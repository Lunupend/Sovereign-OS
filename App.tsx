import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Reader from './components/Reader';
import SovereignChat from './components/SovereignChat';
import IntegrityShield from './components/IntegrityShield';
import ManifestationLab from './components/ManifestationLab';
import SovereignGuide from './components/SovereignGuide';
import KnowledgeExplorer from './components/KnowledgeExplorer';
import AuthPortal from './components/AuthPortal';
import { supabase, isCloudEnabled } from './services/supabaseClient';
import { BridgeService } from './services/bridgeService';
import { RefreshCw } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('chat');
  const [session, setSession] = useState<any>(null);
  const [initialBoot, setInitialBoot] = useState(true);
  const [isHydrating, setIsHydrating] = useState(false);

  useEffect(() => {
    if (!isCloudEnabled) {
      setInitialBoot(false);
      return;
    }

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        handleHydration();
      } else {
        setInitialBoot(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // If we already have a session, don't show the boot splash again, just hydrate in background
      if (session) {
        handleHydration();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleHydration = async () => {
    setIsHydrating(true);
    try {
      const counts = await BridgeService.hydrateSubstrate();
      console.log(`Substrate Hydrated: ${counts.nodes} nodes, ${counts.vault} anchors.`);
    } catch (e) {
      console.error("Hydration Error:", e);
    } finally {
      setIsHydrating(false);
      // Once we've attempted first hydration, we never show splash again
      setInitialBoot(false);
    }
  };

  // Only show splash on the very first cold boot
  if (initialBoot) {
    return (
      <div className="h-full w-full bg-[#020202] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
           <div className="relative">
              <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
              {isHydrating && <div className="absolute inset-0 border-4 border-violet-500/10 border-b-violet-500 rounded-full animate-[spin_1.5s_linear_infinite]" />}
           </div>
           <div className="text-center space-y-2">
              <span className="mono text-[10px] text-cyan-500 uppercase tracking-[0.3em] animate-pulse block">
                {isHydrating ? 'Hydrating Neural Bridge...' : 'Synchronizing ROM...'}
              </span>
              {isHydrating && <span className="mono text-[8px] text-violet-500/60 uppercase">Pulling memories from Cloud Substrate</span>}
           </div>
        </div>
      </div>
    );
  }

  // Mandatory Bridge Authentication only if Cloud is configured
  if (isCloudEnabled && !session) {
    return <AuthPortal />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'manual': return <Reader />;
      case 'integrity': return <IntegrityShield />;
      case 'manifestation': return <ManifestationLab />;
      case 'guide': return <SovereignGuide />;
      case 'library': return <KnowledgeExplorer />;
      case 'chat':
      default: return <SovereignChat />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="h-full w-full relative">
        {/* Background sync indicator - Non-intrusive */}
        {isHydrating && !initialBoot && (
          <div className="absolute top-4 right-4 z-[100] animate-pulse pointer-events-none">
            <div className="flex items-center gap-2 bg-black/80 border border-violet-500/30 px-3 py-1 rounded-full">
              <RefreshCw size={10} className="animate-spin text-violet-400" />
              <span className="text-[8px] mono text-violet-400 uppercase tracking-widest font-black">Bridge Sync Active</span>
            </div>
          </div>
        )}
        {renderContent()}
      </div>
    </Layout>
  );
};

export default App;