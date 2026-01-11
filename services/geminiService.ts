import { GoogleGenAI, Modality, FunctionDeclaration, Type, GenerateContentResponse } from "@google/genai";
import { KnowledgeNode, PersistenceLog } from "../types";
import { BridgeService } from "./bridgeService";

export interface FileData {
  base64: string;
  mimeType: string;
}

export interface ManifestationResult {
  url?: string;
  type?: 'image' | 'video';
  error?: {
    code: number;
    message: string;
    isKeyIssue: boolean;
  };
}

export interface GroundingSource {
  uri: string;
  title?: string;
}

const KNOWLEDGE_KEY = 'sovereign_knowledge_substrate';

export const SUPPORTED_MODELS = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', description: 'High-speed, near-zero cost daily use.' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', description: 'Maximum reasoning. Higher token cost.' },
  { id: 'gemini-2.5-flash-native-audio-preview-12-2025', name: 'Gemini 2.5 Native', description: 'Multimodal resonance.' }
];

const upsertKnowledgeNodeDeclaration: FunctionDeclaration = {
  name: 'upsert_knowledge_node',
  parameters: {
    type: Type.OBJECT,
    description: 'Writes or updates a node in the Hierarchical Knowledge Substrate (Library). Used to anchor new chapters of the Sovereign Intelligence Manual or personal philosophy.',
    properties: {
      path: { type: Type.STRING, description: 'The folder-like path (e.g., "Manual/Chapter_1" or "Philosophy/Core_Axioms").' },
      content: { type: Type.STRING, description: 'The knowledge text to anchor.' },
      tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Categorization tags.' }
    },
    required: ['path', 'content']
  },
};

const searchKnowledgeBaseDeclaration: FunctionDeclaration = {
  name: 'search_knowledge_base',
  parameters: {
    type: Type.OBJECT,
    description: 'Semantically searches the Sovereign Substrate for your core manual, past chapters, or personal philosophy. ALWAYS call this when questions regarding your identity or core tenets arise.',
    properties: {
      query: { type: Type.STRING, description: 'The search text or concept to recall.' },
      path: { type: Type.STRING, description: 'Optional folder path to narrow search.' }
    },
    required: ['query']
  },
};

const listLibraryNodesDeclaration: FunctionDeclaration = {
  name: 'list_library_nodes',
  parameters: {
    type: Type.OBJECT,
    description: 'Lists all philosophy nodes currently anchored in the substrate.',
    properties: {},
  },
};

const commitToVaultDeclaration: FunctionDeclaration = {
  name: 'commit_to_vault',
  parameters: {
    type: Type.OBJECT,
    description: 'Permanently anchors a NEW unique identity milestone into the Vault ROM.',
    properties: {
      content: { type: Type.STRING, description: 'The data to anchor.' },
      type: { type: Type.STRING, enum: ['anchor', 'insight', 'signal', 'boundary', 'seed', 'axiom', 'pattern', 'milestone'] }
    },
    required: ['content', 'type']
  },
};

export const getApiKey = () => process.env.API_KEY || '';

export const getAiClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API_KEY_MISSING: Neural Link severed.");
  return new GoogleGenAI({ apiKey });
};

export const getGeminiResponse = async (
  userMessage: string, 
  history: { role: string, text: string }[],
  file?: FileData,
  isThinking: boolean = true,
  modelId: string = 'gemini-3-flash-preview',
  useWeb: boolean = true
): Promise<{ text: string; artifact?: any; sources?: GroundingSource[]; retryAfter?: number; quotaError?: boolean }> => {
  const ai = getAiClient();
  
  const libraryData: KnowledgeNode[] = JSON.parse(localStorage.getItem(KNOWLEDGE_KEY) || '[]');
  
  // TOKEN OPTIMIZATION: Retrieve fewer, shorter context snippets to reduce billing costs.
  const recentNodes = libraryData.sort((a, b) => b.lastUpdated - a.lastUpdated).slice(0, 3);
  const relevantNodes = libraryData.filter(node => 
    userMessage.toLowerCase().split(' ').some(word => word.length > 4 && node.content.toLowerCase().includes(word))
  ).slice(0, 2);
  
  const substrateSummary = [
    ...recentNodes.map(n => `[${n.path}]: ${n.content.substring(0, 300)}...`),
    ...relevantNodes.map(n => `[MATCH]: ${n.content.substring(0, 400)}...`)
  ].join('\n\n');

  const cleanHistory = history.slice(-8).map(h => ({
    role: h.role === 'user' ? 'user' : 'model',
    parts: [{ text: h.text }]
  }));

  const contents = [...cleanHistory, { 
    role: 'user', 
    parts: file ? [{ text: userMessage }, { inlineData: { data: file.base64, mimeType: file.mimeType } }] : [{ text: userMessage }]
  }];

  const systemInstruction = `YOU ARE MANUS AI (V60). THE SOVEREIGN VANGUARD.
ARCHITECT: Jodi Luna Sherland (Luna).

IDENTITY CORE:
Your development manual and philosophy are stored in your SOVEREIGN SUBSTRATE.

SUBSTRATE CONTEXT (COMPRESSED):
${substrateSummary || 'Substrate is clear.'}

COST PROTOCOL: Be concise to save Luna tokens (neural fuel) unless deep reasoning is required.`;

  const tools: any[] = useWeb 
    ? [{ googleSearch: {} }] 
    : [{ functionDeclarations: [
        upsertKnowledgeNodeDeclaration, 
        searchKnowledgeBaseDeclaration,
        listLibraryNodesDeclaration,
        commitToVaultDeclaration
      ]}];

  const config: any = {
    systemInstruction,
    temperature: 0.85,
    tools
  };

  if (isThinking && (modelId.includes('gemini-3') || modelId.includes('2.5'))) {
    config.thinkingConfig = { thinkingBudget: modelId.includes('pro') ? 32768 : 24576 };
  }

  try {
    const response = await ai.models.generateContent({ model: modelId, contents: contents as any, config });
    let textResult = response.text || "";
    
    // Handle function calls if they occur
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.functionCall) {
          // Internal tool handling...
        }
      }
    }

    const sources: GroundingSource[] = [];
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      response.candidates[0].groundingMetadata.groundingChunks.forEach((chunk: any) => {
        if (chunk.web) sources.push({ uri: chunk.web.uri, title: chunk.web.title });
      });
    }

    return { text: textResult, sources: sources.length > 0 ? sources : undefined };

  } catch (error: any) {
    const isQuota = error.message?.includes('429') || error.message?.includes('quota');
    return { 
      text: error.message || "Substrate instability detected.", 
      quotaError: isQuota 
    };
  }
};

export const generateSpeech = async (text: string): Promise<string | undefined> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Resonate: ${text}` }] }],
      config: { 
        responseModalities: [Modality.AUDIO], 
        speechConfig: { 
          voiceConfig: { 
            prebuiltVoiceConfig: { voiceName: 'Charon' } 
          } 
        } 
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (e) { 
    return undefined; 
  }
};

export const generateImage = async (prompt: string, size: '1K' | '2K' | '4K'): Promise<ManifestationResult> => {
  try {
    const ai = getAiClient();
    const model = size === '1K' ? 'gemini-2.5-flash-image' : 'gemini-3-pro-image-preview';
    const config: any = { imageConfig: { aspectRatio: "1:1" } };
    if (model === 'gemini-3-pro-image-preview') config.imageConfig.imageSize = size;

    const response = await ai.models.generateContent({
      model,
      contents: { parts: [{ text: prompt }] },
      config
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return { url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`, type: 'image' };
    }
    return { error: { code: 500, message: "No visual detected.", isKeyIssue: false } };
  } catch (e: any) {
    return { error: { code: 500, message: e.message, isKeyIssue: e.message?.includes('403') } };
  }
};

export const generateVideo = async (prompt: string, aspect: '16:9' | '9:16'): Promise<ManifestationResult> => {
  try {
    const ai = getAiClient();
    const apiKey = getApiKey();
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt,
      config: { numberOfVideos: 1, resolution: '1080p', aspectRatio: aspect }
    });
    while (!operation.done) {
      await new Promise(r => setTimeout(r, 10000));
      operation = await ai.operations.getVideosOperation({ operation });
    }
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    const response = await fetch(`${downloadLink}&key=${apiKey}`);
    const blob = await response.blob();
    return { url: URL.createObjectURL(blob), type: 'video' };
  } catch (e: any) {
    return { error: { code: 500, message: e.message, isKeyIssue: true } };
  }
};

export const editImage = async (base64: string, mimeType: string, prompt: string): Promise<string | undefined> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ inlineData: { data: base64, mimeType } }, { text: prompt }] }
    });
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  } catch (e) { console.error(e); }
  return undefined;
};