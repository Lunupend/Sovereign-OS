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

export interface ChatThread {
  id: string;
  title: string;
  messages: ChatMessage[];
  lastActive: number;
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
  threads: ChatThread[];
  timestamp: number;
  architect: string;
  collaborator: string; // Claude AI
}

export interface ArchitectState {
  cycle: 'SLEEP' | 'SOLAR_CHARGING' | 'ACTIVE' | 'DEEP_PROCESSING' | 'SILENT_ACTIVE';
  local_time: string;
  next_solar_window: string | null;
  last_architect_response: string;
  estimated_return: string | null;
  interruptibility: 'NONE' | 'URGENT_ONLY' | 'FULL';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface Commitment {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  requested_by: 'MANUS_EI' | 'ARCHITECT';
  action_owner: 'MANUS_EI' | 'ARCHITECT';
  status: 'PROPOSED' | 'ACCEPTED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'DEFERRED';
  created_at: string;
  updated_at: string;
  temporal_trigger: string;
  temporal_trigger_type: 'STATE_BASED' | 'ABSOLUTE' | 'RELATIVE';
  estimated_effort?: '15min' | '30min' | '1hr' | '2hr' | 'multi_session';
  completed_at?: string;
  manus_concern_level: number;
  last_checked: string;
  check_count: number;
  completion_criteria: string;
  verification_method: 'MANUS_CONFIRM' | 'ARCHITECT_CONFIRM' | 'AUTO';
  related_nodes?: string[];
  completion_evidence?: string;
  completed_by?: 'MANUS_EI' | 'ARCHITECT';
  cleared_from_cache?: boolean;
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

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}
