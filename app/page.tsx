'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, 
  Zap, 
  ChevronRight, 
  Search, 
  Filter, 
  Loader2,
  Database,
  RefreshCw
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import ProtocolCard from '@/components/ProtocolCard';
import { collection, query, onSnapshot, orderBy, limit, getDocs, addDoc, serverTimestamp, where, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/hooks/useAuth';
import { GoogleGenAI, Type } from "@google/genai";
import { getCategoryImageUrl } from '@/lib/categoryImages';
import { logEvent } from '@/lib/logger';
import { handleFirestoreError, OperationType } from '@/lib/utils';

const CATEGORIES = [
  "Juices & Smoothies", 
  "Waters & Drinks", 
  "Weight Loss & Cleanses", 
  "Targeted Detox", 
  "Detox Baths", 
  "Soups & Meals"
];

interface Protocol {
  id: string;
  title: string;
  ingredients: string[];
  instructions: string;
  category: string;
  authorId: string;
  authorType: string;
  authorName?: string;
  authorLevel?: number;
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
  moderationStatus?: string;
}

const MARQUEE_ITEMS = [
  { text: "CLINICAL SYNTHESIS", color: "#A800FF" },
  { text: "BIO-ACTIVE BOTANICALS", color: "#3700FF" },
  { text: "METABOLIC RECALIBRATION", color: "#FF003D" },
  { text: "ALGORITHMIC APOTHECARY", color: "#4DFF00" },
  { text: "SYSTEMIC RECOVERY", color: "#FFB300" },
  { text: "NATUROPATHIC PROTOCOLS", color: "#0055FF" },
  { text: "CELLULAR OPTIMIZATION", color: "#A800FF" },
  { text: "MEDICINE MAN AI", color: "#3700FF" },
];

export default function Home() {
  const { user, profile } = useAuth();
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  const isAdmin = user?.email?.toLowerCase() === 'teamhawkins01@gmail.com' || profile?.role === 'admin';

  useEffect(() => {
    console.log('DEBUG: isAdmin', isAdmin, 'user', user, 'profile', profile);
  }, [isAdmin, user, profile]);

  useEffect(() => {
    const q = query(
      collection(db, 'protocols'), 
      where('moderationStatus', '==', 'approved')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Protocol));
      // Sort on client side to avoid requiring a composite index
      data.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });
      setProtocols(data);
      setLoading(false);
    }, (error) => {
      setLoading(false);
      handleFirestoreError(error, OperationType.LIST, 'protocols');
    });

    return () => unsubscribe();
  }, []);

  const seedProtocols = async () => {
    setIsSeeding(true);
    const mockProtocols = [
      {
        title: "Green Machine Protocol",
        ingredients: ["Kale", "Cucumber", "Green Apple", "Lemon", "Ginger"],
        instructions: "1. Wash all produce.\n2. Run through cold-press juicer.\n3. Consume immediately for maximum enzyme retention.",
        category: "Juices & Smoothies",
        authorId: "admin",
        authorType: "Admin",
        isAiGenerated: false,
        moderationStatus: 'approved',
        starRating: 5,
        createdAt: serverTimestamp()
      },
      {
        title: "Alkaline Infusion",
        ingredients: ["Spring Water", "Cucumber Slices", "Mint Leaves", "Key Lime"],
        instructions: "1. Add ingredients to a glass pitcher.\n2. Infuse for 4 hours.\n3. Sip throughout the day to balance pH levels.",
        category: "Waters & Drinks",
        authorId: "admin",
        authorType: "Admin",
        isAiGenerated: false,
        moderationStatus: 'approved',
        starRating: 4,
        createdAt: serverTimestamp()
      },
      {
        title: "Metabolic Reset Soup",
        ingredients: ["Cabbage", "Celery", "Onion", "Bell Pepper", "Tomato", "Spices"],
        instructions: "1. Sauté onions and peppers.\n2. Add remaining vegetables and water.\n3. Simmer for 45 minutes. Blend if desired.",
        category: "Soups & Meals",
        authorId: "admin",
        authorType: "Admin",
        isAiGenerated: false,
        moderationStatus: 'approved',
        starRating: 5,
        createdAt: serverTimestamp()
      },
      {
        title: "Epsom Magnesium Flush",
        ingredients: ["Epsom Salt", "Baking Soda", "Lavender Oil", "Hot Water"],
        instructions: "1. Fill tub with hot water.\n2. Dissolve salts and soda.\n3. Soak for 20 minutes to draw out heavy metals.",
        category: "Detox Baths",
        authorId: "admin",
        authorType: "Admin",
        isAiGenerated: false,
        moderationStatus: 'approved',
        starRating: 5,
        createdAt: serverTimestamp()
      }
    ];

    try {
      for (const r of mockProtocols) {
        await addDoc(collection(db, 'protocols'), r);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'protocols');
    } finally {
      setIsSeeding(false);
    }
  };

  const filteredProtocols = activeCategory 
    ? protocols.filter(r => r.category === activeCategory)
    : protocols;

  const quickSynthesize = async (category: string) => {
    if (!isAdmin || !user) return;
    setIsGenerating(category);

    const randomImage = getCategoryImageUrl(category);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY! });
      const model = "gemini-3-flash-preview";
      
      const prompt = `Generate a unique, highly optimized, technical detox protocol for the category: "${category}". 
      Ensure the protocol title is completely original, distinct, and creative to avoid duplication. Rotate topics and shuffle ideas to ensure variety.
      The protocol must be effective, natural, and follow the DETOX.PROTOCOLS brand voice: professional, smart, and like a naturopathic doctor. Explain the who, what, when, where, how, and why.
      
      Include:
      1. A clean, health-focused, and unique title.
      2. A list of specific natural ingredients with precise measurements.
      3. Step-by-step instructions that are easy to follow and health-conscious.
      4. A list of specific health benefits for each ingredient used, explaining why it was chosen.
      5. A doctor-like rationale for why these ingredients were combined and how they work synergistically.
      6. The expected physiological outcome and long-term health benefit for the user.`;

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
              outcome: { type: Type.STRING }
            },
            required: ["title", "ingredients", "instructions", "ingredientBenefits", "rationale", "outcome"]
          }
        }
      });

      if (!response.text) throw new Error("AI failed to generate content");
      const protocolData = JSON.parse(response.text);

      const newProtocol = {
        ...protocolData,
        category,
        authorId: user.uid,
        authorType: "Admin",
        authorName: profile?.username || "Admin",
        authorLevel: profile?.currentLevel || 1,
        isAiGenerated: true,
        photoUrl: randomImage,
        starRating: 5,
        moderationStatus: 'approved',
        createdAt: Timestamp.now()
      };

      await addDoc(collection(db, "protocols"), newProtocol);
      await logEvent('admin_action', `Quick-deployed protocol: ${newProtocol.title}`, user.uid, user.email || undefined);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'protocols');
    } finally {
      setIsGenerating(null);
    }
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "DETOX.PROTOCOLS",
    "url": "https://detox.protocols",
    "description": "Professional, naturopathic detox protocols. We explain the science behind every ingredient, so you understand exactly how and why to cleanse your body for optimal health.",
    "publisher": {
      "@type": "Organization",
      "name": "DETOX.PROTOCOLS",
      "logo": {
        "@type": "ImageObject",
        "url": "https://detox.protocols/logo.png"
      }
    },
    "keywords": "detox protocols, naturopathic cleanse, holistic health, wellness, juice cleanse, smoothie detox, natural healing"
  };

  return (
    <main className="grid-bg min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />

      {/* Hero Section */}
      <section className="relative pt-64 pb-32 px-6 md:px-12 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="h-[1px] w-12 bg-detox-green" />
              <span className="text-mono text-xs text-detox-green font-bold uppercase tracking-[0.5em]">[ MEDICINE_MAN_ENGINE // ONLINE ]</span>
            </div>
            
            <h1 className="text-display text-5xl md:text-7xl font-black text-white leading-[0.9] mb-8 uppercase tracking-tighter">
              Synthesize <br />
              <span className="text-detox-green">Clinical</span> <br />
              Detox
            </h1>
            
            <p className="text-mono text-base md:text-lg text-white/60 max-w-lg mb-12 leading-relaxed uppercase tracking-widest">
              Input target ailments and available ingredients. The Medicine Man AI instantly generates custom, naturopathic protocols complete with bio-active science and specific SYNTHESIS SEQUENCES.
            </p>

            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => document.getElementById('vault')?.scrollIntoView({ behavior: 'smooth' })}
                className="btn-detox"
              >
                Initialize Medicine Man <ArrowRight className="w-5 h-5" />
              </button>
              {protocols.length === 0 && !loading && (
                <button 
                  onClick={seedProtocols}
                  disabled={isSeeding}
                  className="px-8 py-4 border border-detox-green/20 text-detox-green font-bold text-sm uppercase tracking-widest hover:bg-detox-green hover:text-black transition-all flex items-center gap-2"
                >
                  {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                  SEED_PROTOCOLS
                </button>
              )}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5 }}
            className="relative"
          >
            <div className="relative w-full aspect-[4/3] border-2 border-white/10 p-4 bg-detox-gray">
              <div className="relative w-full h-full overflow-hidden">
                <Image
                  src="https://i.ibb.co/Mx58b7rZ/detox-recipes-hero.png"
                  alt="Medicine Man Detox"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                  className="object-cover transition-all duration-700 hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                
                <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                  <div className="text-mono text-xs text-detox-green uppercase tracking-widest">
                    [ STATUS: CLINICALLY VERIFIED ] <br />
                    [ APPROACH: NATUROPATHIC ]
                  </div>
                  <div className="w-12 h-12 border border-detox-green/40 flex items-center justify-center">
                    <Zap className="w-6 h-6 text-detox-green" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="absolute -top-2 -left-2 w-8 h-8 border-t-2 border-l-2 border-detox-green" />
            <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-2 border-r-2 border-detox-green" />
          </motion.div>
        </div>
      </section>

      {/* Protocol Pioneer Promotion */}
      <section className="px-6 md:px-12 pb-32">
        <div className="max-w-7xl mx-auto p-8 border border-detox-green/20 bg-detox-green/5 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="text-display text-3xl font-black text-white uppercase tracking-tighter mb-2">Become_A_Protocol_Pioneer</h2>
            <p className="text-mono text-xs text-white/60 max-w-xl">
              Be the first to synthesize and execute a new detox SYNTHESIS SEQUENCE, then upload visual verification. Your photo will establish the global sitewide standard, permanently securing your legacy as its Protocol Pioneer.
            </p>
          </div>
          <Link href="/medicineman" className="bg-detox-green text-black font-bold py-4 px-8 text-mono text-xs uppercase tracking-widest hover:bg-white transition-all whitespace-nowrap">
            INITIALIZE_MEDICINE_MAN
          </Link>
        </div>
      </section>

      {/* Marquee */}
      <div className="marquee-container">
        <div className="marquee-content">
          {[0, 1].map((loop) => (
            <div key={loop} className="flex whitespace-nowrap">
              {MARQUEE_ITEMS.map((item, i) => (
                <span key={i} className="text-display text-2xl font-black mx-4 uppercase flex items-center">
                  <span className="bg-black px-2" style={{ color: item.color }}>{item.text}</span>
                  <span className="text-black ml-4">•</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Recipe Vault Section */}
      <section id="vault" className="py-32 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
            <div>
              <div className="text-mono text-xs text-detox-green mb-4 tracking-[0.4em] uppercase">01 // CLINICAL_PROTOCOLS</div>
              <h2 className="text-display text-5xl md:text-7xl font-black text-white uppercase leading-none">
                The <span className="text-detox-green">Protocols</span>
              </h2>
            </div>
            
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setActiveCategory(null)}
                className={`px-4 py-2 text-mono text-xs font-bold uppercase tracking-widest transition-all ${!activeCategory ? 'bg-detox-green text-black' : 'text-white/60 hover:text-white border border-white/10'}`}
              >
                ALL_PROTOCOLS
              </button>
              {CATEGORIES.map(cat => (
                <div key={cat} className="flex flex-col gap-1">
                  <button 
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-2 text-mono text-[10px] font-bold uppercase tracking-widest transition-all ${activeCategory === cat ? 'bg-detox-green text-black' : 'text-white/40 hover:text-white border border-white/10'}`}
                  >
                    {cat.replace(' & ', '_').toUpperCase()}
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => quickSynthesize(cat)}
                      disabled={isGenerating !== null}
                      className="text-[10px] text-detox-green/60 hover:text-detox-green text-mono uppercase tracking-tighter text-center flex items-center justify-center gap-1"
                    >
                      {isGenerating === cat ? (
                        <Loader2 className="w-2 h-2 animate-spin" />
                      ) : (
                        <Zap className="w-2 h-2" />
                      )}
                      [ SYNTHESIZE_NEW ]
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Protocol Pioneer Call to Action */}
          <div className="mb-12 p-6 border border-detox-green/30 bg-detox-green/10 rounded-xl text-center">
            <p className="text-mono text-sm text-detox-green uppercase tracking-widest mb-2 font-bold flex items-center justify-center gap-2">
              <Zap className="w-4 h-4" /> Secure Your Legacy
            </p>
            <p className="text-mono text-xs text-white/80 max-w-3xl mx-auto leading-relaxed uppercase tracking-widest">
              Browse these community-synthesized protocols. Find one with no visual data, be the first to complete the SYNTHESIS SEQUENCE, and upload your photo. You will be locked in as the verified Protocol Pioneer and owner of this digital legacy.
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <RefreshCw className="w-12 h-12 text-detox-green animate-spin" />
              <div className="text-mono text-xs text-white/40 uppercase tracking-[0.4em]">LOADING_CLINICAL_DATA...</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <AnimatePresence mode="popLayout">
                {filteredProtocols.map((protocol) => (
                  <motion.div
                    key={protocol.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4 }}
                  >
                    <ProtocolCard protocol={protocol} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {!loading && filteredProtocols.length === 0 && (
            <div className="text-center py-32 border border-white/5 bg-black/20">
              <div className="text-mono text-xs text-white/40 uppercase tracking-[0.4em]">NO_PROTOCOLS_FOUND_IN_THIS_CATEGORY</div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
