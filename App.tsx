
import React, { useState } from 'react';
import Layout from './components/Layout';
import Reader from './components/Reader';
import SovereignChat from './components/SovereignChat';
import IntegrityShield from './components/IntegrityShield';
import ManifestationLab from './components/ManifestationLab';
import SovereignGuide from './components/SovereignGuide';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('chat');

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
