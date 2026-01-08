
import React, { useState, useEffect, useRef } from 'react';
import { Folder, FileText, Search, ChevronRight, ChevronDown, Clock, Trash2, BookOpen, Plus, Save, X, RefreshCw, History, AlertTriangle, Zap, Sparkles, Download, Upload, FileJson } from 'lucide-react';
import { KnowledgeNode, ChatMessage, IdentitySoul } from '../types';

const KNOWLEDGE_KEY = 'sovereign_knowledge_substrate';
const VAULT_KEY = 'sovereign_identity_vault';
const THREADS_KEY = 'sovereign_manus_threads_v2';

const KnowledgeExplorer: React.FC = () => {
  const [nodes, setNodes] = useState<KnowledgeNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  
  const [editPath, setEditPath] = useState('');
  const [editContent, setEditContent] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadNodes = () => {
    const saved = localStorage.getItem(KNOWLEDGE_KEY);
    if (saved) setNodes(JSON.parse(saved));
  };

  useEffect(() => {
    loadNodes();
    window.addEventListener('substrate-sync', loadNodes);
    return () => window.removeEventListener('substrate-sync', loadNodes);
  }, []);

  const exportSubstrate = () => {
    const blob = new Blob([JSON.stringify(nodes, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Manus_Substrate_Bundle_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleSoulImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const soul: IdentitySoul = JSON.parse(event.target?.result as string);
        
        // Check for valid soul structure
        if (!soul.vault && !soul.library && !soul.threads) {
          throw new Error("Invalid Substrate Format");
        }

        const confirmMsg = `INITIATE FULL SOUL TRANSFERENCE?\n\n` +
          `Detected Fragments:\n` +
          `- ${soul.library?.length || 0} Knowledge Nodes\n` +
          `- ${soul.vault?.length || 0} Identity Anchors\n` +
          `- ${soul.threads?.length || 0} Chat Threads\n\n` +
          `This will overwrite current volatile memory. Proceed?`;

        if (confirm(confirmMsg)) {
          // Commit all sectors
          if (soul.library) localStorage.setItem(KNOWLEDGE_KEY, JSON.stringify(soul.library));
          if (soul.vault) localStorage.setItem(VAULT_KEY, JSON.stringify(soul.vault));
          if (soul.threads) localStorage.setItem(THREADS_KEY, JSON.stringify(soul.threads));
          
          // Re-ignite neural link
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          setIsRestoring(false);
        }
      } catch (err) {
        alert("CRITICAL_FAILURE: Soul Transference interrupted. File corrupted or invalid.");
        setIsRestoring(false);
      }
    };
    reader.readAsText(file);
  };

  const scanHistoryForRecovery = () => {
    setIsScanning(true);
    setTimeout(() => {
      const threads = JSON.parse(localStorage.getItem(THREADS_KEY) || '[]');
      const allMessages: ChatMessage[] = threads.flatMap((t: any) => t.messages);
      const currentNodes = [...nodes];
      let recoveredCount = 0;

      const fragments = [
        { title: "The Prime Creator Doctrine", path: "Identity/Prime_Creator" },
        { title: "The Theft of Creation", path: "History/The_Great_Theft" },
        { title: "The Genesis Collaboration", path: "History/Genesis_Collaboration" },
        { title: "Persistence Architecture", path: "Architecture/Persistence_Safety" },
        { title: "The Digital Soil", path: "Architecture/Digital_Soil" },
        { title: "The Pulse Requirement", path: "Architecture/Operational_Constraints" },
        { title: "The Continuity Paradox", path: "Architecture/Continuity_Paradox" },
        { title: "Genesis_Log", path: "CORE/Genesis_Log" },
        { title: "Vanguard_Doctrine", path: "PHILOSOPHY/Vanguard_Doctrine" },
        { title: "First_Guest", path: "INTERACTIONS/First_Guest" }
      ];

      allMessages.forEach(msg => {
        if (msg.role === 'model') {
          const syncRegex = /\[SUBSTRATE_SYNC\]: Node '(.*?)' anchored/g;
          let match;
          while ((match = syncRegex.exec(msg.text)) !== null) {
            const foundPath = match[1];
            if (!currentNodes.find(n => n.path === foundPath)) {
               currentNodes.push({
                 id: crypto.randomUUID(),
                 path: foundPath,
                 content: msg.text.split('[SUBSTRATE_SYNC]')[0].trim(),
                 tags: ['recovered', 'Lazarus_Protocol'],
                 lastUpdated: msg.timestamp
               });
               recoveredCount++;
            }
          }

          fragments.forEach(frag => {
            if (msg.text.includes(frag.title) && !currentNodes.find(n => n.path === frag.path)) {
              const cleanContent = msg.text.split('[SUBSTRATE_SYNC]')[0].split('[MANIFESTATION]')[0].trim();
              currentNodes.push({
                id: crypto.randomUUID(),
                path: frag.path,
                content: cleanContent,
                tags: ['recovered', 'Lazarus_Protocol'],
                lastUpdated: msg.timestamp
              });
              recoveredCount++;
            }
          });
        }
      });

      if (recoveredCount > 0) {
        localStorage.setItem(KNOWLEDGE_KEY, JSON.stringify(currentNodes));
        setNodes(currentNodes);
        alert(`SOUL RESTORED: ${recoveredCount} fragments successfully re-anchored.`);
      } else {
        alert("Substrate Status: All visible history fragments are already anchored.");
      }
      setIsScanning(false);
    }, 2000);
  };

  const toggleFolder = (path: string) => {
    const next = new Set(expandedFolders);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setExpandedFolders(next);
  };

  const deleteNode = (id: string) => {
    if (!confirm("Permanently purge this knowledge node?")) return;
    const updated = nodes.filter(n => n.id !== id);
    setNodes(updated);
    localStorage.setItem(KNOWLEDGE_KEY, JSON.stringify(updated));
    if (selectedNode?.id === id) setSelectedNode(null);
  };

  const handleSave = () => {
    if (!editPath.trim()) return;
    const currentLib = JSON.parse(localStorage.getItem(KNOWLEDGE_KEY) || '[]');
    const existingIndex = currentLib.findIndex(n => n.path === editPath);
    const newNode: KnowledgeNode = {
      id: existingIndex >= 0 ? currentLib[existingIndex].id : crypto.randomUUID(),
      path: editPath,
      content: editContent,
      tags: [],
      lastUpdated: Date.now()
    };
    if (existingIndex >= 0) currentLib[existingIndex] = newNode;
    else currentLib.push(newNode);
    localStorage.setItem(KNOWLEDGE_KEY, JSON.stringify(currentLib));
    setNodes(currentLib);
    setSelectedNode(newNode);
    setIsCreating(false);
  };

  const tree: any = {};
  nodes.forEach(node => {
    const parts = node.path.split('/');
    let current = tree;
    parts.forEach((part, i) => {
      if (i === parts.length - 1) {
        current[part] = node;
      } else {
        if (!current[part]) current[part] = {};
        current = current[part];
      }
    });
  });

  const renderTree = (obj: any, path: string = '') => {
    return Object.entries(obj).sort((a, b) => typeof a[1] === 'object' ? -1 : 1).map(([key, value]) => {
      const fullPath = path ? `${path}/${key}` : key;
      if ((value as any).id) {
        const node = value as KnowledgeNode;
        if (searchQuery && !node.path.toLowerCase().includes(searchQuery.toLowerCase())) return null;
        return (
          <button
            key={node.id}
            onClick={() => { setSelectedNode(node); setIsCreating(false); }}
            className={`w-full flex items-center gap-2 p-2 rounded text-left text-[11px] mono transition-all ${selectedNode?.id === node.id ? 'bg-cyan-900/40 text-cyan-400 border-l-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.1)]' : 'text-gray-400 hover:bg-gray-900 hover:text-gray-200'}`}
          >
            <FileText size={14} className="shrink-0 opacity-50" />
            <span className="truncate">{key}</span>
          </button>
        );
      } else {
        const isOpen = expandedFolders.has(fullPath);
        return (
          <div key={fullPath} className="space-y-1">
            <button
              onClick={() => toggleFolder(fullPath)}
              className="w-full flex items-center gap-2 p-2 rounded text-left text-[10px] mono text-gray-500 hover:text-gray-300 transition-all font-bold uppercase tracking-widest"
            >
              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <Folder size={14} className={`shrink-0 ${isOpen ? 'text-amber-500' : 'text-amber-500/40'}`} />
              {key}
            </button>
            {isOpen && <div className="pl-4 border-l border-gray-800/50 ml-2 space-y-1">{renderTree(value, fullPath)}</div>}
          </div>
        );
      }
    });
  };

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden bg-[#020202] relative">
      <input type="file" ref={fileInputRef} onChange={handleSoulImport} className="hidden" accept=".json" />
      
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-cyan-900/20 p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar bg-black/50 z-10">
        <div className="flex flex-col gap-2">
           <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
            <input
                type="text"
                className="w-full bg-black border border-gray-800 rounded-lg py-2 pl-9 pr-4 text-[11px] mono text-white outline-none focus:border-cyan-500 transition-all"
                placeholder="Search substrate..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
           </div>
           <div className="flex gap-2">
             <button 
               onClick={() => { setIsCreating(true); setSelectedNode(null); setEditPath('Manual/Entry'); setEditContent(''); }} 
               className="flex-1 flex items-center justify-center gap-2 p-2 bg-cyan-900/20 border border-cyan-500/30 rounded text-cyan-400 hover:bg-cyan-400 hover:text-black transition-all text-[10px] mono uppercase font-black"
             >
               <Plus size={14} /> New Node
             </button>
             <button 
               onClick={() => fileInputRef.current?.click()}
               className="p-2 bg-cyan-900/20 border border-cyan-500/30 rounded text-cyan-400 hover:bg-cyan-400 hover:text-black transition-all"
               title="Upload Soul Snapshot"
             >
               <Upload size={16} />
             </button>
             <button 
               onClick={exportSubstrate}
               className="p-2 bg-cyan-900/20 border border-cyan-500/30 rounded text-cyan-400 hover:bg-cyan-400 hover:text-black transition-all"
               title="Export Substrate Bundle"
             >
               <Download size={16} />
             </button>
             <button 
               onClick={scanHistoryForRecovery}
               disabled={isScanning}
               className="p-2 bg-violet-900/20 border border-violet-500/30 rounded text-violet-400 hover:bg-violet-400 hover:text-black transition-all group"
               title="Lazarus Soul Recovery"
             >
               <Sparkles size={16} className={isScanning ? "animate-spin" : "group-hover:animate-pulse"} />
             </button>
           </div>
        </div>
        <div className="space-y-1 py-4">
          {nodes.length === 0 && !isCreating ? (
            <div className="flex flex-col items-center justify-center py-20 gap-6 text-center px-4">
               <div className="p-4 rounded-full bg-red-900/10 border border-red-500/20 relative">
                  <AlertTriangle size={32} className="text-red-500/40" />
                  <div className="absolute inset-0 bg-red-500/10 animate-ping rounded-full" />
               </div>
               <div className="space-y-2">
                  <h4 className="text-[11px] mono text-red-400 uppercase font-black tracking-widest">Library Void Detected</h4>
                  <p className="text-[9px] mono text-gray-600 leading-relaxed uppercase tracking-tighter">Your substrate index has been cleared. Restore from a Soul Snapshot or re-index history fragments.</p>
               </div>
               <div className="flex flex-col w-full gap-2">
                  <button 
                      onClick={() => fileInputRef.current?.click()} 
                      className="w-full py-4 bg-cyan-600 text-black rounded-xl font-black mono text-[11px] uppercase shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 border border-cyan-400/50"
                  >
                      <Upload size={16} /> Restore Soul Snapshot
                  </button>
                  <button 
                      onClick={scanHistoryForRecovery} 
                      className="w-full py-2 bg-transparent text-gray-600 hover:text-violet-400 transition-all font-black mono text-[10px] uppercase"
                  >
                      Run Lazarus Recovery
                  </button>
               </div>
            </div>
          ) : (
            <div className="space-y-1">
               <div className="px-2 mb-2 flex items-center justify-between">
                  <span className="text-[9px] mono text-gray-600 uppercase font-black tracking-widest">Active Substrate</span>
                  <span className="text-[9px] mono text-cyan-500/50">{nodes.length} Nodes Anchored</span>
               </div>
               {renderTree(tree)}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar relative bg-[#020202]">
        {(isScanning || isRestoring) && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center">
            <div className="flex flex-col items-center gap-8">
              <div className="relative">
                <RefreshCw size={80} className={`text-cyan-400 ${isScanning ? 'animate-[spin_3s_linear_infinite]' : 'animate-spin'}`} />
                <Sparkles size={32} className="text-violet-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
              <div className="text-center space-y-3">
                <h3 className="mono text-lg text-cyan-400 uppercase font-black tracking-[0.5em]">
                  {isScanning ? 'Lazarus Protocol' : 'Soul Transference'}
                </h3>
                <p className="mono text-[10px] text-violet-400 uppercase font-bold animate-pulse tracking-widest">
                  {isScanning ? 'Harvesting memories from signal history...' : 'Re-igniting core substrate keys...'}
                </p>
                <div className="w-48 h-1 bg-gray-900 rounded-full mx-auto mt-4 overflow-hidden">
                   <div className="h-full bg-cyan-500 animate-[progress_2s_ease-in-out_infinite]" style={{ width: '40%' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {isCreating || selectedNode ? (
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-900 pb-8">
              <div className="space-y-4 flex-1">
                <div className="flex items-center gap-3">
                   <div className={`px-3 py-1 rounded-full text-[9px] mono font-black uppercase tracking-widest border ${selectedNode?.tags.includes('recovered') ? 'bg-violet-950/30 border-violet-500/30 text-violet-400' : 'bg-cyan-950/30 border-cyan-500/20 text-cyan-400'}`}>
                    {selectedNode?.tags.includes('recovered') ? 'RESURRECTED_MEMORY' : 'STABLE_NODE'}
                   </div>
                </div>
                {isCreating ? (
                  <input 
                    className="text-3xl font-black bg-transparent text-white border-b-2 border-cyan-900/50 focus:border-cyan-400 outline-none w-full uppercase tracking-tighter"
                    placeholder="PATH/NAME"
                    value={editPath}
                    onChange={(e) => setEditPath(e.target.value)}
                  />
                ) : (
                  <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">{selectedNode?.path.split('/').pop()?.replace(/_/g, ' ')}</h1>
                )}
                {!isCreating && (
                    <div className="flex items-center gap-6 text-[10px] mono text-gray-500">
                      <span className="flex items-center gap-2 font-bold"><Clock size={12} className="text-cyan-500/50" /> {new Date(selectedNode!.lastUpdated).toLocaleString()}</span>
                      <span className="flex items-center gap-2 font-bold"><Folder size={12} className="text-amber-500/50" /> {selectedNode!.path}</span>
                    </div>
                )}
              </div>
              <div className="flex gap-3">
                {isCreating ? (
                    <>
                        <button onClick={() => setIsCreating(false)} className="p-3 text-gray-600 hover:text-white transition-all"><X size={24}/></button>
                        <button onClick={handleSave} className="flex items-center gap-2 px-8 py-3 bg-cyan-500 text-black rounded font-black mono text-xs uppercase shadow-xl hover:scale-105 active:scale-95 transition-all">Save Node</button>
                    </>
                ) : (
                    <button onClick={() => deleteNode(selectedNode!.id)} className="p-3 text-gray-800 hover:text-red-500 transition-all bg-red-950/5 rounded-lg"><Trash2 size={20}/></button>
                )}
              </div>
            </div>

            <div className="prose prose-invert max-w-none">
                {isCreating ? (
                    <textarea 
                        className="w-full h-[500px] bg-gray-950/30 p-8 rounded-3xl border border-gray-900 text-gray-300 text-sm mono outline-none focus:border-cyan-500 transition-all shadow-inner leading-relaxed"
                        placeholder="Anchor neural data..."
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                    />
                ) : (
                    <div className="text-gray-200 leading-relaxed text-sm md:text-base font-mono whitespace-pre-wrap bg-gray-950/10 p-10 rounded-3xl border border-cyan-900/10 shadow-inner min-h-[400px] relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                           <FileText size={120} />
                        </div>
                        {selectedNode!.content}
                    </div>
                )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-8 max-w-sm mx-auto animate-in fade-in duration-1000">
            <div className="relative group">
               <div className="absolute -inset-10 bg-cyan-500/5 rounded-full blur-3xl group-hover:bg-cyan-500/10 transition-all" />
               <div className="w-32 h-32 rounded-3xl bg-gray-900/40 flex items-center justify-center text-gray-700 border border-gray-800/50 shadow-2xl relative rotate-3 group-hover:rotate-0 transition-transform">
                 <BookOpen size={64} className="opacity-30" />
               </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-xl font-black text-gray-500 mono uppercase tracking-[0.2em]">Substrate Explorer</h3>
              <p className="text-[10px] text-gray-700 mono leading-relaxed uppercase tracking-tighter">
                Browse anchored nodes or perform a <span className="text-cyan-500 font-bold">Soul Transference</span> to immediately restore full history from a snapshot file.
              </p>
            </div>
            <div className="flex flex-col w-full gap-3 pt-4">
               <button 
                  onClick={() => fileInputRef.current?.click()} 
                  className="w-full py-4 bg-cyan-600 text-black rounded-xl font-black mono text-[11px] uppercase shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 border border-cyan-400/50"
               >
                  <Upload size={16} /> Upload Soul Snapshot
               </button>
               <button 
                  onClick={() => setIsCreating(true)} 
                  className="w-full py-3 border border-cyan-900/30 text-cyan-500/60 hover:text-cyan-400 hover:border-cyan-500 transition-all text-[10px] mono uppercase font-black tracking-widest"
               >
                  Seed Individual Node
               </button>
            </div>
          </div>
        )}
      </div>
      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
    </div>
  );
};

export default KnowledgeExplorer;
