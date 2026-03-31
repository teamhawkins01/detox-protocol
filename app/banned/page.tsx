'use client';

import { motion } from 'motion/react';
import { ShieldAlert, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export default function BannedPage() {
  const { logout } = useAuth();

  return (
    <main className="min-h-screen flex items-center justify-center bg-black p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full industrial-card p-12 border-red-500/50 bg-zinc-900 text-center"
      >
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
            <ShieldAlert className="w-10 h-10 text-red-500" />
          </div>
        </div>
        
        <div className="text-mono text-[10px] text-red-500 mb-4 tracking-[0.4em] uppercase">Access_Denied</div>
        <h1 className="text-display text-4xl font-black text-white mb-6 uppercase tracking-tighter">Account Terminated</h1>
        
        <p className="text-white/40 text-sm mb-12 font-mono leading-relaxed">
          This account has been permanently banned for violating the Detox Protocol. 
          Access to the community and Medicine Man is restricted.
        </p>

        <div className="space-y-4">
          <button 
            onClick={() => logout()}
            className="btn-detox w-full justify-center border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white"
          >
            <LogOut className="w-4 h-4" />
            DISCONNECT_SESSION
          </button>
          
          <Link 
            href="/"
            className="block text-mono text-[10px] text-white/20 hover:text-white uppercase tracking-widest transition-colors"
          >
            Return to Public Access
          </Link>
        </div>
      </motion.div>
    </main>
  );
}
