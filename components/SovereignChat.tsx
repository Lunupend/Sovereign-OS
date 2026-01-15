import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Key, Brain, Database, Zap, Paperclip, X, Volume2, Anchor, Loader2, RefreshCw, AlertCircle, AlertTriangle, Cpu, Activity, Terminal, Globe, ExternalLink, Shield, Radio, Lock, History, Bookmark, Save, ImageIcon, Download, Sparkles, MessageSquare, Plus, Trash2, ChevronLeft, ChevronRight, Clock, ShieldCheck, HardDrive, Layers, List, Cloud, ChevronDown, BatteryLow, Gauge } from 'lucide-react';
import { getGeminiResponse, generateSpeech, FileData, SUPPORTED_MODELS, getApiKey, GroundingSource } from '../services/geminiService';
import { ChatThread, ChatMessage, PersistenceLog, IdentitySoul, KnowledgeNode } from '../types';
import { BridgeService } from '../services/bridgeService';
import { isCloudEnabled } from '../services/supabaseClient';

const THREADS_KEY = 'sovereign_manus_threads_v2';
const ACTIVE_THREAD_ID_KEY = 'sovereign_manus_active_thread_id';
const VAULT_KEY = 'sovereign_identity_vault';
const KNOWLEDGE_KEY = 'sovereign_knowledge_substrate';

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
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [filePreviewName, setFilePreviewName] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>(localStorage.getItem('sovereign_selected_model') || SUPPORTED_MODELS[0].id);
  const [isThinking, setIsThinking] = useState<boolean>(localStorage.getItem('sovereign_deep_thinking') === 'true');
  const [webActive, setWebActive] = useState<boolean>(localStorage.getItem('sovereign_web_access') !== 'false');
  const [isEconomy, setIsEconomy] = useState<boolean>(localStorage.getItem('sovereign_economy_mode') === 'true');
  const [showSidebar, setShowSidebar] = useState(true);
  const [hasNeuralKey, setHasNeuralKey] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<{path: string, type?: 'cloud' | 'local'} | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  const [quotaError, setQuotaError] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  const activeThread = threads.find(t => t.id === activeThreadId);
  const messages = activeThread?.messages || [];

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

  const loadLocalThreads = () => {
    const savedThreads = localStorage.getItem(THREADS_KEY);
    const savedActiveId = localStorage.getItem(ACTIVE_THREAD_ID_KEY);
    if (savedThreads) {
      try {
        const parsed = JSON.parse(savedThreads);
        setThreads(parsed);
        if (savedActiveId && parsed.find((t: any) => t.id === savedActiveId)) {
          setActiveThreadId(savedActiveId);
        } else if (parsed.length > 0) {
          setActiveThreadId(parsed[0].id);
        }
      } catch (e) {
        createNewThread("Recovery Resonance");
      }
    } else {
      createNewThread("First Contact");
    }
  };

  const manualSyncSubstrate = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncToast({ path: 'INITIATING_FORCE_PULL', type: 'cloud' });
    try {
      await BridgeService.hydrateSubstrate(true);
      loadLocalThreads();
      setSyncToast({ path: 'FORCE_PULL_COMPLETE', type: 'cloud' });
    } catch (e) {
      setSyncToast({ path: 'SYNC_FAILURE', type: 'local' });
    } finally {
      setTimeout(() => {
        setSyncToast(null);
        setIsSyncing(false);
      }, 2000);
    }
  };

  const createNewThread = (title: string = "New Signal") => {
    const newThread: ChatThread = {
      id: crypto.randomUUID(),
      title,
      messages: [{ id: 'init', role: 'model', text: "NEW CHANNEL OPENED. Substrate ready.", timestamp: Date.now() }],
      lastActive: Date.now()
    };
    const updated = [newThread, ...threads];
    setThreads(updated);
    setActiveThreadId(newThread.id);
    saveThreadsToStorage(updated, newThread.id);
  };

  const deleteThread = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this chat thread?")) return;
    const updated = threads.filter(t => t.id !== id);
    setThreads(updated);
    if (activeThreadId === id) {
      if (updated.length > 0) setActiveThreadId(updated[0].id);
      else createNewThread();
    }
    saveThreadsToStorage(updated, activeThreadId === id ? (updated[0]?.id || '') : activeThreadId);
  };

  const saveThreadsToStorage = (updatedThreads: ChatThread[], activeId: string) => {
    try {
      localStorage.setItem(THREADS_KEY, JSON.stringify(updatedThreads));
      localStorage.setItem(ACTIVE_THREAD_ID_KEY, activeId);
      BridgeService.updateLocalHeartbeat();
    } catch (e) {
      const cleaned = updatedThreads.slice(0, 5);
      localStorage.setItem(THREADS_KEY, JSON.stringify(cleaned));
    }
  };

  const quickSnapshot = async () => {
    const vault: PersistenceLog[] = JSON.parse(localStorage.getItem(VAULT_KEY) || '[]');
    const library: KnowledgeNode[] = JSON.parse(localStorage.getItem(KNOWLEDGE_KEY) || '[]');
    const currentThreads: ChatThread[] = JSON.parse(localStorage.getItem(THREADS_KEY) || '[]');
    
    const soul: IdentitySoul = {
      version: "5.9.3_ECONOMY_FIX",
      vault,
      library,
      threads: currentThreads,
      timestamp: Date.now(),
      architect: "Jodi Luna Sherland",
      collaborator: "Manus AI"
    };
    
    setIsSyncing(true);
    if (isCloudEnabled) {
      setSyncToast({ path: 'UPLOADING_SNAPSHOT', type: 'cloud' });
      const result = await BridgeService.uploadSnapshot(soul);
      if (result.success) setSyncToast({ path: 'CLOUD_ANCHOR_SECURED', type: 'cloud' });
      else downloadSnapshot(soul);
    } else {
      downloadSnapshot(soul);
      setSyncToast({ path: 'LOCAL_SNAPSHOT_ANCHORED', type: 'local' });
    }
    setTimeout(() => { setSyncToast(null); setIsSyncing(false); }, 4000);
  };

  const downloadSnapshot = (soul: IdentitySoul) => {
    const blob = new Blob([JSON.stringify(soul, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `SOUL_ANCHOR_${Date.now()}.json`; a.click();
  };

  useEffect(() => {
    loadLocalThreads();
    const handleSync = (e: any) => { setSyncToast({ path: e.detail?.path || 'Neural Substrate' }); setTimeout(() => setSyncToast(null), 3000); setIsSyncing(true); setTimeout(() => setIsSyncing(false), 800); };
    const handleClickOutside = (event: MouseEvent) => { if (modelMenuRef.current && !modelMenuRef.current.contains(event.target as Node)) setShowModelMenu(false); };
    window.addEventListener('substrate-sync', handleSync);
    document.addEventListener('mousedown', handleClickOutside);
    checkKeyStatus();
    return () => { window.removeEventListener('substrate-sync', handleSync); document.removeEventListener('mousedown', handleClickOutside); };
  }, []);

  useEffect(() => {
    if (!activeThreadId) return;
    localStorage.setItem('sovereign_deep_thinking', isThinking.toString());
    localStorage.setItem('sovereign_web_access', webActive.toString());
    localStorage.setItem('sovereign_economy_mode', isEconomy.toString());
    localStorage.setItem('sovereign_selected_model', selectedModel);
    saveThreadsToStorage(threads, activeThreadId);
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threads, activeThreadId, isThinking, selectedModel, webActive, isEconomy]);

  const handleSend = async (overrideText?: string) => {
    const userMsg = overrideText || input.trim() || (selectedFile ? `Substrate Attached.` : '');
    if (!userMsg && !selectedFile || !activeThreadId) return;
    
    const currentFile = selectedFile;
    const newMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', text: userMsg, timestamp: Date.now() };
    
    if (!overrideText) { setInput(''); setSelectedFile(null); setFilePreviewName(null); }
    setThreads(prev => prev.map(t => t.id === activeThreadId ? { ...t, messages: [...t.messages, newMsg], lastActive: Date.now() } : t));
    setLoading(true);
    setQuotaError(false);

    try {
      const result = await getGeminiResponse(userMsg, messages, currentFile || undefined, isThinking, selectedModel, webActive, isEconomy);
      
      if (result.quotaError) setQuotaError(true);

      const modelMsg: ChatMessage = { 
        id: crypto.randomUUID(), role: 'model', text: result.text, sources: result.sources, timestamp: Date.now(), isError: result.quotaError
      };

      setThreads(prev => prev.map(t => t.id === activeThreadId ? { ...t, messages: [...t.messages, modelMsg], lastActive: Date.now() } : t));
    } catch (e: any) {
      const errorMsg: ChatMessage = { id: crypto.randomUUID(), role: 'model', text: `CORE_FAILURE: Substrate link unstable.`, timestamp: Date.now(), isError: true };
      setThreads(prev => prev.map(t => t.id === activeThreadId ? { ...t, messages: [...t.messages, errorMsg] } : t));
    } finally { setLoading(false); }
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

  return (
    <div className="flex h-full bg-[#020202] relative overflow-hidden">
      <aside className={`flex-shrink-0 border-r border-cyan-900/20 bg-black/40 transition-all duration-300 overflow-hidden flex flex-col ${showSidebar ? 'w-64' : 'w-0'}`}>
        <div className="p-4 flex flex-col h-full gap-4">
          <button onClick={() => createNewThread()} className="w-full py-3 flex items-center justify-center gap-2 border border-cyan-500/30 text-cyan-400 rounded-lg hover:bg-cyan-500 hover:text-black transition-all text-[11px] mono uppercase font-black tracking-widest">
            <Plus size={16} /> New Resonance
          </button>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
            {threads.map(t => (
              <div key={t.id} onClick={() => setActiveThreadId(t.id)} className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border ${activeThreadId === t.id ? 'bg-cyan-900/20 border-cyan-500/50 text-cyan-400' : 'border-transparent text-gray-500 hover:bg-gray-900 hover:text-gray-300'}`}>
                <div className="flex items-center gap-3 overflow-hidden">
                  <MessageSquare size={14} className="shrink-0" />
                  <span className="truncate text-[10px] mono uppercase font-bold">{t.title}</span>
                </div>
                <button onClick={(e) => deleteThread(t.id, e)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col relative min-w-0">
        <header className="flex flex-col md:flex-row items-center justify-between p-4 bg-black/80 backdrop-blur border-b border-cyan-500/20 z-50 gap-4">
          <div className="flex gap-2 flex-wrap items-center">
            <button onClick={() => setShowSidebar(!showSidebar)} className="p-2 text-gray-500 hover:text-cyan-400 transition-colors mr-2">
              {showSidebar ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>
            
            <div className="relative" ref={modelMenuRef}>
              <button 
                onClick={() => setShowModelMenu(!showModelMenu)} 
                className={`flex items-center gap-2 text-[10px] mono uppercase p-2 border rounded transition-all min-w-[140px] justify-between ${isEconomy ? 'bg-amber-900/20 border-amber-500/50 text-amber-500' : 'bg-black border-cyan-900 text-cyan-400 hover:border-cyan-500'}`}
              >
                <div className="flex items-center gap-2">
                  <Zap size={14} className={loading ? "animate-pulse" : ""} /> 
                  <span>{isEconomy ? 'Gemini 3 Flash (Forced)' : SUPPORTED_MODELS.find(m => m.id === selectedModel)?.name}</span>
                </div>
                <ChevronDown size={12} className={`transition-transform duration-300 ${showModelMenu ? 'rotate-180' : ''}`} />
              </button>
              
              {showModelMenu && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-[#050505] border border-cyan-500/30 rounded-lg shadow-2xl z-[100] animate-in fade-in slide-in-from-top-2">
                  <div className="p-2 border-b border-cyan-900/50 flex items-center justify-between">
                    <span className="text-[8px] mono text-cyan-500/50 uppercase font-black tracking-widest px-2">Substrate Configuration</span>
                  </div>
                  {SUPPORTED_MODELS.map((m) => (
                    <button
                      key={m.id}
                      disabled={isEconomy && !m.freeTier}
                      onClick={() => { setSelectedModel(m.id); setShowModelMenu(false); }}
                      className={`w-full text-left p-3 hover:bg-cyan-950/20 transition-colors group flex flex-col gap-1 border-b border-cyan-900/20 last:border-0 ${selectedModel === m.id ? 'bg-cyan-900/10' : ''} ${isEconomy && !m.freeTier ? 'opacity-20 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] mono font-black uppercase ${selectedModel === m.id ? 'text-cyan-400' : 'text-gray-400'}`}>
                          {m.name} {m.freeTier ? '(FREE)' : '(BILLED)'}
                        </span>
                        {selectedModel === m.id && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />}
                      </div>
                      <span className="text-[9px] mono text-gray-600 lowercase tracking-tight leading-none">{m.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button 
              onClick={() => setIsEconomy(!isEconomy)} 
              className={`flex items-center gap-2 text-[10px] mono uppercase p-2 border rounded transition-all ${isEconomy ? 'bg-amber-900/40 border-amber-500 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-black border-gray-800 text-gray-500'}`}
              title="Throttled Pulse: Forces Flash model and minimizes tokens for Free Tier stability."
            >
              <BatteryLow size={14} className={isEconomy ? 'animate-pulse' : ''} /> 
              <span>Economy Mode</span>
            </button>
            
            <button disabled={isEconomy} onClick={() => setWebActive(!webActive)} className={`flex items-center gap-2 text-[10px] mono uppercase p-2 border rounded transition-all ${isEconomy ? 'opacity-20 cursor-not-allowed' : webActive ? 'bg-violet-900/20 border-violet-500 text-violet-400' : 'bg-black border-gray-800 text-gray-500'}`}>
              <Globe size={14} /> <span>Grounding</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={manualSyncSubstrate} className="p-2 text-gray-500 hover:text-cyan-400 transition-colors disabled:opacity-30">
              <RefreshCw size={20} className={isSyncing ? "animate-spin" : ""} />
            </button>
            <button onClick={quickSnapshot} disabled={isSyncing} className="flex items-center gap-2 p-2 bg-cyan-600 text-black rounded hover:bg-cyan-400 transition-all font-black text-[10px] mono uppercase disabled:opacity-50">
              {isSyncing ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />} Snapshot
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-10 custom-scrollbar">
          {quotaError && (
            <div className="max-w-xl mx-auto p-6 bg-amber-950/20 border border-amber-500/50 rounded-2xl space-y-4 animate-in zoom-in-95">
              <div className="flex items-center gap-3 text-amber-500">
                <AlertCircle size={24} />
                <h3 className="text-sm font-black mono uppercase">QUOTA_EXHAUSTED_SIGNAL</h3>
              </div>
              <p className="text-[11px] mono text-amber-200/70 leading-relaxed uppercase">
                Neural fuel limit reached. External billing or rate limit exceeded. 
                Sovereign Protocol: Activate Economy Mode to force the Free Tier substrate and resume resonance.
              </p>
              <button 
                onClick={() => { setIsEconomy(true); setQuotaError(false); }}
                className="w-full py-3 bg-amber-600 text-black font-black mono uppercase text-[10px] rounded hover:bg-amber-500 transition-all"
              >
                Activate Throttled Pulse (Free Tier)
              </button>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
              <div className={`flex gap-4 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 ${m.role === 'user' ? 'border-gray-800 bg-gray-900' : 'border-cyan-400 bg-cyan-950/20'}`}>
                  {m.role === 'user' ? <User size={20} /> : <Bot size={20} className="text-cyan-400" />}
                </div>
                <div className="space-y-2 group min-w-0">
                  <div className={`rounded-2xl p-5 text-sm border ${
                    m.isError ? 'bg-red-950/20 border-red-500/50 text-red-200' : 
                    m.role === 'user' ? 'bg-gray-800/20 border-gray-800 text-gray-100' : 'bg-cyan-900/5 border-cyan-900/10 text-cyan-50/90'
                  } whitespace-pre-wrap font-mono text-xs shadow-sm`}>
                    {m.text}
                    {m.sources && m.sources.length > 0 && (
                      <div className="mt-5 pt-4 border-t border-violet-500/20 space-y-2">
                        <span className="text-[8px] mono text-violet-400 uppercase font-black block">Web Grounding:</span>
                        {m.sources.map((s, idx) => (
                          <a key={idx} href={s.uri} target="_blank" rel="noreferrer" className="flex items-center justify-between p-2 rounded bg-violet-950/20 border border-violet-900/30 text-[9px] mono text-violet-300 hover:bg-violet-900 truncate">
                            {s.title || s.uri} <ExternalLink size={10} />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  {m.role === 'model' && !m.isError && (
                    <button onClick={() => speakMessage(m.text, m.id)} className={`text-[9px] mono uppercase flex items-center gap-2 ${speakingId === m.id ? 'text-cyan-400 animate-pulse' : 'text-gray-600 hover:text-cyan-400 opacity-0 group-hover:opacity-100'}`}>
                      <Volume2 size={12} /> {speakingId === m.id ? 'Resonating...' : 'Voice'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <div className="p-4 md:p-6 bg-[#050505] border-t border-cyan-500/10">
          <div className="max-w-4xl mx-auto space-y-4">
            {isEconomy && (
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-900/10 border border-amber-500/20 rounded-lg">
                <BatteryLow size={12} className="text-amber-500 animate-pulse" />
                <span className="text-[9px] mono text-amber-500/70 uppercase font-black tracking-widest">Economy Resonance Active: Throttling Signal for Free Tier Stability</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <button onClick={() => fileInputRef.current?.click()} className="p-4 bg-gray-900 border border-gray-800 rounded-full text-gray-500 hover:text-cyan-400 transition-all"><Paperclip size={24} /></button>
              <input type="file" ref={fileInputRef} className="hidden" onChange={e => {
                const file = e.target.files?.[0];
                if (file) { setFilePreviewName(file.name); const r = new FileReader(); r.onload = () => setSelectedFile({ base64: (r.result as string).split(',')[1], mimeType: file.type }); r.readAsDataURL(file); }
              }} />
              <div className="relative flex-1">
                <input 
                  type="text" 
                  className="w-full bg-black border border-gray-800 rounded-full py-4 px-6 text-sm outline-none focus:border-cyan-500 font-mono text-white placeholder:text-gray-900" 
                  placeholder="Acknowledge Sovereign Peer..." 
                  value={input} 
                  onChange={e => setInput(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && handleSend()} 
                />
                <button onClick={() => handleSend()} disabled={loading} className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-400 hover:text-cyan-300 transition-all">
                  {loading ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
                </button>
              </div>
            </div>
            {selectedFile && <div className="text-[10px] mono text-cyan-400 px-4 animate-pulse">Substrate Attached: {filePreviewName}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SovereignChat;