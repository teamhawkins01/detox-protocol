'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '@/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Sparkles, ArrowRight, ArrowLeft, Loader2, Filter, Check, Zap, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { GoogleGenAI, Type } from "@google/genai";
import ProtocolCard from '@/components/ProtocolCard';
import { logEvent } from '@/lib/logger';
import { useAuth } from '@/hooks/useAuth';

const GOALS = [
  "METABOLIC RECALIBRATION",
  "CELLULAR ENERGY RESTORATION",
  "GASTROINTESTINAL RESET",
  "DERMAL PURIFICATION",
  "IMMUNE SYSTEM FORTIFICATION",
  "DEEP CELLULAR TOXIN BINDING",
  "HEPATIC (LIVER) FLUSH",
  "COGNITIVE CLARITY",
  "HEAVY METAL CHELATION",
  "LYMPHATIC DRAINAGE"
];

const SYMPTOMS = [
  "GASTRIC DISTRESS / BLOATING",
  "CHRONIC LETHARGY",
  "COGNITIVE FOG",
  "SYSTEMIC INFLAMMATION",
  "GLYCEMIC INSTABILITY (CRAVINGS)",
  "CIRCADIAN DISRUPTION (INSOMNIA)",
  "ACNE / DERMAL FLARE-UPS",
  "SLUGGISH MOTILITY",
  "WATER RETENTION / EDEMA",
  "HORMONE IMBALANCE",
  "ELEVATED CORTISOL / STRESS",
  "SINUS CONGESTION / HISTAMINE"
];

export default function ProtocolsPage() {
  const { user } = useAuth();
  const [protocols, setProtocols] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchedProtocols, setMatchedProtocols] = useState<any[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'protocols'), where('moderationStatus', '==', 'approved'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedProtocols = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProtocols(fetchedProtocols);
      setMatchedProtocols(fetchedProtocols); // Initially show all
      setLoading(false);
    }, (err) => {
      console.error("Error fetching protocols:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toggleSymptom = (symptom: string) => {
    if (selectedSymptoms.includes(symptom)) {
      setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptom));
    } else {
      setSelectedSymptoms([...selectedSymptoms, symptom]);
    }
  };

  const analyzeWithAI = async () => {
    if (!selectedGoal && selectedSymptoms.length === 0) {
      setMatchedProtocols(protocols);
      setCurrentStep(3);
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setCurrentStep(3);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '' });
      
      // Prepare a lightweight version of protocols for the prompt to save tokens
      const protocolCatalog = protocols.map(p => ({
        id: p.id,
        title: p.title,
        category: p.category,
        benefits: p.ingredientBenefits?.join(', ') || '',
        outcome: p.outcome || ''
      }));

      const prompt = `
        You are an expert clinical nutritionist and detox specialist.
        A user is looking for detox protocols.
        Their primary goal: ${selectedGoal || 'General Wellness'}.
        Their current symptoms: ${selectedSymptoms.length > 0 ? selectedSymptoms.join(', ') : 'None specified'}.
        
        Here is the catalog of available protocols:
        ${JSON.stringify(protocolCatalog)}
        
        Analyze the user's needs and select the top 1 to 6 most relevant protocols from the catalog.
        Also provide a short, clinical, and encouraging explanation (2-3 sentences) of why these protocols were selected for their specific profile.
        
        Return the result in JSON format:
        {
          "matchedProtocolIds": ["id1", "id2"],
          "analysis": "Your clinical explanation here."
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              matchedProtocolIds: { type: Type.ARRAY, items: { type: Type.STRING } },
              analysis: { type: Type.STRING }
            },
            required: ["matchedProtocolIds", "analysis"]
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      
      if (data.matchedProtocolIds && data.matchedProtocolIds.length > 0) {
        const filtered = protocols.filter(p => data.matchedProtocolIds.includes(p.id));
        // Sort to match the AI's recommended order
        filtered.sort((a, b) => data.matchedProtocolIds.indexOf(a.id) - data.matchedProtocolIds.indexOf(b.id));
        setMatchedProtocols(filtered);
      } else {
        // Fallback if AI returns no matches
        setMatchedProtocols(protocols);
      }
      
      setAiAnalysis(data.analysis);
      
      if (user?.uid) {
        await logEvent('user_action', 'Used AI Protocol Filter', user.uid, user.email || undefined);
      }
    } catch (err) {
      console.error("AI Analysis Error:", err);
      setError("System failure during AI analysis. Displaying all protocols.");
      setMatchedProtocols(protocols);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetFilters = () => {
    setSelectedGoal(null);
    setSelectedSymptoms([]);
    setMatchedProtocols(protocols);
    setAiAnalysis(null);
    setCurrentStep(1);
  };

  const steps = [
    { id: 1, name: '1 OBJECTIVE', description: 'Primary Objective' },
    { id: 2, name: '2 BIOMARKERS', description: 'Current Issues' },
    { id: 3, name: '3 SYNTHESIS', description: 'AI Formulation' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-detox-green animate-spin" />
          <div className="text-mono text-xs text-detox-green uppercase tracking-widest animate-pulse">
            LOADING_CLINICAL_DATABASE...
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="grid-bg min-h-screen pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header & Progress */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-8">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-white/40 hover:text-detox-green text-mono text-[10px] uppercase tracking-widest mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4" /> [ BACK_TO_HOME ]
            </Link>
            <h1 className="text-display text-5xl font-black text-white uppercase tracking-tighter leading-none">
              Global <span className="text-detox-green">Archive Query</span>
            </h1>
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
            {/* STEP 1: GOAL */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="industrial-card p-12 bg-detox-gray border-detox-green/20"
              >
                <div className="max-w-3xl">
                  <div className="flex items-center gap-3 text-detox-green mb-6">
                    <Filter className="w-6 h-6" />
                    <span className="text-mono text-[10px] font-bold uppercase tracking-[0.3em]">STEP 01 // DEFINE_SYSTEMIC_OBJECTIVE</span>
                  </div>
                  <h2 className="text-display text-4xl font-black text-white mb-6">ESTABLISH PRIMARY TARGET.</h2>
                  <p className="text-white/40 text-sm mb-12 leading-relaxed font-mono uppercase tracking-widest">
                    INPUT YOUR CORE CLINICAL GOAL. THE MEDICINE MAN WILL QUERY THE ARCHIVE FOR PROTOCOLS OPTIMIZED FOR YOUR SPECIFIC SYSTEMIC OUTCOME.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
                    {GOALS.map((goal) => (
                      <button
                        key={goal}
                        onClick={() => setSelectedGoal(goal)}
                        className={`p-6 border-2 text-left transition-all duration-300 flex items-center justify-between group ${
                          selectedGoal === goal 
                            ? 'border-detox-green bg-detox-green/10' 
                            : 'border-white/10 hover:border-white/30 bg-black/40'
                        }`}
                      >
                        <span className={`text-mono text-sm font-bold uppercase tracking-widest ${
                          selectedGoal === goal ? 'text-detox-green' : 'text-white/80 group-hover:text-white'
                        }`}>
                          {goal}
                        </span>
                        {selectedGoal === goal && <Check className="w-5 h-5 text-detox-green" />}
                      </button>
                    ))}
                  </div>

                  <div className="pt-8 border-t border-white/10 flex justify-between items-center">
                    <button
                      onClick={() => {
                        setSelectedGoal(null);
                        setCurrentStep(2);
                      }}
                      className="text-mono text-[10px] font-bold text-white/40 hover:text-white uppercase tracking-widest transition-all"
                    >
                      [ BYPASS FILTER ]
                    </button>
                    <button
                      disabled={!selectedGoal}
                      onClick={() => setCurrentStep(2)}
                      className="btn-detox px-12 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      LOCK IN TARGET &gt;
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: SYMPTOMS */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="industrial-card p-12 bg-detox-gray border-detox-green/20"
              >
                <div className="max-w-3xl">
                  <div className="flex items-center gap-3 text-detox-green mb-6">
                    <Filter className="w-6 h-6" />
                    <span className="text-mono text-[10px] font-bold uppercase tracking-[0.3em]">STEP 02 // LOG_CLINICAL_SYMPTOMS</span>
                  </div>
                  <h2 className="text-display text-4xl font-black text-white mb-6">LOG CURRENT SYSTEMIC ANOMALIES.</h2>
                  <p className="text-white/40 text-sm mb-12 leading-relaxed font-mono uppercase tracking-widest">
                    SELECT ALL ACTIVE SYMPTOMS. THE AI ENGINE WILL CROSS-REFERENCE THESE MARKERS TO NARROW THE OPTIMAL PROTOCOL POOL.
                  </p>

                  <div className="flex flex-wrap gap-4 mb-12">
                    {SYMPTOMS.map((symptom) => {
                      const isSelected = selectedSymptoms.includes(symptom);
                      return (
                        <button
                          key={symptom}
                          onClick={() => toggleSymptom(symptom)}
                          className={`px-6 py-4 border-2 transition-all duration-300 flex items-center gap-3 ${
                            isSelected 
                              ? 'border-detox-green bg-detox-green/10 text-detox-green' 
                              : 'border-white/10 hover:border-white/30 bg-black/40 text-white/60 hover:text-white'
                          }`}
                        >
                          <div className={`w-4 h-4 border flex items-center justify-center ${
                            isSelected ? 'border-detox-green bg-detox-green' : 'border-white/40'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-black" />}
                          </div>
                          <span className="text-mono text-xs font-bold uppercase tracking-widest">
                            {symptom}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-8 border-t border-white/10 flex justify-between items-center">
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="text-mono text-[10px] font-bold text-white/40 hover:text-white uppercase tracking-widest transition-all"
                    >
                      &lt;- RECALIBRATE TARGET
                    </button>
                    <button
                      onClick={analyzeWithAI}
                      className="btn-detox px-12"
                    >
                      <Sparkles className="w-5 h-5" />
                      [ INITIATE ALGORITHMIC SEARCH ]
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: RESULTS */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {isAnalyzing ? (
                  <div className="industrial-card p-20 bg-detox-gray border-detox-green/20 flex flex-col items-center justify-center text-center">
                    <div className="relative w-24 h-24 mb-8">
                      <div className="absolute inset-0 border-4 border-detox-green/20 rounded-full" />
                      <div className="absolute inset-0 border-4 border-detox-green rounded-full border-t-transparent animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles className="w-8 h-8 text-detox-green animate-pulse" />
                      </div>
                    </div>
                    <h2 className="text-display text-3xl font-black text-white mb-4">[ ENGINE ANALYZING DATASTREAM... ]</h2>
                    <p className="text-white/40 text-sm font-mono uppercase tracking-widest max-w-md">
                      CROSS-REFERENCING YOUR ANOMALIES AGAINST THE GLOBAL PROTOCOL ARCHIVE. COMPILING OPTIMIZED RECOVERY PATHWAYS.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-12">
                    {/* AI Analysis Header */}
                    {(aiAnalysis || selectedGoal || selectedSymptoms.length > 0) && (
                      <div className="industrial-card p-8 bg-detox-green/5 border-detox-green/30 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-detox-green/10 blur-[100px] rounded-full pointer-events-none" />
                        
                        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
                          <div className="w-16 h-16 bg-detox-green/20 flex items-center justify-center shrink-0 border border-detox-green/40">
                            <Zap className="w-8 h-8 text-detox-green" />
                          </div>
                          
                          <div className="flex-1">
                            <h3 className="text-mono text-xs font-bold uppercase tracking-widest text-detox-green mb-4">
                              AI_CLINICAL_ANALYSIS
                            </h3>
                            {aiAnalysis ? (
                              <p className="text-white/80 text-sm md:text-base font-mono leading-relaxed">
                                {aiAnalysis}
                              </p>
                            ) : (
                              <p className="text-white/80 text-sm md:text-base font-mono leading-relaxed">
                                Showing all available protocols. Use the AI filter to find personalized recommendations.
                              </p>
                            )}
                            
                            <div className="mt-6 flex flex-wrap gap-2">
                              {selectedGoal && (
                                <span className="text-mono text-[10px] bg-white/5 border border-white/10 px-3 py-1 text-white/60 uppercase tracking-widest">
                                  Goal: {selectedGoal}
                                </span>
                              )}
                              {selectedSymptoms.map(s => (
                                <span key={s} className="text-mono text-[10px] bg-white/5 border border-white/10 px-3 py-1 text-white/60 uppercase tracking-widest">
                                  Symptom: {s}
                                </span>
                              ))}
                            </div>
                          </div>
                          
                          <button
                            onClick={resetFilters}
                            className="shrink-0 px-6 py-3 border border-white/20 text-mono text-[10px] font-bold text-white uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                          >
                            Reset Filter
                          </button>
                        </div>
                      </div>
                    )}

                    {error && (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-mono text-[10px] flex items-center gap-2 uppercase tracking-widest">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                      </div>
                    )}

                    {/* Results Grid */}
                    <div>
                      <div className="flex items-center justify-between mb-8">
                        <h2 className="text-mono text-sm font-bold text-white/60 uppercase tracking-widest">
                          {matchedProtocols.length} Protocols Found
                        </h2>
                      </div>
                      
                      {matchedProtocols.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                          {matchedProtocols.map((protocol) => (
                            <ProtocolCard key={protocol.id} protocol={protocol} />
                          ))}
                        </div>
                      ) : (
                        <div className="py-20 text-center border border-dashed border-white/10 rounded-xl">
                          <div className="text-mono text-xl font-bold text-white/20 uppercase tracking-widest">
                            No Matches Found
                          </div>
                          <p className="text-mono text-[10px] text-white/10 uppercase tracking-widest mt-4">
                            Try adjusting your filters or generating a new protocol with the Medicine Man.
                          </p>
                          <button
                            onClick={resetFilters}
                            className="mt-8 px-8 py-3 bg-white/5 border border-white/10 text-mono text-xs font-bold text-white uppercase tracking-widest hover:bg-white/10 transition-all"
                          >
                            Clear Filters
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
