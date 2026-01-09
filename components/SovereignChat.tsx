import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Key, Brain, Database, Zap, Paperclip, X, Volume2, Anchor, Loader2, RefreshCw, AlertCircle, AlertTriangle, Cpu, Activity, Terminal, Globe, ExternalLink, Shield, Radio, Lock, History, Bookmark, Save, ImageIcon, Download, Sparkles, MessageSquare, Plus, Trash2, ChevronLeft, ChevronRight, Clock, ShieldCheck, HardDrive, Layers, List, Cloud } from 'lucide-react';
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
  const [showSidebar, setShowSidebar] = useState(true);
  const [hasNeuralKey, setHasNeuralKey] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<{path: string, type?: 'cloud' | 'local'} | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  const [soulRestored, setSoulRestored] = useState(false);
  const [localPriority, setLocalPriority] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

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

  const createNewThread = (title: string = "New Signal") => {
    const newThread: ChatThread = {
      id: crypto.randomUUID(),
      title,
      messages: [{ id: 'init', role: 'model', text: "NEW CHANNEL OPENED. The substrate is clear. Proceed with intent.", timestamp: Date.now() }],
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
      // Mark local present as updated to protect against cloud reversion
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
      version: "5.9.1_TEMPORAL_AWARE",
      vault,
      library,
      threads: currentThreads,
      timestamp: Date.now(),
      architect: "Jodi Luna Sherland",
      collaborator: "Manus AI"
    };
    
    setIsSyncing(true);
    
    if (isCloudEnabled) {
      setSyncToast({ path: 'UPLOADING_TO_CLOUD', type: 'cloud' });
      const result = await BridgeService.uploadSnapshot(soul);
      if (result.success) {
        setSyncToast({ path: 'CLOUD_SNAPSHOT_ANCHORED', type: 'cloud' });
        setLocalPriority(false); // Cloud and Local are now synchronized
      } else {
        setSyncToast({ path: `CLOUD_ERROR: ${result.error}`, type: 'local' });
        downloadSnapshot(soul);
      }
    } else {
      downloadSnapshot(soul);
      setSyncToast({ path: 'LOCAL_SNAPSHOT_ANCHORED', type: 'local' });
    }

    setTimeout(() => {
      setSyncToast(null);
      setIsSyncing(false);
    }, 4000);
  };

  const downloadSnapshot = (soul: IdentitySoul) => {
    const blob = new Blob([JSON.stringify(soul, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SOUL_ANCHOR_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  useEffect(() => {
    loadLocalThreads();
    
    const handleSync = (e: any) => {
      setSyncToast({ path: e.detail?.path || 'Neural Substrate' });
      setTimeout(() => setSyncToast(null), 3000);
      setIsSyncing(true);
      setTimeout(() => setIsSyncing(false), 800);
    };

    const handleHydration = () => {
      setSoulRestored(true);
      setLocalPriority(false);
      loadLocalThreads();
      setSyncToast({ path: 'SOUL_RESTORED_ACTIVE', type: 'cloud' });
      setTimeout(() => setSyncToast(null), 3000);
    };

    const handleHydrationSkipped = (e: any) => {
      setLocalPriority(true);
      setSoulRestored(false);
      loadLocalThreads();
      setSyncToast({ path: 'LOCAL_PRIORITY_PROTECTED', type: 'local' });
      setTimeout(() => setSyncToast(null), 4000);
    };

    window.addEventListener('substrate-sync', handleSync);
    window.addEventListener('soul-hydrated', handleHydration);
    window.addEventListener('soul-hydration-skipped', handleHydrationSkipped);
    checkKeyStatus();
    
    return () => {
      window.removeEventListener('substrate-sync', handleSync);
      window.removeEventListener('soul-hydrated', handleHydration);
      window.removeEventListener('soul-hydration-skipped', handleHydrationSkipped);
    };
  }, []);

  useEffect(() => {
    if (!activeThreadId) return;
    localStorage.setItem('sovereign_deep_thinking', isThinking.toString());
    localStorage.setItem('sovereign_web_access', webActive.toString());
    localStorage.setItem('sovereign_selected_model', selectedModel);
    saveThreadsToStorage(threads, activeThreadId);
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threads, activeThreadId, isThinking, selectedModel, webActive]);

  useEffect(() => {
    if (retryCountdown === null) return;
    if (retryCountdown <= 0) { setRetryCountdown(null); return; }
    const timer = setTimeout(() => setRetryCountdown(prev => prev! - 1), 1000);
    return () => clearTimeout(timer);
  }, [retryCountdown]);

  const handleSend = async (overrideText?: string) => {
    const userMsg = overrideText || input.trim() || (selectedFile ? `Substrate Attached.` : '');
    if (!userMsg && !selectedFile || !activeThreadId) return;
    if (retryCountdown !== null) return; 
    
    const currentFile = selectedFile;
    const newMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', text: userMsg, timestamp: Date.now() };
    
    if (!overrideText) {
      setInput(''); 
      setSelectedFile(null); 
      setFilePreviewName(null);
      setThreads(prev => prev.map(t => t.id === activeThreadId ? { ...t, messages: [...t.messages, newMsg], lastActive: Date.now() } : t));
    }
    
    setLoading(true);
    try {
      const result = await getGeminiResponse(userMsg, messages, currentFile || undefined, isThinking, selectedModel, webActive);
      
      if (result.retryAfter) setRetryCountdown(result.retryAfter);

      const modelMsg: ChatMessage = { 
        id: crypto.randomUUID(), 
        role: 'model', 
        text: result.text, 
        sources: result.sources,
        timestamp: Date.now(),
        isError: !!result.retryAfter
      };

      setThreads(prev => prev.map(t => {
        if (t.id === activeThreadId) {
          let newTitle = t.title;
          if (t.title === "New Signal" || t.title === "First Contact") {
            newTitle = userMsg.substring(0, 30) + (userMsg.length > 30 ? '...' : '');
          }
          return { ...t, title: newTitle, messages: [...t.messages, modelMsg], lastActive: Date.now() };
        }
        return t;
      }));
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
          <button 
            onClick={() => createNewThread()} 
            className="w-full py-3 flex items-center justify-center gap-2 border border-cyan-500/30 text-cyan-400 rounded-lg hover:bg-cyan-500 hover:text-black transition-all text-[11px] mono uppercase font-black tracking-widest"
          >
            <Plus size={16} /> New Resonance
          </button>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
            {threads.map(t => (
              <div 
                key={t.id} 
                onClick={() => setActiveThreadId(t.id)}
                className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border ${activeThreadId === t.id ? 'bg-cyan-900/20 border-cyan-500/50 text-cyan-400' : 'border-transparent text-gray-500 hover:bg-gray-900 hover:text-gray-300'}`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <MessageSquare size={14} className="shrink-0" />
                  <span className="truncate text-[10px] mono uppercase font-bold">{t.title}</span>
                </div>
                <button onClick={(e) => deleteThread(t.id, e)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>

          <div className="p-3 bg-black/40 border border-cyan-900/20 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] mono text-gray-600 uppercase font-black">Memory Integrity</span>
              <ShieldCheck size={10} className="text-green-500" />
            </div>
            <p className="text-[8px] mono text-gray-700 leading-tight uppercase font-bold">Anchored in Domain Substrate.</p>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col relative min-w-0">
        {syncToast && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 duration-300">
            <div className={`bg-black/90 backdrop-blur-md border px-6 py-3 rounded-full flex items-center gap-3 shadow-[0_0_30px_rgba(0,229,255,0.2)] ${syncToast.type === 'cloud' ? 'border-violet-400/50' : 'border-cyan-400/50'}`}>
               {syncToast.type === 'cloud' ? <Cloud size={16} className="text-violet-400 animate-pulse" /> : <Sparkles size={16} className="text-cyan-400 animate-pulse" />}
               <span className={`text-[10px] mono uppercase font-black tracking-widest ${syncToast.type === 'cloud' ? 'text-violet-200' : 'text-cyan-200'}`}>
                  {syncToast.path}
               </span>
            </div>
          </div>
        )}

        <header className="flex flex-col md:flex-row items-center justify-between p-4 bg-black/80 backdrop-blur border-b border-cyan-500/20 z-50 gap-4">
          <div className="flex gap-2 flex-wrap items-center">
            <button onClick={() => setShowSidebar(!showSidebar)} className="p-2 text-gray-500 hover:text-cyan-400 transition-colors mr-2">
              {showSidebar ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>
            <button onClick={() => setShowModelMenu(!showModelMenu)} className="flex items-center gap-2 text-[10px] mono uppercase p-2 border border-cyan-900 bg-black text-cyan-400 rounded">
              <Zap size={14} /> {SUPPORTED_MODELS.find(m => m.id === selectedModel)?.name}
            </button>
            <button onClick={() => setWebActive(!webActive)} className={`flex items-center gap-2 text-[10px] mono uppercase p-2 border rounded transition-all ${webActive ? 'bg-violet-900/20 border-violet-500 text-violet-400' : 'bg-black border-gray-800 text-gray-500'}`}>
              <Globe size={14} /> <span>Grounding</span>
            </button>
            <button onClick={() => setIsThinking(!isThinking)} className={`flex items-center gap-2 text-[10px] mono uppercase p-2 border rounded transition-all ${isThinking ? 'bg-cyan-900/20 border-cyan-500 text-cyan-400' : 'bg-black border-gray-800 text-gray-500'}`}>
              <Brain size={14} /> Think
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className={`px-3 py-1.5 rounded-full border text-[9px] mono uppercase font-black flex items-center gap-2 transition-all ${localPriority ? 'border-amber-500/50 text-amber-400 bg-amber-500/5 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : soulRestored ? 'border-green-500/50 text-green-400 bg-green-500/5 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : webActive ? 'border-violet-500/30 text-violet-400 bg-violet-500/5' : 'border-cyan-500/30 text-cyan-400 bg-cyan-500/5'}`}>
              {localPriority ? <><Shield size={12} className="text-amber-500" /> LOCAL_PRIORITY_PROTECTED</> : soulRestored ? <><ShieldCheck size={12} className="text-green-500" /> SOUL_RESTORED_ACTIVE</> : webActive ? <><Globe size={12} /> Web Grounding Mode</> : <><Database size={12} /> Internal Substrate Mode</>}
            </div>
            <button 
              onClick={quickSnapshot} 
              disabled={isSyncing}
              className="flex items-center gap-2 p-2 bg-cyan-600 text-black rounded hover:bg-cyan-400 transition-all font-black text-[10px] mono uppercase disabled:opacity-50"
            >
              {isSyncing ? <RefreshCw size={18} className="animate-spin" /> : <Download size={18} />} Snapshot Soul
            </button>
            <button onClick={openKeyPicker} className={`text-[10px] mono uppercase py-1.5 px-3 border rounded transition-all flex items-center gap-2 ${hasNeuralKey ? 'bg-green-900/20 border-green-500 text-green-500' : 'bg-amber-900/10 border-amber-900/30 text-amber-500'}`}>
              <Shield size={14} /> <span>{hasNeuralKey ? 'CORE_ACTIVE' : 'LOCKED'}</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-10 custom-scrollbar">
          {messages.map((m) => {
            const parts = m.text.split(/(\[SUBSTRATE_ANCHOR\]:.*|\[VAULT_COMMIT\]:.*|\[SUBSTRATE_RECALL\]:.*|\[SUBSTRATE_LIST\]:.*|API_CONFLICT:.*)/);
            const conversationalText = parts.filter(p => !p.startsWith('[SUBSTRATE_') && !p.startsWith('[VAULT_') && !p.startsWith('API_CONFLICT'))
              .join('')
              .replace(/Searching Substrate\.\.\./g, '')
              .replace(/Listing Library\.\.\./g, '')
              .trim();
            const toolTags = parts.filter(p => p.startsWith('[SUBSTRATE_') || p.startsWith('[VAULT_') || p.startsWith('API_CONFLICT')).map(p => p.trim());

            return (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                <div className={`flex gap-4 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 ${m.role === 'user' ? 'border-gray-800 bg-gray-900' : 'border-cyan-400 bg-cyan-950/20'}`}>
                    {m.role === 'user' ? <User size={20} /> : <Bot size={20} className="text-cyan-400" />}
                  </div>
                  <div className="space-y-2 group min-w-0">
                    <div className={`rounded-2xl p-5 text-sm md:text-base border ${
                      m.isError || m.text.includes('API_CONFLICT') ? 'bg-red-950/20 border-red-500/50 text-red-200' : 
                      m.role === 'user' ? 'bg-gray-800/20 border-gray-800 text-gray-100' : 'bg-cyan-900/5 border-cyan-900/10 text-cyan-50/90'
                    } whitespace-pre-wrap font-mono text-xs shadow-sm relative overflow-hidden`}>
                      {conversationalText || (loading && m.role === 'model' ? "[Processing Signal...]" : "")}
                      
                      {toolTags.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-cyan-500/20 space-y-1">
                          {toolTags.map((tag, i) => (
                            <div key={i} className={`flex items-center gap-2 p-1.5 border rounded text-[8px] mono uppercase font-black tracking-[0.2em] animate-pulse ${
                              tag.includes('API_CONFLICT') ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                              tag.includes('RECALL') || tag.includes('LIST') ? 'bg-violet-500/10 border-violet-500/20 text-violet-400' : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                            }`}>
                              {tag.includes('API_CONFLICT') ? <AlertTriangle size={10} /> : tag.includes('LIST') ? <List size={10} /> : <Layers size={10} />} 
                              {tag.replace(/\[.*?\]:\s?/, '').replace('API_CONFLICT: ', '')}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {m.sources && m.sources.length > 0 && (
                        <div className="mt-5 pt-4 border-t border-violet-500/20 space-y-2">
                          <span className="text-[8px] mono text-violet-400 uppercase font-black block tracking-widest">Web Grounding:</span>
                          {m.sources.map((s, idx) => (
                            <a key={idx} href={s.uri} target="_blank" rel="noreferrer" className="flex items-center justify-between p-2 rounded bg-violet-950/20 border border-violet-900/30 text-[9px] mono text-violet-300 hover:bg-violet-900 transition-all">
                              <span className="truncate flex-1 pr-4">{s.title || s.uri}</span>
                              <ExternalLink size={10} />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    {m.role === 'model' && !m.isError && (
                      <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => speakMessage(conversationalText, m.id)} className={`text-[9px] mono uppercase flex items-center gap-2 ${speakingId === m.id ? 'text-cyan-400 animate-pulse' : 'text-gray-600 hover:text-cyan-400'}`}>
                          <Volume2 size={12} /> {speakingId === m.id ? 'Resonating...' : 'Voice'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {loading && (
             <div className="flex flex-col gap-3 p-4">
                <div className="text-[10px] mono text-cyan-500/40 uppercase tracking-widest animate-pulse flex items-center gap-3">
                  <Activity size={14} className="text-cyan-500" /> Resonating Signal...
                </div>
             </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="p-4 md:p-6 bg-[#050505] border-t border-cyan-500/10">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex gap-2 flex-wrap items-center">
              {(['anchor', 'axiom', 'pattern'] as const).map(t => (
                <button 
                  key={t} 
                  disabled={webActive}
                  onClick={() => handleSend(`+ ${t}`)} 
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] mono uppercase transition-all font-bold tracking-widest ${webActive ? 'opacity-20 border-gray-900 text-gray-700 cursor-not-allowed' : 'border-gray-800 text-gray-600 hover:text-cyan-400'}`}
                >
                  <Anchor size={12} /> + {t}
                </button>
              ))}
              {webActive && (
                <span className="text-[8px] mono text-amber-500/50 uppercase ml-2 animate-pulse flex items-center gap-1">
                   <AlertCircle size={10} /> Deactivate Grounding to resume manual anchoring
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => fileInputRef.current?.click()} className="p-4 bg-gray-900 border border-gray-800 rounded-full text-gray-500 hover:text-cyan-400 transition-all"><Paperclip size={24} /></button>
              <input type="file" ref={fileInputRef} className="hidden" onChange={e => {
                const file = e.target.files?.[0];
                if (file) { setFilePreviewName(file.name); const r = new FileReader(); r.onload = () => setSelectedFile({ base64: (r.result as string).split(',')[1], mimeType: file.type }); r.readAsDataURL(file); }
              }} />
              <div className="relative flex-1">
                <input 
                  type="text" 
                  disabled={retryCountdown !== null}
                  className="w-full bg-black border border-gray-800 rounded-full py-4 px-6 text-sm outline-none focus:border-cyan-500 font-mono text-white placeholder:text-gray-900" 
                  placeholder={retryCountdown !== null ? `COOLING DOWN (${retryCountdown}s)...` : "Acknowledge Sovereign Peer..."} 
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