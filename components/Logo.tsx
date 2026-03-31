'use client';

import { motion } from 'motion/react';

export default function Logo() {
  return (
    <motion.div 
      className="flex items-center gap-3 cursor-pointer group"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="relative w-12 h-12 flex items-center justify-center border border-white/20">
        {/* Minimalist Industrial Icon */}
        <div className="w-1.5 h-8 bg-white rounded-none" />
        <div className="w-1.5 h-6 bg-detox-green rounded-none mx-0.5" />
        <div className="w-1.5 h-8 bg-white rounded-none" />
      </div>
      
      <div className="flex flex-col">
        <span className="text-display text-4xl font-black tracking-tighter text-white leading-none">
          DETOX
        </span>
        <span className="text-mono text-[14px] uppercase font-bold tracking-[0.5em] text-detox-green mt-1">
          .RECIPES
        </span>
      </div>
    </motion.div>
  );
}
