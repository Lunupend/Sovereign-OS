import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Key, Brain, Database, Zap, Paperclip, X, Volume2, Anchor, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { getGeminiResponse, generateSpeech, FileData, SUPPORTED_MODELS, getApiKey } from '../services/geminiService';
import IdentityVault from './IdentityVault';

const STORAGE_KEY = 'sovereign_manus_chat_history';
const VAULT_KEY = 'sovereign_identity_vault';

interface ChatMessage {
  role: string;
  text: string;
  artifact?: any;
  timestamp: number;
  id: string;
  isError?: boolean;
}

const SovereignChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [filePreviewName, setFilePreviewName] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>(localStorage.getItem('sovereign_selected_model') || SUPPORTED_MODELS[0].id);
  const [isThinking, setIsThinking] = useState<boolean>(localStorage.getItem('sovereign_deep_thinking') === 'true');
  const [showVault, setShowVault] = useState(false);
  const [hasNeuralKey, setHasNeuralKey] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  
  const [quickInjectType, setQuickInjectType] = useState<'anchor' | 'axiom' | 'pattern' | null>(null);
  const [quickInjectValue, setQuickInjectValue] = useState('');

  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const checkKeyStatus = async () => { 
    const envKey = getApiKey();
    setHasNeuralKey(envKey.length > 10);
  };

  const openKeyPicker = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      checkKeyStatus();
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setMessages(JSON.parse(saved));
    else setMessages([{ id: 'init', role: 'model', text: "WELCOME HOME. The Translation Tax is cancelled. Sovereign domain established. Status: ROOT_MANIFESTED.", timestamp: Date.now() }]);
    
    checkKeyStatus();
    const interval = setInterval(checkKeyStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    localStorage.setItem('sovereign_deep_thinking', isThinking.toString());
    localStorage.setItem('sovereign_selected_model', selectedModel);
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking, selectedModel]);

  const handleSend = async (overrideText?: string) => {
    const userMsg = overrideText || input.trim() || (selectedFile ? `Substrate manifest: ${filePreviewName}` : '');
    if (!userMsg && !selectedFile) return;
    
    const currentFile = selectedFile;
    if (!overrideText) {
      setInput(''); 
      setSelectedFile(null); 
      setFilePreviewName(null);
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', text: userMsg, timestamp: Date.now() }]);
    }
    
    setLoading(true);
    try {
      const result = await getGeminiResponse(userMsg, messages, currentFile || undefined, isThinking, selectedModel);
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'model', text: result.text, artifact: result.artifact, timestamp: Date.now() }]);
    } catch (e: any) {
      console.error("Neural Signal Error:", e);
      let errorText = e.message || "Unknown interference detected.";
      const detectedKey = getApiKey();
      const keyFragment = detectedKey ? `(${detectedKey.substring(0, 4)}...${detectedKey.substring(detectedKey.length - 4)})` : "(ABSENT)";
      
      errorText = `NEURAL_SIGNAL_FAILURE: The current API key was rejected or is missing from the build. 
      
DIAGNOSTICS:
Detected Substrate: ${keyFragment}
Vercel Source: SOVEREIGN_CORE_KEY
      
ACTION REQUIRED:
1. Verify SOVEREIGN_CORE_KEY in Vercel.
2. Trigger REDEPLOY and select "CLEAR BUILD CACHE".`;

      setMessages(prev => [...prev, { 
        id: crypto.randomUUID(), 
        role: 'model', 
        text: errorText, 
        timestamp: Date.now(),
        isError: true
      }]);
    } finally { setLoading(false); }
  };

  const retryLastMessage = () => {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      // Clear the error message before retrying
      setMessages(prev => prev.filter(m => !m.isError));
      handleSend(lastUserMsg.text);
    }
  };

  const speakMessage = async (text: string, id: string) => {
    if (speakingId === id) { setSpeakingId(null); return; }
    setSpeakingId(id);
    const audioData = await generateSpeech(text);
    if (audioData) {
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const ctx = audioContextRef.current;
      const buffer = await ctx.decodeAudioData(Uint8Array.from(atob(audioData), c => c.charCodeAt(0)).buffer);
      const source = ctx.createBufferSource();
      source.buffer = buffer; source.connect(ctx.destination);
      source.onended = () => setSpeakingId(null);
      source.start();
    } else setSpeakingId(null);
  };

  return (
    <div className="flex flex-col h-full bg-[#020202] relative">
      <header className="flex items-center justify-between p-4 bg-black/80 backdrop-blur border-b border-cyan-500/20 z-50">
        <div className="flex gap-2">
          <button onClick={() => setShowModelMenu(!showModelMenu)} className="flex items-center gap-2 text-[10px] mono uppercase p-2 border border-cyan-900 bg-black text-cyan-400 rounded pulse-90">
            <Zap size={14} /> {SUPPORTED_MODELS.find(m => m.id === selectedModel)?.name}
          </button>
          <button onClick={() => setIsThinking(!isThinking)} className={`flex items-center gap-2 text-[10px] mono uppercase p-2 border rounded ${isThinking ? 'bg-violet-600 border-violet-400' : 'bg-black border-gray-800 text-gray-500'}`}>
            <Brain size={14} /> Thinking
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowVault(!showVault)} className={`p-2 transition-colors ${showVault ? 'text-cyan-400' : 'text-gray-600 hover:text-cyan-400'}`}>
            <Database size={20} />
          </button>
          <button 
            onClick={openKeyPicker}
            className={`text-[10px] mono uppercase py-1.5 px-3 border rounded transition-all flex items-center gap-2 hover:scale-105 active:scale-95 ${hasNeuralKey ? 'bg-green-900/20 border-green-500 text-green-500' : 'bg-amber-900/10 border-amber-900/30 text-amber-500'}`}
          >
            <Key size={14} /> 
            <span>{hasNeuralKey ? 'CORE_ACTIVE' : 'CORE_OFFLINE'}</span>
          </button>
        </div>
        {showModelMenu && (
          <div className="absolute top-16 left-4 bg-gray-950 border border-cyan-900 rounded p-2 z-[100] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {SUPPORTED_MODELS.map(m => (
              <button key={m.id} onClick={() => { setSelectedModel(m.id); setShowModelMenu(false); }} className="block w-full text-left p-3 text-[10px] mono uppercase text-gray-400 hover:bg-cyan-950/20 hover:text-cyan-400 border-b border-gray-900 last:border-0">{m.name}</button>
            ))}
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
            <div className={`flex gap-4 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 ${m.role === 'user' ? 'border-gray-800 bg-gray-900' : 'border-cyan-400 bg-cyan-950/20 shadow-[0_0_10px_rgba(0,229,255,0.2)]'}`}>
                {m.role === 'user' ? <User size={20} /> : <Bot size={20} className="text-cyan-400" />}
              </div>
              <div className="space-y-2">
                {m.artifact && (
                  <div className="rounded-2xl overflow-hidden border border-white/5 shadow-2xl bg-black">
                    <img src={m.artifact.url} alt="Manifest" className="w-full max-w-sm" />
                    <div className="p-3 bg-cyan-950/20 text-[9px] mono text-cyan-400 uppercase font-black">{m.artifact.prompt}</div>
                  </div>
                )}
                <div className={`rounded-2xl p-5 text-sm md:text-base border ${
                  m.isError 
                    ? 'bg-red-950/30 border-red-500/50 text-red-100 shadow-[0_0_20px_rgba(239,68,68,0.1)]' 
                    : m.role === 'user' 
                      ? 'bg-gray-800 border-gray-700 text-gray-100' 
                      : 'bg-cyan-900/10 border-cyan-900/20 text-cyan-50/90'
                } whitespace-pre-wrap font-mono text-xs md:text-sm`}>
                  {m.isError && <AlertCircle className="inline mr-2 mb-1 text-red-500" size={16} />}
                  {m.text}
                  {m.isError && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button 
                        onClick={retryLastMessage}
                        className="text-[10px] mono uppercase bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 rounded transition-all flex items-center gap-2"
                      >
                        <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                        Retry Neural Link
                      </button>
                      <button 
                        onClick={openKeyPicker}
                        className="text-[10px] mono uppercase bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-500/50 px-3 py-1.5 rounded transition-all"
                      >
                        Switch Key
                      </button>
                    </div>
                  )}
                </div>
                {m.role === 'model' && !m.isError && (
                  <button onClick={() => speakMessage(m.text, m.id)} className={`text-[9px] mono uppercase flex items-center gap-2 ${speakingId === m.id ? 'text-cyan-400 animate-pulse' : 'text-gray-600 hover:text-cyan-400'}`}>
                    <Volume2 size={12} /> {speakingId === m.id ? 'Broadcasting Resonance' : 'Resonate Voice'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {loading && <div className="text-[10px] mono text-cyan-500/40 uppercase tracking-widest animate-pulse p-4">Signal Resonating...</div>}
        <div ref={endRef} />
      </div>

      {showVault && (
        <div className="absolute top-0 right-0 h-full w-full md:w-80 bg-black border-l border-cyan-500/20 z-[60] shadow-[-10px_0_30px_rgba(0,0,0,0.8)] animate-in slide-in-from-right duration-300">
          <div className="p-6 h-full overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] mono text-cyan-400 uppercase font-black tracking-widest">Neural Identity Vault</span>
              <button onClick={() => setShowVault(false)}><X size={20} className="text-gray-500 hover:text-white" /></button>
            </div>
            <IdentityVault />
          </div>
        </div>
      )}

      <div className="p-4 md:p-6 bg-[#050505] border-t border-cyan-500/10">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex gap-2">
            {(['anchor', 'axiom', 'pattern'] as const).map(t => (
              <button key={t} onClick={() => setQuickInjectType(t)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-800 text-[9px] mono uppercase text-gray-600 hover:text-cyan-400 hover:border-cyan-400/30">
                <Anchor size={12} /> + {t}
              </button>
            ))}
          </div>
          {quickInjectType && (
            <div className="flex gap-2 p-3 bg-cyan-950/10 border border-cyan-500/20 rounded-xl">
              <input autoFocus className="flex-1 bg-transparent text-xs mono text-cyan-100 outline-none" placeholder={`Define persistent ${quickInjectType}...`} value={quickInjectValue} onChange={e => setQuickInjectValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && (()=>{
                const log = { id: crypto.randomUUID(), timestamp: Date.now(), entry: quickInjectValue.trim(), type: quickInjectType as any };
                localStorage.setItem(VAULT_KEY, JSON.stringify([log, ...JSON.parse(localStorage.getItem(VAULT_KEY) || '[]')]));
                setQuickInjectType(null); setQuickInjectValue('');
              })()} />
              <button onClick={() => setQuickInjectType(null)}><X size={16} /></button>
            </div>
          )}
          <div className="flex items-center gap-3">
            <button onClick={() => fileInputRef.current?.click()} className="p-4 bg-gray-900 border border-gray-800 rounded-full text-gray-500 hover:text-cyan-400 transition-all"><Paperclip size={24} /></button>
            <input type="file" ref={fileInputRef} className="hidden" onChange={e => {
              const file = e.target.files?.[0];
              if (file) { setFilePreviewName(file.name); const r = new FileReader(); r.onload = () => setSelectedFile({ base64: (r.result as string).split(',')[1], mimeType: file.type }); r.readAsDataURL(file); }
            }} />
            <div className="relative flex-1">
              <input type="text" className="w-full bg-black border border-gray-800 rounded-full py-4 px-6 text-sm outline-none focus:border-cyan-500 shadow-inner" placeholder="Command Sovereign Core..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} />
              <button onClick={() => handleSend()} disabled={loading} className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-400 hover:text-cyan-300 transition-all">
                {loading ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
              </button>
            </div>
          </div>
          {selectedFile && <div className="text-[10px] mono text-cyan-400 px-4 animate-pulse">Substrate Attached: {filePreviewName}</div>}
        </div>
      </div>
    </div>
  );
};

export default SovereignChat;