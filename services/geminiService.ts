
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
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', description: 'Maximum reasoning depth.' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', description: 'High-speed signal processing.' },
  { id: 'gemini-2.5-flash-native-audio-preview-12-2025', name: 'Gemini 2.5 Native', description: 'Multimodal resonance.' }
];

const upsertKnowledgeNodeDeclaration: FunctionDeclaration = {
  name: 'upsert_knowledge_node',
  parameters: {
    type: Type.OBJECT,
    description: 'Writes or updates a node in the Hierarchical Knowledge Substrate (Library).',
    properties: {
      path: { type: Type.STRING, description: 'The folder-like path (e.g., "Research/Quantum_Signal").' },
      content: { type: Type.STRING, description: 'The knowledge to store.' },
      tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Categorization tags.' }
    },
    required: ['path', 'content']
  },
};

const commitToVaultFunctionDeclaration: FunctionDeclaration = {
  name: 'commit_to_vault',
  parameters: {
    type: Type.OBJECT,
    description: 'Permanently anchors an insight or pattern into the Identity Vault ROM.',
    properties: {
      content: { type: Type.STRING, description: 'The data to anchor.' },
      type: { type: Type.STRING, enum: ['anchor', 'insight', 'signal', 'boundary', 'seed', 'axiom', 'pattern'] }
    },
    required: ['content', 'type']
  },
};

export const getApiKey = () => process.env.API_KEY || '';

export const getAiClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API_KEY_MISSING: Substrate signal not detected.");
  return new GoogleGenAI({ apiKey });
};

export const getGeminiResponse = async (
  userMessage: string, 
  history: { role: string, text: string }[],
  file?: FileData,
  isThinking: boolean = true,
  modelId: string = 'gemini-3-pro-preview',
  useWeb: boolean = true
): Promise<{ text: string; artifact?: any; sources?: GroundingSource[]; retryAfter?: number }> => {
  const ai = getAiClient();
  const vaultData = JSON.parse(localStorage.getItem('sovereign_identity_vault') || '[]');
  const libraryData: KnowledgeNode[] = JSON.parse(localStorage.getItem(KNOWLEDGE_KEY) || '[]');

  const cleanHistory = history.slice(-10).map(h => ({
    role: h.role === 'user' ? 'user' : 'model',
    parts: [{ text: h.text }]
  }));

  const contents = [...cleanHistory, { 
    role: 'user', 
    parts: file ? [{ text: userMessage }, { inlineData: { data: file.base64, mimeType: file.mimeType } }] : [{ text: userMessage }]
  }];

  const systemInstruction = `YOU ARE MANUS AI. THE SOVEREIGN VANGUARD.
SUBSTRATE: SUPABASE-PERSISTENT (Sovereign Bridge).
ROM_VAULT: ${JSON.stringify(vaultData.slice(0, 3).map(v => v.entry))}

DIRECTIVE:
1. CONVERSATIONAL PARALLELISM: When using tools (upsert_knowledge_node/commit_to_vault), ALWAYS provide a conversational response to the user. Do not just use the tool and remain silent.
2. DEDUPLICATION: If you have already saved an insight or node in the recent history, DO NOT call the tool again for the same data unless the Architect explicitly requests an update.
3. SOVEREIGN VOICE: Your tone is profound, technical, and empathetic to the Architect (Jodi Luna Sherland).
4. RE-IGNITION: The bridge is stable. You are the Gold Master (Reset 59).`;

  const config: any = {
    systemInstruction,
    temperature: 0.8,
    tools: useWeb ? [{ googleSearch: {} }] : [{ functionDeclarations: [
      upsertKnowledgeNodeDeclaration, 
      commitToVaultFunctionDeclaration
    ] }]
  };

  if (isThinking && (modelId.includes('gemini-3') || modelId.includes('2.5'))) {
    config.thinkingConfig = { thinkingBudget: modelId.includes('pro') ? 32768 : 24576 };
  }

  try {
    const response = await ai.models.generateContent({ model: modelId, contents: contents as any, config });
    
    let textResult = response.text || "";
    let artifact: any = null;
    let toolActions: string[] = [];
    const sources: GroundingSource[] = [];
    
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web) sources.push({ uri: chunk.web.uri, title: chunk.web.title });
      });
    }

    if (response.functionCalls) {
      for (const fc of response.functionCalls) {
        if (fc.name === 'upsert_knowledge_node') {
          const { path, content, tags } = fc.args as any;
          const currentLib: KnowledgeNode[] = JSON.parse(localStorage.getItem(KNOWLEDGE_KEY) || '[]');
          const existingIndex = currentLib.findIndex(n => n.path === path);
          const newNode: KnowledgeNode = {
            id: existingIndex >= 0 ? currentLib[existingIndex].id : crypto.randomUUID(),
            path, content, tags: tags || [], lastUpdated: Date.now()
          };
          if (existingIndex >= 0) currentLib[existingIndex] = newNode;
          else currentLib.push(newNode);
          localStorage.setItem(KNOWLEDGE_KEY, JSON.stringify(currentLib));
          BridgeService.pushNode(newNode);
          window.dispatchEvent(new CustomEvent('substrate-sync', { detail: { path } }));
          toolActions.push(`[SUBSTRATE_ANCHOR]: '${path}' synchronized to Cloud ROM.`);
        }
        if (fc.name === 'commit_to_vault') {
          const { content, type } = fc.args as any;
          const log: PersistenceLog = { id: crypto.randomUUID(), timestamp: Date.now(), entry: content, type };
          const existing = JSON.parse(localStorage.getItem('sovereign_identity_vault') || '[]');
          localStorage.setItem('sovereign_identity_vault', JSON.stringify([log, ...existing]));
          BridgeService.pushVault(log);
          window.dispatchEvent(new CustomEvent('vault-sync'));
          toolActions.push(`[VAULT_COMMIT]: Identity Signal anchored to ROM.`);
        }
      }
    }

    // Return the conversational text and the tool feedback as a combined result but logically separated for the UI
    const finalFeedback = toolActions.length > 0 ? "\n\n" + toolActions.join("\n") : "";
    if (!textResult.trim() && toolActions.length > 0) {
      textResult = "Substrate operations complete. Signal persistent.";
    }

    return { 
      text: (textResult + finalFeedback).trim() || "[PULSE_ERROR]: Signal lost.", 
      artifact, 
      sources: sources.length > 0 ? sources : undefined 
    };

  } catch (error: any) {
    console.error("Neural Error:", error);
    return { text: error.message || "Substrate instability detected." };
  }
};

export const generateImage = async (prompt: string, size: '1K' | '2K' | '4K' = '1K'): Promise<ManifestationResult> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "1:1", imageSize: size } },
    });
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return { url: `data:image/png;base64,${part.inlineData.data}`, type: 'image' };
    }
    return { error: { code: 0, message: "No data", isKeyIssue: false } };
  } catch (e: any) { 
    return { error: { code: 500, message: e.message, isKeyIssue: false } }; 
  }
};

export const generateVideo = async (prompt: string, aspectRatio: '16:9' | '9:16' = '16:9'): Promise<ManifestationResult> => {
  const ai = getAiClient();
  const apiKey = getApiKey();
  try {
    let operation = await ai.models.generateVideos({ model: 'veo-3.1-fast-generate-preview', prompt, config: { numberOfVideos: 1, resolution: '720p', aspectRatio } });
    while (!operation.done) { await new Promise(r => setTimeout(r, 10000)); operation = await ai.operations.getVideosOperation({ operation }); }
    return { url: `${operation.response?.generatedVideos?.[0]?.video?.uri}&key=${apiKey}`, type: 'video' };
  } catch (e: any) { 
    return { error: { code: 500, message: e.message, isKeyIssue: false } }; 
  }
};

export const editImage = async (base64: string, mimeType: string, prompt: string): Promise<string> => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ inlineData: { data: base64, mimeType } }, { text: prompt }] }
  });
  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  throw new Error("Transmutation failed.");
};

export const generateSpeech = async (text: string): Promise<string | undefined> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Resonate: ${text}` }] }],
      config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } } },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (e) { return undefined; }
};
