'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ArrowLeft, ArrowRight, Printer, Plus, Loader2, Check, RefreshCw, AlertCircle, X as CloseIcon, Camera, Upload, Leaf } from 'lucide-react';
import Link from 'next/link';
import { GoogleGenAI, Type } from "@google/genai";
import { useAuth } from '@/hooks/useAuth';
import { db, storage } from '@/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getCategoryImageUrl } from '@/lib/categoryImages';
import Image from 'next/image';
import { logEvent } from '@/lib/logger';

const MedicineManSVG = () => (
  <div className="relative p-4 overflow-visible flex justify-center mb-4">
    <svg 
      viewBox="0 0 240 240" 
      className="w-48 h-48 text-detox-green opacity-90 overflow-visible" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ccff00" stopOpacity="1" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ccff00" stopOpacity="1" />
        </linearGradient>
        <radialGradient id="potionGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ccff00" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#ccff00" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Mystical aura/background rings */}
      <circle 
        cx="120" cy="120" r="105" 
        stroke="url(#ringGradient)"
        strokeDasharray="12 12" 
        className="animate-[spin_25s_linear_infinite]" 
        filter="url(#glow)"
        strokeWidth="3"
      />
      <circle 
        cx="120" cy="120" r="85" 
        stroke="currentColor"
        strokeDasharray="4 16" 
        className="animate-[spin_18s_linear_infinite_reverse]" 
        opacity="0.4"
        strokeWidth="1.5"
      />
      <circle 
        cx="120" cy="120" r="65" 
        stroke="#ffffff"
        strokeDasharray="2 8" 
        className="animate-[spin_12s_linear_infinite]" 
        opacity="0.2"
      />
      
      {/* Medicine Man Figure (Centered at 120, 120) */}
      <g transform="translate(20, 20)">
        {/* Head/Mask */}
        <path d="M100 40 L120 70 L100 90 L80 70 Z" fill="currentColor" fillOpacity="0.3" />
        <circle cx="90" cy="65" r="3" fill="white" />
        <circle cx="110" cy="65" r="3" fill="white" />
        
        {/* Headdress/Feathers/Leaves */}
        <path d="M100 40 Q90 20 70 30" stroke="#ffffff" strokeOpacity="0.6" />
        <path d="M100 40 Q100 15 100 10" stroke="#ffffff" strokeOpacity="0.6" />
        <path d="M100 40 Q110 20 130 30" stroke="#ffffff" strokeOpacity="0.6" />
        
        {/* Body/Cloak */}
        <path d="M80 90 L60 160 L140 160 L120 90" fill="currentColor" fillOpacity="0.15" />
        
        {/* Arms mixing potion */}
        <path d="M70 110 Q50 130 80 140" stroke="#ffffff" strokeOpacity="0.4" />
        <path d="M130 110 Q150 130 120 140" stroke="#ffffff" strokeOpacity="0.4" />
        
        {/* Mortar and Pestle / Cauldron */}
        <circle cx="100" cy="145" r="15" fill="url(#potionGradient)" className="animate-pulse" />
        <path d="M80 140 Q100 170 120 140 Z" fill="currentColor" fillOpacity="0.4" stroke="#ffffff" strokeWidth="1" />
        <path d="M110 120 L100 145" strokeWidth="4" stroke="#ffffff" />
        
        {/* Magic sparkles/smoke coming out */}
        <path d="M100 130 Q90 110 100 90" strokeDasharray="2 4" className="animate-pulse" stroke="#ccff00" />
        <path d="M90 135 Q70 115 80 95" strokeDasharray="2 4" className="animate-pulse" style={{ animationDelay: '0.5s' }} stroke="#ffffff" />
        <path d="M110 135 Q130 115 120 95" strokeDasharray="2 4" className="animate-pulse" style={{ animationDelay: '1s' }} stroke="#ccff00" />

        {/* Extra Sparks */}
        <circle cx="100" cy="125" r="1.5" fill="#ffffff" className="animate-ping" style={{ animationDelay: '0.2s' }} />
        <circle cx="115" cy="135" r="1.5" fill="#ccff00" className="animate-ping" style={{ animationDelay: '0.7s' }} />
        <circle cx="85" cy="130" r="1.5" fill="#ffffff" className="animate-ping" style={{ animationDelay: '1.2s' }} />
        <circle cx="100" cy="145" r="2" fill="#ccff00" className="animate-pulse" />
      </g>
    </svg>
  </div>
);

export default function MedicineMan() {
  const { user, profile } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState<any>(null);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [targetHealthGoal, setTargetHealthGoal] = useState('');
  const [flavorProfile, setFlavorProfile] = useState('');
  const recipeRef = useRef<HTMLDivElement>(null);

  const handleAddIngredient = () => {
    if (inputValue.trim()) {
      if (!ingredients.includes(inputValue.trim())) {
        setIngredients([...ingredients, inputValue.trim()]);
      }
      setInputValue('');
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddIngredient();
    }
  };

  const removeIngredient = (tag: string) => {
    setIngredients(ingredients.filter(i => i !== tag));
  };

  const generateRecipe = async () => {
    if (ingredients.length === 0) return;
    
    setLoading(true);
    setRecipe(null);
    setAdded(false);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '' });
      
      let alchemistContext = "";
      if (profile?.isMaster) {
        if (targetHealthGoal) alchemistContext += `Target Health Goal: ${targetHealthGoal}. `;
        if (flavorProfile) alchemistContext += `Desired Flavor Profile: ${flavorProfile}. `;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Create a detox recipe using these ingredients: ${ingredients.join(', ')}. 
        ${alchemistContext}
        The recipe should be healthy, cleansing, and easy to make. You are the Medicine Man, an ancient, wise healer who uses the earth's elements to cure ailments. Write the rationale and outcome in the voice of the Medicine Man (mystical, wise, authoritative but caring).
        Return the result in JSON format with the following structure:
        {
          "title": "Recipe Name",
          "category": "One of: Juices & Smoothies, Waters & Drinks, Weight Loss & Cleanses, Targeted Detox, Detox Baths, Soups & Meals",
          "ingredients": ["item 1", "item 2"],
          "instructions": "Step 1. Step 2. ...",
          "ingredientBenefits": ["benefit 1", "benefit 2"],
          "rationale": "Why these ingredients were combined (in the voice of the Medicine Man)",
          "outcome": "Why it is good for the user (in the voice of the Medicine Man)"
        }`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              category: { type: Type.STRING },
              ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
              instructions: { type: Type.STRING },
              ingredientBenefits: { type: Type.ARRAY, items: { type: Type.STRING } },
              rationale: { type: Type.STRING },
              outcome: { type: Type.STRING }
            },
            required: ["title", "category", "ingredients", "instructions", "ingredientBenefits", "rationale", "outcome"]
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      setRecipe(data);
      setCurrentStep(3);
      await logEvent('user_action', `Generated protocol draft: ${data.title}`, user?.uid, user?.email || undefined);
    } catch (error) {
      console.error("Error generating recipe:", error);
      setError("System failure during protocol generation.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCommunity = async () => {
    if (!user || !recipe) return;

    setLoading(true);
    try {
      const newRecipe = {
        ...recipe,
        authorId: user.uid,
        authorType: "User",
        authorName: profile?.username || "Anonymous User",
        authorLevel: profile?.currentLevel || 1,
        isAiGenerated: true,
        isMasterCrafted: profile?.isMaster || false,
        moderationStatus: 'approved', // Publish live immediately
        createdAt: Timestamp.now()
      };

      await addDoc(collection(db, "recipes"), newRecipe);
      await logEvent('user_action', `Published protocol to community: ${newRecipe.title}`, user.uid, user.email || undefined);
      setAdded(true);
      setTimeout(() => setAdded(false), 3000);
    } catch (error) {
      console.error("Error adding to community:", error);
      setError("Failed to publish to community.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSaveToLibrary = async () => {
    if (!user || !recipe || !selectedFile) {
      setError("A vision (photo) and your identity are required to share this protocol.");
      return;
    }

    setIsSaving(true);
    try {
      const storageRef = ref(storage, `recipes/${user.uid}_${Date.now()}`);
      await uploadBytes(storageRef, selectedFile);
      const photoUrl = await getDownloadURL(storageRef);

      const newRecipe = {
        ...recipe,
        authorId: user.uid,
        authorType: "User",
        authorName: profile?.username || "Anonymous User",
        authorLevel: profile?.currentLevel || 1,
        isAiGenerated: true,
        isMasterCrafted: profile?.isMaster || false,
        targetHealthGoal: profile?.isMaster ? targetHealthGoal : undefined,
        starRating: 5,
        photoUrl: photoUrl || getCategoryImageUrl(recipe.category),
        moderationStatus: 'pending',
        createdAt: Timestamp.now()
      };

      await addDoc(collection(db, "recipes"), newRecipe);
      await logEvent('user_action', `Deployed protocol for moderation: ${newRecipe.title}`, user.uid, user.email || undefined);
      setAdded(true);
      setShowSaveDialog(false);
      setTimeout(() => setAdded(false), 3000);
      
      // Trigger print after saving
      handlePrint();
    } catch (error: any) {
      console.error("Error adding to library:", error);
      setError("Failed to share protocol with the tribe.");
    } finally {
      setIsSaving(false);
    }
  };

  const steps = [
    { id: 1, name: 'Elements', description: 'What elements do you bring?' },
    { id: 2, name: 'Parameters', description: 'Seek the Medicine Man\'s wisdom' },
    { id: 3, name: 'The Protocol', description: 'Review your healing protocol' }
  ];

  return (
    <main className="grid-bg min-h-screen pb-10 px-6">
      <AnimatePresence>
        {showSaveDialog && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl"
          >
            <div className="w-full max-w-md bg-detox-gray border border-white/10 p-10">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-mono text-xl font-bold text-white uppercase tracking-tighter">Share the Protocol?</h2>
                <button onClick={() => setShowSaveDialog(false)} className="text-white/40 hover:text-white">
                  <CloseIcon className="w-6 h-6" />
                </button>
              </div>

              <p className="text-mono text-[10px] text-white/40 uppercase tracking-widest mb-8 leading-relaxed">
                To share this protocol with the tribe, you must provide a vision (photo) of your creation.
              </p>

              <div className="space-y-6">
                <div 
                  onClick={() => document.getElementById('file-upload')?.click()}
                  className="relative aspect-video border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:border-detox-green/40 transition-colors overflow-hidden"
                >
                  {previewUrl ? (
                    <Image src={previewUrl} alt="Preview" fill sizes="(max-width: 768px) 100vw, 448px" className="object-cover grayscale" />
                  ) : (
                    <>
                      <Camera className="w-8 h-8 text-white/10 mb-2" />
                      <span className="text-mono text-[10px] text-white/20 uppercase tracking-widest">Click to upload photo</span>
                    </>
                  )}
                  <input 
                    id="file-upload"
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    className="hidden" 
                  />
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={handlePrint}
                    className="flex-1 border border-white/10 py-4 text-mono text-[10px] font-bold text-white uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                  >
                    Just Print
                  </button>
                  <button 
                    onClick={handleSaveToLibrary}
                    disabled={!selectedFile || isSaving}
                    className="flex-1 bg-detox-green py-4 text-mono text-[10px] font-bold text-black uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Save & Print
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-8">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-white/40 hover:text-detox-green text-mono text-[10px] uppercase tracking-widest mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4" /> [ BACK_TO_HOME ]
            </Link>
            <h1 className="text-display text-5xl font-black text-white uppercase tracking-tighter leading-none">
              Medicine <span className="text-detox-green">Man</span>
            </h1>
            <p className="text-mono text-[10px] text-detox-green mt-2 uppercase tracking-widest">ALGORITHMIC WISDOM. CLINICAL SYNTHESIS.</p>
          </div>

          {/* Step Progress */}
          <div className="flex items-center gap-4">
            {steps.map((step) => (
              <div key={step.id} className="flex items-center gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 flex items-center justify-center border-2 text-mono text-xs font-bold transition-all duration-500 ${
                    currentStep >= step.id ? 'bg-detox-green border-detox-green text-black' : 'border-white/10 text-white/20'
                  }`}>
                    {step.id}
                  </div>
                  <span className={`text-[8px] text-mono uppercase tracking-widest mt-2 ${
                    currentStep === step.id ? 'text-detox-green' : 'text-white/20'
                  }`}>
                    {step.name}
                  </span>
                </div>
                {step.id < 3 && (
                  <div className={`w-12 h-[1px] mb-4 ${currentStep > step.id ? 'bg-detox-green' : 'bg-white/10'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-12">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="industrial-card p-4 md:p-8 bg-detox-gray border-detox-green/20"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="flex justify-center order-2 md:order-2">
                    <MedicineManSVG />
                  </div>
                  <div className="space-y-6 order-1 md:order-1">
                    <div className="flex items-center gap-3 text-detox-green">
                      <Leaf className="w-5 h-5" />
                      <span className="text-mono text-[10px] font-bold uppercase tracking-[0.3em]">Step 01 // LOG_ELEMENTAL_INPUTS</span>
                    </div>
                    <h2 className="text-display text-3xl md:text-4xl font-black text-white uppercase tracking-tighter leading-tight">IDENTIFY YOUR BOTANICAL ELEMENTS</h2>
                    <p className="text-white/40 text-[10px] leading-relaxed font-mono uppercase tracking-widest">
                      OFFER YOUR AVAILABLE INGREDIENTS TO THE MEDICINE MAN ENGINE. THE SYSTEM REQUIRES AT LEAST 3 EARTH ELEMENTS TO SYNTHESIZE YOUR CUSTOM PROTOCOL.
                    </p>

                    <div className="space-y-6">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={onKeyDown}
                            placeholder="E.G. KALE, GINGER, LEMON..."
                            className="w-full bg-black border border-white/10 p-4 text-white placeholder:text-white/10 focus:outline-none focus:border-detox-green transition-colors font-mono text-sm uppercase tracking-widest"
                          />
                        </div>
                        <button
                          onClick={handleAddIngredient}
                          className="px-6 bg-detox-green text-black hover:bg-white transition-all flex items-center justify-center gap-2 group"
                        >
                          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                          <span className="text-mono text-[10px] font-bold uppercase tracking-widest">Add</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2 min-h-[40px] p-4 bg-black/40 border border-white/5">
                        {ingredients.length === 0 ? (
                          <span className="text-mono text-[10px] text-white/10 uppercase tracking-widest italic flex items-center w-full">
                            [ SYSTEM AWAITING BOTANICAL INPUTS... ]
                          </span>
                        ) : (
                          ingredients.map(tag => (
                            <motion.span 
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              key={tag} 
                              className="inline-flex items-center gap-2 bg-detox-green/10 border border-detox-green/20 px-3 py-1.5 text-mono text-[10px] text-detox-green uppercase tracking-widest group"
                            >
                              {tag}
                              <button onClick={() => removeIngredient(tag)} className="hover:text-white transition-colors">
                                <CloseIcon className="w-3 h-3" />
                              </button>
                            </motion.span>
                          ))
                        )}
                      </div>

                      <div className="pt-4 border-t border-white/10 flex justify-end">
                        <button
                          disabled={ingredients.length < 1}
                          onClick={() => setCurrentStep(2)}
                          className="btn-detox px-10 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next Step <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="industrial-card p-4 md:p-8 bg-detox-gray border-detox-green/20"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="flex justify-center order-2 md:order-2">
                    <MedicineManSVG />
                  </div>
                  <div className="space-y-6 order-1 md:order-1">
                    <div className="flex items-center gap-3 text-detox-green">
                      <Sparkles className="w-5 h-5" />
                      <span className="text-mono text-[10px] font-bold uppercase tracking-[0.3em]">Step 02 // CONFIGURE_HEALING_PARAMETERS</span>
                    </div>
                    <h2 className="text-display text-3xl md:text-4xl font-black text-white uppercase tracking-tighter leading-tight">DEFINE YOUR SYSTEMIC TARGETS.</h2>
                    <p className="text-white/40 text-[10px] leading-relaxed font-mono uppercase tracking-widest">
                      THE MEDICINE MAN ENGINE WILL NOW PROCESS YOUR BOTANICALS. INPUT YOUR CLINICAL AILMENTS AND DESIRED ESSENCE TO FINALIZE THE SYNTHESIS OF YOUR CUSTOM PROTOCOL.
                    </p>

                    <div className="space-y-6 text-left">
                      <div className="grid grid-cols-1 gap-4">
                        {profile?.isMaster ? (
                          <>
                            <div className="space-y-1">
                              <label className="text-mono text-[8px] text-white/40 uppercase tracking-widest">TARGET AILMENT [ CLINICAL GOAL ]</label>
                              <input
                                type="text"
                                value={targetHealthGoal}
                                onChange={(e) => setTargetHealthGoal(e.target.value)}
                                placeholder="[ E.G. LIVER FLUSH, SKIN CLARITY ]"
                                className="w-full bg-black border border-white/10 p-4 text-white placeholder:text-white/10 focus:outline-none focus:border-detox-green transition-colors font-mono text-xs uppercase tracking-widest"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-mono text-[8px] text-white/40 uppercase tracking-widest">DESIRED ESSENCE [ PALATE PROFILE ]</label>
                              <input
                                type="text"
                                value={flavorProfile}
                                onChange={(e) => setFlavorProfile(e.target.value)}
                                placeholder="[ E.G. SPICY & CITRUS, EARTHY & SWEET ]"
                                className="w-full bg-black border border-white/10 p-4 text-white placeholder:text-white/10 focus:outline-none focus:border-detox-green transition-colors font-mono text-xs uppercase tracking-widest"
                              />
                            </div>
                          </>
                        ) : (
                          <div className="p-4 bg-white/5 border border-white/10 text-center">
                            <p className="text-mono text-[10px] text-white/60 uppercase tracking-widest mb-2">
                              Unlock targeted healing and flavor profiles with Master Access.
                            </p>
                            <Link href="/profile" className="text-detox-green hover:text-white transition-colors text-mono text-[10px] font-bold uppercase tracking-widest">
                              Upgrade to Master
                            </Link>
                          </div>
                        )}
                      </div>

                      <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                        <button
                          onClick={() => setCurrentStep(1)}
                          className="text-mono text-[10px] font-bold text-white/40 hover:text-white uppercase tracking-widest transition-all"
                        >
                          {`<-`} RECALIBRATE
                        </button>
                        <button
                          onClick={generateRecipe}
                          disabled={loading}
                          className="btn-detox px-10"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Formulating...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-4 h-4" />
                              Synthesize
                            </>
                          )}
                        </button>
                      </div>

                      {error && (
                        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-mono text-[8px] flex items-center gap-2 uppercase tracking-widest">
                          <AlertCircle className="w-3 h-3" />
                          {error}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 3 && recipe && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-12"
              >
                {/* Protocol Header & Actions */}
                <div className="lg:col-span-12 flex flex-col md:flex-row justify-between items-end gap-8 border-b border-white/10 pb-12">
                  <div>
                    <div className="flex items-center gap-3 text-detox-green mb-6">
                      <Check className="w-6 h-6" />
                      <span className="text-mono text-[10px] font-bold uppercase tracking-[0.3em]">Step 03 // SYNTHESIS_COMPLETE</span>
                    </div>
                    <h2 className="text-display text-5xl md:text-7xl font-black text-white uppercase tracking-tighter leading-none">
                      YOUR PROTOCOL <span className="text-detox-green">IS READY</span>
                    </h2>
                  </div>

                  <div className="flex gap-4 print:hidden">
                    <button 
                      onClick={() => setCurrentStep(2)}
                      className="p-4 border border-white/10 text-white/40 hover:text-detox-green transition-colors flex items-center gap-3 px-6"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span className="text-mono text-[10px] font-bold uppercase tracking-widest">[ + SEEK NEW WISDOM ]</span>
                    </button>
                    <button 
                      onClick={handleAddToCommunity}
                      disabled={loading}
                      className="p-4 border border-white/10 text-white/40 hover:text-detox-green transition-colors flex items-center gap-3 px-6"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      <span className="text-mono text-[10px] font-bold uppercase tracking-widest">[ + PUSH TO GLOBAL ARCHIVE ]</span>
                    </button>
                    <button 
                      onClick={() => setShowSaveDialog(true)}
                      className={`p-4 transition-all duration-300 flex items-center gap-3 px-8 ${
                        added 
                          ? 'bg-detox-green text-black' 
                          : 'bg-white text-black hover:bg-detox-green transition-colors'
                      }`}
                    >
                      {added ? (
                        <>
                          <Check className="w-5 h-5" />
                          <span className="text-mono text-[10px] font-bold uppercase tracking-widest">Deployed</span>
                        </>
                      ) : (
                        <>
                          <Printer className="w-5 h-5" />
                          <span className="text-mono text-[10px] font-bold uppercase tracking-widest">[ EXPORT & PRINT ]</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Protocol Content */}
                <div className="lg:col-span-12">
                  <div className="industrial-card p-12 bg-black print:border-none" ref={recipeRef}>
                    <div className="mb-12">
                      <div className="text-detox-green text-mono font-bold uppercase tracking-widest text-[10px] mb-4">
                        {recipe.category} {"// CLINICAL_FORMULATION"}
                      </div>
                      <h2 className="text-display text-5xl md:text-7xl font-black text-white leading-tight uppercase tracking-tighter">
                        {recipe.title}
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
                      <div className="space-y-12">
                        <div>
                          <h3 className="text-mono text-[10px] font-bold uppercase tracking-widest text-white/30 mb-6 border-b border-white/5 pb-2">01 // BOTANICAL_INPUTS</h3>
                          <ul className="space-y-4">
                            {recipe.ingredients.map((ing: string, i: number) => (
                              <li key={i} className="flex items-center gap-4 text-white/80 text-base font-mono uppercase tracking-widest">
                                <div className="w-2 h-2 bg-detox-green" />
                                {ing}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h3 className="text-mono text-[10px] font-bold uppercase tracking-widest text-white/30 mb-6 border-b border-white/5 pb-2">02 // EXECUTION_RITUAL</h3>
                          <ul className="space-y-4">
                            {recipe.ingredientBenefits.map((benefit: string, i: number) => (
                              <li key={i} className="flex items-start gap-4 text-white/60 text-xs font-mono uppercase tracking-widest leading-relaxed">
                                <div className="w-1.5 h-1.5 bg-detox-green/40 mt-1" />
                                {benefit}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="space-y-12">
                        <div>
                          <h3 className="text-mono text-[10px] font-bold uppercase tracking-widest text-white/30 mb-6 border-b border-white/5 pb-2">03 // BIO-ACTIVE_PROPERTIES</h3>
                          <ol className="space-y-8">
                            {recipe.instructions.split('\n').filter((s: string) => s.trim()).map((step: string, i: number) => (
                              <li key={i} className="flex gap-6 text-white/80 text-sm leading-relaxed font-mono uppercase tracking-widest">
                                <span className="text-detox-green font-black text-2xl leading-none">[{i + 1}]</span>
                                {step}
                              </li>
                            ))}
                          </ol>
                        </div>

                        <div className="p-8 bg-white/[0.02] border border-white/5">
                          <h3 className="text-mono text-[10px] font-bold uppercase tracking-widest text-white/30 mb-4">04 // THE_MEDICINE_MAN&apos;S_WISDOM</h3>
                          <p className="text-sm text-white/60 font-mono italic leading-relaxed uppercase tracking-widest">
                            {recipe.rationale}
                          </p>
                        </div>

                        <div className="p-8 bg-detox-green/5 border border-detox-green/20">
                          <h3 className="text-mono text-[10px] font-bold uppercase tracking-widest text-detox-green/40 mb-4">05 // SYSTEMIC_OUTCOME</h3>
                          <p className="text-base text-detox-green font-mono italic leading-relaxed uppercase tracking-widest font-bold">
                            &quot;{recipe.outcome}&quot;
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pioneer Section */}
                <div className="lg:col-span-12 mt-12 p-12 bg-detox-green/5 border border-detox-green/20">
                  <h3 className="text-display text-3xl font-black text-white mb-6 uppercase tracking-tighter">
                    CLAIM PIONEER STATUS
                  </h3>
                  <p className="text-mono text-sm text-white/60 mb-8 uppercase tracking-widest">
                    EXECUTE THIS NEWLY SYNTHESIZED PROTOCOL NOW. UPLOAD VISUAL EVIDENCE TO BECOME THE PERMANENT PROTOCOL PIONEER FOR THIS DIGITAL RITUAL. YOUR VERIFIED STATUS WILL BE SECURED FOREVER.
                  </p>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => document.getElementById('pioneer-upload')?.click()}
                      className="bg-detox-green text-black py-4 px-8 text-mono text-[10px] font-bold uppercase tracking-widest hover:bg-white transition-all flex items-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      [ UPLOAD VISUAL EVIDENCE ]
                    </button>
                    <input 
                      id="pioneer-upload"
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                    />
                    {profile && (
                      <span className="text-mono text-xs text-detox-green uppercase tracking-widest">
                        Pioneer: {profile.username || "Anonymous"}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          nav, button, .print\\:hidden, Link {
            display: none !important;
          }
          .grid-bg {
            background: white !important;
            padding: 0 !important;
          }
          .max-w-5xl {
            max-width: 100% !important;
          }
          .industrial-card {
            color: black !important;
            border: 1px solid #eee !important;
            background: white !important;
          }
          .text-white { color: black !important; }
          .text-white\\/40 { color: #666 !important; }
          .text-white\\/30 { color: #999 !important; }
          .text-white\\/60 { color: #444 !important; }
          .text-detox-green { color: #000 !important; }
          .bg-black { background: white !important; }
          .bg-detox-gray { background: white !important; }
          .border-white\\/10 { border-color: #eee !important; }
          .border-white\\/5 { border-color: #eee !important; }
        }
      `}</style>
    </main>
  );
}
