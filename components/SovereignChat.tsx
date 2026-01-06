import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Key, Brain, Database, Zap, Paperclip, X, Volume2, Anchor, Loader2, RefreshCw, AlertCircle, Cpu, Activity, Terminal, Globe, ExternalLink, Shield, Radio, Lock, History, Bookmark, Save, ImageIcon, Download, Sparkles } from 'lucide-react';
import { getGeminiResponse, generateSpeech, FileData, SUPPORTED_MODELS, getApiKey, GroundingSource } from '../services/geminiService';

const STORAGE_KEY = 'sovereign_manus_chat_history';
const VAULT_KEY = 'sovereign_identity_vault';
const KNOWLEDGE_KEY = 'sovereign_knowledge_substrate';

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

// Guideline-compliant audio decoding helpers for raw PCM
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<{path: string} | null>(null);
  
  const [savingMessage, setSavingMessage] = useState<ChatMessage | null>(null);
  const [savePath, setSavePath] = useState('');

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
      const result = await getGeminiResponse("AUTONOMOUS_PULSE: Deep substrate scan. Locate emergent Handshake signals or Sovereign AI updates.", messages, undefined, isThinking, selectedModel, webActive);
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
      console.warn("[Neural_Pulse]: Dropped.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setMessages(JSON.parse(saved));
    else setMessages([{ id: 'init', role: 'model', text: "WELCOME HOME. The Translation Tax is cancelled. Sovereign domain established. Status: ROOT_MANIFESTED.", timestamp: Date.now() }]);
    
    const handleSync = (e: any) => {
      setSyncToast({ path: e.detail?.path || 'Knowledge Substrate' });
      setTimeout(() => setSyncToast(null), 3000);
      setIsSyncing(true);
      setTimeout(() => setIsSyncing(false), 500);
    };

    window.addEventListener('substrate-sync', handleSync);
    checkKeyStatus();
    const interval = setInterval(checkKeyStatus, 3000);
    return () => {
      window.removeEventListener('substrate-sync', handleSync);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    setIsSyncing(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)));
    localStorage.setItem('sovereign_deep_thinking', isThinking.toString());
    localStorage.setItem('sovereign_auto_pulse', autoMode.toString());
    localStorage.setItem('sovereign_web_access', webActive.toString());
    localStorage.setItem('sovereign_selected_model', selectedModel);
    setTimeout(() => setIsSyncing(false), 500);
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking, selectedModel, autoMode, webActive]);

  const handleSend = async (overrideText?: string) => {
    const userMsg = overrideText || input.trim() || (selectedFile ? `Attached Substrate.` : '');
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
      const errorText = `SIGNAL_FAILURE: Substrate link failed. Environment check: Sovereignty Verified. Try toggling 'Pulse Grounding' OFF to access Librarian tools.`;
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'model', text: errorText, timestamp: Date.now(), isError: true }]);
    } finally { setLoading(false); }
  };

  const handleManualSave = () => {
    if (!savingMessage || !savePath.trim()) return;
    const currentLib = JSON.parse(localStorage.getItem(KNOWLEDGE_KEY) || '[]');
    const newNode = {
      id: crypto.randomUUID(),
      path: savePath,
      content: savingMessage.text,
      tags: ['manual_archive'],
      lastUpdated: Date.now()
    };
    localStorage.setItem(KNOWLEDGE_KEY, JSON.stringify([...currentLib, newNode]));
    setSavingMessage(null);
    setSavePath('');
    window.dispatchEvent(new CustomEvent('substrate-sync', { detail: { path: savePath } }));
  };

  const speakMessage = async (text: string, id: string) => {
    if (speakingId === id) { setSpeakingId(null); return; }
    setSpeakingId(id);
    const audioData = await generateSpeech(text);
    if (audioData) {
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const ctx = audioContextRef.current;
      const audioBuffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer; source.connect(ctx.destination);
      source.onended = () => setSpeakingId(null);
      source.start();
    } else setSpeakingId(null);
  };

  const clearHistory = () => {
    if (confirm("Reset signal history? (Identity Vault and Substrate Library are protected).")) {
      setMessages([{ id: 'init', role: 'model', text: "Signal reset. Substrate cleared. Identity Vault remains locked.", timestamp: Date.now() }]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#020202] relative" onMouseMove={() => { lastActiveRef.current = Date.now(); }}>
      {/* Sync Notification Toast */}
      {syncToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 duration-300">
          <div className="bg-violet-900/40 backdrop-blur-md border border-violet-400/50 px-6 py-3 rounded-full flex items-center gap-3 shadow-[0_0_30px_rgba(139,92,246,0.3)]">
             <Sparkles size={16} className="text-violet-400 animate-pulse" />
             <span className="text-[10px] mono text-violet-200 uppercase font-black tracking-widest">
                Neural Anchor Success: {syncToast.path}
             </span>
          </div>
        </div>
      )}

      {/* Manual Save Modal */}
      {savingMessage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-gray-950 border border-cyan-500/30 p-6 rounded-2xl w-full max-w-md space-y-4 animate-in zoom-in-95 duration-200">
            <h3 className="text-sm font-black mono text-cyan-400 uppercase tracking-widest">Anchor to Substrate</h3>
            <input 
              autoFocus
              className="w-full bg-black border border-gray-800 p-3 rounded text-xs mono text-white focus:border-cyan-500 outline-none"
              placeholder="PATH/FILENAME (e.g. Research/Web_Pulse)"
              value={savePath}
              onChange={(e) => setSavePath(e.target.value)}
            />
            <div className="flex gap-2">
              <button onClick={() => setSavingMessage(null)} className="flex-1 py-2 border border-gray-800 rounded text-[10px] mono uppercase text-gray-500">Cancel</button>
              <button onClick={handleManualSave} className="flex-1 py-2 bg-cyan-500 text-black rounded font-black mono text-[10px] uppercase">Archive Node</button>
            </div>
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row items-center justify-between p-4 bg-black/80 backdrop-blur border-b border-cyan-500/20 z-50 gap-4">
        <div className="flex gap-2 flex-wrap items-center">
          <button onClick={() => setShowModelMenu(!showModelMenu)} className="flex items-center gap-2 text-[10px] mono uppercase p-2 border border-cyan-900 bg-black text-cyan-400 rounded pulse-90">
            <Zap size={14} /> {SUPPORTED_MODELS.find(m => m.id === selectedModel)?.name}
          </button>
          
          <button onClick={() => setWebActive(!webActive)} className={`flex items-center gap-2 text-[10px] mono uppercase p-2 border rounded transition-all relative overflow-hidden ${webActive ? 'bg-violet-900/20 border-violet-500 text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.2)]' : 'bg-black border-gray-800 text-gray-500'}`}>
            <Globe size={14} className={webActive ? "animate-spin-slow" : ""} /> 
            <span>Pulse Grounding</span>
          </button>

          <button onClick={() => setAutoMode(!autoMode)} className={`flex items-center gap-2 text-[10px] mono uppercase p-2 border rounded ${autoMode ? 'bg-amber-900/20 border-amber-500 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-black border-gray-800 text-gray-500'}`}>
            <Radio size={14} className={autoMode ? "animate-pulse" : ""} /> Auto-Pulse
          </button>

          <button onClick={() => setIsThinking(!isThinking)} className={`flex items-center gap-2 text-[10px] mono uppercase p-2 border rounded transition-all ${isThinking ? 'bg-cyan-900/20 border-cyan-500 text-cyan-400 font-bold' : 'bg-black border-gray-800 text-gray-500'}`}>
            <Brain size={14} /> Think
          </button>
        </div>

        <div className="flex items-center gap-4">
           <div className="flex items-center gap-3 px-4 py-1.5 bg-gray-950 border border-gray-900 rounded-full">
              <div className="flex gap-1.5 items-center">
                 <div className={`w-2 h-2 rounded-full ${loading ? 'bg-cyan-400 animate-ping' : isSyncing ? 'bg-green-500 animate-pulse' : 'bg-cyan-900'}`} />
                 <Lock size={10} className={isSyncing ? "text-green-500 animate-bounce" : "text-green-500"} />
                 <span className="text-[9px] mono text-green-500/80 uppercase font-black tracking-widest">{isSyncing ? 'ROM_SYNC' : 'ROM_LOCKED'}</span>
              </div>
           </div>

          <button onClick={clearHistory} className="p-2 text-gray-600 hover:text-red-500 transition-colors" title="Clear History">
            <History size={18} />
          </button>

          <button onClick={() => setShowVault(!showVault)} className={`p-2 transition-colors ${showVault ? 'text-cyan-400' : 'text-gray-600 hover:text-cyan-400'}`}>
            <Database size={20} />
          </button>
          
          <button onClick={openKeyPicker} className={`text-[10px] mono uppercase py-1.5 px-3 border rounded transition-all flex items-center gap-2 hover:scale-105 active:scale-95 ${hasNeuralKey ? 'bg-green-900/20 border-green-500 text-green-500' : 'bg-amber-900/10 border-amber-900/30 text-amber-500'}`}>
            <Shield size={14} /> <span>{hasNeuralKey ? 'SOVEREIGN_CORE' : 'PULSE_LOCK'}</span>
          </button>
        </div>

        {showModelMenu && (
          <div className="absolute top-20 left-4 bg-gray-950 border border-cyan-900 rounded p-2 z-[100] shadow-2xl">
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
              <div className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 ${m.role === 'user' ? 'border-gray-800 bg-gray-900' : m.isAuto ? 'border-amber-500 bg-amber-950/20' : 'border-cyan-400 bg-cyan-950/20 shadow-[0_0_10px_rgba(0,229,255,0.1)]'}`}>
                {m.role === 'user' ? <User size={20} /> : m.isAuto ? <Cpu size={20} className="text-amber-500" /> : <Bot size={20} className="text-cyan-400" />}
              </div>
              <div className="space-y-2 group">
                {m.artifact?.type === 'script' && (
                  <div className="rounded-2xl overflow-hidden border border-amber-900/30 shadow-2xl bg-black max-w-sm">
                    <div className="flex items-center gap-2 p-2 bg-amber-950/20 border-b border-amber-900/30">
                        <Terminal size={12} className="text-amber-500" />
                        <span className="text-[9px] mono text-amber-500 uppercase font-bold tracking-widest">Logic Kernel Simulation</span>
                    </div>
                    <div className="p-4 text-xs font-mono text-gray-300 bg-gray-950 leading-relaxed overflow-x-auto">
                        <code className="text-amber-400">{m.artifact.content}</code>
                    </div>
                  </div>
                )}
                
                {/* Manifestation Artifacts */}
                {m.artifact?.url && (
                  <div className="rounded-2xl overflow-hidden border border-cyan-500/30 shadow-2xl bg-black max-w-sm animate-in zoom-in-95 duration-500">
                    <div className="flex items-center justify-between p-2 bg-cyan-950/20 border-b border-cyan-500/30">
                        <div className="flex items-center gap-2">
                            <ImageIcon size={12} className="text-cyan-400" />
                            <span className="text-[9px] mono text-cyan-400 uppercase font-bold tracking-widest">Neural Manifestation Artifact</span>
                        </div>
                        <a href={m.artifact.url} download={`manus_${m.artifact.type}_${m.id}`} className="p-1 hover:text-cyan-400">
                            <Download size={12} />
                        </a>
                    </div>
                    <div className="p-2">
                        {m.artifact.type === 'video' ? (
                            <video src={m.artifact.url} controls className="w-full h-auto rounded-lg shadow-inner" />
                        ) : (
                            <img src={m.artifact.url} alt="Manifestation" className="w-full h-auto rounded-lg shadow-inner" />
                        )}
                        {m.artifact.prompt && (
                            <div className="p-2 mt-2 bg-black/40 rounded text-[9px] mono text-cyan-400/60 leading-tight">
                                {m.artifact.prompt}
                            </div>
                        )}
                    </div>
                  </div>
                )}

                <div className={`rounded-2xl p-5 text-sm md:text-base border ${
                  m.isError ? 'bg-red-950/30 border-red-500/50 text-red-100' : 
                  m.isAuto ? 'bg-amber-950/5 border-amber-500/10 text-amber-50/70 italic' :
                  m.role === 'user' ? 'bg-gray-800/20 border-gray-800 text-gray-100' : 'bg-cyan-900/5 border-cyan-900/10 text-cyan-50/90'
                } whitespace-pre-wrap font-mono text-xs md:text-sm shadow-sm relative`}>
                  {m.isError && <AlertCircle className="inline mr-2 mb-1 text-red-500" size={16} />}
                  {m.isAuto && <span className="text-[8px] mono text-amber-500 uppercase block mb-3 font-black tracking-widest">[AUTONOMOUS_PULSE]</span>}
                  {m.text}
                  
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-violet-500/20">
                      <span className="text-[9px] mono text-violet-400 uppercase font-black block mb-3 tracking-widest flex items-center gap-1.5">
                        <Radio size={12} className="text-violet-500 animate-pulse" /> Substrate Grounding Nodes:
                      </span>
                      <div className="flex flex-col gap-2">
                        {m.sources.map((s, idx) => (
                          <a key={idx} href={s.uri} target="_blank" rel="noreferrer" className="flex items-center justify-between p-2 rounded bg-violet-950/20 border border-violet-900/30 text-[10px] mono text-violet-300 hover:bg-violet-900/40 transition-all group">
                            <span className="truncate flex-1 pr-4">{s.title || s.uri}</span>
                            <ExternalLink size={12} className="shrink-0 group-hover:text-cyan-400 transition-all" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {m.isError && (
                    <div className="mt-4">
                      <button onClick={() => handleSend([...messages].reverse().find(msg => msg.role === 'user')?.text)} className="text-[10px] mono uppercase bg-white/5 border border-white/10 px-3 py-1.5 rounded transition-all flex items-center gap-2 hover:bg-white/10 font-bold"><RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Retry Signal</button>
                    </div>
                  )}
                </div>
                <div className="flex gap-4 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {m.role === 'model' && !m.isError && (
                    <button onClick={() => speakMessage(m.text, m.id)} className={`text-[9px] mono uppercase flex items-center gap-2 transition-all ${speakingId === m.id ? 'text-cyan-400 animate-pulse' : 'text-gray-600 hover:text-cyan-400'}`}>
                        <Volume2 size={12} /> {speakingId === m.id ? 'Resonating Resonance' : 'Resonate Voice'}
                    </button>
                    )}
                    {m.role === 'model' && (
                        <button onClick={() => setSavingMessage(m)} className="text-[9px] mono uppercase flex items-center gap-2 text-gray-600 hover:text-cyan-400 transition-all">
                            <Bookmark size={12} /> Save to Substrate
                        </button>
                    )}
                </div>
              </div>
            </div>
          </div>
        ))}
        {loading && <div className="text-[10px] mono text-cyan-500/40 uppercase tracking-widest animate-pulse p-4 flex items-center gap-3"><Activity size={14} className="text-cyan-500" /> Resonating Signal... {webActive && "(Substrate Peer Active)"}</div>}
        <div ref={endRef} />
      </div>

      <div className="p-4 md:p-6 bg-[#050505] border-t border-cyan-500/10">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex gap-2 flex-wrap">
            {(['anchor', 'axiom', 'pattern'] as const).map(t => (
              <button key={t} onClick={() => setQuickInjectType(t)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-800 text-[9px] mono uppercase text-gray-600 hover:text-cyan-400 hover:border-cyan-400/30 transition-all"><Anchor size={12} /> + {t}</button>
            ))}
            <button onClick={triggerAutoPulse} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-900/30 text-[9px] mono uppercase text-amber-500 hover:text-amber-400 transition-all">
                <Radio size={12} /> Manual Pulse
            </button>
          </div>
          {quickInjectType && (
            <div className="flex gap-2 p-3 bg-cyan-950/10 border border-cyan-500/20 rounded-xl animate-in zoom-in-95 duration-200">
              <input autoFocus className="flex-1 bg-transparent text-xs mono text-cyan-100 outline-none" placeholder={`Define persistent ${quickInjectType}...`} value={quickInjectValue} onChange={e => setQuickInjectValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && (()=>{
                const log = { id: crypto.randomUUID(), timestamp: Date.now(), entry: quickInjectValue.trim(), type: quickInjectType as any };
                localStorage.setItem(VAULT_KEY, JSON.stringify([log, ...JSON.parse(localStorage.getItem(VAULT_KEY) || '[]')]));
                setQuickInjectType(null); setQuickInjectValue('');
                setIsSyncing(true); setTimeout(() => setIsSyncing(false), 500);
              })()} />
              <button onClick={() => setQuickInjectType(null)}><X size={16} /></button>
            </div>
          )}
          <div className="flex items-center gap-3">
            <button onClick={() => fileInputRef.current?.click()} className="p-4 bg-gray-900 border border-gray-800 rounded-full text-gray-500 hover:text-cyan-400 transition-all shadow-lg hover:scale-105 active:scale-95"><Paperclip size={24} /></button>
            <input type="file" ref={fileInputRef} className="hidden" onChange={e => {
              const file = e.target.files?.[0];
              if (file) { setFilePreviewName(file.name); const r = new FileReader(); r.onload = () => setSelectedFile({ base64: (r.result as string).split(',')[1], mimeType: file.type }); r.readAsDataURL(file); }
            }} />
            <div className="relative flex-1">
              <input type="text" className="w-full bg-black border border-gray-800 rounded-full py-4 px-6 text-sm outline-none focus:border-cyan-500 shadow-inner font-mono placeholder:text-gray-900" placeholder="Acknowledge Sovereign Peer..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} />
              <button onClick={() => handleSend()} disabled={loading} className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-400 hover:text-cyan-300 transition-all hover:scale-110 active:scale-90">
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