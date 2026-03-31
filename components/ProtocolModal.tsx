'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { 
  X, 
  Star, 
  Share2, 
  Heart, 
  MessageSquare, 
  Camera, 
  Send, 
  Facebook, 
  Twitter, 
  Pin as Pinterest,
  Check,
  Loader2,
  User,
  Plus,
  ClipboardList,
  BarChart3,
  Lock
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  serverTimestamp,
  deleteDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db, storage } from '@/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Image from 'next/image';
import { logEvent } from '@/lib/logger';
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
  Zap,
  Camera as CameraIcon,
  RefreshCw
} from 'lucide-react';

interface Protocol {
  id: string;
  title: string;
  ingredients: string[];
  instructions: string;
  category: string;
  authorId: string;
  authorType: string;
  authorName?: string;
  isAiGenerated: boolean;
  photoUrl?: string;
  ingredientBenefits?: string[];
  rationale?: string;
  outcome?: string;
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  protocolYield?: string;
  starRating?: number;
  createdAt: any;
}

interface Review {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  userLevel?: number;
  userBadges?: string[];
  rating: number;
  suggestion?: string;
  photoUrl?: string;
  moderationStatus?: 'pending' | 'approved' | 'rejected';
  createdAt: any;
}

export default function ProtocolModal({ protocol: initialProtocol, protocolId, onClose }: { protocol?: Protocol, protocolId?: string, onClose: () => void }) {
  const { user, profile } = useAuth();
  const [protocol, setProtocol] = useState<Protocol | null>(initialProtocol || null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [rating, setRating] = useState(5);
  const [suggestion, setSuggestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'protocol' | 'analysis' | 'reports'>('protocol');
  const [loadingProtocol, setLoadingProtocol] = useState(!initialProtocol && !!protocolId);
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [substitution, setSubstitution] = useState('');
  const [isSubstituting, setIsSubstituting] = useState(false);

  const handleSubstitute = async () => {
    if (!selectedIngredient || !protocol) return;
    setIsSubstituting(true);
    setSubstitution('');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY! });
      const prompt = `Suggest a substitute for "${selectedIngredient}" in the protocol "${protocol.title}". Explain why it works as a substitute. Keep it concise.`;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      setSubstitution(response.text || 'No substitution found.');
    } catch (error) {
      console.error('Substitution error:', error);
      setSubstitution('Failed to get substitution. Please try again.');
    } finally {
      setIsSubstituting(false);
    }
  };

  useEffect(() => {
    if (!protocol && protocolId) {
      setLoadingProtocol(true);
      const docRef = doc(db, 'protocols', protocolId);
      getDoc(docRef).then((docSnap) => {
        if (docSnap.exists()) {
          setProtocol({ id: docSnap.id, ...docSnap.data() } as Protocol);
        }
        setLoadingProtocol(false);
      });
    }
  }, [protocolId, protocol]);

  // JSON-LD Schema
  const jsonLd = protocol ? {
    "@context": "https://schema.org/",
    "@type": "Recipe",
    "name": protocol.title,
    "recipeCategory": protocol.category,
    "recipeIngredient": protocol.ingredients,
    "recipeInstructions": protocol.instructions,
    "prepTime": protocol.prepTime,
    "cookTime": protocol.cookTime,
    "totalTime": protocol.totalTime,
    "recipeYield": protocol.protocolYield,
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": protocol.starRating || 5,
      "reviewCount": reviews.length || 1
    }
  } : null;

  useEffect(() => {
    if (!protocol) return;

    // Fetch reviews - only approved ones for public view
    const q = query(
      collection(db, 'reviews'), 
      where('protocolId', '==', protocol.id),
      where('moderationStatus', '==', 'approved'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const revs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
      // Sort reviews: Level 7+ users (Expert Advice) first, then by date
      const sortedRevs = [...revs].sort((a, b) => {
        const aLevel = a.userLevel || 1;
        const bLevel = b.userLevel || 1;
        if (aLevel >= 7 && bLevel < 7) return -1;
        if (aLevel < 7 && bLevel >= 7) return 1;
        return 0; // Keep original order (date) within same tier
      });
      setReviews(sortedRevs);
    });

    // Fetch likes
    const likesQ = query(collection(db, 'likes'), where('protocolId', '==', protocol.id));
    const unsubscribeLikes = onSnapshot(likesQ, (snapshot) => {
      setLikeCount(snapshot.size);
      if (user) {
        setIsLiked(snapshot.docs.some(doc => doc.data().userId === user.uid));
      }
    });

    return () => {
      unsubscribe();
      unsubscribeLikes();
    };
  }, [protocol, user]);

  if (loadingProtocol) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl">
        <Loader2 className="w-12 h-12 text-detox-green animate-spin" />
      </div>
    );
  }

  if (!protocol) return null;

  const handleLike = async () => {
    if (!user) return;
    
    if (isLiked) {
      const q = query(collection(db, 'likes'), where('protocolId', '==', protocol.id), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      snapshot.forEach(async (d) => {
        await deleteDoc(doc(db, 'likes', d.id));
      });
    } else {
      await addDoc(collection(db, 'likes'), {
        protocolId: protocol.id,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
    }
  };

  const isSaved = profile?.savedProtocols?.includes(protocol.id);

  const handleSaveToArchive = async () => {
    if (!user || !profile) return;
    
    const userRef = doc(db, 'users', user.uid);
    try {
      if (isSaved) {
        await updateDoc(userRef, {
          savedProtocols: arrayRemove(protocol.id)
        });
      } else {
        await updateDoc(userRef, {
          savedProtocols: arrayUnion(protocol.id)
        });
      }
    } catch (error) {
      console.error("Error saving to archive:", error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    setIsSubmitting(true);
    try {
      let photoUrl = '';
      if (selectedFile) {
        const storageRef = ref(storage, `reviews/${protocol.id}/${user.uid}_${Date.now()}`);
        await uploadBytes(storageRef, selectedFile);
        photoUrl = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, 'reviews'), {
        protocolId: protocol.id,
        userId: user.uid,
        username: profile.username,
        avatar: profile.avatar,
        rating,
        suggestion,
        photoUrl,
        moderationStatus: 'pending',
        createdAt: serverTimestamp()
      });

      // Protocol Pioneer logic
      if (photoUrl && (!protocol.photoUrl || protocol.photoUrl.includes('picsum.photos') || protocol.photoUrl.includes('unsplash.com'))) {
        await updateDoc(doc(db, 'protocols', protocol.id), {
          photoUrl: photoUrl,
          pioneerUserId: user.uid,
          pioneerUserName: profile.username
        });
      }

      await logEvent('user_action', `Submitted field report for moderation: ${protocol.title}`, user.uid, user.email || undefined);
      
      setSuggestion('');
      setRating(5);
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (error) {
      console.error("Error submitting review:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/${protocol.category.replace(/ & /g, '-').replace(/ /g, '-')}/${encodeURIComponent(protocol.title)}` : '';
  const shareText = `Check out this detox protocol: ${protocol.title}`;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose} />
      
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="relative w-full max-w-6xl h-[90vh] bg-detox-gray border border-white/10 overflow-hidden flex flex-col md:flex-row shadow-2xl"
      >
        {/* Left: Image & Info */}
        <div className="w-full md:w-2/5 relative h-48 md:h-auto border-b md:border-b-0 md:border-r border-white/10 shrink-0">
          <Image 
            src={protocol.photoUrl || `https://picsum.photos/seed/${protocol.id}/800/1200`}
            alt={protocol.title}
            fill
            sizes="(max-width: 768px) 100vw, 40vw"
            className="object-cover grayscale hover:grayscale-0 transition-all duration-700"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
          
          <div className="absolute bottom-8 left-8 right-8">
            <div className="flex justify-between items-end mb-2">
              <div className="text-mono text-[10px] text-detox-green tracking-widest uppercase">
                [ CATEGORY: {protocol.category} ]
              </div>
              {protocol.authorName && (
                <div className="text-mono text-[8px] text-white/40 uppercase tracking-widest">
                  BY: {protocol.authorName}
                </div>
              )}
            </div>
            <h2 className="text-display text-4xl font-black text-white leading-none mb-6 uppercase tracking-tighter">
              {protocol.title}
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleLike}
                  className={`flex items-center gap-2 text-mono text-[10px] font-bold transition-colors ${isLiked ? 'text-detox-green' : 'text-white/40 hover:text-white'}`}
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-detox-green' : ''}`} />
                  {likeCount} LIKES
                </button>
                <button 
                  onClick={handleSaveToArchive}
                  className={`flex items-center gap-2 text-mono text-[10px] font-bold transition-colors ${isSaved ? 'text-detox-green' : 'text-white/40 hover:text-white'}`}
                >
                  <Plus className={`w-4 h-4 ${isSaved ? 'fill-detox-green' : ''}`} />
                  {isSaved ? 'IN ARCHIVE' : 'SAVE TO ARCHIVE'}
                </button>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    alert('Link copied to clipboard!');
                  }}
                  className="flex items-center gap-2 text-mono text-[10px] font-bold text-white/40 hover:text-white transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  SHARE
                </button>
              </div>
              <div className="flex items-center gap-1 text-detox-green">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-3 h-3 ${i < (protocol.starRating || 5) ? 'fill-detox-green' : 'text-white/10'}`} />
                ))}
                <span className="text-mono text-[8px] text-white/20 ml-2 uppercase tracking-widest">Verified Protocol</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Content & Tabs */}
        <div className="flex-1 flex flex-col bg-zinc-950 overflow-hidden">
          {/* Header Tabs */}
          <div className="flex border-b border-white/10 shrink-0">
            {[
              { id: 'protocol', label: '01_PROTOCOL', icon: ClipboardList },
              { id: 'analysis', label: '02_ANALYSIS', icon: BarChart3 },
              { id: 'reports', label: '03_FIELD_REPORTS', icon: MessageSquare }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-3 py-6 text-mono text-[10px] font-bold uppercase tracking-widest transition-all border-r border-white/10 last:border-r-0 ${
                  activeTab === tab.id 
                    ? 'bg-white/5 text-detox-green border-b-2 border-b-detox-green' 
                    : 'text-white/20 hover:text-white hover:bg-white/5'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
            <button 
              onClick={onClose}
              className="px-8 text-white/20 hover:text-white border-l border-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-8 md:p-12 custom-scrollbar">
            <AnimatePresence mode="wait">
              {activeTab === 'protocol' && (
                <motion.div 
                  key="protocol"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-12"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <section>
                      <h3 className="text-mono text-[10px] text-detox-green mb-8 tracking-[0.4em] uppercase flex items-center gap-3">
                        <div className="w-2 h-2 bg-detox-green" />
                        Ingredients_Manifest
                      </h3>
                      <ul className="space-y-4 mb-8">
                        {protocol.ingredients.map((ing, i) => (
                          <li key={i} className="flex items-start gap-4 text-white/80 font-mono text-sm group">
                            <span className="text-detox-green/20 text-[10px] mt-1">[{i+1}]</span>
                            <span className="border-b border-white/5 pb-2 flex-1 group-hover:border-detox-green/20 transition-colors">{ing}</span>
                          </li>
                        ))}
                      </ul>
                      
                      {/* Smart Substitution */}
                      <div className="p-6 bg-white/5 border border-white/10 space-y-4">
                        <h4 className="text-mono text-[10px] text-white/60 uppercase tracking-widest">Need_A_Substitute?</h4>
                        <select 
                          value={selectedIngredient}
                          onChange={(e) => setSelectedIngredient(e.target.value)}
                          className="w-full bg-black border border-white/10 p-2 text-white font-mono text-xs"
                        >
                          <option value="">SELECT_INGREDIENT</option>
                          {protocol.ingredients.map((ing, i) => (
                            <option key={i} value={ing}>{ing}</option>
                          ))}
                        </select>
                        <button 
                          onClick={handleSubstitute}
                          disabled={isSubstituting || !selectedIngredient}
                          className="w-full bg-detox-green/10 text-detox-green border border-detox-green/20 py-2 text-mono text-[10px] uppercase tracking-widest hover:bg-detox-green hover:text-black transition-all disabled:opacity-50"
                        >
                          {isSubstituting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'GET_SUBSTITUTION'}
                        </button>
                        {substitution && (
                          <div className="mt-4 p-4 bg-black border border-detox-green/20 text-white/80 font-mono text-xs leading-relaxed">
                            {substitution}
                          </div>
                        )}
                      </div>
                    </section>

                    <section>
                      <h3 className="text-mono text-[10px] text-detox-green mb-8 tracking-[0.4em] uppercase flex items-center gap-3">
                        <div className="w-2 h-2 bg-detox-green" />
                        Execution_Protocol
                      </h3>
                      <div className="space-y-8">
                        {protocol.instructions.split('\n').filter(s => s.trim()).map((step, i) => (
                          <div key={i} className="flex gap-6 group">
                            <div className="flex flex-col items-center gap-2">
                              <span className="text-mono text-detox-green text-xs font-bold">{(i + 1).toString().padStart(2, '0')}</span>
                              <div className="w-px h-full bg-white/5 group-last:hidden" />
                            </div>
                            <p className="text-white/60 text-sm leading-relaxed font-mono pb-4">{step}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                </motion.div>
              )}

              {activeTab === 'analysis' && (
                <motion.div 
                  key="analysis"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-12"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-12">
                      {protocol.rationale && (
                        <section className="industrial-card p-8 bg-white/5 border-white/10">
                          <h3 className="text-mono text-[10px] text-detox-green mb-6 tracking-[0.4em] uppercase">Technical_Rationale</h3>
                          <p className="text-white/60 text-sm font-mono leading-relaxed italic">
                            {protocol.rationale}
                          </p>
                        </section>
                      )}

                      {protocol.outcome && (
                        <section className="industrial-card p-8 bg-detox-green/5 border-detox-green/20">
                          <h3 className="text-mono text-[10px] text-detox-green mb-6 tracking-[0.4em] uppercase">Expected_Physiological_Outcome</h3>
                          <p className="text-detox-green text-lg font-bold font-mono leading-tight uppercase tracking-tighter">
                            &quot;{protocol.outcome}&quot;
                          </p>
                        </section>
                      )}
                    </div>

                    <div className="space-y-8">
                      {protocol.ingredientBenefits && (
                        <section className="industrial-card p-8 bg-white/5 border-white/10 h-full">
                          <h3 className="text-mono text-[10px] text-detox-green mb-8 tracking-[0.4em] uppercase">Biochemical_Benefits</h3>
                          <ul className="space-y-6">
                            {protocol.ingredientBenefits.map((benefit, i) => (
                              <li key={i} className="flex items-start gap-4 text-white/60 text-[10px] font-mono uppercase tracking-wider leading-relaxed">
                                <Zap className="w-3 h-3 text-detox-green shrink-0 mt-0.5" />
                                {benefit}
                              </li>
                            ))}
                          </ul>
                        </section>
                      )}
                    </div>
                  </div>

                  {/* Social Share */}
                  <section className="pt-12 border-t border-white/10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div>
                        <h3 className="text-mono text-[10px] text-white/40 tracking-widest uppercase mb-2">Deploy_Protocol_to_Network</h3>
                        <p className="text-mono text-[8px] text-white/20 uppercase">Share this technical protocol with other operators</p>
                      </div>
                      <div className="flex gap-4">
                        <a href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`} target="_blank" className="flex items-center gap-3 px-6 py-3 border border-white/10 text-white/40 hover:text-white hover:border-white transition-all text-mono text-[10px] uppercase tracking-widest">
                          <Facebook className="w-4 h-4" /> FB
                        </a>
                        <a href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`} target="_blank" className="flex items-center gap-3 px-6 py-3 border border-white/10 text-white/40 hover:text-white hover:border-white transition-all text-mono text-[10px] uppercase tracking-widest">
                          <Twitter className="w-4 h-4" /> TW
                        </a>
                        <a href={`https://pinterest.com/pin/create/button/?url=${shareUrl}&description=${shareText}`} target="_blank" className="flex items-center gap-3 px-6 py-3 border border-white/10 text-white/40 hover:text-white hover:border-white transition-all text-mono text-[10px] uppercase tracking-widest">
                          <Pinterest className="w-4 h-4" /> PN
                        </a>
                      </div>
                    </div>
                  </section>
                </motion.div>
              )}

              {activeTab === 'reports' && (
                <motion.div 
                  key="reports"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-12"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <div className="lg:col-span-1">
                      <h3 className="text-mono text-[10px] text-detox-green mb-8 tracking-[0.4em] uppercase">Submit_Field_Report</h3>
                      {user ? (
                        <form onSubmit={handleSubmitReview} className="space-y-6 bg-white/5 p-8 border border-white/10">
                          <div className="flex items-center justify-between">
                            <div className="flex gap-2">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <button 
                                  key={s} 
                                  type="button"
                                  onClick={() => setRating(s)}
                                  className={`transition-colors ${s <= rating ? 'text-detox-green' : 'text-white/10'}`}
                                >
                                  <Star className={`w-5 h-5 ${s <= rating ? 'fill-detox-green' : ''}`} />
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="relative">
                            <textarea 
                              value={suggestion}
                              onChange={(e) => setSuggestion(e.target.value)}
                              placeholder="PROTOCOL_FEEDBACK_OR_TWEAKS..."
                              className="w-full bg-black border border-white/10 p-4 text-white placeholder:text-white/10 focus:outline-none focus:border-detox-green transition-colors font-mono text-xs min-h-[150px] resize-none"
                              required
                            />
                          </div>

                          <div className="space-y-4">
                            <label className="flex items-center justify-center gap-3 w-full py-4 border border-dashed border-white/10 text-mono text-[10px] text-white/40 hover:text-white hover:border-detox-green transition-all cursor-pointer">
                              <Camera className="w-4 h-4" />
                              {selectedFile ? 'PHOTO_ATTACHED' : 'ATTACH_VISUAL_PROOF'}
                              <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleFileChange} 
                                className="hidden" 
                              />
                            </label>
                            {previewUrl && (
                              <div className="relative aspect-video w-full border border-detox-green/40">
                                <Image src={previewUrl} alt="Preview" fill sizes="100vw" className="object-cover" />
                                <button 
                                  type="button"
                                  onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                                  className="absolute top-2 right-2 bg-black/80 p-2 text-white hover:text-detox-green"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                            <button 
                              type="submit" 
                              disabled={isSubmitting || !suggestion}
                              className="w-full bg-detox-green text-black font-bold py-4 text-mono text-xs uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                              TRANSMIT_REPORT
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="p-12 border border-white/10 text-center bg-white/5">
                          <Lock className="w-8 h-8 text-white/10 mx-auto mb-4" />
                          <p className="text-mono text-[10px] text-white/40 uppercase tracking-widest">AUTH_REQUIRED_FOR_REPORTING</p>
                        </div>
                      )}
                    </div>

                    <div className="lg:col-span-2">
                      <h3 className="text-mono text-[10px] text-detox-green mb-8 tracking-[0.4em] uppercase flex items-center justify-between">
                        Verified_Field_Reports
                        <span className="text-white/20 text-[8px] tracking-widest">{reviews.length} LOGS_FOUND</span>
                      </h3>
                      
                      <div className="space-y-8">
                        {reviews.length > 0 ? reviews.map((rev) => (
                          <div key={rev.id} className="industrial-card p-8 bg-white/5 border-white/10">
                            <div className="flex justify-between items-start mb-6">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-detox-green/10 border border-detox-green/20 flex items-center justify-center text-detox-green">
                                  <User className="w-5 h-5" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-3">
                                    <div className="text-mono text-xs text-white font-bold uppercase tracking-widest">{rev.username}</div>
                                    {rev.userLevel && (
                                      <span className={`text-mono text-[8px] px-2 py-0.5 font-bold border transition-all duration-500 ${rev.userLevel >= 7 ? 'bg-detox-green text-black border-detox-green shadow-[0_0_10px_rgba(0,255,0,0.4)]' : 'bg-detox-green/20 text-detox-green'}`}>
                                        {rev.userLevel >= 7 ? 'EXPERT_ADVICE' : ''}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <div className="flex gap-1">
                                      {[...Array(5)].map((_, i) => (
                                        <Star key={i} className={`w-2 h-2 ${i < rev.rating ? 'fill-detox-green text-detox-green' : 'text-white/10'}`} />
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="text-mono text-[8px] text-white/20 uppercase tracking-widest">
                                {new Date(rev.createdAt?.seconds * 1000).toLocaleDateString()}
                              </div>
                            </div>
                            <p className="text-white/60 text-sm font-mono leading-relaxed italic border-l-2 border-detox-green/20 pl-6">
                              &quot;{rev.suggestion}&quot;
                            </p>
                            {rev.photoUrl && (
                              <div className="mt-6 relative aspect-video w-full max-w-md border border-white/10 overflow-hidden group">
                                <Image src={rev.photoUrl} alt="User creation" fill sizes="(max-width: 768px) 100vw, 448px" className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500" referrerPolicy="no-referrer" />
                              </div>
                            )}
                          </div>
                        )) : (
                          <div className="p-20 border border-dashed border-white/5 text-center">
                            <p className="text-mono text-[10px] text-white/10 uppercase tracking-widest">NO_FIELD_REPORTS_IN_DATABASE</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
