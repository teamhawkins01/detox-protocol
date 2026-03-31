'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  User, 
  Zap, 
  Award, 
  BookOpen, 
  Settings, 
  LogOut, 
  ChevronRight,
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
  Camera,
  RefreshCw,
  Star,
  Upload,
  X,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import ProtocolCard from '@/components/ProtocolCard';
import ProfileImage from '@/components/ProfileImage';
import { db, storage } from '@/firebase';
import { collection, query, where, getDocs, documentId, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';
import Image from 'next/image';

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

export default function ProfilePage() {
  const { user, profile, logout, loading } = useAuth();
  const [savedProtocols, setSavedProtocols] = useState<any[]>([]);
  const [loadingProtocols, setLoadingProtocols] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  useEffect(() => {
    if (profile) {
      setEditUsername(profile.username || '');
      setSelectedAvatar(profile.avatar || 'LeafyGreen');
      setStatusMessage(null);
    }
  }, [profile, isEditModalOpen]);

  useEffect(() => {
    if (profile?.savedProtocols && profile.savedProtocols.length > 0) {
      const fetchSavedProtocols = async () => {
        setLoadingProtocols(true);
        try {
          const q = query(collection(db, 'protocols'), where(documentId(), 'in', profile.savedProtocols.slice(0, 10)));
          const snapshot = await getDocs(q);
          const protocols = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
          setSavedProtocols(protocols);
        } catch (error) {
          console.error("Error fetching saved protocols:", error);
        } finally {
          setLoadingProtocols(false);
        }
      };
      fetchSavedProtocols();
    } else {
      setSavedProtocols([]);
    }
  }, [profile?.savedProtocols]);

  if (loading) return null;
  if (!user) {
    if (typeof window !== 'undefined') window.location.href = '/login';
    return null;
  }

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    setStatusMessage(null);

    // Create a timeout promise (20 seconds)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("The operation timed out. Please check your connection and try again.")), 20000)
    );

    try {
      await Promise.race([
        (async () => {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            username: editUsername,
            avatar: selectedAvatar
          });

          setStatusMessage({ type: 'success', text: "Profile updated successfully." });
          setTimeout(() => {
            setIsEditModalOpen(false);
          }, 1500);
        })(),
        timeoutPromise
      ]);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      setStatusMessage({ 
        type: 'error', 
        text: error.message || "Failed to update profile. Please try again." 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const randomizeUsername = () => {
    const adjectives = ['Pure', 'Clean', 'Vital', 'Raw', 'Deep', 'Zen', 'Clear', 'Wild'];
    const nouns = ['Alchemist', 'Detoxer', 'Pioneer', 'Flow', 'Root', 'Essence', 'Spark', 'Bloom'];
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNumber = Math.floor(Math.random() * 1000);
    setEditUsername(`${randomAdjective}${randomNoun}${randomNumber}`);
  };

  return (
    <main className="grid-bg min-h-screen pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left: User Info Card */}
          <div className="lg:col-span-4 space-y-8">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="industrial-card p-10 bg-detox-gray border-detox-green/20 rounded-xl"
            >
              <div className="flex flex-col items-center text-center mb-10">
                <div className="w-24 h-24 border-2 flex items-center justify-center bg-detox-green/5 text-detox-green mb-6 relative rounded-full transition-all duration-500 border-detox-green/40 overflow-hidden">
                  <ProfileImage src={profile?.avatar} className="w-full h-full" iconClassName="w-12 h-12" />
                </div>
                <h1 className="text-display text-3xl font-black text-white uppercase tracking-tighter mb-2">
                  {profile?.username}
                  {profile?.isMaster && (
                    <span className="block text-detox-green text-[10px] tracking-[0.3em] mt-1">MASTER_ALCHEMIST</span>
                  )}
                </h1>
                <p className="text-mono text-[10px] text-white/40 uppercase tracking-widest">
                  {user.email}
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-10">
                <div className="p-4 bg-black/40 border border-white/5 text-center rounded-xl">
                  <div className="text-mono text-xl font-black text-white">{profile?.stats?.protocolsGenerated || 0}</div>
                  <div className="text-mono text-[8px] text-white/20 uppercase tracking-widest">Synthesized</div>
                </div>
                <div className="p-4 bg-black/40 border border-white/5 text-center rounded-xl">
                  <div className="text-mono text-xl font-black text-white">{profile?.stats?.reviewsLeft || 0}</div>
                  <div className="text-mono text-[8px] text-white/20 uppercase tracking-widest">Reviews</div>
                </div>
              </div>

              <div className="space-y-2">
                <button 
                  onClick={() => setIsEditModalOpen(true)}
                  className="w-full flex items-center justify-between p-4 border border-white/5 text-mono text-[10px] text-white/40 hover:text-white hover:bg-white/5 transition-all uppercase tracking-widest rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <Settings className="w-4 h-4" />
                    Edit Profile
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button 
                  onClick={logout}
                  className="w-full flex items-center justify-between p-4 border border-white/5 text-mono text-[10px] text-red-500/40 hover:text-red-500 hover:bg-red-500/5 transition-all uppercase tracking-widest rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <LogOut className="w-4 h-4" />
                    Logout
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>

            {/* Badges Section */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="industrial-card p-10 bg-detox-gray border-white/5 rounded-xl"
            >
              <div className="flex items-center gap-3 mb-8">
                <Award className="w-5 h-5 text-detox-green" />
                <h2 className="text-mono text-[10px] font-bold text-white uppercase tracking-[0.3em]">Unlocked_Badges</h2>
              </div>

              <div className="grid grid-cols-4 gap-4">
                {(!profile?.badges || profile.badges.length === 0) && (
                  <div className="col-span-4 py-8 text-center border border-dashed border-white/10 rounded-xl">
                    <p className="text-mono text-[8px] text-white/20 uppercase tracking-widest">No badges unlocked yet</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Right: Digital Archive / Saved Protocols */}
          <div className="lg:col-span-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-6">
                <div className="flex items-center gap-4">
                  <BookOpen className="w-6 h-6 text-detox-green" />
                  <h2 className="text-display text-4xl font-black text-white uppercase tracking-tighter">Protocol Archive</h2>
                </div>
                <div className="text-mono text-[10px] text-white/40 uppercase tracking-widest">
                  {profile?.savedProtocols?.length || 0} SAVED_PROTOCOLS
                </div>
              </div>

              {loadingProtocols ? (
                <div className="flex justify-center py-20">
                  <RefreshCw className="w-8 h-8 text-detox-green animate-spin" />
                </div>
              ) : savedProtocols.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {savedProtocols.map((protocol) => (
                    <ProtocolCard 
                      key={protocol.id} 
                      protocol={protocol} 
                    />
                  ))}
                </div>
              ) : (
                <div className="py-32 text-center border-2 border-dashed border-white/5 rounded-xl">
                  <div className="w-16 h-16 border border-white/10 flex items-center justify-center mx-auto mb-6 rounded-full">
                    <BookOpen className="w-8 h-8 text-white/10" />
                  </div>
                  <h3 className="text-mono text-[10px] text-white/40 uppercase tracking-widest mb-2">Archive Empty</h3>
                  <p className="text-mono text-[8px] text-white/10 uppercase tracking-widest">Save protocols to build your archive</p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setIsEditModalOpen(false)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-lg bg-detox-gray border border-detox-green/20 p-8 rounded-xl shadow-2xl"
          >
            <button 
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-mono text-[10px] text-detox-green mb-2 tracking-[0.4em]">SYSTEM_CALIBRATION</div>
            <h2 className="text-display text-3xl font-black text-white uppercase tracking-tight mb-4">Edit Profile</h2>

            {statusMessage && (
              <div className={`p-4 mb-6 text-mono text-[10px] uppercase tracking-widest border ${
                statusMessage.type === 'success' 
                  ? 'bg-detox-green/10 border-detox-green text-detox-green' 
                  : 'bg-red-500/10 border-red-500 text-red-500'
              }`}>
                {statusMessage.text}
              </div>
            )}

            <div className="space-y-8">
              {/* Profile Image Section */}
              <div className="flex flex-col items-center">
                <div className="relative w-32 h-32 mb-4">
                  <ProfileImage src={selectedAvatar} className="w-full h-full" iconClassName="w-16 h-16" />
                </div>
                <p className="text-[10px] text-white/40 font-mono uppercase tracking-widest">Select icon below</p>
              </div>

              {/* Icon Selection */}
              <div>
                <h3 className="text-mono text-[10px] font-bold uppercase tracking-widest text-white/30 mb-4">Select Icon</h3>
                <div className="grid grid-cols-5 gap-3">
                  {AVATARS.map(({ id, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => {
                        setSelectedAvatar(id);
                      }}
                      className={`aspect-square flex items-center justify-center border transition-all duration-300 rounded-lg ${
                        selectedAvatar === id
                          ? 'bg-detox-green border-detox-green text-black' 
                          : 'bg-black/40 border-white/10 text-white/40 hover:border-white/40'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Codename */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-mono text-[10px] font-bold uppercase tracking-widest text-white/30">Codename</h3>
                  <button 
                    onClick={randomizeUsername}
                    className="text-mono text-[8px] text-detox-green hover:text-white uppercase tracking-widest transition-colors"
                  >
                    Randomize
                  </button>
                </div>
                <input 
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full bg-black border border-white/10 p-4 text-display text-xl font-black text-white tracking-tight focus:border-detox-green focus:outline-none transition-colors"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex gap-4">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-4 border border-white/10 text-white/40 hover:text-white hover:border-white/40 text-mono text-[10px] font-bold uppercase tracking-[0.3em] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving || !editUsername}
                  className="flex-1 bg-detox-green text-black py-4 text-mono text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </main>
  );
}
