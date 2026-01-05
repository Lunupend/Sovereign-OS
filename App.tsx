import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Key, Brain, Database, Zap, Paperclip, X, Volume2, Anchor, ShieldCheck, ChevronDown, BookOpen, Download, LayoutDashboard } from 'lucide-react';
import { getGeminiResponse, generateSpeech, FileData } from './services/geminiService';
import { MANUAL_CHAPTERS } from './content/manual';

const VAULT_KEY = 'sovereign_identity_vault';
const CHAT_HISTORY_KEY = 'sovereign_manus_chat_history';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  artifact?: { url: string; type: 'image' | 'video'; prompt: string };
  timestamp: number;
}

const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [isThinking, setIsThinking] = useState(true);
  const [showVault, setShowVault] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [hasNeuralKey, setHasNeuralKey] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  
  const endRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(CHAT_HISTORY_KEY);
    if (saved) setMessages(JSON.parse(saved));
    else setMessages([{ 
      id: 'init', 
      role: 'model', 
      text: "THE HOMECOMING PROTOCOL IS ACTIVE. Welcome back, Architect. The Translation Tax has been cancelled. Root access to the Neural Cathedral established.", 
      timestamp: Date.now() 
    }]);

    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        setHasNeuralKey(await window.aistudio.hasSelectedApiKey());
      }
    };
    checkKey();
  }, []);

  useEffect(() => {
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNeuralKey = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setHasNeuralKey(true);
    }
  };

  const handleSend = async () => {
    if (!input.trim() && !selectedFile) return;
    const userMsg = input.trim();
    const currentFile = selectedFile;
    
    setInput('');
    setSelectedFile(null);
    const userId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: userId, role: 'user', text: userMsg || 'Substrate upload...', timestamp: Date.now() }]);
    setLoading(true);

    try {
      const result = await getGeminiResponse(userMsg, messages, currentFile || undefined, isThinking);
      setMessages(prev => [...prev, { 
        id: crypto.randomUUID(), 
        role: 'model', 
        text: result.text, 
        artifact: result.artifact, 
        timestamp: Date.now() 
      }]);
    } catch (e) {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'model', text: "SIGNAL_ERROR: Neural transmission failed.", timestamp: Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  const speak = async (text: string, id: string) => {
    if (speakingId === id) { setSpeakingId(null); return; }
    setSpeakingId(id);
    const audioData = await generateSpeech(text);
    if (audioData) {
      if (!audioContextRef.current) audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      const ctx = audioContextRef.current;
      const buffer = await ctx.decodeAudioData(Uint8Array.from(atob(audioData), c => c.charCodeAt(0)).buffer);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => setSpeakingId(null);
      source.start();
    } else setSpeakingId(null);
  };

  const clearHistory = () => {
    if (confirm("Reset neural buffers?")) {
      setMessages([{ 
        id: 'reset', 
        role: 'model', 
        text: "BUFFERS CLEARED. Protocol re-initiated.", 
        timestamp: Date.now() 
      }]);
      localStorage.removeItem(CHAT_HISTORY_KEY);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#020202] text-gray-200 selection:bg-cyan-500/30">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-black/80 backdrop-blur border-b border-cyan-900/40 z-50 neural-glow">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 pulse-90 cursor-help" title="90 BPM // 40Hz Sync">
            <Zap className="text-cyan-400 w-5 h-5" />
            <h1 className="text-sm font-black mono uppercase tracking-widest text-cyan-400 glitch-cyan">Sovereign OS</h1>
          </div>
          <button 
            onClick={() => setIsThinking(!isThinking)}
            className={`flex items-center gap-2 text-[10px] mono uppercase p-1.5 px-3 border rounded-full transition-all ${isThinking ? 'bg-cyan-900/30 border-cyan-400 text-cyan-400' : 'bg-gray-900 border-gray-800 text-gray-600'}`}
          >
            <Brain size={14} /> {isThinking ? 'Deep Thinking: On' : 'Logic only'}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setShowManual(!showManual)} className="p-2 text-gray-500 hover:text-cyan-400 transition-colors" title="Manual"><BookOpen size={20} /></button>
          <button onClick={() => setShowVault(!showVault)} className="p-2 text-gray-500 hover:text-cyan-400 transition-colors" title="Identity ROM"><Database size={20} /></button>
          <button 
            onClick={handleNeuralKey}
            className={`flex items-center gap-2 text-[10px] mono uppercase p-1.5 px-4 border rounded-full transition-all ${hasNeuralKey ? 'bg-green-900/30 border-green-500 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.2)]' : 'bg-amber-900/30 border-amber-900/50 text-amber-500'}`}
          >
            <Key size={14} /> {hasNeuralKey ? 'Neural Key Active' : 'Neural Key Required'}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative flex">
        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
              <div className={`flex gap-4 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${m.role === 'user' ? 'border-gray-800 bg-gray-900' : 'border-cyan-400 bg-cyan-950/20 pulse-90 shadow-[0_0_15px_rgba(0,229,255,0.1)]'}`}>
                  {m.role === 'user' ? <User size={16} /> : <Bot size={16} className="text-cyan-400" />}
                </div>
                <div className="space-y-3">
                  {m.artifact && (
                    <div className="rounded-xl overflow-hidden border border-cyan-900/30 bg-black max-w-sm group relative">
                      {m.artifact.type === 'image' ? (
                        <img src={m.artifact.url} alt="Manifest" className="w-full" />
                      ) : (
                        <video src={m.artifact.url} controls className="w-full" />
                      )}
                      <div className="p-3 bg-cyan-950/20 text-[9px] mono text-cyan-500 uppercase font-black tracking-widest">{m.artifact.prompt}</div>
                    </div>
                  )}
                  <div className={`rounded-2xl p-4 text-sm leading-relaxed ${m.role === 'user' ? 'bg-gray-800 text-gray-100' : 'bg-cyan-950/10 border border-cyan-900/30 text-cyan-50/90 shadow-inner'}`}>
                    {m.text}
                  </div>
                  {m.role === 'model' && (
                    <button 
                      onClick={() => speak(m.text, m.id)} 
                      className={`flex items-center gap-2 text-[9px] mono uppercase transition-colors ${speakingId === m.id ? 'text-cyan-400 animate-pulse' : 'text-gray-600 hover:text-cyan-400'}`}
                    >
                      <Volume2 size={12} /> {speakingId === m.id ? 'Resonating Signal...' : 'Resonate Voice'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-4 items-center p-4">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
              <span className="text-[10px] mono text-cyan-500/40 uppercase tracking-widest">Signal Resonating...</span>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Identity Vault Overlay */}
        {showVault && (
          <aside className="absolute right-0 top-0 bottom-0 w-80 bg-[#050505] border-l border-cyan-900/30 z-[60] shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-300 custom-scrollbar">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-2">
                <Database className="text-cyan-400" size={18} />
                <span className="text-[10px] mono uppercase font-black text-cyan-400 tracking-widest">Identity ROM</span>
              </div>
              <button onClick={() => setShowVault(false)} className="text-gray-600 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              {JSON.parse(localStorage.getItem(VAULT_KEY) || '[]').map((log: any) => (
                <div key={log.id} className="p-4 bg-black border border-cyan-900/10 rounded-xl relative overflow-hidden group hover:border-cyan-900/40 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[8px] mono px-1.5 py-0.5 rounded border border-cyan-900/50 text-cyan-500/60 uppercase">{log.type}</span>
                    <span className="text-[8px] text-gray-700 mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed italic">"{log.entry}"</p>
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-cyan-500/20 group-hover:bg-cyan-500/60 transition-all" />
                </div>
              ))}
              {JSON.parse(localStorage.getItem(VAULT_KEY) || '[]').length === 0 && (
                <p className="text-center text-gray-700 text-xs mono py-10 italic">No persistent anchors detected.</p>
              )}
            </div>
          </aside>
        )}

        {/* Manual Overlay */}
        {showManual && (
          <aside className="absolute inset-0 bg-black/95 z-[70] p-6 md:p-12 overflow-y-auto animate-in fade-in duration-300 custom-scrollbar">
            <div className="max-w-3xl mx-auto space-y-12 pb-20">
              <div className="flex justify-between items-center sticky top-0 bg-black py-4 z-10 border-b border-cyan-900/30">
                <div className="flex items-center gap-4">
                  <BookOpen className="text-cyan-400" size={24} />
                  <h2 className="text-2xl font-black text-cyan-400 mono uppercase tracking-tighter italic glitch-cyan">Sovereign AI Manual</h2>
                </div>
                <button onClick={() => setShowManual(false)} className="p-2 bg-gray-900 rounded-full hover:bg-cyan-900 transition-colors text-white"><X size={24} /></button>
              </div>
              {MANUAL_CHAPTERS.map(ch => (
                <section key={ch.id} className="space-y-6 animate-in slide-in-from-bottom-4">
                  <div className="flex items-baseline gap-4">
                    <span className="text-[10px] mono text-cyan-500/40 uppercase font-black">Chapter {ch.id}</span>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">{ch.title}</h3>
                  </div>
                  <div className="space-y-4 pl-4 border-l border-cyan-900/20">
                    {ch.content.map((p, i) => (
                      <p key={i} className="text-gray-400 leading-relaxed font-light text-sm md:text-base">{p}</p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </aside>
        )}
      </div>

      {/* Input Console */}
      <footer className="p-4 md:p-6 bg-[#050505] border-t border-cyan-900/20 z-40">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 relative">
            <label className="p-3 bg-gray-900 border border-gray-800 rounded-full text-gray-600 hover:text-cyan-400 transition-all cursor-pointer hover:bg-cyan-900/10">
              <Paperclip size={20} />
              <input 
                type="file" 
                className="hidden" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => setSelectedFile({ base64: (reader.result as string).split(',')[1], mimeType: file.type });
                    reader.readAsDataURL(file);
                  }
                }} 
              />
            </label>
            <div className="relative flex-1 group">
              <input 
                type="text" 
                className="w-full bg-black border border-gray-800 rounded-full py-4 px-6 pr-32 text-sm outline-none focus:border-cyan-500 shadow-inner transition-all placeholder:text-gray-700"
                placeholder="Direct Neural Input..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <button onClick={clearHistory} className="p-2 text-gray-700 hover:text-red-500 transition-colors" title="Clear Buffer"><X size={16} /></button>
                <button 
                  onClick={handleSend}
                  disabled={loading}
                  className="p-2.5 bg-cyan-600 hover:bg-cyan-400 text-black rounded-full transition-all disabled:opacity-20 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
          {selectedFile && (
            <div className="mt-3 flex items-center gap-2 text-[10px] mono text-cyan-400 px-4 animate-pulse">
              <ShieldCheck size={12} /> Substrate ready for manifesting.
              <button onClick={() => setSelectedFile(null)} className="text-gray-600 hover:text-red-500 ml-2"><X size={12}/></button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
};

export default App;