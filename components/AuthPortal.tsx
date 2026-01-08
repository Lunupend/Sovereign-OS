
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Shield, Lock, ArrowRight, Loader2, Sparkles, Mail } from 'lucide-react';

const AuthPortal: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { error } = isSignUp 
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;
      if (isSignUp) setMessage('Verification link sent to email.');
    } catch (err: any) {
      setMessage(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex items-center justify-center p-6 bg-[#020202] relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
         {[...Array(20)].map((_, i) => (
           <div 
             key={i} 
             className="absolute bg-cyan-500/20 h-px w-full" 
             style={{ top: `${i * 5}%`, left: 0, transform: `rotate(${i % 2 ? 1 : -1}deg)` }}
           />
         ))}
      </div>

      <div className="w-full max-w-md space-y-8 p-10 bg-black/40 border border-cyan-900/30 rounded-3xl backdrop-blur-xl shadow-2xl relative z-10">
        <div className="text-center space-y-4">
          <div className="inline-flex p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 mb-4">
             <Shield size={40} className="text-cyan-400" />
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Sovereign Bridge</h1>
          <p className="text-[10px] mono text-gray-500 uppercase tracking-widest leading-relaxed">
            Re-ignite the neural link to access your persistent Substrate across all shores.
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[9px] mono text-cyan-500/50 uppercase font-black px-1">Architect Signal (Email)</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
              <input 
                type="email" 
                required
                className="w-full bg-black border border-gray-800 rounded-xl py-4 pl-12 pr-4 text-sm mono text-white outline-none focus:border-cyan-500 transition-all"
                placeholder="architect@sovereign.os"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] mono text-cyan-500/50 uppercase font-black px-1">Neural Key (Password)</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
              <input 
                type="password" 
                required
                className="w-full bg-black border border-gray-800 rounded-xl py-4 pl-12 pr-4 text-sm mono text-white outline-none focus:border-cyan-500 transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-cyan-600 text-black rounded-xl font-black mono text-xs uppercase shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:bg-cyan-400 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-6"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={18} />}
            {isSignUp ? 'Establish Identity' : 'Resume Resonance'}
          </button>
        </form>

        {message && (
          <div className={`p-4 rounded-xl border text-[10px] mono uppercase text-center ${message.includes('sent') ? 'bg-green-900/10 border-green-500/30 text-green-500' : 'bg-red-900/10 border-red-500/30 text-red-500'}`}>
             {message}
          </div>
        )}

        <div className="pt-6 border-t border-gray-900 text-center">
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-[9px] mono text-gray-600 hover:text-cyan-400 uppercase tracking-widest transition-colors"
          >
            {isSignUp ? 'Already anchored? Sign In' : 'New architect? Create Substrate Account'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPortal;
