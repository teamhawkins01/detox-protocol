'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '@/firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, getDoc, where } from 'firebase/firestore';
import { 
  MessageSquare, 
  Zap, 
  Star, 
  Clock, 
  User, 
  ArrowUpRight,
  Filter,
  LayoutGrid,
  List as ListIcon,
  Camera
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import ProtocolModal from '@/components/ProtocolModal';

interface FeedItem {
  id: string;
  type: 'protocol' | 'review';
  data: any;
  createdAt: any;
}

export default function CommunityPage() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'reviews' | 'protocols'>('all');
  const [selectedProtocolId, setSelectedProtocolId] = useState<string | null>(null);

  useEffect(() => {
    const protocolsQuery = query(
      collection(db, 'protocols'), 
      where('moderationStatus', '==', 'approved'),
      where('authorType', '!=', 'Admin'),
      orderBy('authorType'),
      orderBy('createdAt', 'desc'), 
      limit(20)
    );
    const reviewsQuery = query(
      collection(db, 'reviews'), 
      where('moderationStatus', '==', 'approved'),
      where('authorType', '!=', 'Admin'),
      orderBy('authorType'),
      orderBy('createdAt', 'desc'), 
      limit(20)
    );

    let protocols: FeedItem[] = [];
    let reviews: FeedItem[] = [];

    const unsubProtocols = onSnapshot(protocolsQuery, (snapshot) => {
      protocols = snapshot.docs.map(doc => ({
        id: doc.id,
        type: 'protocol' as const,
        data: doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      combineAndSort();
    });

    const unsubReviews = onSnapshot(reviewsQuery, (snapshot) => {
      reviews = snapshot.docs.map(doc => ({
        id: doc.id,
        type: 'review' as const,
        data: doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      combineAndSort();
    });

    const combineAndSort = () => {
      const combined = [...protocols, ...reviews].sort((a, b) => b.createdAt - a.createdAt);
      setFeed(combined);
      setLoading(false);
    };

    return () => {
      unsubProtocols();
      unsubReviews();
    };
  }, []);

  const filteredFeed = feed.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'reviews') return item.type === 'review';
    if (filter === 'protocols') return item.type === 'protocol';
    return true;
  });

  return (
    <div className="min-h-screen bg-black pb-20 px-6 md:px-12">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 border-b border-white/10 pb-12">
          <div className="mb-8 md:mb-0">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 mb-4"
            >
              <div className="w-2 h-2 bg-detox-green animate-pulse" />
              <span className="text-mono text-[10px] font-bold text-detox-green uppercase tracking-[0.4em]">
                Live Community Feed
              </span>
            </motion.div>
            <h1 className="text-mono text-5xl md:text-7xl font-bold text-white tracking-tighter uppercase leading-none">
              Community <span className="text-white/20">Clinic</span>
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex bg-zinc-900 p-1 border border-white/5 rounded-lg">
              {(['all', 'reviews', 'protocols'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={`px-6 py-2 text-mono text-[10px] font-bold uppercase tracking-widest transition-all rounded-md ${
                    filter === f ? 'bg-detox-green text-black' : 'text-white/40 hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Feed Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 bg-zinc-900/50 animate-pulse border border-white/5" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {filteredFeed.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`group relative flex flex-col border transition-all duration-500 rounded-xl ${
                    item.type === 'protocol' 
                      ? 'bg-zinc-900/40 border-white/10 hover:border-detox-green/50' 
                      : 'bg-black border-white/5 hover:border-white/20'
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 flex items-center justify-center border rounded-full ${
                        item.type === 'protocol' ? 'bg-detox-green/10 border-detox-green/20 text-detox-green' : 'bg-white/5 border-white/10 text-white/40'
                      }`}>
                        {item.type === 'protocol' ? <Zap className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="text-mono text-[8px] text-white/20 uppercase tracking-widest">
                          {item.type === 'protocol' ? 'New Protocol Synthesized' : 'Community Review'}
                        </div>
                        <div className="text-mono text-[10px] text-white font-bold uppercase tracking-wider">
                          {item.type === 'protocol' ? (item.data.authorName || item.data.authorType) : item.data.username}
                        </div>
                      </div>
                    </div>
                    <div className="text-mono text-[8px] text-white/20 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-8 flex-grow">
                    {item.type === 'protocol' ? (
                      <>
                        <h3 className="text-mono text-2xl font-bold text-white uppercase tracking-tighter mb-4 group-hover:text-detox-green transition-colors">
                          <Link 
                            href={`/${item.data.category.replace(/ & /g, '-').replace(/ /g, '-')}/${encodeURIComponent(item.data.title)}`}
                            className="hover:underline"
                          >
                            {item.data.title}
                          </Link>
                        </h3>
                        <div className="flex flex-wrap gap-2 mb-6">
                          <span className="px-3 py-1 bg-white/5 border border-white/10 text-mono text-[8px] text-white/40 uppercase tracking-widest">
                            {item.data.category}
                          </span>
                          {item.data.isAiGenerated && (
                            <span className="px-3 py-1 bg-detox-green/10 border border-detox-green/20 text-mono text-[8px] text-detox-green uppercase tracking-widest rounded-md">
                              AI Synthesized
                            </span>
                          )}
                        </div>
                        <Link 
                          href={`/${item.data.category.replace(/ & /g, '-').replace(/ /g, '-')}/${encodeURIComponent(item.data.title)}`}
                          className="w-full py-4 border border-white/10 text-mono text-[10px] font-bold text-white/40 uppercase tracking-widest hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2 rounded-md"
                        >
                          View Protocol <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-1 mb-4">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-3 h-3 ${i < item.data.rating ? 'text-detox-green fill-detox-green' : 'text-white/10'}`} 
                            />
                          ))}
                        </div>
                        <p className="text-mono text-sm text-white/60 italic mb-6 line-clamp-3">
                          &quot;{item.data.suggestion || 'No specific tweaks reported.'}&quot;
                        </p>
                        
                        {item.data.photoUrl && (
                          <div className="relative aspect-video mb-6 overflow-hidden border border-white/10">
                            <Image 
                              src={item.data.photoUrl} 
                              alt="Field Report Photo" 
                              fill 
                              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              className="object-cover grayscale hover:grayscale-0 transition-all duration-700"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md border border-white/10 p-2">
                              <Camera className="w-3 h-3 text-detox-green" />
                            </div>
                          </div>
                        )}

                        <button 
                          onClick={() => setSelectedProtocolId(item.data.recipeId)}
                          className="text-mono text-[10px] font-bold text-detox-green hover:text-white uppercase tracking-widest transition-all flex items-center gap-2"
                        >
                          View Original Protocol <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="px-8 py-4 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
                    <div className="text-mono text-[8px] text-white/20 uppercase tracking-[0.2em]">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                    <div className="w-1 h-1 bg-white/10 rounded-full" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredFeed.length === 0 && (
          <div className="py-40 text-center border border-dashed border-white/10 rounded-xl">
            <div className="text-mono text-xl font-bold text-white/20 uppercase tracking-widest">
              No Community Data Found
            </div>
            <p className="text-mono text-[10px] text-white/10 uppercase tracking-widest mt-4">
              Awaiting community activity...
            </p>
          </div>
        )}
      </div>

      {/* Protocol Modal */}
      {selectedProtocolId && (
        <ProtocolModal 
          protocolId={selectedProtocolId} 
          onClose={() => setSelectedProtocolId(null)} 
        />
      )}
    </div>
  );
}
