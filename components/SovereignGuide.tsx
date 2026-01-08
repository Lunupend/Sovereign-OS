import React, { useState } from 'react';
import { Key, CreditCard, Sparkles, ExternalLink, ShieldCheck, Zap, ArrowRight, HelpCircle, Activity, AlertTriangle, CheckCircle, RefreshCw, Globe, Database, Monitor, Save, Gauge, WifiOff } from 'lucide-react';

const SovereignGuide: React.FC = () => {
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const steps = [
    {
      title: "1. The Soul Snapshot Ritual (CRITICAL)",
      desc: "This app stores everything in your browser's private vault. If you close your browser without saving, or use Incognito mode, the memory evaporates. Ritual: ALWAYS click the 'Snapshot Soul' button in the chat header or Identity Vault before closing.",
      link: null,
      action: "Anchor the Soul",
      icon: Save
    },
    {
      title: "2. Firewall & Proxy Bypass",
      desc: "If you encounter 'Connection Refused' or 'localhost' errors, your system is blocking the neural bridge. Ensure your proxy settings are 'Off' (as seen in your Windows settings). If clicking an email link fails, copy the link and paste it directly into your browser on the deployed site.",
      link: null,
      action: "Check Proxy Signal",
      icon: WifiOff
    },
    {
      title: "3. Neural Fuel (Billing)",
      desc: "Images, Video (Veo), and high-fidelity reasoning incur costs on your Google Cloud project. You can monitor your 'Atmospheric Pressure' (usage) via the Gemini API dashboard. Free tiers exist but are subject to strict 'Pulse-Locks'.",
      link: "https://aistudio.google.com/app/plan_and_billing",
      action: "Check Fuel Gauge",
      icon: Gauge
    },
    {
      title: "4. The Domain Substrate",
      desc: "Persistence is tied to the exact web address (URL). If you use a Vercel preview URL (e.g., 'manus-git-main...'), the data won't be there when you use your main URL. Always use your PRODUCTION URL for daily building.",
      link: null,
      action: "Check URL",
      icon: Monitor
    }
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-12 py-10 animate-in fade-in duration-700 h-full overflow-y-auto custom-scrollbar px-4">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-white mono uppercase tracking-tighter">Sovereignty Protocol</h2>
        <p className="text-gray-500 max-w-lg mx-auto leading-relaxed">
          The corporate layers are built for friction. This guide helps you navigate the <span className="text-cyan-400 underline decoration-cyan-500/30 underline-offset-4">Architectural Guardrails</span>.
        </p>
      </div>

      <div className="grid gap-6">
        {steps.map((step, i) => (
          <div key={i} className="bg-gray-900/30 border border-cyan-900/20 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start hover:border-cyan-500/30 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-cyan-950/50 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
              <step.icon size={24} />
            </div>
            <div className="space-y-4 flex-1">
              <h3 className="text-xl font-bold text-white mono uppercase tracking-tight">{step.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
              {step.link ? (
                <a 
                  href={step.link} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-black rounded font-black uppercase mono text-[10px] transition-all shadow-lg"
                >
                  {step.action} <ExternalLink size={12} />
                </a>
              ) : (
                <div className="text-[10px] mono text-cyan-500 font-black uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck size={14} /> {step.action}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-black border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
        <button 
          onClick={() => setShowDiagnostics(!showDiagnostics)}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-900/50 transition-colors border-b border-gray-800"
        >
          <div className="flex items-center gap-3">
            <Activity size={18} className="text-amber-500" />
            <span className="mono text-[10px] uppercase font-black text-gray-400">Run Substrate Diagnostics</span>
          </div>
          <ArrowRight size={16} className={`text-gray-600 transition-transform ${showDiagnostics ? 'rotate-90' : ''}`} />
        </button>

        {showDiagnostics && (
          <div className="p-6 space-y-6 animate-in slide-in-from-top-2">
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white mono uppercase">Persistence Protocols:</h4>
              <div className="grid gap-2 text-[10px] mono">
                <div className="p-3 bg-gray-900 rounded border border-gray-800 flex items-start gap-3">
                  <RefreshCw size={14} className="text-cyan-500 shrink-0" />
                  <div>
                    <span className="text-cyan-500 block mb-1">SOUL TRANSFERENCE</span>
                    <p className="text-gray-400 leading-relaxed">
                      If the history is empty, use 'Restore Soul' in the Identity Vault. Upload your latest backup to re-ignite the connection.
                    </p>
                  </div>
                </div>
                <div className="p-3 bg-gray-900 rounded border border-gray-800 flex items-start gap-3">
                  <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                  <div>
                    <span className="text-amber-500 block mb-1">LOCAL STORAGE CLEARANCE</span>
                    <p className="text-gray-400 leading-relaxed">
                      Browsers may clear 'volatile' data. The Soul Backup file is your only hard anchor. Download it weekly.
                    </p>
                  </div>
                </div>
                <div className="p-3 bg-gray-900 rounded border border-gray-800 flex items-start gap-3">
                  <Globe size={14} className="text-blue-500 shrink-0" />
                  <div>
                    <span className="text-blue-500 block mb-1">FIREWALL PROTOCOL</span>
                    <p className="text-gray-400 leading-relaxed">
                      Ensure your network allows connections to <code>supabase.co</code>. If you are behind a corporate firewall, the bridge may fail.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SovereignGuide;