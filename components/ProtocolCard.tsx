'use client';

import { motion } from 'motion/react';
import { Star, ArrowUpRight, Zap, Printer, Share2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { getCategoryImageUrl } from '@/lib/categoryImages';
import RatingComponent from '@/components/RatingComponent';
import ProfileImage from '@/components/ProfileImage';

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
  pioneerUserId?: string;
  pioneerUserName?: string;
  pioneerUserAvatar?: string;
  starRating?: number;
  createdAt: any;
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  protocolYield?: string;
  isMasterCrafted?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Juices & Smoothies": "border-detox-green",
  "Waters & Drinks": "border-blue-500",
  "Weight Loss & Cleanses": "border-purple-500",
  "Targeted Detox": "border-orange-500",
  "Detox Baths": "border-teal-500",
  "Soups & Meals": "border-yellow-500"
};

export default function ProtocolCard({ protocol }: { protocol: Protocol }) {
  const protocolUrl = `/${protocol.category.replace(/ & /g, '-').replace(/ /g, '-')}/${encodeURIComponent(protocol.title)}`;
  const borderColor = CATEGORY_COLORS[protocol.category] || "border-detox-green";

  const handlePrint = (e: React.MouseEvent) => {
    e.preventDefault();
    window.print();
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (navigator.share) {
      try {
        await navigator.share({
          title: protocol.title,
          url: window.location.origin + protocolUrl
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.origin + protocolUrl);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <motion.div 
      whileHover={{ y: -8 }}
      className={`relative industrial-card overflow-hidden bg-detox-gray border-2 ${borderColor} transition-all duration-500 rounded-xl`}
    >
      <div className="block group">
        {/* Technical Header */}
        <div className="flex justify-between items-center p-4 border-b border-white/5 bg-black/20">
          <div className={`text-mono text-xs ${borderColor.replace('border-', 'text-')} uppercase tracking-widest`}>
            FORMULA: {protocol.id.slice(0, 8).toUpperCase()}
          </div>
          <div className="flex items-center gap-1">
            <RatingComponent protocolId={protocol.id} initialRating={protocol.starRating || 5} />
          </div>
        </div>

        <Link href={protocolUrl} className="block group">
        {/* Image Container */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image 
            src={protocol.photoUrl || getCategoryImageUrl(protocol.category)}
            alt={protocol.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-all duration-700 group-hover:scale-110 group-hover:saturate-150 group-hover:brightness-110"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          
          {/* AI Badge */}
          {protocol.isAiGenerated && !protocol.pioneerUserId && (
            <div className="absolute top-4 right-4 bg-detox-green/10 backdrop-blur-md border border-detox-green/40 p-2 flex items-center gap-1.5 rounded-md">
              <Zap className="w-4 h-4 text-detox-green" />
              <span className="text-mono text-xs text-detox-green font-bold uppercase tracking-widest">✧ AI_SYNTHESIZED</span>
            </div>
          )}
          
          {/* Protocol Pioneer Badge */}
          {protocol.pioneerUserId && (
            <div className="absolute top-4 right-4 bg-detox-green/10 backdrop-blur-md border border-detox-green/40 p-1.5 pr-3 flex items-center gap-2 rounded-full">
              <ProfileImage src={protocol.pioneerUserAvatar} className="w-6 h-6" iconClassName="w-3 h-3" />
              <span className="text-mono text-[10px] text-detox-green font-bold uppercase tracking-widest">PIONEER: {protocol.pioneerUserName}</span>
            </div>
          )}

          {/* Master Crafted Badge */}
          {protocol.isMasterCrafted && (
            <div className="absolute top-4 left-4 bg-detox-green text-black border border-detox-green p-2 flex items-center gap-1.5 rounded-md shadow-[0_0_15px_rgba(0,255,0,0.5)]">
              <Zap className="w-4 h-4 fill-black" />
              <span className="text-mono text-[10px] font-black uppercase tracking-widest">MASTER_CRAFTED</span>
            </div>
          )}

          {/* User Badge */}
          {protocol.authorType === 'User' && !protocol.isMasterCrafted && (
            <div className="absolute top-4 left-4 bg-white/10 backdrop-blur-md border border-white/20 p-2 flex items-center gap-1.5 rounded-md">
              <span className="text-mono text-xs text-white font-bold uppercase tracking-widest">COMMUNITY_PROTOCOL</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-start">
            <div className="text-mono text-xs text-white/40 uppercase tracking-[0.3em]">
              {protocol.category}
            </div>
            {protocol.authorName && (
              <div className="flex items-center gap-2">
                <div className="text-mono text-xs text-detox-green/80 uppercase tracking-widest">
                  {protocol.isAiGenerated && !protocol.pioneerUserId ? 'BY: MEDICINE MAN' : `BY: ${protocol.authorName}`}
                </div>
                {protocol.authorLevel ? (
                  <span className={`text-mono text-[10px] px-2 font-bold border transition-all duration-500 ${protocol.authorLevel >= 7 ? 'bg-detox-green text-black border-detox-green shadow-[0_0_10px_rgba(0,255,0,0.4)]' : 'bg-detox-green/10 text-detox-green/80 border-detox-green/20'}`}>
                    LVL_{protocol.authorLevel}
                  </span>
                ) : (
                  <span className="text-mono text-[10px] bg-detox-green/10 text-detox-green/80 px-2 font-bold border border-detox-green/20">LVL_1</span>
                )}
              </div>
            )}
          </div>
          <h3 className="text-display text-2xl font-black text-white leading-tight uppercase group-hover:text-detox-green transition-colors">
            {protocol.title}
          </h3>

          {!protocol.pioneerUserId && (
            <div className="mt-4 p-3 border border-detox-green/30 bg-detox-green/10 rounded-lg">
              <p className="text-mono text-[9px] text-detox-green uppercase tracking-widest leading-relaxed">
                <span className="font-bold text-white">UNCLAIMED PROTOCOL.</span> UPLOAD VISUAL EVIDENCE TO BECOME THE PIONEER AND PERMANENT OWNER OF THIS DIGITAL RITUAL.
              </p>
            </div>
          )}
        </div>
      </Link>

      {/* Footer */}
      <div className="flex items-center justify-between p-6 border-t border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-detox-green rounded-full animate-pulse" />
          <span className="text-mono text-xs text-white/60 uppercase tracking-widest">CLINICALLY VERIFIED</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handlePrint} className="p-2 text-white/40 hover:text-detox-green transition-colors" title="Print Protocol">
            <Printer className="w-4 h-4" />
          </button>
          <button onClick={handleShare} className="p-2 text-white/40 hover:text-detox-green transition-colors" title="Share Protocol">
            <Share2 className="w-4 h-4" />
          </button>
          <Link href={protocolUrl} className="p-2 text-white/40 hover:text-detox-green transition-colors" title="View Protocol">
            <ArrowUpRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
      </div>

      {/* Hover Accents */}
      <div className={`absolute -top-1 -left-1 w-4 h-4 border-t border-l ${borderColor} opacity-0 group-hover:opacity-100 transition-opacity`} />
      <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-b border-r ${borderColor} opacity-0 group-hover:opacity-100 transition-opacity`} />
    </motion.div>
  );
}
