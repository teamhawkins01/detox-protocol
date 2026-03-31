'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Globe, Clock, User, ChevronRight, ArrowLeft } from 'lucide-react';
import { db } from "@/firebase";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import Markdown from 'react-markdown';

export default function ArticlesPage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'articles'),
      where('moderationStatus', '==', 'approved'),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      setArticles(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => unsub();
  }, []);

  if (selectedArticle) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="pt-32 pb-20 px-6 max-w-4xl mx-auto">
          <button 
            onClick={() => setSelectedArticle(null)}
            className="flex items-center gap-2 text-mono text-[10px] text-white/40 hover:text-detox-green uppercase tracking-widest mb-12 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Intelligence Feed
          </button>

          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-mono text-[10px] text-detox-green font-bold uppercase tracking-widest mb-4">
              {selectedArticle.category} {'//'} PROTOCOL_GUIDE
            </div>
            <h1 className="text-mono text-4xl md:text-6xl font-black text-white uppercase tracking-tighter mb-8 leading-none">
              {selectedArticle.title}
            </h1>

            <div className="flex flex-wrap items-center gap-6 mb-12 py-6 border-y border-white/10">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-white/20" />
                <span className="text-mono text-[10px] text-white/40 uppercase tracking-widest">Authored by {selectedArticle.authorName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-white/20" />
                <span className="text-mono text-[10px] text-white/40 uppercase tracking-widest">
                  {selectedArticle.createdAt?.toDate().toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-white/20" />
                <span className="text-mono text-[10px] text-white/40 uppercase tracking-widest">AI_GENERATED_CONTENT</span>
              </div>
            </div>

            <div className="prose prose-invert max-w-none">
              <div className="text-mono text-lg text-white/60 italic mb-12 border-l-4 border-detox-green pl-6 py-2">
                {selectedArticle.summary}
              </div>
              <div className="markdown-body text-mono text-sm leading-relaxed text-white/80 space-y-6">
                <Markdown>{selectedArticle.content}</Markdown>
              </div>
            </div>
          </motion.article>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="pt-32 pb-20 px-6 max-w-6xl mx-auto">
        <div className="mb-16 border-b border-white/10 pb-8">
          <h1 className="text-mono text-5xl font-black text-white tracking-tighter uppercase mb-4">
            Intelligence <span className="text-detox-green">Feed</span>
          </h1>
          <p className="text-mono text-[10px] text-white/40 uppercase tracking-[0.4em]">
            Deep-Dive Protocols & Technical Guides
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-2 border-detox-green border-t-transparent rounded-full animate-spin" />
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-20 border border-white/5 bg-zinc-900/30">
            <p className="text-mono text-[10px] text-white/20 uppercase tracking-widest">No Intelligence Data Found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {articles.map((article) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                onClick={() => setSelectedArticle(article)}
                className="group cursor-pointer bg-zinc-900 border border-white/10 p-8 hover:border-detox-green/50 transition-all duration-500"
              >
                <div className="text-mono text-[10px] text-detox-green font-bold uppercase tracking-widest mb-4">
                  {article.category}
                </div>
                <h2 className="text-mono text-2xl font-bold text-white uppercase tracking-tighter mb-4 group-hover:text-detox-green transition-colors">
                  {article.title}
                </h2>
                <p className="text-mono text-[10px] text-white/40 uppercase leading-relaxed mb-8 line-clamp-3">
                  {article.summary}
                </p>
                <div className="flex items-center justify-between pt-6 border-t border-white/5">
                  <span className="text-mono text-[8px] text-white/20 uppercase tracking-widest">
                    {article.createdAt?.toDate().toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2 text-mono text-[10px] text-detox-green font-bold uppercase tracking-widest group-hover:translate-x-2 transition-transform">
                    Read Protocol <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
