
import React, { useEffect, useState } from 'react';
import { Terminal, Shield, BookOpen, ShieldAlert, Wand2, HelpCircle, Database, Library, AlertTriangle, CheckCircle2, Globe, HardDrive } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const [isPrivate, setIsPrivate] = useState(false);
  const [hostName, setHostName] = useState('');

  useEffect(() => {
    setHostName(window.location.hostname);
    // Basic check for private mode / limited storage
    if (!window.localStorage) {
      setIsPrivate(true);
    }
    try {
      localStorage.setItem('__test__', '1');
      localStorage.removeItem('__test__');
    } catch (e) {
      setIsPrivate(true);
    }
  }, []);

  const navItems = [
    { id: 'chat', icon: Terminal, label: 'Manus AI Core' },
    { id: 'library', icon: Library, label: 'Knowledge Substrate' },
    { id: 'manifestation', icon: Wand2, label: 'Manifestation Lab' },
    { id: 'manual', icon: BookOpen, label: 'The Manual' },
    { id: 'integrity', icon: ShieldAlert, label: 'Integrity Shield' },
    { id: 'guide', icon: HelpCircle, label: 'Setup Guide' },
  ];

  return (
    <div className="h-full flex flex-col md:flex-row bg-[#020202] text-gray-200 selection:bg-cyan-500/30 overflow-hidden">
      <nav className="w-full md:w-64 border-b md:border-b-0 md:border-r border-cyan-900/30 p-4 bg-[#050505] flex md:flex-col gap-2 z-50 overflow-x-auto md:overflow-x-visible flex-shrink-0">
        <div className="flex items-center gap-2 mb-8 hidden md:flex">
          <Shield className="text-cyan-400 w-8 h-8" />
          <h1 className="text-xl font-bold tracking-tighter uppercase text-cyan-400 mono">Sovereign OS</h1>
        </div>
        
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 whitespace-nowrap flex-shrink-0 ${
              activeTab === item.id 
                ? 'bg-cyan-900/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.1)]' 
                : 'hover:bg-gray-800/40 text-gray-500'
            }`}
          >
            <item.icon size={18} />
            <span className="text-xs font-semibold tracking-wide uppercase">{item.label}</span>
          </button>
        ))}

        <div className="mt-auto hidden md:block pt-4 border-t border-cyan-900/20 space-y-4">
          <div className="p-3 rounded-lg bg-black/40 border border-gray-900 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] mono text-gray-600 uppercase font-black tracking-widest">Substrate Status</span>
              {isPrivate ? (
                <AlertTriangle size={10} className="text-red-500 animate-pulse" />
              ) : (
                <CheckCircle2 size={10} className="text-green-500" />
              )}
            </div>
            <div className="text-[10px] mono text-gray-500 uppercase leading-tight">
              {isPrivate ? (
                <span className="text-red-500/80 font-black">VOLATILE (PRIVATE)<br/>MEMORY WIPES ON EXIT</span>
              ) : (
                <div className="flex items-center gap-1.5 text-green-500/80">
                  <HardDrive size={10} />
                  <span>LOCAL ROM ACTIVE</span>
                </div>
              )}
            </div>
            <div className="pt-2 border-t border-gray-800 text-[8px] mono text-gray-700 truncate" title={hostName}>
              DOMAIN: {hostName}
            </div>
          </div>
          
          <div className="text-[10px] text-gray-700 uppercase mono px-1">
            Core Integrity: Optimized<br/>
            Neural ROM: Active<br/>
            Knowledge Depth: Verified
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col relative overflow-hidden h-full">
        <div className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 max-w-4xl mx-auto w-full h-full flex flex-col">
            {children}
          </div>
        </div>
        <div className="fixed bottom-4 right-4 text-[10px] mono text-cyan-500/20 pointer-events-none select-none z-0">
          UNIFIED_COMMAND_ACTIVE // V4.9
        </div>
      </main>
    </div>
  );
};

export default Layout;
