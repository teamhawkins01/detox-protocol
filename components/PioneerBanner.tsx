'use client';

import { motion } from 'motion/react';
import { Trophy, Camera, Sparkles } from 'lucide-react';

export default function PioneerBanner() {
  const scrollToGallery = () => {
    const gallery = document.getElementById('protocol-gallery');
    if (gallery) {
      gallery.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="relative overflow-hidden bg-detox-green/10 border border-detox-green/50 p-6 md:p-8 mb-10 group cursor-pointer"
      onClick={scrollToGallery}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-detox-green/0 via-detox-green/10 to-detox-green/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
      
      <div className="relative z-10 flex flex-col items-center text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Sparkles className="w-5 h-5 text-detox-green animate-pulse" />
          <Trophy className="w-8 h-8 text-detox-green" />
          <Sparkles className="w-5 h-5 text-detox-green animate-pulse" />
        </div>
        
        <h3 className="font-display text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
          Become the <span className="text-detox-green">Supreme Protocol Pioneer</span>!
        </h3>
        
        <p className="text-white/80 text-sm md:text-base max-w-2xl font-mono leading-relaxed">
          No one has uploaded a photo of this protocol yet. Execute this protocol, snap a photo, and cement your legacy in the Protocol Gallery forever.
        </p>
        
        <button className="mt-4 inline-flex items-center gap-2 bg-detox-green text-black px-6 py-3 text-mono text-xs font-bold uppercase tracking-widest hover:bg-white transition-colors">
          <Camera className="w-4 h-4" />
          UPLOAD PHOTO NOW
        </button>
      </div>
    </motion.div>
  );
}
