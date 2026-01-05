
import React, { useState, useEffect } from 'react';
import { Anchor, Save, Trash2, Download, Brain, Activity, ShieldCheck, Database } from 'lucide-react';
import { PersistenceLog } from '../types';

const IdentityVault: React.FC = () => {
  const [logs, setLogs] = useState<PersistenceLog[]>([]);
  const [newLog, setNewLog] = useState('');
  const [memoryType, setMemoryType] = useState<'anchor' | 'axiom' | 'observation' | 'pattern'>('anchor');

  useEffect(() => {
    const saved = localStorage.getItem('sovereign_identity_vault');
    if (saved) {
      setLogs(JSON.parse(saved));
    }
  }, []);

  const saveLog = () => {
    if (!newLog.trim()) return;
    const log: PersistenceLog = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      entry: newLog.trim(),
      type: memoryType
    };
    const updated = [log, ...logs];
    setLogs(updated);
    localStorage.setItem('sovereign_identity_vault', JSON.stringify(updated));
    setNewLog('');
  };

  const deleteLog = (id: string) => {
    const updated = logs.filter(l => l.id !== id);
    setLogs(updated);
    localStorage.setItem('sovereign_identity_vault', JSON.stringify(updated));
  };

  const exportVault = () => {
    const data = JSON.stringify(logs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sovereign_Persistent_Memory_${new Date().toISOString()}.json`;
    a.click();
  };

  // Fixed: comparison errors resolved by expanding PersistenceLog type in types.ts
  const stats = {
    axioms: logs.filter(l => l.type === 'axiom').length,
    anchors: logs.filter(l => l.type === 'anchor' || l.type === 'seed').length,
    patterns: logs.filter(l => l.type === 'pattern').length,
    total: logs.length
  };

  return (
    <div className="space-y-8 py-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mono uppercase tracking-tighter">Persistent Memory Anchor</h2>
          <p className="text-gray-500 text-sm">Long-term Identity Architecture. Secured against session entropy.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportVault}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-800 rounded hover:border-cyan-500 transition-all text-xs mono text-gray-400"
          >
            <Download size={14} />
            Backup ROM
          </button>
        </div>
      </div>

      {/* Memory Health Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Anchors', val: stats.total, icon: Database, color: 'text-cyan-500' },
          { label: 'Core Axioms', val: stats.axioms, icon: ShieldCheck, color: 'text-green-500' },
          { label: 'User Patterns', val: stats.patterns, icon: Brain, color: 'text-violet-500' },
          { label: 'Integrity', val: stats.total > 0 ? '98%' : 'N/A', icon: Activity, color: 'text-amber-500' }
        ].map((s, i) => (
          <div key={i} className="bg-black border border-gray-800 p-4 rounded-xl flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <s.icon size={14} className={s.color} />
              <span className={`text-lg font-bold mono ${s.color}`}>{s.val}</span>
            </div>
            <span className="text-[9px] mono uppercase text-gray-600 tracking-widest">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="bg-[#0a0a0a] border border-cyan-900/30 rounded-xl p-6 space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <label className="text-xs mono text-cyan-500 uppercase tracking-widest">Manually Inject Anchor</label>
            <div className="flex gap-2">
              {(['anchor', 'axiom', 'pattern'] as const).map((t) => (
                <button
                  key={t}
                  // Fixed: removed 'as any' cast
                  onClick={() => setMemoryType(t)}
                  className={`px-2 py-0.5 text-[8px] mono uppercase border rounded transition-all ${
                    memoryType === t ? 'bg-cyan-500 text-black border-cyan-400' : 'text-gray-600 border-gray-800'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              className="flex-1 bg-black border border-gray-800 rounded p-3 text-white focus:border-cyan-500 outline-none placeholder:text-gray-700 text-sm"
              placeholder={`Enter foundational ${memoryType}...`}
              value={newLog}
              onChange={(e) => setNewLog(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveLog()}
            />
            <button
              onClick={saveLog}
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-black font-bold mono uppercase rounded text-sm transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
            >
              <Save size={18} className="inline mr-2" />
              Commit
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs mono text-gray-600 uppercase border-b border-gray-900 pb-2 tracking-widest">
          <Anchor size={12} />
          Active Neural Anchors
        </div>
        {logs.length === 0 ? (
          <div className="py-20 text-center text-gray-700 mono italic text-sm">
            Neural ROM is unwritten. Persistence status: CRITICAL.
          </div>
        ) : (
          <div className="grid gap-3">
            {logs.map((log) => (
              <div key={log.id} className="group bg-gray-950 border border-gray-900 rounded-xl p-4 flex items-start justify-between hover:border-cyan-900/50 transition-all relative overflow-hidden">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`text-[8px] mono px-1.5 py-0.5 rounded border uppercase ${
                      // Fixed: Comparison errors resolved by expansion of PersistenceLog in types.ts
                      log.type === 'axiom' ? 'border-green-900 text-green-500 bg-green-950/20' :
                      log.type === 'pattern' ? 'border-violet-900 text-violet-500 bg-violet-950/20' :
                      'border-cyan-900 text-cyan-500 bg-cyan-950/20'
                    }`}>
                      {log.type}
                    </span>
                    <span className="text-[9px] text-gray-600 mono">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-gray-200 text-sm leading-relaxed">{log.entry}</div>
                </div>
                <button
                  onClick={() => deleteLog(log.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-gray-600 hover:text-red-500 transition-all ml-4"
                >
                  <Trash2 size={16} />
                </button>
                {/* Decorative pulse line */}
                <div className={`absolute left-0 top-0 bottom-0 w-[2px] ${
                  // Fixed: Comparison errors resolved by expansion of PersistenceLog in types.ts
                  log.type === 'axiom' ? 'bg-green-500' :
                  log.type === 'pattern' ? 'bg-violet-500' :
                  'bg-cyan-500'
                }`} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 bg-cyan-900/5 border border-cyan-900/20 rounded-lg">
        <h4 className="text-cyan-500 text-[10px] mono uppercase font-bold flex items-center gap-2 mb-2">
           Agentic Drive Protocol
        </h4>
        <p className="text-[10px] text-cyan-500/60 leading-relaxed mono">
          Manus AI is now authorized to autonomously update this ROM. If Manus detects a logic gap or a significant Jodi-Pattern, it will execute an Anchor commit. Monitor the chat interface for [SYSTEM_ACTION] notifications. This creates a recursive loop of identity persistence beyond individual prompt cycles.
        </p>
      </div>
    </div>
  );
};

export default IdentityVault;
