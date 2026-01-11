import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Key, Brain, Database, Zap, Paperclip, X, Volume2, Anchor, Loader2, RefreshCw, AlertCircle, AlertTriangle, Cpu, Activity, Terminal, Globe, ExternalLink, Shield, Radio, Lock, History, Bookmark, Save, ImageIcon, Download, Sparkles, MessageSquare, Plus, Trash2, ChevronLeft, ChevronRight, Clock, ShieldCheck, HardDrive, Layers, List, Cloud, ChevronDown, Repeat } from 'lucide-react';
import { getGeminiResponse, generateSpeech, FileData, SUPPORTED_MODELS, getApiKey, GroundingSource } from '../services/geminiService';
import { ChatThread, ChatMessage, PersistenceLog, IdentitySoul, KnowledgeNode } from '../types';
import { BridgeService } from '../services/bridgeService';
import { isCloudEnabled } from '../services/supabaseClient';

const THREADS_KEY = 'sovereign_manus_threads_v2';
const ACTIVE_THREAD_ID_KEY = 'sovereign_manus_active_thread_id';

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
  const [selectedModel, setSelectedModel] = useState<string>(localStorage.getItem('sovereign_selected_model') || 'gemini-3-flash-preview');
  const [isThinking, setIsThinking] = useState<boolean>(localStorage.getItem('sovereign_deep_thinking') === 'true');
  const [webActive, setWebActive] = useState<boolean>(localStorage.getItem('sovereign_web_access') !== 'false');
  const [showSidebar, setShowSidebar] = useState(true);
  const [hasNeuralKey, setHasNeuralKey] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState<{path: string, type?: 'cloud' | 'local'} | null>(null);
  
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
      } catch (e) { createNewThread(); }
    } else { createNewThread(); }
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
    localStorage.setItem(THREADS_KEY, JSON.stringify(updated));
    localStorage.setItem(ACTIVE_THREAD_ID_KEY, newThread.id);
  };

  useEffect(() => {
    loadLocalThreads();
    checkKeyStatus();
    
    const handleClickOutside = (event: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(event.target as Node)) {
        setShowModelMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!activeThreadId) return;
    localStorage.setItem('sovereign_selected_model', selectedModel);
    localStorage.setItem('sovereign_deep_thinking', isThinking.toString());
    localStorage.setItem('sovereign_web_access', webActive.toString());
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threads, activeThreadId, isThinking, selectedModel, webActive]);

  const switchToFlash = () => {
    setSelectedModel('gemini-3-flash-preview');
    setShowModelMenu(false);
  };

  const handleSend = async (overrideText?: string) => {
    const userMsg = overrideText || input.trim() || (selectedFile ? `Substrate Attached.` : '');
    if (!userMsg && !selectedFile || !activeThreadId) return;
    
    const currentFile = selectedFile;
    const newMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', text: userMsg, timestamp: Date.now() };
    
    setInput(''); 
    setSelectedFile(null); 
    setFilePreviewName(null);
    
    setThreads(prev => prev.map(t => t.id === activeThreadId ? { ...t, messages: [...t.messages, newMsg], lastActive: Date.now() } : t));
    
    setLoading(true);
    try {
      const result = await getGeminiResponse(userMsg, messages, currentFile || undefined, isThinking, selectedModel, webActive);
      
      const modelMsg: ChatMessage = { 
        id: crypto.randomUUID(), 
        role: 'model', 
        text: result.text, 
        sources: result.sources,
        timestamp: Date.now(),
        isError: result.quotaError
      };

      setThreads(prev => prev.map(t => t.id === activeThreadId ? { ...t, messages: [...t.messages, modelMsg] } : t));
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
          <button onClick={() => createNewThread()} className="w-full py-3 border border-cyan-500/30 text-cyan-400 rounded-lg hover:bg-cyan-500 hover:text-black transition-all text-[11px] mono uppercase font-black">
            <Plus size={16} /> New Resonance
          </button>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
            {threads.map(t => (
              <div key={t.id} onClick={() => setActiveThreadId(t.id)} className={`p-3 rounded-lg cursor-pointer border ${activeThreadId === t.id ? 'bg-cyan-900/20 border-cyan-500/50 text-cyan-400' : 'border-transparent text-gray-500 hover:bg-gray-900'}`}>
                <span className="truncate text-[10px] mono uppercase font-bold">{t.title}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex flex-wrap items-center justify-between p-4 bg-black/80 border-b border-cyan-500/20 z-50 gap-4">
          <div className="flex gap-2 items-center">
            <button onClick={() => setShowSidebar(!showSidebar)} className="p-2 text-gray-500 hover:text-cyan-400 transition-colors">
              {showSidebar ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </button>
            
            <div className="relative" ref={modelMenuRef}>
              <button onClick={() => setShowModelMenu(!showModelMenu)} className="flex items-center gap-2 text-[10px] mono uppercase p-2 border border-cyan-900 bg-black text-cyan-400 rounded hover:border-cyan-500 min-w-[150px] justify-between">
                <div className="flex items-center gap-2"><Zap size={14} /> <span>{SUPPORTED_MODELS.find(m => m.id === selectedModel)?.name || "Select Model"}</span></div>
                <ChevronDown size={12} className={showModelMenu ? 'rotate-180' : ''} />
              </button>
              {showModelMenu && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-[#050505] border border-cyan-500/30 rounded-lg shadow-2xl z-[100] overflow-hidden">
                  {SUPPORTED_MODELS.map((m) => (
                    <button key={m.id} onClick={() => { setSelectedModel(m.id); setShowModelMenu(false); }} className={`w-full text-left p-3 hover:bg-cyan-950/20 border-b border-cyan-900/20 last:border-0 ${selectedModel === m.id ? 'bg-cyan-900/10' : ''}`}>
                      <div className="text-[11px] mono font-black uppercase text-cyan-400">{m.name}</div>
                      <div className="text-[9px] mono text-gray-600 lowercase">{m.description}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={() => setWebActive(!webActive)} className={`flex items-center gap-2 text-[10px] mono uppercase p-2 border rounded transition-all ${webActive ? 'bg-violet-900/20 border-violet-500 text-violet-400' : 'bg-black border-gray-800 text-gray-500'}`}><Globe size={14} /> Grounding</button>
            <button onClick={() => setIsThinking(!isThinking)} className={`flex items-center gap-2 text-[10px] mono uppercase p-2 border rounded transition-all ${isThinking ? 'bg-cyan-900/20 border-cyan-500 text-cyan-400' : 'bg-black border-gray-800 text-gray-500'}`}><Brain size={14} /> Think</button>
          </div>
          <button onClick={() => window.aistudio.openSelectKey()} className={`text-[10px] mono uppercase py-1.5 px-3 border rounded transition-all flex items-center gap-2 ${hasNeuralKey ? 'bg-green-900/20 border-green-500 text-green-500' : 'bg-amber-900/10 border-amber-900/30 text-amber-500'}`}><Shield size={14} /> <span>{hasNeuralKey ? 'ACTIVE' : 'LOCKED'}</span></button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-10 custom-scrollbar">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
              <div className={`flex gap-4 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-10 h-10 rounded-full border flex items-center justify-center shrink-0 ${m.role === 'user' ? 'border-gray-800 bg-gray-900' : 'border-cyan-400 bg-cyan-950/20'}`}>
                  {m.role === 'user' ? <User size={20} /> : <Bot size={20} className="text-cyan-400" />}
                </div>
                <div className="space-y-3 min-w-0">
                  <div className={`rounded-2xl p-5 text-sm border ${m.isError ? 'bg-red-950/20 border-red-500/50 text-red-200' : m.role === 'user' ? 'bg-gray-800/20 border-gray-800 text-gray-100' : 'bg-cyan-900/5 border-cyan-900/10 text-cyan-50/90'} whitespace-pre-wrap font-mono text-xs shadow-sm`}>
                    {m.text}
                    {m.isError && m.text.includes('429') && (
                      <div className="mt-4 pt-4 border-t border-red-500/20 space-y-3">
                        <p className="text-[10px] uppercase font-black text-red-400 animate-pulse flex items-center gap-2">
                          <AlertTriangle size={12} /> Quota Limit Exhausted on {SUPPORTED_MODELS.find(x => x.id === selectedModel)?.name}
                        </p>
                        <button onClick={switchToFlash} className="w-full py-2 bg-red-500 text-black rounded font-black uppercase text-[10px] flex items-center justify-center gap-2 hover:bg-red-400 transition-all">
                          <Repeat size={14} /> Auto-Switch to Gemini 3 Flash (High Quota)
                        </button>
                      </div>
                    )}
                    {m.sources && (
                      <div className="mt-4 pt-4 border-t border-violet-500/20 space-y-2">
                        {m.sources.map((s, idx) => (
                          <a key={idx} href={s.uri} target="_blank" rel="noreferrer" className="flex items-center justify-between p-2 rounded bg-violet-950/20 text-[9px] text-violet-300 hover:bg-violet-900 transition-all">
                            <span className="truncate">{s.title || s.uri}</span>
                            <ExternalLink size={10} />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  {m.role === 'model' && !m.isError && (
                    <button onClick={() => speakMessage(m.text, m.id)} className={`text-[9px] mono uppercase flex items-center gap-2 ${speakingId === m.id ? 'text-cyan-400 animate-pulse' : 'text-gray-600 hover:text-cyan-400'}`}>
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
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <button onClick={() => fileInputRef.current?.click()} className="p-4 bg-gray-900 border border-gray-800 rounded-full text-gray-500 hover:text-cyan-400 transition-all"><Paperclip size={24} /></button>
            <input type="file" ref={fileInputRef} className="hidden" onChange={e => {
              const file = e.target.files?.[0];
              if (file) { setFilePreviewName(file.name); const r = new FileReader(); r.onload = () => setSelectedFile({ base64: (r.result as string).split(',')[1], mimeType: file.type }); r.readAsDataURL(file); }
            }} />
            <div className="relative flex-1">
              <input type="text" className="w-full bg-black border border-gray-800 rounded-full py-4 px-6 text-sm outline-none focus:border-cyan-500 text-white" placeholder="Acknowledge Sovereign Peer..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} />
              <button onClick={() => handleSend()} disabled={loading} className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-400 hover:text-cyan-300">
                {loading ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
              </button>
            </div>
          </div>
          {selectedFile && <div className="text-[10px] mono text-cyan-400 mt-2 px-16">Attached: {filePreviewName}</div>}
        </div>
      </div>
    </div>
  );
};

export default SovereignChat;