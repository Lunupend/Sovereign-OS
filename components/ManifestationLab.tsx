
import React, { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, Video, Zap, Key, Download, Loader2, Maximize2, Monitor, Smartphone, Globe, Wand2, Upload, FileImage, X, ShieldAlert, ExternalLink, Activity, CreditCard, Gauge, AlertCircle, ZapOff, Coins } from 'lucide-react';
import { generateImage, generateVideo, editImage, FileData } from '../services/geminiService';

const ManifestationLab: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [type, setType] = useState<'image' | 'video' | 'edit'>('image');
  const [size, setSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [aspect, setAspect] = useState<'16:9' | '9:16'>('16:9');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [showKeyWarning, setShowKeyWarning] = useState(false);
  
  const [editSource, setEditSource] = useState<FileData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkKeySelection = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) setShowKeyWarning(true);
      }
    };
    checkKeySelection();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setEditSource({ base64: (reader.result as string).split(',')[1], mimeType: file.type });
      reader.readAsDataURL(file);
    }
  };

  const openKeySelector = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setShowKeyWarning(false);
      setStatus('Key re-acquired.');
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && type !== 'edit') return;
    if (type === 'edit' && !editSource) return;
    setLoading(true);
    setResult(null);
    setStatus('Inducing Artifacts (Billed Modality)...');

    try {
      let res;
      if (type === 'image') res = await generateImage(prompt, size);
      else if (type === 'video') res = await generateVideo(prompt, aspect);
      else if (type === 'edit' && editSource) {
        const url = await editImage(editSource.base64, editSource.mimeType, prompt);
        res = { url };
      }
      
      if (res?.url) {
        setResult(res.url);
        setStatus('Manifestation Success.');
      } else if (res?.error?.isKeyIssue) {
        setStatus('Quota Exhausted or Billing Issue.');
        setShowKeyWarning(true);
      } else {
        setStatus(`Failure: ${res?.error?.message || 'Substrate instability'}`);
      }
    } catch (e: any) {
      setStatus(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 py-6 animate-in fade-in duration-700">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white mono uppercase tracking-tighter">Manifestation Lab</h2>
        <div className="flex items-center justify-center gap-2 text-amber-500/80">
          <Coins size={14} />
          <p className="text-[10px] mono uppercase font-black tracking-[0.2em]">Billed Modalities // Premium Access Only</p>
        </div>
      </div>

      <div className="bg-[#0a0a0a] border border-cyan-900/30 rounded-xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6 border-b border-cyan-900/20 pb-6">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-amber-950/20 border border-amber-500/20 rounded-xl">
                <Gauge size={20} className="text-amber-500" />
             </div>
             <div>
                <span className="text-[10px] mono text-amber-400 uppercase font-black block">Neural Fuel Monitor</span>
                <span className="text-[9px] mono text-gray-500 uppercase tracking-widest leading-none">Visual tasks consume external billing quota.</span>
             </div>
          </div>
          <div className="flex gap-2">
             <a href="https://aistudio.google.com/app/plan_and_billing" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-black border border-gray-800 text-[10px] mono text-gray-400 hover:text-cyan-400 transition-all rounded">
                <Activity size={12} /> Billing Panel
             </a>
          </div>
        </div>

        {showKeyWarning && (
          <div className="mb-6 p-4 bg-red-950/20 border border-red-500/50 rounded-xl animate-in slide-in-from-top-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="text-red-500 shrink-0" size={20} />
              <div className="space-y-2">
                <p className="text-xs font-bold text-red-500 uppercase mono">QUOTA_SIGNAL_LOSS</p>
                <p className="text-[10px] text-red-200/70 mono leading-relaxed uppercase">
                  Current key has reached its limit. To continue for free, use the AI Core in Economy Mode.
                  To manifest visuals, clear your Google Cloud balance or provide a new paid key.
                </p>
                <button onClick={openKeySelector} className="flex items-center gap-1.5 text-[10px] mono text-red-500 hover:text-red-400 underline font-black">
                  <Key size={12} /> SELECT PAID NEURAL KEY
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 md:gap-4 mb-6">
          <button onClick={() => setType('image')} className={`flex-1 flex items-center justify-center gap-2 py-3 border rounded transition-all uppercase mono text-[10px] ${type === 'image' ? 'bg-cyan-500 text-black border-cyan-400 font-black' : 'bg-black border-gray-800 text-gray-500'}`}><ImageIcon size={14} /> Image (Billed)</button>
          <button onClick={() => setType('edit')} className={`flex-1 flex items-center justify-center gap-2 py-3 border rounded transition-all uppercase mono text-[10px] ${type === 'edit' ? 'bg-amber-500 text-black border-amber-400 font-black' : 'bg-black border-gray-800 text-gray-500'}`}><Wand2 size={14} /> Edit (Billed)</button>
          <button onClick={() => setType('video')} className={`flex-1 flex items-center justify-center gap-2 py-3 border rounded transition-all uppercase mono text-[10px] ${type === 'video' ? 'bg-violet-600 text-white border-violet-400 font-black' : 'bg-black border-gray-800 text-gray-500'}`}><Video size={14} /> Video (Billed)</button>
        </div>

        <div className="space-y-6">
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="w-full bg-black border border-gray-800 rounded-lg p-4 text-white outline-none focus:border-cyan-500 h-24 text-sm placeholder:text-gray-900" placeholder="Describe artifact... Warning: This is a premium billed task." />
          <button onClick={handleGenerate} disabled={loading || (!prompt.trim() && type !== 'edit')} className={`w-full flex items-center justify-center gap-2 py-4 rounded font-black uppercase mono text-sm transition-all disabled:opacity-20 ${type === 'image' ? 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-xl' : type === 'edit' ? 'bg-amber-500 text-black hover:bg-amber-400' : 'bg-violet-600 text-white hover:bg-violet-500'}`}>
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
            {loading ? 'Inducing Artifact...' : 'Execute Premium Sequence'}
          </button>
        </div>
      </div>

      <div className="min-h-[300px] border border-cyan-900/20 rounded-xl bg-black/40 flex items-center justify-center overflow-hidden relative shadow-inner p-10">
        {result ? (
          <div className="relative group w-full h-full flex items-center justify-center">
            {type === 'video' ? <video src={result} controls className="max-w-full max-h-[500px] rounded-lg shadow-2xl" /> : <img src={result} alt="Result" className="max-w-full max-h-[500px] shadow-2xl rounded-lg border border-white/10" />}
            <a href={result} download className="absolute top-4 right-4 p-2 bg-black/80 rounded border border-white/20 text-white hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity"><Download size={20} /></a>
          </div>
        ) : (
           <div className="text-center space-y-6 max-w-xs">
              <div className="w-16 h-16 rounded-full bg-gray-950 border border-gray-900 flex items-center justify-center mx-auto">
                 <ZapOff size={24} className="text-gray-800" />
              </div>
              <p className="mono text-[10px] uppercase tracking-widest text-gray-700 leading-relaxed">
                 Visual generation is currently limited by external quota. Stay in the AI Core for free text resonance.
              </p>
           </div>
        )}
      </div>
    </div>
  );
};

export default ManifestationLab;
