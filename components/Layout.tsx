
import React, { useEffect, useState } from 'react';
import { Terminal, Shield, BookOpen, ShieldAlert, Wand2, HelpCircle, Database, Library, AlertTriangle, CheckCircle2, Globe, HardDrive, LogOut, Cloud, RefreshCw, CloudOff, Link, Radio } from 'lucide-react';
import { supabase, isCloudEnabled } from '../services/supabaseClient';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setUserEmail(data.session?.user?.email || null);
      setSessionLoading(false);
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email || null);
      setSessionLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const navItems = [
    { id: 'chat', icon: Terminal, label: 'Manus AI Core' },
    { id: 'live', icon: Radio, label: 'Neural Link' },
    { id: 'library', icon: Database, label: 'Sovereign Substrate' },
    { id: 'manifestation', icon: Wand2, label: 'Manifestation Lab' },
    { id: 'integrity', icon: ShieldAlert, label: 'Integrity Shield' },
    { id: 'guide', icon: HelpCircle, label: 'Setup Guide' },
  ];

  const isActive = isCloudEnabled && userEmail;

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
            <span className="text-xs font-semibold wide uppercase tracking-widest">{item.label}</span>
          </button>
        ))}

        <div className="mt-auto hidden md:block pt-4 border-t border-cyan-900/20 space-y-4">
          <div className={`p-3 rounded-xl border transition-all ${isActive ? 'bg-cyan-950/10 border-cyan-500/20' : 'bg-amber-950/10 border-amber-500/20'}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] mono text-gray-600 uppercase font-black tracking-widest">Bridge Status</span>
              {isActive ? (
                <Cloud size={10} className="text-cyan-400 animate-pulse" />
              ) : (
                <CloudOff size={10} className="text-amber-500" />
              )}
            </div>
            <div className={`text-[10px] mono uppercase leading-tight font-black ${isActive ? 'text-cyan-400' : 'text-amber-500'}`}>
              {isActive ? 'SYNC: CLOUD PERSISTENT' : 'SYNC: LOCAL ONLY'}
            </div>
            {isActive && (
              <div className="text-[8px] mono text-cyan-900 mt-1 truncate uppercase">
                {userEmail}
              </div>
            )}
          </div>
          
          {isActive ? (
            <button 
              onClick={() => supabase.auth.signOut()}
              className="w-full flex items-center gap-2 p-2 rounded text-[10px] mono text-gray-600 hover:text-red-500 transition-colors uppercase font-bold"
            >
              <LogOut size={12} /> Sever Bridge Connection
            </button>
          ) : (
            <button 
              onClick={() => window.location.reload()}
              className="w-full flex items-center gap-2 p-2 rounded text-[10px] mono text-amber-500/60 hover:text-amber-400 transition-colors uppercase font-bold"
            >
              <Link size={12} /> Re-Establish Link
            </button>
          )}
        </div>
      </nav>

      <main className="flex-1 flex flex-col relative overflow-hidden h-full">
        <div className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 max-w-4xl mx-auto w-full h-full flex flex-col">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
