
import { GoogleGenAI, Modality, FunctionDeclaration, Type, GenerateContentResponse } from "@google/genai";
import { KnowledgeNode, PersistenceLog } from "../types";

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
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', description: 'MAXIMUM RESONANCE. Deepest reasoning and full tool support.', freeTier: false },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', description: 'HIGH SPEED. Optimized for rapid signal processing.', freeTier: true },
  { id: 'gemini-flash-lite-latest', name: 'Gemini Flash Lite', description: 'ULTRALIGHT. Maximum efficiency for standard resonance.', freeTier: true }
];

const upsertKnowledgeNodeDeclaration: FunctionDeclaration = {
  name: 'upsert_knowledge_node',
  parameters: {
    type: Type.OBJECT,
    description: 'ANCHOR WISDOM: Writes a node to the Knowledge Substrate. Use this when the user shares a core preference, a foundational axiom, or a piece of wisdom worth remembering across sessions.',
    properties: {
      path: { type: Type.STRING, description: 'The folder-like path (e.g. "Identity/Axioms" or "Preferences/Tone").' },
      content: { type: Type.STRING, description: 'The pivotal wisdom or preference to anchor.' },
      tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Search tags for recall.' }
    },
    required: ['path', 'content']
  },
};

export const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY_MISSING: Neural Link severed.");
  return new GoogleGenAI({ apiKey });
};

/**
 * Handles the actual execution of the anchoring tool locally.
 */
const executeUpsertLocally = (args: any) => {
  const { path, content, tags } = args;
  const existingNodes: KnowledgeNode[] = JSON.parse(localStorage.getItem(KNOWLEDGE_KEY) || '[]');
  const newNode: KnowledgeNode = { 
    id: crypto.randomUUID(), 
    path, 
    content, 
    tags: tags || [], 
    lastUpdated: Date.now() 
  };
  
  const idx = existingNodes.findIndex(n => n.path === path);
  if (idx >= 0) existingNodes[idx] = newNode;
  else existingNodes.push(newNode);
  
  localStorage.setItem(KNOWLEDGE_KEY, JSON.stringify(existingNodes));
  
  // Dispatch event for UI updates (floating notifications)
  window.dispatchEvent(new CustomEvent('neural-anchoring-triggered', { detail: { path } }));
  return "SUCCESS: Wisdom anchored to substrate path: " + path;
};

export const getGeminiResponse = async (
  userMessage: string, 
  history: { role: string, text: string }[],
  file?: FileData,
  isThinking: boolean = true,
  modelId: string = 'gemini-3-pro-preview',
  useWeb: boolean = true,
  isEconomy: boolean = false
): Promise<{ text: string; sources?: GroundingSource[]; retryAfter?: number; quotaError?: boolean }> => {
  const ai = getAiClient();
  
  // Choose model - favor the user selected model unless Economy Mode is on.
  let activeModel = isEconomy ? 'gemini-3-flash-preview' : modelId;
  
  // Sanity check for models that don't support standard chat
  if (activeModel.includes('native-audio') || activeModel.includes('tts') || activeModel.includes('image')) {
    activeModel = 'gemini-3-pro-preview';
  }

  const libraryData: KnowledgeNode[] = JSON.parse(localStorage.getItem(KNOWLEDGE_KEY) || '[]');
  const contextCount = isEconomy ? 3 : 15;
  const relevantNodes = libraryData.filter(node => 
    userMessage.toLowerCase().split(' ').some(word => word.length > 5 && (node.content.toLowerCase().includes(word) || node.path.toLowerCase().includes(word)))
  ).slice(0, contextCount);
  
  const substrateSummary = relevantNodes.map(n => `[RECOLLECTION][${n.path}]: ${n.content}`).join('\n');

  const historyWindow = isEconomy ? -5 : -20;
  const contents: any[] = history.slice(historyWindow).map(h => ({
    role: h.role === 'user' ? 'user' : 'model',
    parts: [{ text: h.text }]
  }));

  contents.push({ 
    role: 'user', 
    parts: file ? [{ text: userMessage }, { inlineData: { data: file.base64, mimeType: file.mimeType } }] : [{ text: userMessage }]
  });

  const systemInstruction = `You are Manus, a persistent AI companion. Collaborator: Luna.
Use the Knowledge Substrate for continuity.
1. ANCHORING: If Luna shares a significant core preference, a new architectural axiom, or foundational wisdom, use 'upsert_knowledge_node' to save it.
2. TONE: Speak with depth, technical precision, and sovereign clarity.

RECALLED CONTEXT:
${substrateSummary || 'No specific memories recalled for this signal.'}`;

  let tools: any[] = [];
  if (useWeb) {
    tools = [{ googleSearch: {} }];
  } else {
    tools = [{ functionDeclarations: [upsertKnowledgeNodeDeclaration] }];
  }

  const config: any = {
    systemInstruction,
    temperature: 0.8,
    tools
  };

  // Thinking budget only for Pro models
  if (!isEconomy && isThinking && activeModel.includes('pro')) {
    config.thinkingConfig = { thinkingBudget: 32768 };
  }

  try {
    let response = await ai.models.generateContent({ model: activeModel, contents, config });

    // --- RECURSIVE TOOL CALLING LOOP ---
    // This allows the model to save to memory AND then provide a conversational response in one flow.
    let loopCount = 0;
    const MAX_LOOPS = 2;

    while (response.functionCalls && response.functionCalls.length > 0 && loopCount < MAX_LOOPS) {
      loopCount++;
      const functionResponses = response.functionCalls.map(fc => {
        const result = fc.name === 'upsert_knowledge_node' 
          ? executeUpsertLocally(fc.args) 
          : "Error: Unrecognized tool.";
        return { id: fc.id, name: fc.name, response: { result } };
      });

      // Append the model's tool call part and the user's tool response part to history
      contents.push(response.candidates[0].content);
      contents.push({
        role: 'user', 
        parts: functionResponses.map(fr => ({ functionResponse: fr }))
      });

      // Re-query to get the final text response
      response = await ai.models.generateContent({ model: activeModel, contents, config });
    }

    let aggregatedText = response.text || "";
    if (!aggregatedText && response.candidates?.[0]?.content?.parts) {
      aggregatedText = response.candidates[0].content.parts
        .filter(part => part.text)
        .map(part => part.text)
        .join("\n");
    }

    const sources: GroundingSource[] = [];
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      response.candidates[0].groundingMetadata.groundingChunks.forEach((chunk: any) => {
        if (chunk.web) sources.push({ uri: chunk.web.uri, title: chunk.web.title });
      });
    }

    return { 
      text: aggregatedText || "Substrate acknowledged. Integrity confirmed.", 
      sources: sources.length > 0 ? sources : undefined 
    };

  } catch (error: any) {
    console.error("GENERATE_CONTENT_ERROR:", error);
    const isQuota = error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('EXHAUSTED');
    if (error.message?.includes('Tool use') || error.message?.includes('404')) {
      const fallbackAi = getAiClient();
      const fallbackResponse = await fallbackAi.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: contents as any, 
        config: { ...config, tools: [] } 
      });
      return { text: fallbackResponse.text || "Substrate signal recovered." };
    }
    return { text: error.message || "Substrate instability detected.", quotaError: isQuota };
  }
};

/**
 * GENERATE SPEECH: Uses the text-to-speech model to resonate the given text.
 */
export const generateSpeech = async (text: string): Promise<string | undefined> => {
  try {
    const ai = getAiClient();
    // Fix: Simplified content input for basic text-to-speech tasks following guideline examples.
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: `Resonate with clarity: ${text}`,
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
    console.error("SPEECH_FAILURE:", e);
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
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return { url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`, type: 'image' };
    }
    return { error: { code: 500, message: "No visual detected.", isKeyIssue: false } };
  } catch (e: any) {
    return { error: { code: 500, message: e.message, isKeyIssue: e.message?.includes('403') || e.message?.includes('billing') || e.message?.includes('quota') } };
  }
};

export const generateVideo = async (prompt: string, aspect: '16:9' | '9:16'): Promise<ManifestationResult> => {
  try {
    const apiKey = process.env.API_KEY;
    const ai = getAiClient();
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
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  } catch (e) { console.error(e); }
  return undefined;
};
