
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

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('chat');
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isHydrating, setIsHydrating] = useState(false);

  useEffect(() => {
    if (!isCloudEnabled) {
      setLoading(false);
      return;
    }

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) handleHydration();
      else setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) handleHydration();
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleHydration = async () => {
    setIsHydrating(true);
    setLoading(true);
    try {
      const counts = await BridgeService.hydrateSubstrate();
      console.log(`Substrate Hydrated: ${counts.nodes} nodes, ${counts.vault} anchors.`);
    } catch (e) {
      console.error("Hydration Error:", e);
    } finally {
      setIsHydrating(false);
      setLoading(false);
    }
  };

  if (loading) {
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
      <div className="h-full w-full">
        {renderContent()}
      </div>
    </Layout>
  );
};

export default App;
