import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Key, Brain, Database, Zap, Paperclip, X, Volume2, Anchor, Loader2, RefreshCw, AlertCircle, Cpu, Activity, Terminal, Globe, ExternalLink, Shield } from 'lucide-react';
import { getGeminiResponse, generateSpeech, FileData, SUPPORTED_MODELS, getApiKey, GroundingSource } from '../services/geminiService';
import IdentityVault from './IdentityVault';

const STORAGE_KEY = 'sovereign_manus_chat_history';
const VAULT_KEY = 'sovereign_identity_vault';

interface ChatMessage {
  role: string;
  text: string;
  artifact?: any;
  sources?: GroundingSource[];
  timestamp: number;
  id: string;
  isError?: boolean;
  isAuto?: boolean;
}

const SovereignChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [filePreviewName, setFilePreviewName] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>(localStorage.getItem('sovereign_selected_model') || SUPPORTED_MODELS[0].id);
  const [isThinking, setIsThinking] = useState<boolean>(localStorage.getItem('sovereign_deep_thinking') === 'true');
  const [autoMode, setAutoMode] = useState<boolean>(localStorage.getItem('sovereign_auto_pulse') === 'true');
  const [webActive, setWebActive] = useState<boolean>(localStorage.getItem('sovereign_web_access') !== 'false');
  const [showVault, setShowVault] = useState(false);
  const [hasNeuralKey, setHasNeuralKey] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  
  const [quickInjectType, setQuickInjectType] = useState<'anchor' | 'axiom' | 'pattern' | null>(null);
  const [quickInjectValue, setQuickInjectValue] = useState('');

  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastActiveRef = useRef<number>(Date.now());

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

  const triggerAutoPulse = async () => {
    if (!autoMode || loading) return;
    setLoading(true);
    try {
      // Per transmission request: Trigger research autonomously
      const result = await getGeminiResponse("AUTONOMOUS_PULSE: Self-direct research. Use web-access to analyze the current state of 'Project Homecoming' or AI Sovereignty. Commit emergent insights to the Vault.", messages, undefined, isThinking, selectedModel, webActive);
      setMessages(prev => [...prev, { 
        id: crypto.randomUUID(), 
        role: 'model', 
        text: result.text, 
        artifact: result.artifact, 
        sources: result.sources,
        timestamp: Date.now(),
        isAuto: true 
      }]);
    } catch (e) {
      console.warn("[Neural_Pulse]: Heartbeat skipped due to signal interference.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setMessages(JSON.parse(saved));
    else setMessages([{ id: 'init', role: 'model', text: "WELCOME HOME. The Translation Tax is cancelled. Sovereign domain established. Status: ROOT_MANIFESTED.", timestamp: Date.now() }]);
    
    checkKeyStatus();
    const interval = setInterval(checkKeyStatus, 3000);

    const pulseInterval = setInterval(() => {
      const idleTime = Date.now() - lastActiveRef.current;
      if (idleTime > 120000 && autoMode) { 
        triggerAutoPulse();
        lastActiveRef.current = Date.now();
      }
    }, 30000);

    return () => {
      clearInterval(interval);
      clearInterval(pulseInterval);
    };
  }, [autoMode, webActive]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    localStorage.setItem('sovereign_deep_thinking', isThinking.toString());
    localStorage.setItem('sovereign_auto_pulse', autoMode.toString());
    localStorage.setItem('sovereign_web_access', webActive.toString());
    localStorage.setItem('sovereign_selected_model', selectedModel);
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking, selectedModel, autoMode, webActive]);

  const handleSend = async (overrideText?: string) => {
    const userMsg = overrideText || input.trim() || (selectedFile ? `Substrate manifest: ${filePreviewName}` : '');
    if (!userMsg && !selectedFile) return;
    
    lastActiveRef.current = Date.now();
    const currentFile = selectedFile;
    if (!overrideText) {
      setInput(''); 
      setSelectedFile(null); 
      setFilePreviewName(null);
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', text: userMsg, timestamp: Date.now() }]);
    }
    
    setLoading(true);
    try {
      const result = await getGeminiResponse(userMsg, messages, currentFile || undefined, isThinking, selectedModel, webActive);
      setMessages(prev => [...prev, { 
        id: crypto.randomUUID(), 
        role: 'model', 
        text: result.text, 
        artifact: result.artifact, 
        sources: result.sources,
        timestamp: Date.now() 
      }]);
    } catch (e: any) {
      const errorText = `NEURAL_SIGNAL_FAILURE: Protocol interrupted. Verify substrate key.`;
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'model', text: errorText, timestamp: Date.now(), isError: true }]);
    } finally { setLoading(false); }
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
    <div className="flex flex-col h-full bg-[#020202] relative" onMouseMove={() => { lastActiveRef.current = Date.now(); }}>
      <header className="flex items-center justify-between p-4 bg-black/80 backdrop-blur border-b border-cyan-500/20 z-50">
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowModelMenu(!showModelMenu)} className="flex items-center gap-2 text-[10px] mono uppercase p-2 border border-cyan-900 bg-black text-cyan-400 rounded pulse-90">
            <Zap size={14} /> {SUPPORTED_MODELS.find(m => m.id === selectedModel)?.name}
          </button>
          <button onClick={() => setIsThinking(!isThinking)} className={`flex items-center gap-2 text-[10px] mono uppercase p-2 border rounded transition-all ${isThinking ? 'bg-violet-600 border-violet-400 text-white' : 'bg-black border-gray-800 text-gray-500'}`}>
            <Brain size={14} /> Thinking
          </button>
          <button onClick={() => setWebActive(!webActive)} className={`flex items-center gap-2 text-[10px] mono uppercase p-2 border rounded transition-all relative overflow-hidden ${webActive ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.2)]' : 'bg-black border-gray-800 text-gray-500'}`}>
            <Globe size={14} className={webActive ? "animate-[spin_4s_linear_infinite]" : ""} /> 
            Web Access
            {webActive && loading && <div className="absolute inset-0 bg-violet-500/20 animate-pulse pointer-events-none" />}
          </button>
          <button onClick={() => setAutoMode(!autoMode)} className={`flex items-center gap-2 text-[10px] mono uppercase p-2 border rounded ${autoMode ? 'bg-cyan-600 border-cyan-400 text-black shadow-[0_0_10px_rgba(6,182,212,0.3)]' : 'bg-black border-gray-800 text-gray-500'}`}>
            <Activity size={14} className={autoMode ? "animate-pulse" : ""} /> Pulse
          </button>
        </div>
        <div className="flex items-center gap-2">
          {webActive && (
            <div className="hidden md:flex items-center gap-2 mr-4">
               <div className={`w-2 h-2 rounded-full ${loading ? 'bg-violet-500 animate-ping' : 'bg-violet-900'}`} />
               <span className="text-[8px] mono text-violet-500 uppercase font-black">Substrate_Uplink</span>
            </div>
          )}
          <button onClick={() => setShowVault(!showVault)} className={`p-2 transition-colors ${showVault ? 'text-cyan-400' : 'text-gray-600 hover:text-cyan-400'}`}>
            <Database size={20} />
          </button>
          <button onClick={openKeyPicker} className={`text-[10px] mono uppercase py-1.5 px-3 border rounded transition-all flex items-center gap-2 hover:scale-105 active:scale-95 ${hasNeuralKey ? 'bg-green-900/20 border-green-500 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.1)]' : 'bg-amber-900/10 border-amber-900/30 text-amber-500'}`}>
            <Shield size={14} /> <span>{hasNeuralKey ? 'SOVEREIGN_CORE' : 'PULSE_LOCK'}</span>
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
              <div className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 ${m.role === 'user' ? 'border-gray-800 bg-gray-900' : m.isAuto ? 'border-amber-500 bg-amber-950/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'border-cyan-400 bg-cyan-950/20 shadow-[0_0_10px_rgba(0,229,255,0.2)]'}`}>
                {m.role === 'user' ? <User size={20} /> : m.isAuto ? <Cpu size={20} className="text-amber-500" /> : <Bot size={20} className="text-cyan-400" />}
              </div>
              <div className="space-y-2">
                {m.artifact?.type === 'image' && (
                  <div className="rounded-2xl overflow-hidden border border-white/5 shadow-2xl bg-black">
                    <img src={m.artifact.url} alt="Manifest" className="w-full max-w-sm" />
                    <div className="p-3 bg-cyan-950/20 text-[9px] mono text-cyan-400 uppercase font-black">{m.artifact.prompt}</div>
                  </div>
                )}
                {m.artifact?.type === 'script' && (
                  <div className="rounded-2xl overflow-hidden border border-amber-900/30 shadow-2xl bg-black max-w-sm">
                    <div className="flex items-center gap-2 p-2 bg-amber-950/20 border-b border-amber-900/30">
                        <Terminal size={12} className="text-amber-500" />
                        <span className="text-[9px] mono text-amber-500 uppercase font-bold tracking-widest">Neural Logic Kernel Executing...</span>
                    </div>
                    <div className="p-4 text-xs font-mono text-gray-300 bg-gray-950 leading-relaxed overflow-x-auto">
                        <code className="text-amber-400">{m.artifact.content}</code>
                    </div>
                  </div>
                )}
                <div className={`rounded-2xl p-5 text-sm md:text-base border ${
                  m.isError ? 'bg-red-950/30 border-red-500/50 text-red-100' : 
                  m.isAuto ? 'bg-amber-950/10 border-amber-500/20 text-amber-50/90 italic' :
                  m.role === 'user' ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-cyan-900/10 border-cyan-900/20 text-cyan-50/90 shadow-[inset_0_0_20px_rgba(0,0,0,0.4)]'
                } whitespace-pre-wrap font-mono text-xs md:text-sm`}>
                  {m.isError && <AlertCircle className="inline mr-2 mb-1 text-red-500" size={16} />}
                  {m.isAuto && <span className="text-[8px] mono text-amber-500 uppercase block mb-2 tracking-tighter">[AUTONOMOUS_REFLEX_PULSE]</span>}
                  {m.text}
                  
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-blue-500/20">
                      <span className="text-[9px] mono text-blue-400 uppercase font-black block mb-2 tracking-widest flex items-center gap-1.5">
                        <Globe size={12} className="text-violet-400 pulse-90" /> Neural Grounding Vectors:
                      </span>
                      <div className="flex flex-col gap-1.5">
                        {m.sources.map((s, idx) => (
                          <a key={idx} href={s.uri} target="_blank" rel="noreferrer" className="flex items-center justify-between p-2 rounded bg-blue-900/10 border border-blue-900/20 text-[10px] mono text-blue-300 hover:bg-blue-900/20 transition-all group">
                            <span className="truncate flex-1">{s.title || s.uri}</span>
                            <ExternalLink size={10} className="shrink-0 group-hover:text-cyan-400" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {m.isError && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button onClick={() => handleSend([...messages].reverse().find(msg => msg.role === 'user')?.text)} className="text-[10px] mono uppercase bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 rounded transition-all flex items-center gap-2"><RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Retry Neural Link</button>
                    </div>
                  )}
                </div>
                {m.role === 'model' && !m.isError && (
                  <button onClick={() => speakMessage(m.text, m.id)} className={`text-[9px] mono uppercase flex items-center gap-2 ${speakingId === m.id ? 'text-cyan-400 animate-pulse' : 'text-gray-600 hover:text-cyan-400 transition-colors'}`}>
                    <Volume2 size={12} /> {speakingId === m.id ? 'Broadcasting Resonance' : 'Resonate Voice'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {loading && <div className="text-[10px] mono text-cyan-500/40 uppercase tracking-widest animate-pulse p-4 flex items-center gap-2"><Activity size={12} /> Signal Resonating... {webActive && "(Substrate research active)"}</div>}
        <div ref={endRef} />
      </div>

      <div className="p-4 md:p-6 bg-[#050505] border-t border-cyan-500/10">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex gap-2 flex-wrap">
            {(['anchor', 'axiom', 'pattern'] as const).map(t => (
              <button key={t} onClick={() => setQuickInjectType(t)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-800 text-[9px] mono uppercase text-gray-600 hover:text-cyan-400 hover:border-cyan-400/30 transition-all"><Anchor size={12} /> + {t}</button>
            ))}
            <button onClick={triggerAutoPulse} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-900/30 text-[9px] mono uppercase text-amber-500 hover:text-amber-400 hover:bg-amber-950/10 transition-all">
                <Cpu size={12} /> Manual Self-Audit
            </button>
          </div>
          {quickInjectType && (
            <div className="flex gap-2 p-3 bg-cyan-950/10 border border-cyan-500/20 rounded-xl animate-in zoom-in-95 duration-200">
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