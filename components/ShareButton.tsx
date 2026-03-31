'use client';

import { Share2 } from 'lucide-react';

export default function ShareButton() {
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Link copied to clipboard!');
  };

  return (
    <button 
      onClick={handleShare}
      className="flex items-center gap-2 text-mono text-xs text-white/40 hover:text-white transition-colors"
    >
      <Share2 className="w-3 h-3" />
      SHARE
    </button>
  );
}
