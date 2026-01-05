
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
  type: 'insight' | 'signal' | 'boundary' | 'anchor' | 'seed' | 'axiom' | 'observation' | 'pattern';
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
