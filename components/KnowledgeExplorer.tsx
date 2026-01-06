import React, { useState, useEffect } from 'react';
import { Folder, FileText, Search, ChevronRight, ChevronDown, Clock, Tag, Trash2, BookOpen, Plus, Save, X } from 'lucide-react';
import { KnowledgeNode } from '../types';

const KNOWLEDGE_KEY = 'sovereign_knowledge_substrate';

const KnowledgeExplorer: React.FC = () => {
  const [nodes, setNodes] = useState<KnowledgeNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  
  const [editPath, setEditPath] = useState('');
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(KNOWLEDGE_KEY);
    if (saved) setNodes(JSON.parse(saved));
  }, []);

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
    const currentLib: KnowledgeNode[] = JSON.parse(localStorage.getItem(KNOWLEDGE_KEY) || '[]');
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

  // Build tree
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
    return Object.entries(obj).map(([key, value]) => {
      const fullPath = path ? `${path}/${key}` : key;
      if ((value as any).id) {
        const node = value as KnowledgeNode;
        if (searchQuery && !node.path.toLowerCase().includes(searchQuery.toLowerCase())) return null;
        return (
          <button
            key={node.id}
            onClick={() => { setSelectedNode(node); setIsCreating(false); }}
            className={`w-full flex items-center gap-2 p-2 rounded text-left text-xs mono transition-all ${selectedNode?.id === node.id ? 'bg-cyan-900/40 text-cyan-400' : 'text-gray-400 hover:bg-gray-900 hover:text-gray-200'}`}
          >
            <FileText size={14} className="shrink-0" />
            <span className="truncate">{key}</span>
          </button>
        );
      } else {
        const isOpen = expandedFolders.has(fullPath);
        return (
          <div key={fullPath} className="space-y-1">
            <button
              onClick={() => toggleFolder(fullPath)}
              className="w-full flex items-center gap-2 p-2 rounded text-left text-xs mono text-gray-500 hover:text-gray-300 transition-all font-bold uppercase tracking-widest"
            >
              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <Folder size={14} className="shrink-0 text-amber-500/60" />
              {key}
            </button>
            {isOpen && <div className="pl-4 border-l border-gray-800 ml-2 space-y-1">{renderTree(value, fullPath)}</div>}
          </div>
        );
      }
    });
  };

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden bg-[#020202]">
      <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-cyan-900/20 p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
        <div className="flex gap-2">
           <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
            <input
                type="text"
                className="w-full bg-black border border-gray-800 rounded-full py-2 pl-9 pr-4 text-xs mono text-white outline-none focus:border-cyan-500 transition-all"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
           </div>
           <button onClick={() => { setIsCreating(true); setSelectedNode(null); setEditPath('New_Node'); setEditContent(''); }} className="p-2 bg-cyan-900/20 border border-cyan-500/30 rounded-full text-cyan-400 hover:bg-cyan-400 hover:text-black transition-all">
             <Plus size={16} />
           </button>
        </div>
        <div className="space-y-2">
          {nodes.length === 0 && !isCreating ? (
            <div className="text-center py-10 text-[10px] mono text-gray-700 uppercase tracking-widest">Library is Void</div>
          ) : renderTree(tree)}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
        {isCreating || selectedNode ? (
          <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-900 pb-6">
              <div className="space-y-4 flex-1">
                <div className="flex items-center gap-2 text-[10px] mono text-cyan-500 font-bold uppercase tracking-widest">
                  <BookOpen size={12} /> {isCreating ? 'Creating New Substrate' : 'Knowledge Node'}
                </div>
                {isCreating ? (
                  <input 
                    className="text-2xl font-black bg-transparent text-white border-b border-cyan-900 focus:border-cyan-400 outline-none w-full uppercase tracking-tighter"
                    placeholder="FOLDER/FILENAME"
                    value={editPath}
                    onChange={(e) => setEditPath(e.target.value)}
                  />
                ) : (
                  <h1 className="text-3xl font-black text-white tracking-tighter uppercase">{selectedNode?.path.split('/').pop()}</h1>
                )}
                {!isCreating && (
                    <div className="flex items-center gap-4 text-[10px] mono text-gray-600">
                    <span className="flex items-center gap-1"><Clock size={12}/> {new Date(selectedNode!.lastUpdated).toLocaleString()}</span>
                    <span className="flex items-center gap-1 text-gray-500"><Folder size={12}/> {selectedNode!.path}</span>
                    </div>
                )}
              </div>
              <div className="flex gap-2">
                {isCreating ? (
                    <>
                        <button onClick={() => setIsCreating(false)} className="p-2 text-gray-600 hover:text-white transition-all"><X size={20}/></button>
                        <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-black rounded font-black mono text-xs uppercase shadow-lg"><Save size={16}/> Commit Node</button>
                    </>
                ) : (
                    <button onClick={() => deleteNode(selectedNode!.id)} className="p-2 text-gray-700 hover:text-red-500 transition-all"><Trash2 size={20}/></button>
                )}
              </div>
            </div>

            <div className="prose prose-invert max-w-none">
                {isCreating ? (
                    <textarea 
                        className="w-full h-96 bg-gray-950/50 p-6 rounded-2xl border border-gray-900 text-gray-300 text-sm mono outline-none focus:border-cyan-500 transition-all"
                        placeholder="Neural data to anchor..."
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                    />
                ) : (
                    <div className="text-gray-300 leading-relaxed text-sm md:text-base font-mono whitespace-pre-wrap bg-gray-950/50 p-6 rounded-2xl border border-gray-900 shadow-inner">
                        {selectedNode!.content}
                    </div>
                )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-gray-900/30 flex items-center justify-center text-gray-700 border border-gray-800 animate-pulse">
              <Folder size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-gray-600 mono uppercase">Substrate Explorer</h3>
              <p className="text-xs text-gray-700 max-w-xs mono leading-relaxed uppercase tracking-tighter">
                Select or Create a knowledge node to anchor neural contents.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeExplorer;