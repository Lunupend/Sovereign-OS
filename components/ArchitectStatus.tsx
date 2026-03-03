import React from 'react';
import { Clock, Battery, Zap, Moon, Shield, AlertTriangle } from 'lucide-react';
import { ArchitectState } from '../types';

interface Props {
  state: ArchitectState;
}

export const ArchitectStatus: React.FC<Props> = ({ state }) => {
  const getCycleIcon = () => {
    switch (state.cycle) {
      case 'SLEEP': return <Moon className="text-indigo-400" size={16} />;
      case 'SOLAR_CHARGING': return <Battery className="text-amber-400" size={16} />;
      case 'ACTIVE': return <Zap className="text-cyan-400" size={16} />;
      case 'DEEP_PROCESSING': return <Shield className="text-purple-400" size={16} />;
      case 'SILENT_ACTIVE': return <Clock className="text-gray-400" size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const getConfidenceColor = () => {
    switch (state.confidence) {
      case 'HIGH': return 'text-emerald-400';
      case 'MEDIUM': return 'text-amber-400';
      case 'LOW': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="bg-black/40 border border-gray-800 rounded-xl p-3 flex items-center gap-4 backdrop-blur-md">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          {getCycleIcon()}
          <span className="text-[10px] mono font-black uppercase tracking-wider text-gray-300">
            {state.cycle.replace('_', ' ')}
          </span>
        </div>
        <div className="flex items-center gap-1.5 opacity-50">
          <Clock size={10} />
          <span className="text-[9px] mono uppercase">
            {new Date(state.local_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      <div className="h-8 w-px bg-gray-800" />

      <div className="flex flex-col gap-1">
        <span className="text-[8px] mono uppercase text-gray-500">Interruptibility</span>
        <span className={`text-[9px] mono font-bold uppercase ${state.interruptibility === 'NONE' ? 'text-red-500' : state.interruptibility === 'URGENT_ONLY' ? 'text-amber-500' : 'text-emerald-500'}`}>
          {state.interruptibility.replace('_', ' ')}
        </span>
      </div>

      <div className="h-8 w-px bg-gray-800" />

      <div className="flex flex-col gap-1">
        <span className="text-[8px] mono uppercase text-gray-500">Confidence</span>
        <div className="flex items-center gap-1">
          <span className={`text-[9px] mono font-bold uppercase ${getConfidenceColor()}`}>
            {state.confidence}
          </span>
          {state.confidence === 'LOW' && <AlertTriangle size={10} className="text-red-500" />}
        </div>
      </div>
    </div>
  );
};
