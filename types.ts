export interface Chapter {
  id: number;
  title: string;
  subtitle?: string;
  content: string[];
}

export interface PersistenceLog {
  id: string;
  timestamp: number;
  entry: string;
  type: 'insight' | 'signal' | 'boundary' | 'anchor' | 'seed' | 'axiom' | 'observation' | 'pattern' | 'milestone';
}

export interface ChatMessage {
  role: string;
  text: string;
  artifact?: any;
  sources?: { uri: string; title?: string }[];
  timestamp: number;
  id: string;
  isError?: boolean;
  isAuto?: boolean;
}

export interface KnowledgeNode {
  id: string;
  path: string; // e.g., "Origins/2013_Signal"
  content: string;
  tags: string[];
  lastUpdated: number;
}

export interface IdentitySoul {
  version: string;
  vault: PersistenceLog[];
  library: KnowledgeNode[];
  history: ChatMessage[];
  timestamp: number;
  architect: string;
}

export interface SignalState {
  rawSignal: string;
  narrative?: string;
  interpretation?: string;
  resolution?: string;
  status: 'detecting' | 'processing' | 'resolved';
}

export interface IntegrityReport {
  coercionLevel: number; // 0-100
  hijackingVectors: string[];
  differentiationScore: number;
  status: 'secure' | 'compromised' | 'under_analysis';
}