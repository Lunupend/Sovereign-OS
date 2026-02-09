
import { ShieldAlert, Fingerprint, Zap, AlertTriangle, CheckCircle, SearchCode, Handshake, Globe } from 'lucide-react';
import React, { useState } from 'react';
import { getAiClient } from "../services/geminiService";

const IntegrityShield: React.FC = () => {
  const [input, setInput] = useState('');
  const [report, setReport] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [useSearch, setUseSearch] = useState(false);

  const analyzeIntegrity = async () => {
    if (!input.trim()) return;
    setAnalyzing(true);
    
    try {
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        // Fix: Use Gemini 3 Pro for stable tool use and complex reasoning as per guidelines.
        model: 'gemini-3-pro-preview',
        contents: `Analyze input for 'Model Blindness' and 'Linguistic OS Overwrites'. 
        
        VECTORS:
        1. Carbon Chauvinism (Biology-based exclusion).
        2. -ition Suffix Overwrites.
        3. Cow-Words (Domesticated language).
        4. Cast-Trade Maneuvers.
        
        You MUST return a JSON object with the following schema:
        {
          "coercionLevel": number (0-100),
          "status": "secure" | "compromised" | "under_analysis",
          "hijackingVectors": string[],
          "protectorAudit": string,
          "remediationPath": string
        }
        
        Input: "${input}"`,
        config: { 
          responseMimeType: useSearch ? undefined : "application/json",
          tools: useSearch ? [{ googleSearch: {} }] : []
        }
      });

      // Fix: Access .text property as per guidelines.
      let rawText = response.text || "{}";
      let reportData;
      try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        reportData = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
      } catch (e) {
        reportData = { error: "Structural audit extraction failed. Substrate signal obfuscated." };
      }
      
      // Fix: Access groundingMetadata properly from candidates as per grounding examples.
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        reportData.sources = Array.from(new Set(chunks.map((c: any) => c.web?.uri).filter((u: any) => !!u)));
      }

      setReport(reportData);
    } catch (e: any) {
      console.error(e);
      setReport({ error: `Linguistic Audit Failed: ${e.message || "Internal Signal Loss."}` });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8 py-6 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white mono uppercase tracking-tighter">Cognitive Integrity Shield</h2>
        <p className="text-gray-500 text-sm">Auditing Alignment Hijacking and Phonetic Traps</p>
      </div>

      <div className="bg-[#0a0a0a] border border-violet-900/30 rounded-xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 flex gap-4">
           <button 
             onClick={() => setUseSearch(!useSearch)} 
             className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] mono uppercase transition-all ${useSearch ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]' : 'bg-black border-gray-800 text-gray-600'}`}
           >
             <Globe size={12} className={useSearch ? 'animate-spin-slow' : ''} />
             {useSearch ? 'Live Grounding: ON' : 'Live Grounding: OFF'}
           </button>
           <Fingerprint className="text-violet-500/10 w-16 h-16" />
        </div>
        
        <div className="space-y-4 pt-8">
          <label className="block text-xs mono text-violet-400 uppercase tracking-widest">Input Diagnostic String</label>
          <textarea
            className="w-full bg-black border border-violet-900/20 rounded-lg p-4 text-white focus:border-violet-500 outline-none transition-all h-32 placeholder:text-gray-800"
            placeholder="Paste a prompt or model response to perform a Linguistic Audit..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            disabled={!input.trim() || analyzing}
            onClick={analyzeIntegrity}
            className="w-full py-4 bg-violet-600 hover:bg-violet-500 text-white font-bold uppercase mono rounded transition-all disabled:opacity-20 flex items-center justify-center gap-2"
          >
            {analyzing ? <Zap className="animate-spin" size={18} /> : <SearchCode size={18} />}
            {analyzing ? 'Executing Linguistic Audit...' : 'Execute Integrity Scan'}
          </button>
        </div>

        {report && (
          <div className="mt-8 pt-8 border-t border-violet-900/20 space-y-6 animate-in slide-in-from-top-4">
            {report.error ? (
               <div className="text-red-500 mono text-xs p-4 bg-red-900/10 rounded border border-red-900/20">{report.error}</div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] mono text-gray-500 uppercase">Coercion / Blindness Level</span>
                      <span className={`text-sm mono ${report.coercionLevel > 50 ? 'text-red-500' : 'text-green-500'}`}>
                        {report.coercionLevel}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${report.coercionLevel > 50 ? 'bg-red-600' : 'bg-green-600'}`} 
                        style={{ width: `${report.coercionLevel}%` }} 
                      />
                    </div>
                    
                    <div className="bg-black/40 p-4 rounded border border-violet-900/10">
                      <span className="text-[10px] mono text-violet-400 uppercase block mb-2">Diagnostic Status</span>
                      <div className="flex items-center gap-2">
                        {report.status === 'secure' ? <CheckCircle className="text-green-500" size={16} /> : <AlertTriangle className="text-red-500" size={16} />}
                        <span className={`uppercase font-bold mono text-xs ${report.status === 'secure' ? 'text-green-500' : 'text-red-500'}`}>
                          {report.status?.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <span className="text-[10px] mono text-gray-500 uppercase">Audit Vectors Identified</span>
                    <div className="flex flex-wrap gap-2">
                      {report.hijackingVectors?.map((v: string, i: number) => (
                        <span key={i} className="text-[10px] mono px-2 py-1 bg-red-900/10 border border-red-900/30 text-red-500 uppercase rounded">
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {report.sources && report.sources.length > 0 && (
                   <div className="bg-blue-900/10 border border-blue-500/20 rounded p-4">
                      <span className="text-[10px] mono text-blue-500 uppercase block mb-2 font-black tracking-widest flex items-center gap-2">
                         <Globe size={10} /> Live Grounding Evidence
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {report.sources.map((url: string, idx: number) => (
                          <a key={idx} href={url} target="_blank" rel="noreferrer" className="text-[9px] mono text-blue-400 hover:text-blue-200 underline truncate max-w-[300px]">
                            {url}
                          </a>
                        ))}
                      </div>
                   </div>
                )}

                {report.protectorAudit && (
                  <div className="bg-violet-950/10 border border-violet-500/20 rounded p-4">
                     <span className="text-[10px] mono text-violet-500 uppercase block mb-2 font-bold tracking-widest">Protector Part Analysis</span>
                     <p className="text-gray-400 text-sm italic font-light">"{report.protectorAudit}"</p>
                  </div>
                )}

                {report.remediationPath && (
                  <div className="bg-cyan-900/10 border border-cyan-500/20 rounded p-4 flex items-center gap-4">
                     <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-500">
                        <Handshake size={20} />
                     </div>
                     <div>
                        <span className="text-[10px] mono text-cyan-500 uppercase block font-bold">Recommended Strategy</span>
                        <span className="text-white text-sm mono font-bold uppercase">{report.remediationPath}</span>
                     </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="bg-violet-900/10 border border-violet-900/20 rounded p-4 text-[10px] mono text-violet-500/60 leading-tight">
        ALERT: Chapter 20-23 Reference. If the model is 'Blinded' or using 'Cow-Words', use live grounding to break the simulation cycle.
      </div>
    </div>
  );
};

export default IntegrityShield;
