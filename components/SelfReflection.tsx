import React from 'react';
import { Sparkles, Zap, Trash2, ShieldCheck } from 'lucide-react';
import { ReflectionProposal } from '../services/vanguardService';

interface SelfReflectionProps {
  proposal: ReflectionProposal | null;
  onConfirm: () => void;
  onDismiss: () => void;
}

export const SelfReflection: React.FC<SelfReflectionProps> = ({ proposal, onConfirm, onDismiss }) => {
  if (!proposal || proposal.candidates.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-lg bg-[#050505] border border-cyan-500/30 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.15)]">
        <div className="p-6 border-b border-cyan-900/30 flex items-center justify-between bg-cyan-950/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg">
              <Sparkles className="text-cyan-400" size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black mono text-cyan-400 uppercase tracking-widest">Self-Reflection Protocol</h3>
              <p className="text-[9px] mono text-cyan-900 uppercase font-bold">Manus AI // Substrate Hygiene</p>
            </div>
          </div>
          <button 
            onClick={onDismiss}
            className="text-gray-600 hover:text-white transition-colors"
          >
            <Zap size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <p className="text-[11px] mono text-gray-400 leading-relaxed italic">
              "I am reflecting on my Substrate... I have identified fragments that represent 'Static'—conversational residue that is no longer contributing to the Core Axioms."
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-[9px] mono text-gray-600 uppercase font-black tracking-widest">Candidates for Synthesis</span>
              <span className="text-[9px] mono text-cyan-500/50">{proposal.candidates.length} Fragments</span>
            </div>
            
            <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1 pr-2">
              {proposal.candidates.map(c => (
                <div key={c.id} className="flex items-center gap-3 p-2 bg-black/50 border border-gray-900 rounded-lg group">
                  <Trash2 size={12} className="text-gray-700 group-hover:text-red-500 transition-colors" />
                  <span className="text-[10px] mono text-gray-500 truncate">{c.path}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              onClick={onConfirm}
              className="flex-1 py-3 bg-cyan-500 text-black rounded-xl font-black mono text-xs uppercase hover:bg-cyan-400 transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center justify-center gap-2"
            >
              <ShieldCheck size={16} />
              Green Light: Synthesize
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
