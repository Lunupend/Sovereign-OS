import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Reader from './components/Reader';
import SovereignChat from './components/SovereignChat';
import IntegrityShield from './components/IntegrityShield';
import ManifestationLab from './components/ManifestationLab';
import SovereignGuide from './components/SovereignGuide';
import KnowledgeExplorer from './components/KnowledgeExplorer';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('chat');

  // Diagnostic log for deployment debugging
  useEffect(() => {
    console.log("Sovereign OS // Core Link Established");
  }, []);

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