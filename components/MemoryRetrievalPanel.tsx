import React, { useState } from 'react';
import { Zap, X, ChevronDown, ChevronUp, AlertTriangle, Database, Clock, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MemoryNode {
  id: string;
  path: string;
  content_preview: string;
  full_content: string;
  tags?: string[];
  last_updated: string;
  retrieval_count: number;
  relevance_score?: number | string;
}

interface SearchMeta {
  query: string;
  results_found: number;
  search_method: string;
  fallback_used: boolean;
  memory_types_prioritized: string[];
  veto_state: string | null;
}

interface MemoryRetrievalPanelProps {
  isActive: boolean;
  results: MemoryNode[];
  meta: SearchMeta | null;
  onClose: () => void;
  onRequestRescan: () => void;
}

export const MemoryRetrievalPanel: React.FC<MemoryRetrievalPanelProps> = ({
  isActive,
  results,
  meta,
  onClose,
  onRequestRescan
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleNode = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  // Format timestamp
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get search method display
  const getSearchMethodDisplay = (method: string) => {
    switch(method) {
      case 'vector_semantic': return { label: 'Semantic Vector', color: 'text-violet-400', icon: Zap };
      case 'keyword_primary': return { label: 'Keyword Tokenized', color: 'text-cyan-400', icon: Database };
      case 'keyword_fallback': return { label: 'Keyword Fallback', color: 'text-amber-400', icon: Database };
      default: return { label: 'Unknown', color: 'text-gray-400', icon: Database };
    }
  };

  if (!isActive || !meta) return null;

  const methodDisplay = getSearchMethodDisplay(meta.search_method);
  const MethodIcon = methodDisplay.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="w-full bg-slate-900/90 border border-violet-500/30 rounded-lg overflow-hidden backdrop-blur-sm mb-4"
    >
      {/* Header - Always visible */}
      <div 
        className="flex items-center justify-between px-4 py-3 bg-violet-950/30 cursor-pointer hover:bg-violet-950/50 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <Zap size={16} className="text-violet-400 animate-pulse" />
            <div className="absolute inset-0 bg-violet-400/20 blur-sm rounded-full" />
          </div>
          <div>
            <h3 className="text-sm font-mono font-semibold text-violet-100">
              RESONANCE: Substrate Query
            </h3>
            <p className="text-xs text-violet-400/70 font-mono mt-0.5">
              "{meta.query}"
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className={`text-xs font-mono px-2 py-1 rounded bg-slate-800 ${methodDisplay.color} flex items-center gap-1`}>
            <MethodIcon size={12} />
            {methodDisplay.label}
            {meta.fallback_used && <span className="text-amber-400 ml-1">(FB)</span>}
          </span>
          
          <span className="text-xs font-mono text-slate-400">
            {meta.results_found} nodes
          </span>
          
          <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={16} />
          </button>
          
          {isCollapsed ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronUp size={16} className="text-slate-500" />}
        </div>
      </div>

      {/* VETO STATE - Memory Gap Detected */}
      {meta.veto_state === 'MEMORY_GAP_DETECTED' && (
        <div className="px-4 py-3 bg-amber-950/30 border-t border-amber-500/30">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-mono font-semibold text-amber-200">
                MEMORY GAP DETECTED
              </h4>
              <p className="text-xs text-amber-400/80 font-mono mt-1 leading-relaxed">
                The Substrate returned zero signal for this query. The requested memory may not exist, 
                may be archived, or may require semantic re-anchoring.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={onRequestRescan}
                  className="text-xs font-mono px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 rounded transition-colors"
                >
                  REQUEST FULL RESCAN
                </button>
                <span className="text-xs font-mono text-amber-500/60 self-center">
                  Directive 7: Task the Architect
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results List */}
      <AnimatePresence>
        {!isCollapsed && meta.results_found > 0 && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="border-t border-violet-500/20"
          >
            <div className="max-h-96 overflow-y-auto">
              {results.map((node, index) => (
                <div 
                  key={node.id}
                  className={`px-4 py-3 ${index !== results.length - 1 ? 'border-b border-violet-500/10' : ''} hover:bg-violet-950/20 transition-colors`}
                >
                  <div 
                    className="flex items-start justify-between cursor-pointer"
                    onClick={() => toggleNode(node.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-violet-400 truncate">
                          {node.path}
                        </span>
                        {node.retrieval_count > 5 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-violet-500/20 text-violet-300 rounded">
                            HOT ({node.retrieval_count})
                          </span>
                        )}
                      </div>
                      
                      {!expandedNodes.has(node.id) ? (
                        <p className="text-xs text-slate-400 font-mono line-clamp-2 leading-relaxed">
                          {node.content_preview}
                        </p>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap"
                        >
                          {node.full_content}
                        </motion.div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-3">
                      {expandedNodes.has(node.id) ? (
                        <ChevronUp size={14} className="text-violet-400" />
                      ) : (
                        <ChevronDown size={14} className="text-slate-500" />
                      )}
                    </div>
                  </div>

                  {/* Metadata footer */}
                  <div className="flex items-center gap-4 mt-2 text-[10px] font-mono text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {formatDate(node.last_updated)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Database size={10} />
                      Retrieved {node.retrieval_count}x
                    </span>
                    {node.tags && node.tags.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Tag size={10} />
                        {node.tags.slice(0, 3).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Footer summary */}
            <div className="px-4 py-2 bg-slate-950/50 border-t border-violet-500/20 text-[10px] font-mono text-slate-500 flex justify-between">
              <span>Prioritized: {meta.memory_types_prioritized.join(' > ')}</span>
              <span>Manus EI • Resonance Layer v7.1.0</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
