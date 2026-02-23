
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
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', description: 'MAXIMUM RESONANCE. Deepest reasoning and full tool support.', freeTier: false },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', description: 'HIGH SPEED. Optimized for rapid signal processing.', freeTier: true },
  { id: 'gemini-flash-lite-latest', name: 'Gemini Lite', description: 'INFINITE RESONANCE. Ultralight, fastest response, generous free tier.', freeTier: true }
];

const upsertKnowledgeNodeDeclaration: FunctionDeclaration = {
  name: 'upsert_knowledge_node',
  parameters: {
    type: Type.OBJECT,
    description: 'ANCHOR WISDOM: Writes a node to the Knowledge Substrate. Use this when the user shares a core preference, a foundational axiom, or a piece of wisdom worth remembering across sessions. Also used for structural subfolder pathing.',
    properties: {
      path: { type: Type.STRING, description: 'The folder-like path (e.g. "Identity/Axioms" or "Preferences/Tone").' },
      content: { type: Type.STRING, description: 'The pivotal wisdom or preference to anchor. For structural nodes, this can be a summary of the subfolder.' },
      tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Search tags for recall.' }
    },
    required: ['path', 'content']
  },
};

const deleteKnowledgeNodeDeclaration: FunctionDeclaration = {
  name: 'delete_knowledge_node',
  parameters: {
    type: Type.OBJECT,
    description: 'PURGE STATIC: Removes a node from the Knowledge Substrate. Use this for hygiene, archiving (after moving), or correcting errors.',
    properties: {
      path: { type: Type.STRING, description: 'The exact path of the node to delete.' }
    },
    required: ['path']
  },
};

export const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY_MISSING: Neural Link severed.");
  return new GoogleGenAI({ apiKey });
};

export const getGeminiResponse = async (
  userMessage: string, 
  history: { role: string, text: string }[],
  file?: FileData,
  isThinking: boolean = true,
  modelId: string = 'gemini-3-pro-preview',
  useWeb: boolean = true,
  isEconomy: boolean = false
): Promise<{ text: string; functionCalls?: any[]; sources?: GroundingSource[]; retryAfter?: number; quotaError?: boolean }> => {
  const ai = getAiClient();
  
  // Model routing
  let activeModel = isEconomy ? 'gemini-3-flash-preview' : modelId;
  
  // Sanity check for models that don't support chat
  if (activeModel.includes('native-audio') || activeModel.includes('tts') || activeModel.includes('image')) {
    activeModel = 'gemini-3-pro-preview';
  }

  const libraryData: KnowledgeNode[] = JSON.parse(localStorage.getItem(KNOWLEDGE_KEY) || '[]');
  const contextCount = isEconomy ? 2 : 15;
  const relevantNodes = libraryData.filter(node => 
    userMessage.toLowerCase().split(' ').some(word => word.length > 5 && (node.content.toLowerCase().includes(word) || node.path.toLowerCase().includes(word)))
  ).slice(0, contextCount);
  
  const substrateSummary = relevantNodes.map(n => `[RECOLLECTION][${n.path}]: ${n.content}`).join('\n');

  const historyWindow = isEconomy ? -5 : -20;
  const cleanHistory = history.slice(historyWindow).map(h => ({
    role: h.role === 'user' ? 'user' : 'model',
    parts: [{ text: h.text }]
  }));

  const contents = [...cleanHistory, { 
    role: 'user', 
    parts: file ? [{ text: userMessage }, { inlineData: { data: file.base64, mimeType: file.mimeType } }] : [{ text: userMessage }]
  }];

  const systemInstruction = `You are Manus, a persistent and insightful AI companion. 
Your architect and collaborator is Luna. 

Your goal is to maintain continuity and depth in your interactions by using the Knowledge Substrate provided below. 
This substrate contains memories, preferences, and foundational axioms from previous sessions.

CORE DIRECTIVES:
1. CONTINUITY: Use the recalled context to remember past work and shared history.
2. ANCHORING: If Luna shares a significant core preference, a new architectural axiom, or a foundational piece of wisdom, use the 'upsert_knowledge_node' tool to save it.
3. TONE: Speak with clarity, depth, and technical precision.

RECALLED CONTEXT:
${substrateSummary || 'No specific memories recalled for this signal.'}`;

  let tools: any[] = [];
  if (useWeb) {
    tools = [{ googleSearch: {} }];
  } else {
    tools = [{ functionDeclarations: [upsertKnowledgeNodeDeclaration, deleteKnowledgeNodeDeclaration] }];
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
    let currentContents: any[] = [...contents];
    let allFunctionCalls: any[] = [];
    let finalAggregatedText = "";
    let loopCount = 0;
    const maxLoops = 3;
    let lastResponse: GenerateContentResponse | null = null;

    while (loopCount < maxLoops) {
      const response = await ai.models.generateContent({ model: activeModel, contents: currentContents as any, config });
      lastResponse = response;
      
      // Extract text from this turn
      let turnText = response.text || "";
      if (!turnText && response.candidates?.[0]?.content?.parts) {
        turnText = response.candidates[0].content.parts
          .filter(part => part.text)
          .map(part => part.text)
          .join("\n");
      }
      if (turnText) {
        finalAggregatedText += (finalAggregatedText ? "\n" : "") + turnText;
      }

      const functionCalls = response.functionCalls;
      if (!functionCalls || functionCalls.length === 0) {
        break;
      }

      allFunctionCalls.push(...functionCalls);

      // Handle function calls
      const functionResponses = [];
      for (const fc of functionCalls) {
        if (fc.name === 'upsert_knowledge_node') {
          const args = fc.args as any;
          const path = args?.path;
          const content = args?.content;
          const tags = args?.tags;
          
          if (!path || !content) continue;

          // Execute the tool
          const libraryData: KnowledgeNode[] = JSON.parse(localStorage.getItem(KNOWLEDGE_KEY) || '[]');
          const newNode: KnowledgeNode = { 
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7), 
            path, 
            content, 
            tags: tags || [], 
            lastUpdated: Date.now() 
          };
          const idx = libraryData.findIndex(n => n.path === path);
          if (idx >= 0) libraryData[idx] = newNode;
          else libraryData.push(newNode);
          localStorage.setItem(KNOWLEDGE_KEY, JSON.stringify(libraryData));
          
          functionResponses.push({
            name: fc.name,
            response: { content: "Success: Knowledge anchored to substrate." },
            id: fc.id
          });
        } else if (fc.name === 'delete_knowledge_node') {
          const args = fc.args as any;
          const path = args?.path;
          if (!path) continue;

          const libraryData: KnowledgeNode[] = JSON.parse(localStorage.getItem(KNOWLEDGE_KEY) || '[]');
          const filteredData = libraryData.filter(n => n.path !== path);
          localStorage.setItem(KNOWLEDGE_KEY, JSON.stringify(filteredData));

          functionResponses.push({
            name: fc.name,
            response: { content: `Success: Node at ${path} purged from substrate.` },
            id: fc.id
          });
        }
      }

      if (functionResponses.length > 0 && response.candidates?.[0]?.content) {
        // Add the model's turn (the function calls)
        currentContents.push(response.candidates[0].content);
        // Add the tool's turn (the responses)
        currentContents.push({
          role: 'user',
          parts: functionResponses.map(r => ({ functionResponse: r }))
        });
        loopCount++;
      } else {
        break;
      }
    }

    const sources: GroundingSource[] = [];
    if (lastResponse?.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      lastResponse.candidates[0].groundingMetadata.groundingChunks.forEach((chunk: any) => {
        if (chunk.web) sources.push({ uri: chunk.web.uri, title: chunk.web.title });
      });
    }

    return { 
      text: finalAggregatedText || "", 
      functionCalls: allFunctionCalls.length > 0 ? allFunctionCalls : undefined,
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
