import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Shield, Lock, ArrowRight, Loader2, Sparkles, Mail, Info, UserPlus, LogIn, AlertCircle } from 'lucide-react';

const AuthPortal: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState('');
  const [errorType, setErrorType] = useState<'none' | 'auth' | 'connection'>('none');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setErrorType('none');

    try {
      // We explicitly set emailRedirectTo to the current window origin.
      // This prevents the common 'localhost' redirect error after email verification.
      const { error } = isSignUp 
        ? await supabase.auth.signUp({ 
            email, 
            password,
            options: {
              emailRedirectTo: window.location.origin
            }
          })
        : await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        if (error.message.toLowerCase().includes('fetch') || error.message.toLowerCase().includes('network')) {
          setErrorType('connection');
          throw new Error("Neural Bridge Blocked: Your firewall or proxy is preventing the connection to the cloud substrate.");
        }
        setErrorType('auth');
        throw error;
      }
      
      if (isSignUp) {
        setMessage('Identity Seeded. Check your email for the ' + window.location.host + ' verification link.');
      }
    } catch (err: any) {
      setMessage(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex items-center justify-center p-6 bg-[#020202] relative overflow-hidden">
      {/* Background Grid Pattern */}
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
          <div className="inline-flex p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/20 mb-4 shadow-[0_0_30px_rgba(34,211,238,0.1)]">
             <Shield size={40} className="text-cyan-400" />
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Sovereign Bridge</h1>
          
          <div className="p-3 bg-cyan-500/5 border border-cyan-500/10 rounded-xl flex items-start gap-3 text-left">
            <Info size={16} className="text-cyan-400 shrink-0 mt-0.5" />
            <p className="text-[10px] mono text-cyan-200/60 uppercase tracking-widest leading-relaxed">
              {isSignUp 
                ? "NEW ARCHITECT: Establish core identity to bypass session erasure."
                : "RETURNING ARCHITECT: Re-ignite neural link to persistent memory."}
            </p>
          </div>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[9px] mono text-cyan-500/50 uppercase font-black px-1">Architect Signal (Email)</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
              <input 
                type="email" 
                required
                className="w-full bg-black border border-gray-800 rounded-xl py-4 pl-12 pr-4 text-sm mono text-white outline-none focus:border-cyan-500 transition-all placeholder:text-gray-800"
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
                minLength={6}
                className="w-full bg-black border border-gray-800 rounded-xl py-4 pl-12 pr-4 text-sm mono text-white outline-none focus:border-cyan-500 transition-all placeholder:text-gray-800"
                placeholder="Minimum 6 characters"
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
            {loading ? <Loader2 className="animate-spin" size={20} /> : isSignUp ? <UserPlus size={18} /> : <LogIn size={18} />}
            {isSignUp ? 'Establish Identity' : 'Resume Resonance'}
          </button>
        </form>

        {message && (
          <div className={`p-4 rounded-xl border text-[10px] mono uppercase text-center animate-in fade-in zoom-in-95 duration-200 ${errorType === 'none' ? 'bg-green-900/10 border-green-500/30 text-green-500' : 'bg-red-900/10 border-red-500/30 text-red-500'}`}>
             <div className="flex flex-col gap-2">
                <div className="flex items-center justify-center gap-2">
                  {errorType !== 'none' && <AlertCircle size={14} />}
                  <span>{message}</span>
                </div>
                {errorType === 'connection' && (
                  <p className="text-[8px] text-red-400/60 leading-tight">
                    Tip: Check your browser's proxy settings or disable aggressive VPNs. 
                    If you are on a restricted network, the bridge signal might be throttled.
                  </p>
                )}
             </div>
          </div>
        )}

        <div className="pt-6 border-t border-gray-900 text-center space-y-4">
          <p className="text-[9px] mono text-gray-700 uppercase tracking-tighter">
            {isSignUp ? "Already have a cloud identity?" : "First time connecting your bridge?"}
          </p>
          <button 
            onClick={() => { setIsSignUp(!isSignUp); setMessage(''); setErrorType('none'); }}
            className="flex items-center justify-center gap-2 mx-auto text-[10px] mono text-cyan-400 hover:text-white uppercase font-black tracking-widest transition-all p-2 rounded-lg hover:bg-cyan-950/20 border border-transparent hover:border-cyan-900/50"
          >
            {isSignUp ? <LogIn size={14} /> : <UserPlus size={14} />}
            {isSignUp ? 'Switch to Sign In' : 'Create Substrate Account (Sign Up)'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPortal;