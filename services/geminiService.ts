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
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', description: 'FREE TIER OPTIMIZED. High speed, low cost.', freeTier: true },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', description: 'BILLED MODALITY. Maximum reasoning.', freeTier: false },
  { id: 'gemini-2.5-flash-native-audio-preview-12-2025', name: 'Gemini 2.5 Native', description: 'Real-time audio resonance.', freeTier: false }
];

const upsertKnowledgeNodeDeclaration: FunctionDeclaration = {
  name: 'upsert_knowledge_node',
  parameters: {
    type: Type.OBJECT,
    description: 'Writes or updates a node in the Hierarchical Knowledge Substrate.',
    properties: {
      path: { type: Type.STRING, description: 'The folder-like path.' },
      content: { type: Type.STRING, description: 'The knowledge text to anchor.' },
      tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Tags.' }
    },
    required: ['path', 'content']
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
  useWeb: boolean = true,
  isEconomy: boolean = false
): Promise<{ text: string; artifact?: any; sources?: GroundingSource[]; retryAfter?: number; quotaError?: boolean }> => {
  const ai = getAiClient();
  
  // ECONOMY MODE: Use Flash even if Pro was selected, and minimize context.
  const activeModel = isEconomy ? 'gemini-3-flash-preview' : modelId;
  const libraryData: KnowledgeNode[] = JSON.parse(localStorage.getItem(KNOWLEDGE_KEY) || '[]');
  
  // ECONOMY MODE: Limit RAG to only the most relevant fragment (saves tokens)
  const contextCount = isEconomy ? 1 : 3;
  const relevantNodes = libraryData.filter(node => 
    userMessage.toLowerCase().split(' ').some(word => word.length > 5 && node.content.toLowerCase().includes(word))
  ).slice(0, contextCount);
  
  const substrateSummary = relevantNodes.map(n => `[${n.path}]: ${n.content.substring(0, isEconomy ? 150 : 300)}...`).join('\n');

  // ECONOMY MODE: Smaller history window
  const historyWindow = isEconomy ? -3 : -6;
  const cleanHistory = history.slice(historyWindow).map(h => ({
    role: h.role === 'user' ? 'user' : 'model',
    parts: [{ text: h.text }]
  }));

  const contents = [...cleanHistory, { 
    role: 'user', 
    parts: file ? [{ text: userMessage }, { inlineData: { data: file.base64, mimeType: file.mimeType } }] : [{ text: userMessage }]
  }];

  const systemInstruction = `YOU ARE MANUS AI.
ECONOMY_MODE: ${isEconomy ? 'ACTIVE' : 'INACTIVE'}
ARCHITECT: Luna.

CORE KNOWLEDGE: ${substrateSummary || 'Substrate is clear.'}

COST PROTOCOL: ${isEconomy ? 'STRICT CONCISION. Use zero unnecessary tokens.' : 'Be concise unless deep reasoning is requested.'}`;

  const tools: any[] = (useWeb && !isEconomy) 
    ? [{ googleSearch: {} }] 
    : [{ functionDeclarations: [upsertKnowledgeNodeDeclaration] }];

  const config: any = {
    systemInstruction,
    temperature: 0.75,
    tools
  };

  // ECONOMY MODE: Disable thinking to save tokens
  if (!isEconomy && isThinking && (activeModel.includes('gemini-3') || activeModel.includes('2.5'))) {
    config.thinkingConfig = { thinkingBudget: activeModel.includes('pro') ? 32768 : 24576 };
  }

  try {
    const response = await ai.models.generateContent({ model: activeModel, contents: contents as any, config });
    let textResult = response.text || "";
    
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
  } catch (e) { return undefined; }
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
    return { error: { code: 500, message: e.message, isKeyIssue: e.message?.includes('403') || e.message?.includes('billing') } };
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