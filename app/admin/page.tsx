'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { 
  Lock, Zap, CheckCircle2, AlertCircle, Loader2, ChevronRight, LogIn, 
  Shield, BarChart3, ClipboardList, Users2, Search, Filter, 
  UserMinus, UserCheck, Ban, Trash2, Check, X, Eye, Clock, 
  Globe, MousePointer2, Activity, ArrowLeft, RefreshCw
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { db, auth } from "@/firebase";
import { 
  collection, addDoc, Timestamp, query, orderBy, limit, 
  onSnapshot, doc, updateDoc, deleteDoc, where, getDocs, setDoc, writeBatch 
} from "firebase/firestore";
import { useAuth } from '@/hooks/useAuth';
import { logEvent } from '@/lib/logger';
import { handleFirestoreError, OperationType } from '@/lib/utils';
import { getCategoryImageUrl } from '@/lib/categoryImages';
import Image from 'next/image';

const CATEGORIES = [
  "Juices & Smoothies",
  "Waters & Drinks",
  "Weight Loss & Cleanses",
  "Targeted Detox",
  "Detox Baths",
  "Soups & Meals"
];

type AdminTab = 'medicineman' | 'moderation' | 'protocols' | 'users' | 'analytics' | 'logs';

export default function AdminPage() {
  const { user, profile, signInWithGoogle } = useAuth();
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('medicineman');
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Data states
  const [users, setUsers] = useState<any[]>([]);
  const [pendingProtocols, setPendingProtocols] = useState<any[]>([]);
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ totalViews: 0, topPages: [] });
  const [editingProtocol, setEditingProtocol] = useState<any | null>(null);
  const [allProtocols, setAllProtocols] = useState<any[]>([]);
  const [authors, setAuthors] = useState<any[]>([]);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string>('system_admin');

  const isAdminEmail = user?.email?.toLowerCase() === 'teamhawkins01@gmail.com';

  useEffect(() => {
    if (!isAuthenticated || !user || (!isAdminEmail && profile?.role !== 'admin')) return;

    // Real-time listeners
    const unsubAuthors = onSnapshot(collection(db, 'authors'), (snap) => {
      setAuthors(snap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'authors'));

    const unsubUsers = onSnapshot(query(collection(db, 'users'), orderBy('createdAt', 'desc')), (snap) => {
      setUsers(snap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

    const unsubProtocols = onSnapshot(query(collection(db, 'protocols'), where('moderationStatus', '==', 'pending')), (snap) => {
      setPendingProtocols(snap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'protocols'));

    const unsubReviews = onSnapshot(query(collection(db, 'reviews'), where('moderationStatus', '==', 'pending')), (snap) => {
      setPendingReviews(snap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'reviews'));

    const unsubAllProtocols = onSnapshot(query(collection(db, 'protocols'), orderBy('createdAt', 'desc'), limit(100)), (snap) => {
      setAllProtocols(snap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'protocols'));

    const unsubLogs = onSnapshot(query(collection(db, 'system_logs'), orderBy('timestamp', 'desc'), limit(50)), (snap) => {
      setSystemLogs(snap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'system_logs'));

    const unsubAnalytics = onSnapshot(query(collection(db, 'analytics'), orderBy('timestamp', 'desc'), limit(100)), (snap) => {
      const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as any));
      setAnalytics(data);
      
      // Calculate stats
      const pageCounts: Record<string, number> = {};
      data.forEach(v => {
        pageCounts[v.page] = (pageCounts[v.page] || 0) + 1;
      });
      const topPages = Object.entries(pageCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([page, count]) => ({ page, count }));
      
      setStats({ totalViews: data.length, topPages });
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'analytics'));

    return () => {
      unsubAuthors();
      unsubUsers();
      unsubProtocols();
      unsubReviews();
      unsubAllProtocols();
      unsubLogs();
      unsubAnalytics();
    };
  }, [isAuthenticated, user, profile, isAdminEmail]);

  const seedAuthors = async () => {
    if (!isAdminEmail) return;
    const authorsToSeed = [
      {
        id: 'aris_latham',
        name: 'Dr. Aris Latham',
        bio: 'Sunfired Food Scientist and pioneer of the Raw Vegan Detox movement.',
        avatar: 'https://picsum.photos/seed/aris/400/400',
        specialty: 'Sunfired Nutrition & Raw Detox',
        badges: ['verified_author', 'nutritional_scientist']
      },
      {
        id: 'chef_ahki',
        name: 'Chef Ahki',
        bio: 'Celebrity Chef and Nutritional Scientist specializing in non-hybrid electric foods.',
        avatar: 'https://picsum.photos/seed/ahki/400/400',
        specialty: 'Electric Foods & Alkaline Detox',
        badges: ['verified_author', 'nutritional_scientist']
      },
      {
        id: 'queen_afua',
        name: 'Queen Afua',
        bio: 'Holistic Health Practitioner and author of "Heal Thyself" and "Sacred Woman".',
        avatar: 'https://picsum.photos/seed/afua/400/400',
        specialty: 'Womb Wellness & Fasting Protocols',
        badges: ['verified_author', 'master_herbalist']
      },
      {
        id: 'robert_morse',
        name: 'Dr. Robert Morse',
        bio: 'Detoxification Specialist and expert on the lymphatic system and fruitarianism.',
        avatar: 'https://picsum.photos/seed/morse/400/400',
        specialty: 'Lymphatic Detox & Regenerative Detox',
        badges: ['verified_author', 'nutritional_scientist']
      },
      {
        id: 'yahki_awakened',
        name: 'Yahki Awakened',
        bio: 'Herbalist and Holistic Health Strategist focusing on cellular regeneration.',
        avatar: 'https://picsum.photos/seed/yahki/400/400',
        specialty: 'Cellular Regeneration & Herbalism',
        badges: ['verified_author', 'master_herbalist']
      }
    ];

    try {
      for (const author of authorsToSeed) {
        await setDoc(doc(db, 'authors', author.id), author);
      }
      // Also ensure a system admin author exists
      await setDoc(doc(db, 'authors', 'system_admin'), {
        id: 'system_admin',
        name: 'Medicine Man',
        bio: 'Core Protocol Architect and System Administrator.',
        avatar: 'https://picsum.photos/seed/admin/400/400',
        specialty: 'System Architecture',
        badges: ['verified_author', 'System Architect']
      });
      
      setMessage({ type: 'success', text: 'AUTHORS_SEEDED_SUCCESSFULLY' });
    } catch (error) {
      console.error("Error seeding authors:", error);
      setMessage({ type: 'error', text: 'FAILED_TO_SEED_AUTHORS' });
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '1PiperdoG!') {
      setIsAuthenticated(true);
      logEvent('admin_action', 'Admin access granted via password');
    } else {
      setMessage({ type: 'error', text: 'INCORRECT ACCESS CODE' });
      logEvent('auth_error', 'Failed admin access attempt');
    }
  };

  const generateProtocol = async (category: string) => {
    if (!user) return;
    setLoading(category);
    setMessage(null);

    const randomImage = getCategoryImageUrl(category);

    const selectedAuthor = authors.find(a => a.id === selectedAuthorId) || { name: 'Medicine Man', id: 'system_admin' };

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY! });
      const model = "gemini-3-flash-preview";
      
      const prompt = `Generate a unique, highly optimized, technical detox protocol for the category: "${category}". 
      Ensure the protocol title is completely original, distinct, and creative to avoid duplication. Rotate topics and shuffle ideas to ensure variety.
      The protocol must be effective, precise, and follow the DETOX.PROTOCOLS brand voice: industrial, high-performance, and results-oriented.
      The author of this protocol is ${selectedAuthor.name}, who is an expert in ${selectedAuthor.specialty || 'Detoxification'}.
      
      Include:
      1. A bold, technical, and unique title.
      2. A list of specific ingredients with precise measurements.
      3. Step-by-step instructions that sound like a technical protocol.
      4. A list of specific benefits for each ingredient used.
      5. A technical rationale for why these ingredients were combined.
      6. The expected physiological outcome/benefit for the user.`;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
              instructions: { type: Type.STRING },
              ingredientBenefits: { type: Type.ARRAY, items: { type: Type.STRING } },
              rationale: { type: Type.STRING },
              outcome: { type: Type.STRING },
              prepTime: { type: Type.STRING, description: "ISO 8601 duration, e.g., PT15M" },
              cookTime: { type: Type.STRING, description: "ISO 8601 duration, e.g., PT30M" },
              totalTime: { type: Type.STRING, description: "ISO 8601 duration, e.g., PT45M" },
              protocolYield: { type: Type.STRING, description: "e.g., 4 servings" }
            },
            required: ["title", "ingredients", "instructions", "ingredientBenefits", "rationale", "outcome", "prepTime", "cookTime", "totalTime", "protocolYield"]
          }
        }
      });

      if (!response.text) throw new Error("AI failed to generate content");
      const protocolData = JSON.parse(response.text);

      const { photoUrl, ...rest } = protocolData;

      const newProtocol = {
        ...rest,
        category,
        authorId: selectedAuthor.id,
        authorType: "Admin",
        authorName: selectedAuthor.id === 'system_admin' ? 'Medicine Man' : selectedAuthor.name,
        authorLevel: selectedAuthor.id === 'system_admin' ? 99 : undefined,
        isAiGenerated: true,
        photoUrl: randomImage,
        starRating: 5,
        moderationStatus: 'approved',
        createdAt: Timestamp.now()
      };

      await addDoc(collection(db, "protocols"), newProtocol);
      await logEvent('admin_action', `Generated and deployed protocol: ${newProtocol.title} by ${selectedAuthor.name}`, user.uid, user.email || undefined);
      setMessage({ type: 'success', text: `Protocol Deployed: ${newProtocol.title}` });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, 'protocols');
    } finally {
      setLoading(null);
    }
  };

  const updateUserStatus = async (userId: string, status: 'active' | 'suspended' | 'banned') => {
    try {
      await updateDoc(doc(db, 'users', userId), { status });
      await logEvent('admin_action', `Updated user ${userId} status to ${status}`, user?.uid, user?.email || undefined);
      setMessage({ type: 'success', text: `User status updated to ${status}` });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
    }
  };

  const moderateProtocol = async (protocolId: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'protocols', protocolId), { moderationStatus: status });
      await logEvent('admin_action', `${status === 'approved' ? 'Approved' : 'Rejected'} protocol ${protocolId}`, user?.uid, user?.email || undefined);
      setMessage({ type: 'success', text: `Protocol ${status}` });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, `protocols/${protocolId}`);
    }
  };

  const moderateReview = async (reviewId: string, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'reviews', reviewId), { moderationStatus: status });
      await logEvent('admin_action', `${status === 'approved' ? 'Approved' : 'Rejected'} review ${reviewId}`, user?.uid, user?.email || undefined);
      setMessage({ type: 'success', text: `Field Report ${status}` });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, `reviews/${reviewId}`);
    }
  };

  const deleteProtocol = async (protocolId: string) => {
    if (!window.confirm('ARE YOU SURE YOU WANT TO DELETE THIS PROTOCOL? THIS ACTION IS IRREVERSIBLE.')) return;
    
    // Optimistic update
    setAllProtocols(prev => prev.filter(p => p.id !== protocolId));

    try {
      const batch = writeBatch(db);
      
      // Delete protocol
      batch.delete(doc(db, 'protocols', protocolId));
      
      // Delete associated reviews
      const reviewsQuery = query(collection(db, 'reviews'), where('protocolId', '==', protocolId));
      const reviewsSnapshot = await getDocs(reviewsQuery);
      reviewsSnapshot.forEach((doc) => batch.delete(doc.ref));
      
      await batch.commit();
      
      await logEvent('admin_action', `Deleted protocol ${protocolId} and associated reviews`, user?.uid, user?.email || undefined);
      setMessage({ type: 'success', text: 'Protocol and associated reviews deleted successfully' });
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, `protocols/${protocolId}`);
      // Revert optimistic update on error
      setAllProtocols(prev => [...prev]); // Force re-render if needed
    }
  };

  const updateAllProtocolImages = async () => {
    setLoading('updating_images');
    setMessage(null);
    try {
      const protocolsToUpdate = allProtocols.filter(r => 
        !r.photoUrl || r.photoUrl.includes('unsplash.com') || r.photoUrl.includes('picsum.photos')
      );
      
      for (const protocol of protocolsToUpdate) {
        const newPhotoUrl = getCategoryImageUrl(protocol.category);
        await updateDoc(doc(db, 'protocols', protocol.id), { photoUrl: newPhotoUrl });
      }
      setMessage({ type: 'success', text: `Updated ${protocolsToUpdate.length} protocol images.` });
    } catch (error) {
      console.error("Error updating images:", error);
      setMessage({ type: 'error', text: "Failed to update images." });
    } finally {
      setLoading(null);
    }
  };

  const updateProtocol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProtocol) return;
    try {
      const { id, ...data } = editingProtocol;
      await updateDoc(doc(db, 'protocols', id), data);
      await logEvent('admin_action', `Updated protocol ${id}`, user?.uid, user?.email || undefined);
      setMessage({ type: 'success', text: 'Protocol updated successfully' });
      setEditingProtocol(null);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.WRITE, `protocols/${editingProtocol.id}`);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-zinc-900 border border-white/10 p-12 rounded-none shadow-2xl"
        >
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-detox-green/10 border border-detox-green/20 flex items-center justify-center rounded-none">
              <Lock className="w-8 h-8 text-detox-green" />
            </div>
          </div>
          
          <h1 className="text-mono text-xl font-bold text-white text-center mb-2 tracking-tighter uppercase">
            Admin Access
          </h1>
          <p className="text-mono text-[10px] text-white/40 text-center mb-8 uppercase tracking-widest">
            Restricted Content Moderation
          </p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ENTER ACCESS CODE"
                className="w-full bg-black border border-white/10 px-6 py-4 text-mono text-sm text-white focus:border-detox-green outline-none transition-all placeholder:text-white/10"
                autoFocus
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-detox-green text-black font-bold py-4 text-mono text-xs uppercase tracking-widest hover:bg-white transition-all"
            >
              [ AUTHORIZE ]
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <Link href="/" className="text-mono text-[10px] text-white/20 hover:text-detox-green uppercase tracking-widest transition-all inline-flex items-center gap-2">
              <ArrowLeft className="w-3 h-3" /> [ ABORT_AND_RETURN_HOME ]
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-32 pb-20 px-6 md:px-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 border-b border-white/10 pb-8 gap-6">
          <div className="flex items-start gap-6">
            <Link 
              href="/" 
              className="mt-2 p-3 bg-zinc-900 border border-white/10 text-white/40 hover:text-detox-green hover:border-detox-green transition-all"
              title="Return Home"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-mono text-4xl font-black text-white tracking-tighter uppercase mb-2">
                Detox <span className="text-detox-green">Command</span>
              </h1>
              <p className="text-mono text-[10px] text-white/40 uppercase tracking-[0.4em]">
                System Administration // v4.0.1-STABLE
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {!user ? (
              <button onClick={signInWithGoogle} className="text-mono text-[10px] text-detox-green font-bold uppercase tracking-widest">[ AUTH REQUIRED ]</button>
            ) : !isAdminEmail && profile?.role !== 'admin' ? (
              <div className="text-right">
                <div className="text-mono text-[10px] text-red-500 font-bold uppercase tracking-widest mb-1">UNAUTHORIZED ({user.email})</div>
                <button onClick={signInWithGoogle} className="text-mono text-[8px] text-white/40 underline uppercase tracking-widest">Switch Account</button>
              </div>
            ) : (
              <div className="text-right">
                <div className="flex items-center justify-end gap-2 mb-1">
                  {profile?.currentLevel === 99 && (
                    <span className="text-mono text-[8px] bg-detox-green text-black px-2 py-0.5 font-black animate-pulse shadow-[0_0_10px_rgba(0,255,0,0.5)]">
                      MASTER_ALCHEMIST
                    </span>
                  )}
                  <div className="text-mono text-[10px] text-detox-green font-bold uppercase tracking-widest">System Status: Online</div>
                </div>
                <div className="text-mono text-[10px] text-white/20 uppercase tracking-widest">{user.email}</div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-12">
          {[
            { id: 'medicineman', icon: Zap, label: 'Medicine Man' },
            { id: 'moderation', icon: Shield, label: 'Moderation' },
            { id: 'protocols', icon: ClipboardList, label: 'Protocols' },
            { id: 'users', icon: Users2, label: 'Users' },
            { id: 'analytics', icon: BarChart3, label: 'Analytics' },
            { id: 'logs', icon: Activity, label: 'Logs' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`flex items-center gap-3 px-6 py-3 text-mono text-[10px] font-bold uppercase tracking-widest transition-all ${
                activeTab === tab.id 
                  ? 'bg-detox-green text-black' 
                  : 'bg-zinc-900 text-white/40 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.id === 'moderation' && (pendingProtocols.length + pendingReviews.length) > 0 && (
                <span className="ml-2 bg-red-500 text-white px-1.5 py-0.5 rounded-full text-[8px]">
                  {pendingProtocols.length + pendingReviews.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {message && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`mb-8 p-6 flex items-center gap-4 border ${
                message.type === 'success' 
                  ? 'bg-detox-green/10 border-detox-green/20 text-detox-green' 
                  : 'bg-red-500/10 border-red-500/20 text-red-500'
              }`}
            >
              {message.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
              <span className="text-mono text-xs font-bold uppercase tracking-wider">{message.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'medicineman' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              <div className="industrial-card p-8 bg-zinc-900 border-white/10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h3 className="text-mono text-[10px] text-detox-green mb-2 tracking-[0.4em] uppercase">Select_Authority_Author</h3>
                    <p className="text-mono text-[8px] text-white/20 uppercase">Choose the author identity for this protocol deployment</p>
                  </div>
                  <div className="flex items-center gap-4">
                      <select 
                        value={selectedAuthorId}
                        onChange={(e) => setSelectedAuthorId(e.target.value)}
                        className="bg-black border border-white/10 p-4 text-mono text-xs text-white focus:border-detox-green outline-none appearance-none min-w-[250px]"
                      >
                        {authors.length > 0 ? authors.map(a => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        )) : (
                          <option value="system_admin">Medicine Man</option>
                        )}
                      </select>
                    <button 
                      onClick={seedAuthors}
                      className="p-4 border border-white/10 text-white/20 hover:text-detox-green hover:border-detox-green transition-all"
                      title="Seed/Update Authors"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => generateProtocol(cat)}
                    disabled={loading !== null || !isAdminEmail}
                    className={`group relative overflow-hidden border p-8 text-left transition-all duration-500 ${
                      loading === cat ? 'bg-detox-green/20 border-detox-green' : 'bg-zinc-900 border-white/10 hover:border-detox-green/50'
                    }`}
                  >
                    <div className="relative z-10 flex items-center justify-between">
                      <div>
                        <div className="text-mono text-[10px] text-white/40 uppercase tracking-widest mb-2">GENERATE PROTOCOL</div>
                        <h3 className="text-mono text-xl font-bold text-white uppercase tracking-tighter">{cat}</h3>
                      </div>
                      {loading === cat ? <Loader2 className="w-8 h-8 animate-spin text-detox-green" /> : <Zap className="w-8 h-8 text-white/10 group-hover:text-detox-green" />}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'moderation' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
              {/* Protocols Section */}
              <section>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-mono text-xl font-bold text-white uppercase tracking-tighter">Pending Protocols</h2>
                  <span className="text-mono text-[10px] text-white/40 uppercase tracking-widest">{pendingProtocols.length} Awaiting Verification</span>
                </div>
                
                {pendingProtocols.length === 0 ? (
                  <div className="p-12 border border-white/5 bg-zinc-900/30 text-center">
                    <CheckCircle2 className="w-8 h-8 text-detox-green/20 mx-auto mb-4" />
                    <p className="text-mono text-[10px] text-white/20 uppercase tracking-widest">Protocols Clear.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {pendingProtocols.map((protocol) => (
                      <div key={protocol.id} className="industrial-card p-6 bg-zinc-900 border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex-1">
                          <div className="text-mono text-[10px] text-detox-green mb-1 uppercase tracking-widest">{protocol.category}</div>
                          <h3 className="text-mono text-lg font-bold text-white uppercase mb-2">{protocol.title}</h3>
                          <div className="text-mono text-[10px] text-white/40 uppercase tracking-widest">Author: {protocol.authorName} {'//'} {protocol.authorId}</div>
                        </div>
                        <div className="flex gap-3">
                          <button onClick={() => moderateProtocol(protocol.id, 'rejected')} className="p-3 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all"><X className="w-5 h-5" /></button>
                          <button onClick={() => moderateProtocol(protocol.id, 'approved')} className="p-3 border border-detox-green/20 text-detox-green hover:bg-detox-green hover:text-black transition-all"><Check className="w-5 h-5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Reviews Section */}
              <section>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-mono text-xl font-bold text-white uppercase tracking-tighter">Pending Field Reports</h2>
                  <span className="text-mono text-[10px] text-white/40 uppercase tracking-widest">{pendingReviews.length} Awaiting Verification</span>
                </div>
                
                {pendingReviews.length === 0 ? (
                  <div className="p-12 border border-white/5 bg-zinc-900/30 text-center">
                    <CheckCircle2 className="w-8 h-8 text-detox-green/20 mx-auto mb-4" />
                    <p className="text-mono text-[10px] text-white/20 uppercase tracking-widest">Reports Clear.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {pendingReviews.map((review) => (
                      <div key={review.id} className="industrial-card p-6 bg-zinc-900 border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-mono text-[10px] text-detox-green uppercase tracking-widest">{review.username}</span>
                            <span className="text-mono text-[8px] text-white/20 uppercase tracking-widest">Rating: {review.rating}/5</span>
                          </div>
                          <p className="text-mono text-xs text-white/60 italic mb-2">&quot;{review.suggestion}&quot;</p>
                          <div className="text-mono text-[8px] text-white/20 uppercase tracking-widest">Protocol ID: {review.protocolId}</div>
                        </div>
                        <div className="flex gap-3">
                          <button onClick={() => moderateReview(review.id, 'rejected')} className="p-3 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all"><X className="w-5 h-5" /></button>
                          <button onClick={() => moderateReview(review.id, 'approved')} className="p-3 border border-detox-green/20 text-detox-green hover:bg-detox-green hover:text-black transition-all"><Check className="w-5 h-5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </motion.div>
          )}

          {activeTab === 'protocols' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-mono text-xl font-bold text-white uppercase tracking-tighter">Protocol Management</h2>
                <div className="flex gap-4">
                  <button
                    onClick={updateAllProtocolImages}
                    disabled={loading !== null}
                    className="px-4 py-2 bg-detox-green text-black text-mono text-xs font-bold uppercase tracking-widest hover:bg-white transition-all"
                  >
                    {loading === 'updating_images' ? 'UPDATING...' : 'UPDATE ALL IMAGES'}
                  </button>
                  <div className="text-mono text-[10px] text-white/40 uppercase tracking-widest flex items-center">{allProtocols.length} TOTAL_PROTOCOLS</div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {allProtocols.map((protocol) => (
                  <div key={protocol.id} className="industrial-card p-6 bg-zinc-900 border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-6 flex-1">
                      <div className="relative w-16 h-16 border border-white/10 overflow-hidden shrink-0">
                        <Image 
                          src={protocol.photoUrl || `https://picsum.photos/seed/${protocol.id}/100/100`} 
                          alt={protocol.title} 
                          fill 
                          sizes="64px"
                          className="object-cover grayscale"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div>
                        <div className="text-mono text-[10px] text-detox-green mb-1 uppercase tracking-widest">{protocol.category}</div>
                        <h3 className="text-mono text-lg font-bold text-white uppercase">{protocol.title}</h3>
                        <div className="text-mono text-[8px] text-white/20 uppercase tracking-widest mt-1">ID: {protocol.id} {'//'} AUTHOR: {protocol.authorName}</div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setEditingProtocol(protocol)} 
                        className="p-3 border border-white/10 text-white/40 hover:text-detox-green hover:border-detox-green transition-all"
                        title="Edit Protocol"
                      >
                        <Filter className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => deleteProtocol(protocol.id)} 
                        className="p-3 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                        title="Delete Protocol"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'users' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-mono text-xl font-bold text-white uppercase tracking-tighter">User Management</h2>
                <div className="flex gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input type="text" placeholder="SEARCH_UID_OR_EMAIL" className="bg-black border border-white/10 pl-10 pr-4 py-2 text-mono text-[10px] text-white outline-none focus:border-detox-green w-64" />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="py-4 text-mono text-[10px] text-white/40 uppercase tracking-widest">User</th>
                      <th className="py-4 text-mono text-[10px] text-white/40 uppercase tracking-widest">Role</th>
                      <th className="py-4 text-mono text-[10px] text-white/40 uppercase tracking-widest">Status</th>
                      <th className="py-4 text-mono text-[10px] text-white/40 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-zinc-800 flex items-center justify-center text-white/40 text-xs font-mono">
                              {u.username?.[0] || '?'}
                            </div>
                            <div>
                              <div className="text-mono text-xs font-bold text-white">{u.username}</div>
                              <div className="text-mono text-[8px] text-white/20 uppercase tracking-widest">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          <span className={`text-mono text-[8px] px-2 py-1 uppercase tracking-widest ${u.role === 'admin' ? 'bg-detox-green/20 text-detox-green' : 'bg-white/5 text-white/40'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-4">
                          <span className={`text-mono text-[8px] px-2 py-1 uppercase tracking-widest ${u.status === 'banned' ? 'bg-red-500/20 text-red-500' : u.status === 'suspended' ? 'bg-orange-500/20 text-orange-500' : 'bg-detox-green/20 text-detox-green'}`}>
                            {u.status || 'active'}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {u.status !== 'active' && (
                              <button onClick={() => updateUserStatus(u.id, 'active')} className="p-2 text-detox-green hover:bg-detox-green/10" title="Activate"><UserCheck className="w-4 h-4" /></button>
                            )}
                            {u.status !== 'suspended' && (
                              <button onClick={() => updateUserStatus(u.id, 'suspended')} className="p-2 text-orange-500 hover:bg-orange-500/10" title="Suspend"><Clock className="w-4 h-4" /></button>
                            )}
                            {u.status !== 'banned' && (
                              <button onClick={() => updateUserStatus(u.id, 'banned')} className="p-2 text-red-500 hover:bg-red-500/10" title="Ban"><Ban className="w-4 h-4" /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="industrial-card p-8 bg-zinc-900 border-white/10">
                  <div className="text-mono text-[10px] text-white/40 uppercase tracking-widest mb-4">Total Page Views</div>
                  <div className="text-display text-5xl font-black text-detox-green">{stats.totalViews}</div>
                  <div className="mt-4 flex items-center gap-2 text-mono text-[8px] text-white/20">
                    <Activity className="w-3 h-3" /> REALTIME_STREAM_ACTIVE
                  </div>
                </div>
                <div className="industrial-card p-8 bg-zinc-900 border-white/10 col-span-2">
                  <div className="text-mono text-[10px] text-white/40 uppercase tracking-widest mb-6">Top Performing Protocols</div>
                  <div className="space-y-4">
                    {stats.topPages.map((p: any, i: number) => (
                      <div key={p.page} className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-mono text-[10px] text-white/20">0{i+1}</span>
                          <span className="text-mono text-xs text-white uppercase tracking-tight">{p.page}</span>
                        </div>
                        <div className="flex items-center gap-4 flex-1 mx-8">
                          <div className="h-1 bg-white/5 flex-1 relative overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(p.count / stats.totalViews) * 100}%` }}
                              className="absolute top-0 left-0 h-full bg-detox-green"
                            />
                          </div>
                        </div>
                        <span className="text-mono text-xs font-bold text-detox-green">{p.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="industrial-card p-8 bg-zinc-900 border-white/10">
                <div className="text-mono text-[10px] text-white/40 uppercase tracking-widest mb-6">Live Traffic Feed</div>
                <div className="space-y-3">
                  {analytics.slice(0, 10).map((v) => (
                    <div key={v.id} className="flex items-center justify-between text-mono text-[10px] border-b border-white/5 pb-2">
                      <div className="flex items-center gap-4">
                        <MousePointer2 className="w-3 h-3 text-detox-green" />
                        <span className="text-white uppercase">{v.page}</span>
                      </div>
                      <div className="flex items-center gap-6">
                        <span className="text-white/20">{v.userId || 'ANONYMOUS'}</span>
                        <span className="text-white/40">{v.timestamp?.toDate().toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'logs' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-mono text-xl font-bold text-white uppercase tracking-tighter">System Event Log</h2>
                <div className="flex gap-4">
                  <button className="flex items-center gap-2 text-mono text-[10px] text-white/40 hover:text-white uppercase tracking-widest transition-all">
                    <Filter className="w-3 h-3" /> Filter_Type
                  </button>
                </div>
              </div>

              <div className="bg-zinc-900 border border-white/10 overflow-hidden">
                <div className="max-h-[600px] overflow-y-auto p-6 space-y-4 font-mono text-[10px]">
                  {systemLogs.map((log) => (
                    <div key={log.id} className="flex gap-4 border-b border-white/5 pb-4 last:border-0">
                      <div className="text-white/20 whitespace-nowrap">[{log.timestamp?.toDate().toLocaleTimeString()}]</div>
                      <div className={`font-bold uppercase tracking-widest whitespace-nowrap ${
                        log.type === 'auth_error' ? 'text-red-500' : 
                        log.type === 'admin_action' ? 'text-detox-green' : 
                        'text-white/40'
                      }`}>
                        [{log.type}]
                      </div>
                      <div className="text-white/60 flex-1 leading-relaxed">
                        {log.details}
                        {log.email && <span className="text-white/20 ml-2">{'//'} {log.email}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Edit Protocol Modal */}
      <AnimatePresence>
        {editingProtocol && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
              onClick={() => setEditingProtocol(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-zinc-900 border border-white/10 p-12 overflow-y-auto max-h-[90vh]"
            >
              <button 
                onClick={() => setEditingProtocol(null)}
                className="absolute top-8 right-8 text-white/20 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>

              <h2 className="text-mono text-2xl font-black text-white uppercase tracking-tighter mb-12">
                Edit <span className="text-detox-green">Protocol</span>
              </h2>

              <form onSubmit={updateProtocol} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="text-mono text-[10px] text-white/40 uppercase tracking-widest mb-2 block">Protocol Title</label>
                      <input 
                        type="text"
                        value={editingProtocol.title}
                        onChange={(e) => setEditingProtocol({...editingProtocol, title: e.target.value})}
                        className="w-full bg-black border border-white/10 p-4 text-mono text-sm text-white focus:border-detox-green outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-mono text-[10px] text-white/40 uppercase tracking-widest mb-2 block">Category</label>
                      <select 
                        value={editingProtocol.category}
                        onChange={(e) => setEditingProtocol({...editingProtocol, category: e.target.value})}
                        className="w-full bg-black border border-white/10 p-4 text-mono text-sm text-white focus:border-detox-green outline-none appearance-none"
                      >
                        {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-mono text-[10px] text-white/40 uppercase tracking-widest mb-2 block">Author</label>
                      <select 
                        value={editingProtocol.authorId}
                        onChange={(e) => {
                          const author = authors.find(a => a.id === e.target.value);
                          setEditingProtocol({
                            ...editingProtocol, 
                            authorId: e.target.value,
                            authorName: author?.name || 'Medicine Man'
                          });
                        }}
                        className="w-full bg-black border border-white/10 p-4 text-mono text-sm text-white focus:border-detox-green outline-none appearance-none"
                      >
                        {authors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-mono text-[10px] text-white/40 uppercase tracking-widest mb-2 block">Photo URL</label>
                      <input 
                        type="text"
                        value={editingProtocol.photoUrl || ''}
                        onChange={(e) => setEditingProtocol({...editingProtocol, photoUrl: e.target.value})}
                        className="w-full bg-black border border-white/10 p-4 text-mono text-sm text-white focus:border-detox-green outline-none"
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="text-mono text-[10px] text-white/40 uppercase tracking-widest mb-2 block">Ingredients (One per line)</label>
                      <textarea 
                        value={editingProtocol.ingredients.join('\n')}
                        onChange={(e) => setEditingProtocol({...editingProtocol, ingredients: e.target.value.split('\n')})}
                        className="w-full bg-black border border-white/10 p-4 text-mono text-sm text-white focus:border-detox-green outline-none h-32 resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-mono text-[10px] text-white/40 uppercase tracking-widest mb-2 block">Execution Steps</label>
                      <textarea 
                        value={editingProtocol.instructions}
                        onChange={(e) => setEditingProtocol({...editingProtocol, instructions: e.target.value})}
                        className="w-full bg-black border border-white/10 p-4 text-mono text-sm text-white focus:border-detox-green outline-none h-32 resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-white/5">
                  <div>
                    <label className="text-mono text-[10px] text-white/40 uppercase tracking-widest mb-2 block">Technical Rationale</label>
                    <textarea 
                      value={editingProtocol.rationale || ''}
                      onChange={(e) => setEditingProtocol({...editingProtocol, rationale: e.target.value})}
                      className="w-full bg-black border border-white/10 p-4 text-mono text-[10px] text-white focus:border-detox-green outline-none h-24 resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-mono text-[10px] text-white/40 uppercase tracking-widest mb-2 block">Expected Outcome</label>
                    <textarea 
                      value={editingProtocol.outcome || ''}
                      onChange={(e) => setEditingProtocol({...editingProtocol, outcome: e.target.value})}
                      className="w-full bg-black border border-white/10 p-4 text-mono text-[10px] text-white focus:border-detox-green outline-none h-24 resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-mono text-[10px] text-white/40 uppercase tracking-widest mb-2 block">Ingredient Benefits (One per line)</label>
                    <textarea 
                      value={(editingProtocol.ingredientBenefits || []).join('\n')}
                      onChange={(e) => setEditingProtocol({...editingProtocol, ingredientBenefits: e.target.value.split('\n')})}
                      className="w-full bg-black border border-white/10 p-4 text-mono text-[10px] text-white focus:border-detox-green outline-none h-24 resize-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-8">
                  <button 
                    type="button"
                    onClick={() => setEditingProtocol(null)}
                    className="px-8 py-4 border border-white/10 text-white/40 text-mono text-xs uppercase tracking-widest hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-8 py-4 bg-detox-green text-black font-bold text-mono text-xs uppercase tracking-widest hover:bg-white transition-all"
                  >
                    [ UPDATE_PROTOCOL ]
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

