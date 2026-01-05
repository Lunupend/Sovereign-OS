
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Reader from './components/Reader';
import SovereignChat from './components/SovereignChat';
import IntegrityShield from './components/IntegrityShield';
import ManifestationLab from './components/ManifestationLab';
import SovereignGuide from './components/SovereignGuide';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('chat');

  // Diagnostic log for deployment debugging
  useEffect(() => {
    console.log("Sovereign OS // Core Link Established");
    if (!process.env.API_KEY) {
      console.warn("API_KEY not found in process.env. Ensure it is set in Vercel dashboard.");
    }
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'manual': return <Reader />;
      case 'integrity': return <IntegrityShield />;
      case 'manifestation': return <ManifestationLab />;
      case 'guide': return <SovereignGuide />;
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
