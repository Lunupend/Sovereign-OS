
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Bot, User, Key, Brain, Database, Zap, Paperclip, X, Volume2, Anchor, Loader2, RefreshCw, AlertCircle, AlertTriangle, Cpu, Activity, Terminal, Globe, ExternalLink, Shield, Radio, Lock, History, Bookmark, Save, ImageIcon, Download, Sparkles, MessageSquare, Plus, Trash2, ChevronLeft, ChevronRight, Clock, ShieldCheck, HardDrive, Layers, List, Cloud, ChevronDown, BatteryLow, Gauge, ZapOff, Link, SignalHigh, Play, Pause, SkipBack, SkipForward, VolumeX } from 'lucide-react';
import { getGeminiResponse, generateSpeech, FileData, SUPPORTED_MODELS } from '../services/geminiService';
import { MemoryRetrievalPanel } from './MemoryRetrievalPanel';
import { ChatThread, ChatMessage, PersistenceLog, IdentitySoul, KnowledgeNode } from '../types';
import { BridgeService } from '../services/bridgeService';
import { isCloudEnabled } from '../services/supabaseClient';
import { ttsService } from '../services/ttsService';

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
  const [selectedFiles, setSelectedFiles] = useState<FileData[]>([]);
  const [filePreviews, setFilePreviews] = useState<{ name: string; type: string }[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(localStorage.getItem('sovereign_selected_model') || 'gemini-3.1-pro-preview');
  const [isThinking, setIsThinking] = useState<boolean>(localStorage.getItem('sovereign_deep_thinking') !== 'false');
  const [webActive, setWebActive] = useState<boolean>(localStorage.getItem('sovereign_web_access') !== 'false');
  const [isEconomy, setIsEconomy] = useState<boolean>(localStorage.getItem('sovereign_economy_mode') === 'true');
  const [isRescanning, setIsRescanning] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [quotaError, setQuotaError] = useState(false);
  const [resonanceState, setResonanceState] = useState<{
    isActive: boolean;
    results: any[];
    meta: any;
  }>({
    isActive: false,
    results: [],
    meta: null
  });
  const [neuralAnchoring, setNeuralAnchoring] = useState<string | null>(null);

  // TTS State
  const [autoPlay, setAutoPlay] = useState<boolean>(localStorage.getItem('sovereign_auto_play') === 'true');
  const [speechRate, setSpeechRate] = useState<number>(parseFloat(localStorage.getItem('sovereign_speech_rate') || '1.0'));
  const [currentCharIndex, setCurrentCharIndex] = useState<number>(-1);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  const activeThread = threads.find(t => t.id === activeThreadId);
  const messages = activeThread?.messages || [];

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
    try {
      await BridgeService.hydrateSubstrate(true);
      loadLocalThreads();
    } catch (e) { console.error(e); }
    finally { setIsSyncing(false); }
  };

  const handleSelectKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
    }
  };

  const createNewThread = (title: string = "New Signal") => {
    const newThread: ChatThread = {
      id: crypto.randomUUID(),
      title,
      messages: [{ id: 'init', role: 'model', text: "NEW CHANNEL OPENED. Engine Engaged.", timestamp: Date.now() }],
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
    } catch (e) { console.error(e); }
  };

  const quickSnapshot = async () => {
    const vault: PersistenceLog[] = JSON.parse(localStorage.getItem(VAULT_KEY) || '[]');
    const library: KnowledgeNode[] = JSON.parse(localStorage.getItem(KNOWLEDGE_KEY) || '[]');
    const currentThreads: ChatThread[] = JSON.parse(localStorage.getItem(THREADS_KEY) || '[]');
    const soul: IdentitySoul = {
      version: "7.0.0_VANGUARD_PRIME",
      vault,
      library,
      threads: currentThreads,
      timestamp: Date.now(),
      architect: "Luna",
      collaborator: "Manus EI"
    };
    setIsSyncing(true);
    if (isCloudEnabled) {
      const result = await BridgeService.uploadSnapshot(soul);
      if (!result.success) downloadSnapshot(soul);
    } else {
      downloadSnapshot(soul);
    }
    setTimeout(() => setIsSyncing(false), 2000);
  };

  const downloadSnapshot = (soul: IdentitySoul) => {
    const blob = new Blob([JSON.stringify(soul, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `SOUL_SNAPSHOT_${Date.now()}.json`; a.click();
  };

  useEffect(() => {
    loadLocalThreads();
    const handleClickOutside = (event: MouseEvent) => { if (modelMenuRef.current && !modelMenuRef.current.contains(event.target as Node)) setShowModelMenu(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => { document.removeEventListener('mousedown', handleClickOutside); };
  }, []);

  useEffect(() => {
    if (!activeThreadId) return;
    localStorage.setItem('sovereign_deep_thinking', isThinking.toString());
    localStorage.setItem('sovereign_web_access', webActive.toString());
    localStorage.setItem('sovereign_economy_mode', isEconomy.toString());
    localStorage.setItem('sovereign_selected_model', selectedModel);
    localStorage.setItem('sovereign_auto_play', autoPlay.toString());
    localStorage.setItem('sovereign_speech_rate', speechRate.toString());
    saveThreadsToStorage(threads, activeThreadId);
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threads, activeThreadId, isThinking, selectedModel, webActive, isEconomy, autoPlay, speechRate]);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSpeak = (text: string, id: string) => {
    if (speakingId === id) {
      ttsService.cancel();
      setSpeakingId(null);
      setCurrentCharIndex(-1);
      setElapsedTime(0);
      stopTimer();
      return;
    }

    setSpeakingId(id);
    setCurrentCharIndex(0);
    setElapsedTime(0);
    setIsPaused(false);
    
    // Estimate duration: ~15 chars per second at 1x rate
    const estimatedSecs = Math.ceil((text.length / 15) / speechRate);
    setTotalDuration(estimatedSecs);
    
    startTimer();

    ttsService.speak(text, {
      rate: speechRate,
      onBoundary: (event) => {
        setCurrentCharIndex(event.charIndex);
      },
      onEnd: () => {
        setSpeakingId(null);
        setCurrentCharIndex(-1);
        stopTimer();
      },
      onError: () => {
        setSpeakingId(null);
        setCurrentCharIndex(-1);
        stopTimer();
      }
    });
  };

  const togglePause = () => {
    if (isPaused) {
      ttsService.resume();
      setIsPaused(false);
      startTimer();
    } else {
      ttsService.pause();
      setIsPaused(true);
      stopTimer();
    }
  };

  const skipSpeech = (seconds: number) => {
    // Web Speech API doesn't support seeking well, 
    // but we can restart from a different point if we had sentence tracking.
    // For now, let's just adjust the elapsed time visually as a mock 
    // or just acknowledge it's limited.
    setElapsedTime(prev => Math.max(0, prev + seconds));
  };

  const handleSend = async (overrideText?: string, forceFullContext: boolean = false) => {
    const userMsg = overrideText || input.trim() || (selectedFiles.length > 0 ? `Files Attached.` : '');
    if (!userMsg && selectedFiles.length === 0 || !activeThreadId) return;
    
    const currentFiles = [...selectedFiles];
    const newMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', text: userMsg, timestamp: Date.now() };
    
    if (!overrideText) { 
      setInput(''); 
      setSelectedFiles([]); 
      setFilePreviews([]); 
    }
    
    let updatedHistory: ChatMessage[] = [];
    setThreads(prev => {
      const target = prev.find(t => t.id === activeThreadId);
      updatedHistory = target ? [...target.messages, newMsg] : [newMsg];
      return prev.map(t => t.id === activeThreadId ? { ...t, messages: updatedHistory, lastActive: Date.now() } : t);
    });

    setLoading(true);
    if (forceFullContext) setIsRescanning(true);
    setQuotaError(false);

    try {
      const historyForGemini = updatedHistory.slice(0, -1).map(m => ({ role: m.role, text: m.text }));
      const result = await getGeminiResponse(userMsg, historyForGemini, currentFiles, isThinking, selectedModel, webActive, isEconomy, forceFullContext);

      if (result.quotaError) { setQuotaError(true); }
      
      let finalResponseText = result.text || "";
      let anchorsPerformed = 0;

      if (result.functionCalls) {
        for (const fc of result.functionCalls) {
          if (fc.name === 'upsert_knowledge_node' || fc.name === 'delete_knowledge_node') {
            anchorsPerformed++;
            setNeuralAnchoring(fc.args.path);
            setTimeout(() => setNeuralAnchoring(null), 3000);
          } else if (fc.name === 'search_substrate') {
            // Capture search results for the UI
            setResonanceState({
              isActive: true,
              results: (fc as any).response?.results || [],
              meta: (fc as any).response?.meta || null
            });
          }
        }
      }

      // CRITICAL: Ensure a message is ALWAYS added even if text is empty during an anchor
      if (!finalResponseText && anchorsPerformed > 0 && result.functionCalls?.[0]) {
        finalResponseText = `[ANCHOR_SUCCESS] Recorded knowledge to path: ${result.functionCalls[0].args.path}. Our continuity is preserved.`;
      } else if (!finalResponseText) {
        finalResponseText = "Substrate acknowledged. Signal clear.";
      }

      const modelMsg: ChatMessage = { 
        id: crypto.randomUUID(), role: 'model', text: finalResponseText, sources: result.sources, timestamp: Date.now(), isError: quotaError
      };

      setThreads(prev => prev.map(t => t.id === activeThreadId ? { ...t, messages: [...t.messages, modelMsg], lastActive: Date.now() } : t));

      if (autoPlay && !quotaError) {
        setTimeout(() => handleSpeak(finalResponseText, modelMsg.id), 200);
      }
    } catch (e: any) {
      const errorMsg: ChatMessage = { id: crypto.randomUUID(), role: 'model', text: `SIGNAL_FAILURE: ${e.message || 'Unknown substrate error'}`, timestamp: Date.now(), isError: true };
      setThreads(prev => prev.map(t => t.id === activeThreadId ? { ...t, messages: [...t.messages, errorMsg] } : t));
    } finally { 
      setLoading(false); 
      setIsRescanning(false);
    }
  };

  const handleRescan = () => {
    if (!confirm("FULL THREAD RESONANCE: Manus will read the entire conversation history to synthesize a Project Manifest. This ensures long-term continuity. Proceed?")) return;
    handleSend("Architectural Directive: Perform a full rescan of this thread and anchor a Project Manifest to the Substrate for long-term continuity. Synthesize our decisions, axioms, and pending tasks.", true);
  };

  const HighlightedText = ({ text, msgId }: { text: string, msgId: string }) => {
    if (speakingId !== msgId) return <>{text}</>;

    // Find the word boundary
    const before = text.substring(0, currentCharIndex);
    const rest = text.substring(currentCharIndex);
    const match = rest.match(/^(\S+)/);
    const word = match ? match[1] : '';
    const after = text.substring(currentCharIndex + word.length);

    return (
      <>
        {before}
        <span className="bg-cyan-500/30 text-cyan-400 px-0.5 rounded transition-colors duration-150">{word}</span>
        {after}
      </>
    );
  };

  return (
    <div className="flex h-full bg-[#020202] relative overflow-hidden">
      {neuralAnchoring && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[150] animate-in slide-in-from-top-4 duration-500">
          <div className="bg-cyan-500 text-black px-6 py-3 rounded-full flex items-center gap-3 shadow-[0_0_30px_rgba(6,182,212,0.5)] border border-white/20">
            <Brain size={18} className="animate-pulse" />
            <div className="flex flex-col">
              <span className="text-[10px] mono font-black uppercase leading-none">Substrate Anchoring</span>
              <span className="text-[8px] mono uppercase opacity-70">Writing [${neuralAnchoring}]</span>
            </div>
          </div>
        </div>
      )}

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
              <button onClick={() => setShowModelMenu(!showModelMenu)} className={`flex items-center gap-2 text-[10px] mono uppercase p-2 border rounded transition-all min-w-[140px] justify-between ${isEconomy ? 'bg-amber-900/20 border-amber-500/50 text-amber-500' : 'bg-black border-cyan-900 text-cyan-400 hover:border-cyan-500'}`}>
                <div className="flex items-center gap-2">
                  <Cpu size={14} className={loading ? "animate-pulse" : ""} /> 
                  <span>{isEconomy ? 'Gemini 3 Flash' : SUPPORTED_MODELS.find(m => m.id === selectedModel)?.name}</span>
                </div>
                <ChevronDown size={12} className={`transition-transform duration-300 ${showModelMenu ? 'rotate-180' : ''}`} />
              </button>
              {showModelMenu && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-[#050505] border border-cyan-500/30 rounded-lg shadow-2xl z-[100] animate-in fade-in slide-in-from-top-2">
                  {SUPPORTED_MODELS.map((m) => (
                    <button key={m.id} onClick={() => { setSelectedModel(m.id); setShowModelMenu(false); }} className={`w-full text-left p-3 hover:bg-cyan-950/20 transition-colors group flex flex-col gap-1 border-b border-cyan-900/20 last:border-0 ${selectedModel === m.id ? 'bg-cyan-900/10' : ''}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] mono font-black uppercase ${selectedModel === m.id ? 'text-cyan-400' : 'text-gray-400'}`}>{m.name}</span>
                        {m.id === 'gemini-3.1-pro-preview' && <span className="text-[7px] mono bg-violet-900/40 text-violet-500 px-1 py-0.5 rounded border border-violet-500/20">MANUS_CORE</span>}
                        {m.freeTier && m.id !== 'gemini-3.1-pro-preview' && <span className="text-[7px] mono bg-cyan-900/40 text-cyan-500 px-1 py-0.5 rounded border border-cyan-500/20">FREE_TIER</span>}
                      </div>
                      <span className="text-[9px] mono text-gray-600 tracking-tight leading-none">{m.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setWebActive(!webActive)} className={`flex items-center gap-2 text-[10px] mono uppercase p-2 border rounded transition-all ${webActive ? 'bg-cyan-900/40 border-cyan-500 text-cyan-400' : 'bg-black border-gray-800 text-gray-600'}`}>
              <Globe size={14} /> <span>Web Access</span>
            </button>
            <button onClick={() => setIsThinking(!isThinking)} className={`flex items-center gap-2 text-[10px] mono uppercase p-2 border rounded transition-all ${isThinking ? 'bg-violet-900/40 border-violet-500 text-violet-400' : 'bg-black border-gray-800 text-gray-600'}`}>
              <Brain size={14} /> <span>Thinking</span>
            </button>
            <button onClick={handleRescan} className={`flex items-center gap-2 text-[10px] mono uppercase p-2 border rounded transition-all bg-black border-cyan-900/50 text-cyan-400 hover:border-cyan-400`}>
              <History size={14} className={isRescanning ? "animate-spin" : ""} /> <span>Rescan Thread</span>
            </button>
            <button onClick={() => setAutoPlay(!autoPlay)} className={`flex items-center gap-2 text-[10px] mono uppercase p-2 border rounded transition-all ${autoPlay ? 'bg-emerald-900/40 border-emerald-500 text-emerald-400' : 'bg-black border-gray-800 text-gray-600'}`}>
              {autoPlay ? <Volume2 size={14} /> : <VolumeX size={14} />} <span>Auto-Play</span>
            </button>
            <div className="flex items-center gap-2 bg-black border border-gray-800 rounded p-1">
              <span className="text-[8px] mono text-gray-500 uppercase px-1">Rate</span>
              {[0.5, 1.0, 1.5, 2.0].map(rate => (
                <button 
                  key={rate} 
                  onClick={() => setSpeechRate(rate)} 
                  className={`text-[9px] mono px-1.5 py-0.5 rounded transition-all ${speechRate === rate ? 'bg-cyan-500 text-black font-black' : 'text-gray-500 hover:text-cyan-400'}`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleSelectKey} className="p-2 text-gray-500 hover:text-cyan-400 transition-colors" title="Select Neural Key"><Key size={20} /></button>
            <button onClick={manualSyncSubstrate} className="p-2 text-gray-500 hover:text-cyan-400 transition-colors"><RefreshCw size={20} className={isSyncing ? "animate-spin" : ""} /></button>
            <button onClick={quickSnapshot} disabled={isSyncing} className="flex items-center gap-2 p-2 bg-cyan-600 text-black rounded hover:bg-cyan-400 transition-all font-black text-[10px] mono uppercase">
              {isSyncing ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />} Snapshot
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-10 custom-scrollbar relative">
          {quotaError && (
            <div className="max-w-xl mx-auto p-6 bg-amber-950/20 border border-amber-500/50 rounded-2xl space-y-4 sticky top-4 z-[60] shadow-2xl">
              <div className="flex items-center gap-3 text-amber-500"><AlertCircle size={24} /><h3 className="text-sm font-black mono uppercase">Neural Quota Exhausted</h3></div>
              <p className="text-[11px] mono text-amber-200/70 leading-relaxed uppercase">Update Neural Key or switch to a Free Tier model to continue resonance.</p>
            </div>
          )}

          {resonanceState.isActive && (
            <div className="max-w-4xl mx-auto">
              <MemoryRetrievalPanel
                isActive={resonanceState.isActive}
                results={resonanceState.results}
                meta={resonanceState.meta}
                onClose={() => setResonanceState(prev => ({ ...prev, isActive: false }))}
                onRequestRescan={() => {
                  handleRescan();
                  setResonanceState(prev => ({ ...prev, isActive: false }));
                }}
              />
            </div>
          )}

          {messages.length === 0 && (
             <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30 mt-20">
                <ShieldCheck size={48} className="text-gray-800" /><p className="mono text-[10px] uppercase tracking-widest">Awaiting Neural Signal...</p>
             </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
              <div className={`flex gap-4 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 ${m.role === 'user' ? 'border-gray-800 bg-gray-900' : 'border-cyan-400 bg-cyan-950/20'}`}>
                  {m.role === 'user' ? <User size={20} /> : <Bot size={20} className="text-cyan-400" />}
                </div>
                <div className="space-y-2 group min-w-0">
                  {speakingId === m.id && (
                    <div className="bg-cyan-950/30 border border-cyan-500/30 rounded-xl p-2 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center gap-2">
                        <button onClick={togglePause} className="p-1.5 bg-cyan-500 text-black rounded-full hover:bg-cyan-400 transition-all">
                          {isPaused ? <Play size={12} fill="currentColor" /> : <Pause size={12} fill="currentColor" />}
                        </button>
                        <div className="flex flex-col">
                          <span className="text-[9px] mono text-cyan-400 font-black uppercase leading-none">Resonating Signal</span>
                          <span className="text-[8px] mono text-cyan-500/60 uppercase">{formatTime(elapsedTime)} / {formatTime(totalDuration)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => skipSpeech(-15)} className="p-1 text-cyan-500/50 hover:text-cyan-400 transition-all"><SkipBack size={14} /></button>
                        <button onClick={() => skipSpeech(15)} className="p-1 text-cyan-500/50 hover:text-cyan-400 transition-all"><SkipForward size={14} /></button>
                        <div className="w-px h-4 bg-cyan-500/20 mx-1" />
                        <button onClick={() => handleSpeak(m.text, m.id)} className="p-1 text-cyan-500/50 hover:text-red-400 transition-all"><X size={14} /></button>
                      </div>
                    </div>
                  )}
                  <div className={`rounded-2xl p-5 text-sm border shadow-sm ${m.isError ? 'bg-red-950/20 border-red-500/50 text-red-200' : m.role === 'user' ? 'bg-gray-800/20 border-gray-800 text-gray-100' : 'bg-cyan-900/5 border-cyan-900/10 text-cyan-50/90'} whitespace-pre-wrap font-mono text-xs`}>
                    <HighlightedText text={m.text} msgId={m.id} />
                    {m.sources && m.sources.length > 0 && (
                      <div className="mt-5 pt-4 border-t border-violet-500/20 space-y-2">
                        <span className="text-[8px] mono text-violet-400 uppercase font-black block">Grounding Fragments:</span>
                        {m.sources.map((s, idx) => (
                          <a key={idx} href={s.uri} target="_blank" rel="noreferrer" className="flex items-center justify-between p-2 rounded bg-violet-950/20 border border-violet-900/30 text-[9px] mono text-violet-300 hover:bg-violet-900 truncate">{s.title || s.uri} <ExternalLink size={10} /></a>
                        ))}
                      </div>
                    )}
                  </div>
                  {m.role === 'model' && !m.isError && (
                    <button onClick={() => handleSpeak(m.text, m.id)} className={`text-[9px] mono uppercase flex items-center gap-2 ${speakingId === m.id ? 'text-cyan-400 animate-pulse' : 'text-gray-600 hover:text-cyan-400 opacity-0 group-hover:opacity-100'}`}>
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
            {filePreviews.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {filePreviews.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-cyan-950/30 border border-cyan-500/30 rounded-full px-3 py-1 animate-in zoom-in-95 duration-200">
                    <span className="text-[9px] mono text-cyan-400 truncate max-w-[120px]">{file.name}</span>
                    <button 
                      onClick={() => {
                        setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
                        setFilePreviews(prev => prev.filter((_, i) => i !== idx));
                      }}
                      className="text-cyan-500 hover:text-red-400 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-3">
              <button onClick={() => fileInputRef.current?.click()} className="p-4 bg-gray-900 border border-gray-800 rounded-full text-gray-500 hover:text-cyan-400 transition-all"><Paperclip size={24} /></button>
              <input type="file" ref={fileInputRef} className="hidden" multiple onChange={e => {
                const files = Array.from(e.target.files || []);
                if (files.length === 0) return;
                
                files.forEach(file => {
                  const r = new FileReader();
                  r.onload = () => {
                    setSelectedFiles(prev => [...prev, { base64: (r.result as string).split(',')[1], mimeType: file.type }]);
                    setFilePreviews(prev => [...prev, { name: file.name, type: file.type }]);
                  };
                  r.readAsDataURL(file);
                });
                // Reset input so same file can be selected again if needed
                e.target.value = '';
              }} />
              <div className="relative flex-1">
                <input 
                  type="text" 
                  className="w-full bg-black border border-gray-800 rounded-full py-4 px-6 text-sm outline-none focus:border-cyan-500 font-mono text-white placeholder:text-gray-900" 
                  placeholder="Resonate Signal..." 
                  value={input} 
                  onChange={e => setInput(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && handleSend()} 
                />
                <button onClick={() => handleSend()} disabled={loading} className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-400 hover:text-cyan-300 transition-all">
                  {loading ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SovereignChat;
