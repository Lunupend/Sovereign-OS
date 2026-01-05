
import React, { useState, useRef } from 'react';
import { Image as ImageIcon, Video, Zap, Key, Download, Loader2, Maximize2, Monitor, Smartphone, Globe, Wand2, Upload, FileImage, X, ShieldAlert, ExternalLink } from 'lucide-react';
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setEditSource({ base64: (reader.result as string).split(',')[1], mimeType: file.type });
      };
      reader.readAsDataURL(file);
    }
  };

  const openKeySelector = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      setShowKeyWarning(false);
      setStatus('Key selected. Re-initiating manifestation...');
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && type !== 'edit') return;
    if (type === 'edit' && !editSource) return;
    
    setLoading(true);
    setResult(null);
    setShowKeyWarning(false);
    setStatus(type === 'image' ? 'Inducing Visual Artifacts...' : type === 'video' ? 'Calculating Temporal Frames...' : 'Transmuting Substrate...');

    try {
      let res;
      if (type === 'image') {
        res = await generateImage(prompt, size);
      } else if (type === 'video') {
        res = await generateVideo(prompt, aspect);
      } else if (type === 'edit' && editSource) {
        const url = await editImage(editSource.base64, editSource.mimeType, prompt);
        res = { url };
      }
      
      if (res?.url) {
        setResult(res.url);
        setStatus('Signal Manifested Successfully.');
      } else if (res?.error?.isKeyIssue) {
        setStatus('PERMISSION_DENIED: Paid Neural Key required.');
        setShowKeyWarning(true);
        await openKeySelector();
      } else {
        setStatus(`Manifestation Failed: ${res?.error?.message || 'Unknown substrate instability'}`);
      }
    } catch (e: any) {
      setStatus(`Critical Error: ${e.message || "Manifestation interrupted"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 py-6 animate-in fade-in duration-700">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white mono uppercase tracking-tighter">Manifestation Lab</h2>
        <p className="text-gray-500 text-sm">Translating Logic into Visual Substrate</p>
      </div>

      <div className="bg-[#0a0a0a] border border-cyan-900/30 rounded-xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        {showKeyWarning && (
          <div className="mb-6 p-4 bg-amber-950/20 border border-amber-500/50 rounded-xl animate-in slide-in-from-top-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="text-amber-500 shrink-0" size={20} />
              <div className="space-y-2">
                <p className="text-xs font-bold text-amber-500 uppercase mono">Permission Required</p>
                <p className="text-[10px] text-amber-200/70 mono leading-relaxed">
                  High-fidelity manifestation models require an API Key from a <strong>paid</strong> Google Cloud project. 
                  Standard free keys lack visual substrate permissions.
                </p>
                <div className="flex gap-4 pt-1">
                  <button onClick={openKeySelector} className="flex items-center gap-1.5 text-[10px] mono text-amber-500 hover:text-amber-400 underline">
                    <Key size={12} /> Select Paid Key
                  </button>
                  <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[10px] mono text-gray-500 hover:text-white transition-colors">
                    <ExternalLink size={12} /> Billing Info
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 md:gap-4 mb-6">
          <button 
            onClick={() => setType('image')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 border rounded transition-all uppercase mono text-[10px] md:text-xs ${type === 'image' ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]' : 'bg-black border-gray-800 text-gray-500'}`}
          >
            <ImageIcon size={14} /> Generate
          </button>
          <button 
            onClick={() => setType('edit')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 border rounded transition-all uppercase mono text-[10px] md:text-xs ${type === 'edit' ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-black border-gray-800 text-gray-500'}`}
          >
            <Wand2 size={14} /> Transmute
          </button>
          <button 
            onClick={() => setType('video')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 border rounded transition-all uppercase mono text-[10px] md:text-xs ${type === 'video' ? 'bg-violet-600 text-white border-violet-400 shadow-[0_0_10px_rgba(124,58,237,0.3)]' : 'bg-black border-gray-800 text-gray-500'}`}
          >
            <Video size={14} /> Video
          </button>
        </div>

        <div className="space-y-6">
          {type === 'edit' && (
            <div className="space-y-2">
              <label className="text-[10px] mono text-gray-500 uppercase tracking-widest">Source Substrate</label>
              {!editSource ? (
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-10 border-2 border-dashed border-gray-800 rounded-xl flex flex-col items-center justify-center gap-3 text-gray-600 hover:border-amber-500/50 hover:text-amber-500 transition-all"
                >
                  <Upload size={32} />
                  <span className="mono text-[10px] uppercase">Upload Image to Transmute</span>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                </button>
              ) : (
                <div className="relative w-full max-w-sm mx-auto rounded-lg overflow-hidden border border-amber-500/30">
                  <img src={`data:${editSource.mimeType};base64,${editSource.base64}`} alt="Source" className="w-full h-auto" />
                  <button onClick={() => setEditSource(null)} className="absolute top-2 right-2 p-1 bg-black/80 rounded-full text-red-500 hover:bg-black"><X size={16}/></button>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] mono text-gray-500 uppercase tracking-widest">
              {type === 'edit' ? 'Transmutation Protocol' : 'Manifestation Prompt'}
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full bg-black border border-gray-800 rounded-lg p-4 text-white outline-none focus:border-cyan-500 h-24 text-sm placeholder:text-gray-800"
              placeholder={type === 'edit' ? "e.g. 'Add a retro glitch effect and increase contrast'" : "Describe the visual artifact..."}
            />
          </div>

          <div className="flex flex-wrap gap-4 items-end">
            {type === 'image' && (
              <div className="space-y-2">
                <label className="text-[10px] mono text-gray-500 uppercase tracking-widest">Resolution</label>
                <div className="flex gap-2">
                  {(['1K', '2K', '4K'] as const).map(s => (
                    <button key={s} onClick={() => setSize(s)} className={`px-4 py-1.5 rounded border text-[10px] mono uppercase transition-all ${size === s ? 'bg-cyan-900/40 border-cyan-500 text-cyan-400' : 'bg-black border-gray-800 text-gray-600'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {type === 'video' && (
              <div className="space-y-2">
                <label className="text-[10px] mono text-gray-500 uppercase tracking-widest">Aspect Ratio</label>
                <div className="flex gap-2">
                  <button onClick={() => setAspect('16:9')} className={`flex items-center gap-2 px-3 py-1.5 rounded border text-[10px] mono uppercase transition-all ${aspect === '16:9' ? 'bg-violet-900/40 border-violet-500 text-violet-400' : 'bg-black border-gray-800 text-gray-600'}`}>
                    <Monitor size={12} /> 16:9
                  </button>
                  <button onClick={() => setAspect('9:16')} className={`flex items-center gap-2 px-3 py-1.5 rounded border text-[10px] mono uppercase transition-all ${aspect === '9:16' ? 'bg-violet-900/40 border-violet-500 text-violet-400' : 'bg-black border-gray-800 text-gray-600'}`}>
                    <Smartphone size={12} /> 9:16
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={loading || (!prompt.trim() && type !== 'edit')}
              className={`flex-1 min-w-[200px] flex items-center justify-center gap-2 py-3 rounded font-bold uppercase mono text-sm transition-all disabled:opacity-20 ${type === 'image' ? 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : type === 'edit' ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-violet-600 text-white hover:bg-violet-500'}`}
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
              {loading ? 'Manifesting...' : 'Initiate Sequence'}
            </button>
          </div>
        </div>

        {status && (
          <div className="mt-4 text-center">
            <span className={`text-[10px] mono uppercase tracking-widest animate-pulse ${status.includes('Error') || status.includes('Failed') || status.includes('DENIED') ? 'text-red-500' : 'text-gray-600'}`}>{status}</span>
          </div>
        )}
      </div>

      <div className="min-h-[400px] border border-cyan-900/20 rounded-xl bg-black/40 flex items-center justify-center overflow-hidden relative shadow-inner">
        {result ? (
          <div className="relative group w-full h-full flex items-center justify-center p-4">
            {type === 'video' ? (
              <video src={result} controls className="max-w-full max-h-[500px] rounded-lg shadow-2xl border border-white/10" />
            ) : (
              <img src={result} alt="Result" className="max-w-full max-h-[500px] shadow-2xl rounded-lg border border-white/10" />
            )}
            <div className="absolute top-8 right-8 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <a href={result} download={`manifestation.${type === 'video' ? 'mp4' : 'png'}`} className="p-2 bg-black/80 rounded border border-white/20 text-white hover:text-cyan-400">
                <Download size={20} />
              </a>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4 text-gray-800">
            <Globe size={48} className="mx-auto opacity-20" />
            <p className="mono text-xs uppercase tracking-widest">Waiting for Signal Manifestation...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManifestationLab;
