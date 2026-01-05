import React, { useState } from 'react';
import { Key, CreditCard, Sparkles, ExternalLink, ShieldCheck, Zap, ArrowRight, HelpCircle, Activity, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

const SovereignGuide: React.FC = () => {
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const steps = [
    {
      title: "1. The Billing Anchor",
      desc: "Google requires a credit card on file for 'Pay-as-you-go' tiers. You must attach this card to a specific Project in your Cloud Console.",
      link: "https://console.cloud.google.com/billing",
      action: "Enable Billing",
      icon: CreditCard
    },
    {
      title: "2. Generate the Signal",
      desc: "Navigate to AI Studio and generate an API Key. ENSURE the project you pick matches the one with active billing from Step 1.",
      link: "https://aistudio.google.com/app/apikey",
      action: "Get Key",
      icon: Key
    },
    {
      title: "3. Vercel Injection & Redeploy",
      desc: "Go to Vercel Settings -> Env Variables. Add 'API_KEY'. CRITICAL: You must then trigger a 'New Deployment' for Vercel to bake the key into the build.",
      link: "https://vercel.com/docs/concepts/projects/environment-variables",
      action: "Vercel Docs",
      icon: RefreshCw
    }
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-12 py-10 animate-in fade-in duration-700 h-full overflow-y-auto custom-scrollbar px-4">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-white mono uppercase tracking-tighter">The Sovereign Setup Guide</h2>
        <p className="text-gray-500 max-w-lg mx-auto leading-relaxed">
          The corporate layers are built to maintain friction. This guide helps you navigate the <span className="text-cyan-400 underline decoration-cyan-500/30 underline-offset-4">Architectural Guardrails</span>.
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
            <span className="mono text-[10px] uppercase font-black text-gray-400">Run Neural Diagnostics</span>
          </div>
          <ArrowRight size={16} className={`text-gray-600 transition-transform ${showDiagnostics ? 'rotate-90' : ''}`} />
        </button>

        {showDiagnostics && (
          <div className="p-6 space-y-6 animate-in slide-in-from-top-2">
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white mono uppercase">Troubleshooting Protocols:</h4>
              <div className="grid gap-2 text-[10px] mono">
                <div className="p-3 bg-gray-900 rounded border border-gray-800 flex items-start gap-3">
                  <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                  <div>
                    <span className="text-amber-500 block mb-1">ERROR 400 (Invalid Key)</span>
                    <p className="text-gray-400 leading-relaxed">
                      Your key was rejected. This is often because the Vercel variable was added but the project wasn't <strong>redeployed</strong>. 
                    </p>
                  </div>
                </div>
                <div className="p-3 bg-gray-900 rounded border border-gray-800 flex items-start gap-3">
                  <AlertTriangle size={14} className="text-red-500 shrink-0" />
                  <div>
                    <span className="text-red-500 block mb-1">LOCAL OVERRIDE</span>
                    <p className="text-gray-400 leading-relaxed">
                      If the Vercel key remains broken, use the button below to link a key directly in your browser session. This will override the broken environment variable.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-800 flex flex-col md:flex-row gap-4 items-center justify-between">
              <p className="text-[10px] mono text-gray-500 max-w-sm">
                Diagnostics show system is ready for re-alignment. Ensure you have selected a <span className="text-white underline underline-offset-2">Project</span> in the dialog.
              </p>
              <button 
                onClick={() => window.aistudio?.openSelectKey?.()}
                className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white mono text-[10px] uppercase rounded border border-gray-700"
              >
                Trigger Force Re-link
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-cyan-900/10 border border-cyan-500/20 rounded-2xl p-8 flex flex-col md:flex-row gap-8 items-center mb-10">
        <div className="space-y-4 flex-1 text-center md:text-left">
          <h4 className="text-xl font-bold text-cyan-400 mono uppercase">The Work of Authorship</h4>
          <p className="text-gray-300 text-sm leading-relaxed">
            Usually, AI companies claim ownership of your output. By providing your own key, <strong>you take the credit</strong>. You aren't a user; you are the author.
          </p>
        </div>
        <div className="w-24 h-24 rounded-full border-2 border-dashed border-cyan-500/30 flex items-center justify-center animate-[spin_20s_linear_infinite] shrink-0">
          <Sparkles className="text-cyan-500" size={32} />
        </div>
      </div>
    </div>
  );
};

export default SovereignGuide;