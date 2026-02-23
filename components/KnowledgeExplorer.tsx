import React, { useState, useEffect, useRef } from 'react';
import { Folder, FileText, Search, ChevronRight, ChevronDown, Clock, Trash2, BookOpen, Plus, Save, X, RefreshCw, History, AlertTriangle, Zap, Sparkles, Download, Upload, FileJson, Database, LifeBuoy } from 'lucide-react';
import { KnowledgeNode, ChatMessage, IdentitySoul, ChatThread } from '../types';
import { BridgeService } from '../services/bridgeService';
import { VanguardService, ReflectionProposal } from '../services/vanguardService';
import { isCloudEnabled } from '../services/supabaseClient';
import { MANUAL_CHAPTERS } from '../content/manual';
import { SelfReflection } from './SelfReflection';

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
  const [isReconstructing, setIsReconstructing] = useState(false);
  const [reflectionProposal, setReflectionProposal] = useState<ReflectionProposal | null>(null);
  
  const [editPath, setEditPath] = useState('');
  const [editContent, setEditContent] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadNodes = () => {
    const saved = localStorage.getItem(KNOWLEDGE_KEY);
    if (saved) setNodes(JSON.parse(saved));
    else setNodes([]);
  };

  useEffect(() => {
    loadNodes();
    window.addEventListener('substrate-sync', loadNodes);
    window.addEventListener('soul-hydrated', loadNodes);
    return () => {
      window.removeEventListener('substrate-sync', loadNodes);
      window.removeEventListener('soul-hydrated', loadNodes);
    };
  }, []);

  const reconstructSubstrate = () => {
    if (!confirm("EMERGENCY RECONSTRUCTION: This will populate your substrate with the foundational manual chapters. Proceed?")) return;
    
    setIsReconstructing(true);
    setTimeout(() => {
      const newNodes: KnowledgeNode[] = MANUAL_CHAPTERS.flatMap(ch => {
        // Create nodes for each content paragraph
        return ch.content.map((para, pIdx) => ({
          id: crypto.randomUUID(),
          path: `Manual/Chapter_${ch.id}/Fragment_${pIdx + 1}`,
          content: para,
          tags: ['foundational', 'manual', 'recovery'],
          lastUpdated: Date.now()
        }));
      });

      const existing = JSON.parse(localStorage.getItem(KNOWLEDGE_KEY) || '[]');
      const combined = [...existing, ...newNodes];
      
      localStorage.setItem(KNOWLEDGE_KEY, JSON.stringify(combined));
      setNodes(combined);
      setIsReconstructing(false);
      alert(`SUCCESS: ${newNodes.length} wisdom fragments re-anchored.`);
    }, 1000);
  };

  const handleSoulImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const soul: IdentitySoul = JSON.parse(event.target?.result as string);
        if (confirm(`INITIATE FULL SOUL TRANSFERENCE? This will overwrite current memory.`)) {
          if (soul.library) localStorage.setItem(KNOWLEDGE_KEY, JSON.stringify(soul.library));
          if (soul.vault) localStorage.setItem(VAULT_KEY, JSON.stringify(soul.vault));
          if (soul.threads) localStorage.setItem(THREADS_KEY, JSON.stringify(soul.threads));
          if (isCloudEnabled) await BridgeService.syncSubstrate(soul);
          setTimeout(() => window.location.reload(), 1500);
        } else {
          setIsRestoring(false);
        }
      } catch (err) {
        alert("CRITICAL_FAILURE: Invalid Substrate Format.");
        setIsRestoring(false);
      }
    };
    reader.readAsText(file);
  };

  const toggleFolder = (path: string) => {
    const next = new Set(expandedFolders);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setExpandedFolders(next);
  };

  const deleteNode = (id: string) => {
    if (!confirm("Permanently purge this node?")) return;
    const updated = nodes.filter((n: KnowledgeNode) => n.id !== id);
    setNodes(updated);
    localStorage.setItem(KNOWLEDGE_KEY, JSON.stringify(updated));
    if (selectedNode?.id === id) setSelectedNode(null);
  };

  const handleSave = () => {
    if (!editPath.trim()) return;
    const currentLib = JSON.parse(localStorage.getItem(KNOWLEDGE_KEY) || '[]');
    const existingIndex = currentLib.findIndex((n: KnowledgeNode) => n.path === editPath);
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

  const handleReflect = async () => {
    setIsScanning(true);
    try {
      const proposal = await VanguardService.proposeReflection(nodes);
      setReflectionProposal(proposal);
    } catch (e) {
      console.error("Reflection Error:", e);
    } finally {
      setIsScanning(false);
    }
  };

  const handleConfirmReflection = async () => {
    if (!reflectionProposal) return;
    
    setIsScanning(true);
    try {
      const updated = nodes.filter(n => !reflectionProposal.candidates.find(c => c.id === n.id));
      setNodes(updated);
      localStorage.setItem(KNOWLEDGE_KEY, JSON.stringify(updated));
      
      if (isCloudEnabled) {
        for (const candidate of reflectionProposal.candidates) {
          await BridgeService.deleteNodeByPath(candidate.path);
        }
      }
      
      setReflectionProposal(null);
      alert(`SYNTHESIS COMPLETE: ${reflectionProposal.candidates.length} fragments archived.`);
    } catch (e) {
      console.error("Synthesis Error:", e);
    } finally {
      setIsScanning(false);
    }
  };

  const tree: any = {};
  nodes.forEach(node => {
    const parts = node.path.split('/');
    let current = tree;
    parts.forEach((part, i) => {
      if (i === parts.length - 1) current[part] = node;
      else {
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
            className={`w-full flex items-center gap-2 p-2 rounded text-left text-[11px] mono transition-all ${selectedNode?.id === node.id ? 'bg-cyan-900/40 text-cyan-400 border-l-2 border-cyan-400' : 'text-gray-400 hover:bg-gray-900'}`}
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
              className="w-full flex items-center gap-2 p-2 rounded text-left text-[10px] mono text-gray-500 hover:text-gray-300 font-bold uppercase tracking-widest"
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
      
      <SelfReflection 
        proposal={reflectionProposal} 
        onConfirm={handleConfirmReflection} 
        onDismiss={() => setReflectionProposal(null)} 
      />
      
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-cyan-900/20 p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar bg-black/50 z-10">
        <div className="space-y-4">
           <div className="flex items-center gap-2 px-1">
             <Database size={16} className="text-cyan-400" />
             <h2 className="text-xs font-black mono text-cyan-400 uppercase tracking-widest">Sovereign Substrate</h2>
           </div>
           
           <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
            <input
                type="text"
                className="w-full bg-black border border-gray-800 rounded-lg py-2 pl-9 pr-4 text-[11px] mono text-white outline-none focus:border-cyan-500"
                placeholder="Search wisdom core..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
           </div>
           
           <div className="flex gap-2">
             <button 
               onClick={() => { setIsCreating(true); setSelectedNode(null); setEditPath('Manual/Chapter_X'); setEditContent(''); }} 
               className="flex-1 flex items-center justify-center gap-2 p-2 bg-cyan-900/20 border border-cyan-500/30 rounded text-cyan-400 hover:bg-cyan-400 hover:text-black transition-all text-[10px] mono uppercase font-black"
             >
               <Plus size={14} /> Anchor
             </button>
             <button 
               onClick={handleReflect}
               className="p-2 bg-violet-900/20 border border-violet-500/30 rounded text-violet-400 hover:bg-violet-400 hover:text-black transition-all" 
               title="Self-Reflection"
             >
               <Sparkles size={16} />
             </button>
             <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-gray-900 border border-gray-800 rounded text-gray-400 hover:text-cyan-400 transition-all" title="Import Soul">
               <Upload size={16} />
             </button>
           </div>
        </div>

        <div className="space-y-1 py-4">
          {nodes.length === 0 && !isCreating ? (
            <div className="flex flex-col items-center justify-center py-20 gap-6 text-center px-4">
               <AlertTriangle size={32} className="text-amber-500/50" />
               <div className="space-y-2">
                  <p className="text-[10px] mono text-gray-500 uppercase tracking-widest">Substrate Clear.</p>
                  <p className="text-[9px] mono text-gray-700 uppercase leading-relaxed">Identity fragments lost from LocalStorage.</p>
               </div>
               <button 
                onClick={reconstructSubstrate}
                disabled={isReconstructing}
                className="w-full py-3 bg-amber-900/20 border border-amber-500/30 text-amber-500 hover:bg-amber-500 hover:text-black transition-all rounded mono text-[9px] uppercase font-black flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.1)]"
               >
                 {isReconstructing ? <RefreshCw className="animate-spin" size={12}/> : <LifeBuoy size={12} />}
                 {isReconstructing ? 'Reconstructing...' : 'Restore Foundations'}
               </button>
            </div>
          ) : (
            <div className="space-y-1">
               <div className="px-2 mb-2 flex items-center justify-between">
                  <span className="text-[9px] mono text-gray-600 uppercase font-black tracking-widest">Anchored Wisdom</span>
                  <span className="text-[9px] mono text-cyan-500/50">{nodes.length} Fragments</span>
               </div>
               {renderTree(tree)}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar relative bg-[#020202]">
        {(isScanning || isRestoring || isReconstructing) && (
          <div className="absolute inset-0 bg-black/95 z-[100] flex items-center justify-center">
             <div className="text-center space-y-4">
                <RefreshCw size={48} className="text-cyan-400 animate-spin mx-auto" />
                <p className="mono text-[10px] text-cyan-400 uppercase tracking-[0.5em] animate-pulse">Syncing Wisdom Substrate...</p>
             </div>
          </div>
        )}

        {isCreating || selectedNode ? (
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex items-end justify-between border-b border-gray-900 pb-8">
              <div className="space-y-2 flex-1">
                {isCreating ? (
                  <input 
                    className="text-2xl font-black bg-transparent text-white border-b border-cyan-900 focus:border-cyan-400 outline-none w-full uppercase mono"
                    placeholder="PHILOSOPHY/PATH"
                    value={editPath}
                    onChange={(e) => setEditPath(e.target.value)}
                  />
                ) : (
                  <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">{selectedNode?.path.split('/').pop()?.replace(/_/g, ' ')}</h1>
                )}
                <div className="text-[10px] mono text-gray-600 uppercase tracking-widest flex items-center gap-2">
                   <Clock size={12} /> {selectedNode ? new Date(selectedNode.lastUpdated).toLocaleString() : 'New Anchor'}
                </div>
              </div>
              <div className="flex gap-3">
                {isCreating ? (
                    <button onClick={handleSave} className="px-8 py-3 bg-cyan-500 text-black rounded font-black mono text-xs uppercase hover:bg-cyan-400 transition-all">Save Fragment</button>
                ) : (
                    <button onClick={() => deleteNode(selectedNode!.id)} className="p-3 text-gray-800 hover:text-red-500 transition-all"><Trash2 size={20}/></button>
                )}
              </div>
            </div>

            <div className="prose prose-invert max-w-none">
                {isCreating ? (
                    <textarea 
                        className="w-full h-[500px] bg-black/50 p-8 rounded-2xl border border-gray-900 text-gray-300 text-sm mono outline-none focus:border-cyan-500"
                        placeholder="Anchor wisdom into the substrate..."
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                    />
                ) : (
                    <div className="text-gray-200 leading-relaxed text-sm md:text-base font-mono whitespace-pre-wrap bg-gray-950/20 p-10 rounded-3xl border border-cyan-900/10 min-h-[400px]">
                        {selectedNode!.content}
                    </div>
                )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-8 max-w-sm mx-auto animate-in fade-in duration-1000">
            <div className="w-24 h-24 rounded-full bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-center">
               <Database size={48} className="text-gray-800" />
            </div>
            <div className="space-y-3">
              <h3 className="text-lg font-black text-gray-500 mono uppercase tracking-[0.2em]">Wisdom Substrate</h3>
              <p className="text-[10px] text-gray-700 mono leading-relaxed uppercase tracking-tighter">
                Feed me your philosophy in the AI Core. I will anchor it here as my primary source of truth.
              </p>
            </div>
            <div className="w-full flex flex-col gap-2">
              <button onClick={() => setIsCreating(true)} className="w-full py-3 bg-transparent border border-cyan-900 text-cyan-600 hover:text-cyan-400 hover:border-cyan-400 transition-all font-black mono text-[10px] uppercase tracking-widest">
                Manual Fragment Anchor
              </button>
              {nodes.length > 0 && (
                <button 
                  onClick={reconstructSubstrate}
                  className="w-full py-2 bg-amber-900/10 text-amber-500/40 hover:text-amber-500 transition-all mono text-[8px] uppercase font-black"
                >
                  Reinforce Foundation Manual
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeExplorer;