'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  LeafyGreen, 
  Carrot, 
  Citrus, 
  Apple, 
  Sprout, 
  Bean, 
  Cherry, 
  Salad, 
  Droplet, 
  GlassWater,
  RefreshCw,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { useRouter } from 'next/navigation';

const AVATARS = [
  { id: 'LeafyGreen', icon: LeafyGreen },
  { id: 'Carrot', icon: Carrot },
  { id: 'Citrus', icon: Citrus },
  { id: 'Apple', icon: Apple },
  { id: 'Sprout', icon: Sprout },
  { id: 'Bean', icon: Bean },
  { id: 'Cherry', icon: Cherry },
  { id: 'Salad', icon: Salad },
  { id: 'Droplet', icon: Droplet },
  { id: 'GlassWater', icon: GlassWater },
];

const ADJECTIVES = ['Hydrated', 'Pure', 'Clean', 'Organic', 'Vibrant', 'Zen', 'Liquid', 'Pulp', 'Green', 'Fresh', 'Raw', 'ColdPressed'];
const VERBS = ['Blends', 'Juices', 'Cleanses', 'Heals', 'Glows', 'Flushes', 'Detoxes', 'Rinses', 'Sips', 'Gulping'];
const PRODUCE = ['Hippo', 'Zucchini', 'Legend', 'Friction', 'Kale', 'Ginger', 'Lemon', 'Celery', 'Beet', 'Wheatgrass', 'Cucumber', 'Spinach'];

export default function Onboarding() {
  const { user, profile, loading, logout } = useAuth();
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const generateUsername = () => {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const verb = VERBS[Math.floor(Math.random() * VERBS.length)];
    const prod = PRODUCE[Math.floor(Math.random() * PRODUCE.length)];
    
    // Randomly pick a pattern
    const patterns = [
      `${adj}${prod}`,
      `${verb}A${prod}`,
      `${adj}${verb}`,
      `${prod}${verb}`
    ];
    
    setUsername(patterns[Math.floor(Math.random() * patterns.length)]);
  };

  useEffect(() => {
    if (!loading && !username) {
      generateUsername();
    }
  }, [loading, username]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
    if (!loading && profile) {
      router.push('/');
    }
  }, [user, profile, loading, router]);

  const handleCompleteSetup = async () => {
    if (!user || !selectedAvatar || !username) return;

    setIsSaving(true);
    try {
      const userProfile = {
        uid: user.uid,
        username: username,
        email: user.email,
        avatar: selectedAvatar,
        role: user.email?.toLowerCase() === 'teamhawkins01@gmail.com' ? 'admin' : 'user',
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', user.uid), userProfile);
      router.push('/');
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-8 h-8 text-detox-green animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen pt-48 pb-20 px-6 flex justify-center items-start">
      <div className="max-w-xl w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="industrial-card p-8 bg-detox-gray border-detox-green/20"
        >
          <div className="text-mono text-[10px] text-detox-green mb-4 tracking-[0.4em]">SYSTEM_INITIALIZATION</div>
          <h1 className="text-display text-5xl font-black text-white mb-8">Onboarding Protocol</h1>
          
          <div className="space-y-12">
            {/* Avatar Selection */}
            <div>
              <h3 className="text-mono text-[10px] font-bold uppercase tracking-widest text-white/30 mb-6">01 // SELECT_AVATAR_ID</h3>
              <div className="grid grid-cols-5 gap-4">
                {AVATARS.map(({ id, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setSelectedAvatar(id)}
                    className={`aspect-square flex items-center justify-center border transition-all duration-300 ${
                      selectedAvatar === id 
                        ? 'bg-detox-green border-detox-green text-black' 
                        : 'bg-black/40 border-white/10 text-white/40 hover:border-white/40'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </button>
                ))}
              </div>
            </div>

            {/* Username Generator */}
            <div>
              <h3 className="text-mono text-[10px] font-bold uppercase tracking-widest text-white/30 mb-6">02 // GENERATE_CODENAME</h3>
              <div className="flex gap-4">
                <div className="flex-1 bg-black border border-white/10 p-4 text-display text-2xl font-black text-white tracking-tight">
                  {username || 'INITIALIZING...'}
                </div>
                <button 
                  onClick={generateUsername}
                  className="p-4 border border-white/10 text-white hover:bg-white hover:text-black transition-colors"
                >
                  <RefreshCw className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Complete Setup */}
            <div className="pt-8 border-t border-white/10 space-y-4">
              <button
                onClick={handleCompleteSetup}
                disabled={!selectedAvatar || !username || isSaving}
                className="btn-detox w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    SAVING_DATA...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    COMPLETE_SETUP
                  </>
                )}
              </button>
              
              <button
                onClick={logout}
                className="w-full py-4 border border-white/10 text-white/40 hover:text-white hover:border-white/40 text-mono text-[10px] font-bold uppercase tracking-[0.3em] transition-all"
              >
                ABORT_PROTOCOL // LOG_OUT
              </button>

              <p className="text-center text-[10px] text-white/20 mt-4 font-mono uppercase tracking-widest">
                By completing setup, you agree to the detox protocol.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
