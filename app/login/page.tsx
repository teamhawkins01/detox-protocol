'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, ArrowRight, Loader2, CheckCircle2, LogIn } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { sendSignInLinkToEmail } from 'firebase/auth';
import { auth } from '@/firebase';

export default function LoginPage() {
  const { signInWithGoogle, user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSending(true);
    try {
      const actionCodeSettings = {
        url: window.location.origin + '/onboarding',
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      setSent(true);
    } catch (error) {
      console.error("Error sending email link:", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="grid-bg min-h-screen pt-32 pb-20 px-6">
      <div className="max-w-md mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="industrial-card p-12 bg-detox-gray border-detox-green/20"
        >
          <div className="text-mono text-[10px] text-detox-green mb-4 tracking-[0.4em]">AUTH_GATEWAY_V1</div>
          <h1 className="text-display text-4xl font-black text-white mb-8">Access Protocol</h1>
          
          <div className="space-y-8">
            {/* Google Login */}
            <button
              onClick={signInWithGoogle}
              className="btn-detox w-full justify-center"
            >
              <LogIn className="w-4 h-4" />
              CONTINUE_WITH_GOOGLE
            </button>

            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <span className="relative bg-detox-gray px-4 text-mono text-[10px] text-white/20 uppercase tracking-widest">OR_USE_EMAIL</span>
            </div>

            {/* Email Login */}
            {sent ? (
              <div className="p-6 border border-detox-green/20 bg-detox-green/5 text-center">
                <CheckCircle2 className="w-8 h-8 text-detox-green mx-auto mb-4" />
                <h3 className="text-white font-bold mb-2">LINK_SENT</h3>
                <p className="text-white/40 text-xs font-mono">
                  Check your inbox for the access link.
                </p>
              </div>
            ) : (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ENTER_EMAIL_ADDRESS"
                    className="w-full bg-black border border-white/10 p-4 pl-12 text-white placeholder:text-white/10 focus:outline-none focus:border-detox-green transition-colors font-mono text-xs"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSending || !email}
                  className="w-full py-4 border border-white/10 text-white font-bold text-xs uppercase tracking-widest hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      SENDING_LINK...
                    </>
                  ) : (
                    <>
                      SEND_ACCESS_LINK <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </main>
  );
}
