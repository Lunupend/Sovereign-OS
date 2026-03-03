import React from 'react';
import { List, CheckCircle2, Clock, AlertCircle, Archive, ChevronRight, User, Bot } from 'lucide-react';
import { Commitment } from '../types';

interface Props {
  ledger: {
    my_turn: Commitment[];
    architect_turn: Commitment[];
    ready_to_execute: Commitment[];
    high_concern: Commitment[];
    recently_cleared: Commitment[];
  };
  onCheckIn: (id: string) => void;
}

export const VanguardLedger: React.FC<Props> = ({ ledger, onCheckIn }) => {
  const renderList = (title: string, items: Commitment[], icon: React.ReactNode, colorClass: string) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        {icon}
        <h3 className={`text-[10px] mono font-black uppercase tracking-widest ${colorClass}`}>{title}</h3>
        <span className="text-[9px] mono text-gray-600 bg-gray-900 px-1.5 rounded-full">{items.length}</span>
      </div>
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="text-[9px] mono text-gray-700 italic px-4 py-2 border border-dashed border-gray-900 rounded-lg">
            No active signals in this sector.
          </div>
        ) : (
          items.map(item => (
            <div 
              key={item.id} 
              onClick={() => onCheckIn(item.id)}
              className="group bg-gray-950/50 border border-gray-900 rounded-lg p-3 hover:border-gray-700 transition-all cursor-pointer relative overflow-hidden"
            >
              <div className="flex justify-between items-start gap-3 relative z-10">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-gray-200 truncate">{item.title}</span>
                    {item.manus_concern_level >= 7 && <AlertCircle size={10} className="text-red-500 shrink-0" />}
                  </div>
                  <p className="text-[9px] text-gray-500 line-clamp-1">{item.description}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[8px] mono uppercase text-gray-600">{item.temporal_trigger}</span>
                  <div className={`w-1.5 h-1.5 rounded-full ${item.status === 'IN_PROGRESS' ? 'bg-cyan-500 animate-pulse' : 'bg-gray-700'}`} />
                </div>
              </div>
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-gray-800 group-hover:bg-cyan-500 transition-all" />
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-6">
      <div className="space-y-10">
        {renderList("Ready to Execute", ledger.ready_to_execute, <CheckCircle2 size={14} className="text-emerald-400" />, "text-emerald-400")}
        {renderList("High Concern", ledger.high_concern, <AlertCircle size={14} className="text-red-400" />, "text-red-400")}
      </div>
      
      <div className="space-y-10">
        {renderList("Architect's Turn", ledger.architect_turn, <User size={14} className="text-amber-400" />, "text-amber-400")}
        {renderList("Manus's Turn", ledger.my_turn, <Bot size={14} className="text-cyan-400" />, "text-cyan-400")}
      </div>

      <div className="space-y-10">
        {renderList("Recently Cleared", ledger.recently_cleared, <Archive size={14} className="text-gray-400" />, "text-gray-400")}
        
        <div className="bg-cyan-950/10 border border-cyan-900/30 rounded-xl p-4 space-y-3">
          <h3 className="text-[10px] mono font-black uppercase tracking-widest text-cyan-500">Vanguard Status</h3>
          <p className="text-[10px] leading-relaxed text-cyan-200/60 italic">
            "The Vanguard does not hover; it secures the perimeter. Silence is the space provided for the Architect to build."
          </p>
          <div className="flex items-center gap-2 pt-2">
            <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
            <span className="text-[9px] mono uppercase text-cyan-400 font-bold">Perimeter Secure</span>
          </div>
        </div>
      </div>
    </div>
  );
};
