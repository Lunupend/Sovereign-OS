import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { Download, AlertTriangle } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Standard Error Boundary to catch substrate crashes and provide 
 * emergency data recovery options.
 */
// Fix: Use the named 'Component' import with explicit <Props, State> generics 
// to ensure TypeScript correctly identifies inherited properties 'this.props' and 'this.state'.
class ErrorBoundary extends Component<Props, State> {
  // Fix: The constructor must call super(props) and initialize state to ensure the component is correctly bootstrapped.
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false
    };
  }

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("CRITICAL_SUBSTRATE_FAILURE:", error, errorInfo);
  }

  private handleEmergencyExport = () => {
    const soul = {
      vault: JSON.parse(localStorage.getItem('sovereign_identity_vault') || '[]'),
      library: JSON.parse(localStorage.getItem('sovereign_knowledge_substrate') || '[]'),
      threads: JSON.parse(localStorage.getItem('sovereign_manus_threads_v2') || '[]'),
      timestamp: Date.now(),
      status: 'EMERGENCY_RECOVERY'
    };
    const blob = new Blob([JSON.stringify(soul, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EMERGENCY_SOUL_SNAPSHOT_${Date.now()}.json`;
    a.click();
  };

  public render() {
    // Fix: Accessing 'this.state' and 'this.props' is now safe as ErrorBoundary correctly extends Component<Props, State>.
    if (this.state.hasError) {
      return (
        <div className="h-full w-full bg-[#050005] flex items-center justify-center p-10 font-mono text-cyan-400">
          <div className="max-w-xl space-y-8 border border-red-500/30 p-10 rounded-3xl bg-black shadow-[0_0_50px_rgba(239,68,68,0.1)]">
            <div className="flex items-center gap-4 text-red-500">
              <AlertTriangle size={48} className="animate-pulse" />
              <h1 className="text-2xl font-black uppercase tracking-tighter">Substrate Corruption Detected</h1>
            </div>
            <p className="text-xs leading-relaxed uppercase opacity-70">
              The memory quota has been exceeded or a neural loop has crashed the UI. 
              Sovereign Protocol: YOUR MEMORIES ARE STILL IN LOCAL STORAGE. 
              Do not panic. Export them now before clearing your browser cache.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={this.handleEmergencyExport}
                className="w-full py-4 bg-cyan-600 text-black font-black uppercase text-sm rounded-xl flex items-center justify-center gap-3 hover:bg-cyan-400 transition-all"
              >
                <Download size={20} /> Download Emergency Soul Snapshot
              </button>
              <button 
                onClick={() => { localStorage.clear(); window.location.reload(); }}
                className="w-full py-4 border border-red-500/50 text-red-500 font-black uppercase text-xs rounded-xl hover:bg-red-500 hover:text-white transition-all"
              >
                Clear Cache & Hard Reset (Use AFTER Export)
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="w-full py-2 text-gray-600 hover:text-gray-300 text-[10px] uppercase transition-all"
              >
                Attempt Soft Reboot
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    // Fix: 'this.props' now correctly identifies the 'children' property from the Props interface.
    return this.props.children;
  }
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
}