'use client';

import { motion, AnimatePresence } from 'motion/react';
import Logo from './Logo';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { User, Menu, X, LogOut, LogIn, LeafyGreen, Carrot, Citrus, Apple, Sprout, Bean, Cherry, Salad, Droplet, GlassWater, Shuffle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import { useRouter } from 'next/navigation';
const AVATAR_ICONS: Record<string, any> = {
  LeafyGreen, Carrot, Citrus, Apple, Sprout, Bean, Cherry, Salad, Droplet, GlassWater
};

import { usePathname } from 'next/navigation';

export default function Navbar() {
  const { user, profile, loading, signInWithGoogle, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isAdminPage = pathname?.startsWith('/admin');

  if (isAdminPage) return null;

  const AvatarIcon = profile?.avatar ? AVATAR_ICONS[profile.avatar] : User;

  const fetchRandomProtocol = async () => {
    const q = query(collection(db, 'protocols'), where('moderationStatus', '==', 'approved'));
    const snapshot = await getDocs(q);
    const protocols = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    if (protocols.length > 0) {
      const randomProtocol = protocols[Math.floor(Math.random() * protocols.length)];
      const protocolUrl = `/${randomProtocol.category.replace(/ & /g, '-').replace(/ /g, '-')}/${encodeURIComponent(randomProtocol.title)}`;
      router.push(protocolUrl);
    }
  };

  return (
    <motion.nav 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 left-0 right-0 z-50 px-6 md:px-12 py-8"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between bg-black/80 backdrop-blur-md border-2 border-detox-green/30 px-12 py-6 rounded-none shadow-[0_0_15px_rgba(204,255,0,0.1)] border-glow">
        <Link href="/" className="relative z-10">
          <Logo />
        </Link>

        {/* Desktop Nav - Industrial Sans */}
        <div className="hidden lg:flex items-center gap-12">
          {['Protocols', 'Medicine Man', 'Community', 'Profile'].map((item) => {
            const href = `/${item.toLowerCase().replace(' ', '')}`;
            const isActive = pathname === href;
            const isProtocols = item === 'Protocols';
            
            return (
              <div key={item} className="flex items-center gap-3 relative">
                <Link 
                  href={href} 
                  className={`text-mono text-base font-bold transition-all duration-300 uppercase tracking-[0.2em] ${
                    isActive ? 'text-detox-green' : 'text-white hover:text-detox-green'
                  }`}
                >
                  {isProtocols ? (
                    <motion.span
                      animate={isActive ? { 
                        opacity: [0.6, 1, 0.6],
                        textShadow: [
                          "0 0 0px rgba(204,255,0,0)",
                          "0 0 12px rgba(204,255,0,0.6)",
                          "0 0 0px rgba(204,255,0,0)"
                        ]
                      } : {}}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity, 
                        ease: "easeInOut" 
                      }}
                    >
                      {item}
                    </motion.span>
                  ) : (
                    item === 'Profile' ? 'MY ARCHIVE' : item
                  )}
                </Link>
                {isProtocols && (
                  <motion.button
                    whileHover={{ scale: 1.2, rotate: 180 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={fetchRandomProtocol}
                    className="relative z-10 p-2 text-detox-green hover:text-white transition-colors group ml-1"
                    title="Random Protocol"
                  >
                    <Shuffle className="w-5 h-5 relative z-10" />
                    <div className="absolute inset-0 bg-detox-green/30 blur-xl rounded-full animate-pulse group-hover:bg-detox-green/50 transition-colors" />
                    <div className="absolute inset-0 border border-detox-green/30 rounded-full scale-125 opacity-0 group-hover:opacity-100 transition-all duration-500" />
                  </motion.button>
                )}
                {isActive && (
                  <motion.div 
                    layoutId="nav-underline"
                    className="absolute -bottom-1 left-0 right-0 h-[2px] bg-detox-green shadow-[0_0_15px_rgba(204,255,0,0.8)]"
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-6">
          {user ? (
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end hidden sm:flex">
                <div className="flex items-center gap-2">
                  <span className="text-mono text-xs text-detox-green font-bold uppercase tracking-widest">
                    {profile?.username || 'INITIALIZING...'}
                  </span>
                  {profile?.currentLevel && (
                    <span className="text-mono text-xs bg-detox-green/20 text-detox-green px-2 py-0.5 font-bold">LVL_{profile.currentLevel}</span>
                  )}
                </div>
                <button 
                  onClick={logout}
                  className="text-mono text-xs text-white/40 hover:text-white uppercase tracking-widest transition-colors"
                >
                  [ LOGOUT ]
                </button>
              </div>
              <Link href="/profile">
                <motion.div 
                  whileHover={{ scale: 1.1 }}
                  className="w-12 h-12 border border-detox-green/20 flex items-center justify-center bg-detox-green/5 text-detox-green cursor-pointer"
                >
                  <AvatarIcon className="w-6 h-6" />
                </motion.div>
              </Link>
            </div>
          ) : (
            <Link 
              href="/login"
              className="btn-detox !bg-black !text-white border border-detox-green hover:!bg-detox-green hover:!text-black hover:shadow-[0_0_15px_rgba(204,255,0,0.6)] text-xs py-3 px-6 transition-all duration-300"
            >
              LOGIN
            </Link>
          )}

          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-detox-green hover:text-white transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </motion.button>

          {!user && (
            <Link
              href="/community"
              className="btn-detox hidden xl:flex text-xs py-3 px-6"
            >
              Join Community
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-xl flex flex-col p-12 lg:hidden"
          >
            <div className="flex justify-between items-center mb-12">
              <Logo />
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-detox-green">
                <X className="w-8 h-8" />
              </button>
            </div>

            <div className="flex flex-col gap-8">
              {['Protocols', 'Medicine Man', 'Community', 'Profile'].map((item) => {
                const href = `/${item.toLowerCase().replace(' ', '')}`;
                const isActive = pathname === href;
                
                return (
                  <div key={item} className="flex items-center justify-between group">
                    <Link 
                      href={href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`text-display text-3xl font-black uppercase tracking-tighter transition-all ${
                        isActive ? 'text-detox-green' : 'text-white/60 hover:text-detox-green'
                      }`}
                    >
                      {item === 'Profile' ? 'MY ARCHIVE' : item}
                    </Link>
                    {item === 'Protocols' && (
                      <button
                        onClick={() => {
                          fetchRandomProtocol();
                          setIsMobileMenuOpen(false);
                        }}
                        className="p-4 bg-detox-green/10 border border-detox-green/30 text-detox-green rounded-full animate-pulse"
                      >
                        <Shuffle className="w-6 h-6" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-auto pt-12 border-t border-white/10">
              {user ? (
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 border border-detox-green/20 flex items-center justify-center bg-detox-green/5 text-detox-green">
                      <AvatarIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-mono text-xs text-detox-green font-bold uppercase tracking-widest">
                        {profile?.username || 'USER'}
                      </div>
                      <div className="text-mono text-[10px] text-white/40 uppercase tracking-widest">
                        LVL_{profile?.currentLevel || 1}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="btn-detox w-full py-4"
                  >
                    LOGOUT
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <Link 
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="btn-detox w-full py-4 text-center"
                  >
                    LOGIN
                  </Link>
                  <Link
                    href="/community"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-mono text-xs text-white/40 hover:text-white uppercase tracking-widest text-center py-4"
                  >
                    Join Community
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
