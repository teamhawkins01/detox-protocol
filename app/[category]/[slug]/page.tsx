import { Metadata, ResolvingMetadata } from 'next';
import { notFound } from 'next/navigation';
import { collection, query, where, getDocs, limit, addDoc, serverTimestamp, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db, storage, auth } from '@/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Star, Clock, Zap, Shield, ArrowLeft, Database, Upload, MessageSquare, Send } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { getCategoryImageUrl } from '@/lib/categoryImages';
import { SubstitutionFeatures, CommunityInsightsFeatures, ProtocolGallery } from '@/components/RecipeInteractiveFeatures';
import ShareButton from '@/components/ShareButton';
import PioneerBanner from '@/components/PioneerBanner';
import ProfileImage from '@/components/ProfileImage';
import { useState, useEffect } from 'react';
import RatingComponent from '@/components/RatingComponent';

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
  starRating?: number;
  createdAt: any;
  prepTime?: string; // ISO 8601 duration, e.g., PT15M
  cookTime?: string; // ISO 8601 duration, e.g., PT30M
  totalTime?: string; // ISO 8601 duration, e.g., PT45M
  protocolYield?: string; // e.g., "4 servings"
  pioneerUserId?: string;
  pioneerUserName?: string;
  pioneerUserAvatar?: string;
}

interface Props {
  params: Promise<{ category: string; slug: string }>;
}

function parseCategoryFromUrl(urlCategory: string) {
  const map: Record<string, string> = {
    "Juices-Smoothies": "Juices & Smoothies",
    "Waters-Drinks": "Waters & Drinks",
    "Weight-Loss-Cleanses": "Weight Loss & Cleanses",
    "Targeted-Detox": "Targeted Detox",
    "Detox-Baths": "Detox Baths",
    "Soups-Meals": "Soups & Meals"
  };
  return map[urlCategory] || urlCategory.replace(/-/g, ' ');
}

async function getProtocol(category: string, slug: string): Promise<Protocol | null> {
  const dbCategory = parseCategoryFromUrl(category);
  let decodedSlug = slug;
  try {
    decodedSlug = decodeURIComponent(slug);
  } catch (e) {
    // Ignore if already decoded or invalid
  }
  
  try {
    const q = query(
      collection(db, 'protocols'),
      where('category', '==', dbCategory),
      where('title', '==', decodedSlug),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Protocol;
  } catch (error) {
    console.error("Error fetching protocol:", error);
    return null;
  }
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const resolvedParams = await params;
  const protocol = await getProtocol(resolvedParams.category, resolvedParams.slug);

  if (!protocol) {
    return {
      title: 'Protocol Not Found | Detox.Recipes',
    };
  }

  const title = `${protocol.title} | ${protocol.category} | Detox.Recipes`;
  const description = protocol.rationale || `Learn how to execute ${protocol.title}, a high-performance detox protocol in the ${protocol.category} category.`;
  const url = `https://www.detox.recipes/${resolvedParams.category}/${encodeURIComponent(resolvedParams.slug)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: 'article',
      images: protocol.photoUrl ? [{ url: protocol.photoUrl }] : [],
      authors: protocol.authorName ? [protocol.authorName] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: protocol.photoUrl ? [protocol.photoUrl] : [],
    },
    alternates: {
      canonical: url,
    }
  };
}

export default async function ProtocolPage({ params }: Props) {
  const resolvedParams = await params;
  const protocol = await getProtocol(resolvedParams.category, resolvedParams.slug);

  if (!protocol) {
    notFound();
  }

  // Serialize protocol for Client Components
  const serializedProtocol = {
    ...protocol,
    createdAt: protocol.createdAt?.toDate?.()?.toISOString() || protocol.createdAt,
  };

  // Generate JSON-LD Schema for Rich SERP Results
  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "HowTo",
    "name": serializedProtocol.title,
    "image": serializedProtocol.photoUrl ? [serializedProtocol.photoUrl] : [],
    "author": {
      "@type": "Person",
      "name": serializedProtocol.authorName || "Medicine Man"
    },
    "datePublished": serializedProtocol.createdAt,
    "description": serializedProtocol.rationale || `A high-performance detox protocol for ${serializedProtocol.title}.`,
    "recipeCategory": serializedProtocol.category,
    "recipeIngredient": serializedProtocol.ingredients,
    "recipeInstructions": serializedProtocol.instructions.split('\\n').filter(s => s.trim()).map((step, index) => ({
      "@type": "HowToStep",
      "text": step.trim()
    })),
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": serializedProtocol.starRating || 5,
      "ratingCount": 1
    },
    "prepTime": serializedProtocol.prepTime || "PT15M",
    "cookTime": serializedProtocol.cookTime || "PT30M",
    "totalTime": serializedProtocol.totalTime || "PT45M",
    "recipeYield": serializedProtocol.protocolYield || "1 serving",
    "keywords": `${serializedProtocol.category}, ${serializedProtocol.ingredients.join(', ')}`
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Inject JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="flex-1 container mx-auto px-4 py-8 md:py-12 max-w-4xl mt-24">
        <article className="industrial-card p-6 md:p-10 bg-zinc-900/80 backdrop-blur-sm border-white/10">
          <header className="mt-8 mb-10 text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <Link href="/" className="inline-flex items-center text-detox-green hover:text-white transition-colors text-mono text-sm uppercase tracking-widest">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Link>
              <div className="inline-block px-3 py-1 bg-detox-green/10 border border-detox-green/30 text-detox-green text-mono text-[10px] uppercase tracking-[0.2em]">
                [ CATEGORY: {serializedProtocol.category} ]
              </div>
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-black text-white uppercase tracking-tight mb-4">
              {serializedProtocol.title}
            </h1>
            
            <div className="flex flex-wrap items-center justify-center gap-4 text-mono text-xs text-white/40 uppercase tracking-widest">
              {serializedProtocol.authorName && (
                <div className="flex items-center">
                  <Shield className="w-3 h-3 mr-1 text-detox-green" />
                  BY: {serializedProtocol.authorName === 'Detox Recipes' ? 'MEDICINE MAN' : serializedProtocol.authorName}
                </div>
              )}
              <div className="flex items-center">
                <ShareButton />
              </div>
              <div className="flex items-center">
                <Zap className="w-3 h-3 mr-1 text-detox-green" />
                {serializedProtocol.isAiGenerated ? 'SYNTHESIZED_BY_AI' : 'USER_SUBMITTED'}
              </div>
              <div className="flex items-center">
                <RatingComponent protocolId={serializedProtocol.id} initialRating={serializedProtocol.starRating || 5} />
              </div>
            </div>
          </header>

          <div className="relative w-full h-64 md:h-96 mb-10 border border-white/10 overflow-hidden">
            <Image 
              src={serializedProtocol.photoUrl || getCategoryImageUrl(serializedProtocol.category)} 
              alt={serializedProtocol.title} 
              fill 
              sizes="100vw"
              className="object-cover"
              referrerPolicy="no-referrer"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
          </div>

          {!serializedProtocol.pioneerUserId ? (
            <PioneerBanner />
          ) : (
            <div className="bg-detox-green/5 border border-detox-green/20 p-6 mb-10 flex items-center gap-6">
              <ProfileImage src={serializedProtocol.pioneerUserAvatar} className="w-16 h-16" iconClassName="w-8 h-8" />
              <div>
                <div className="text-mono text-[10px] text-detox-green uppercase tracking-[0.3em] mb-1">PROTOCOL_PIONEER</div>
                <div className="text-display text-2xl font-black text-white uppercase tracking-tight">{serializedProtocol.pioneerUserName}</div>
                <div className="text-mono text-[8px] text-white/40 uppercase tracking-widest mt-1">FIRST_TO_EXECUTE_AND_DOCUMENT</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mt-12">
            <div className="md:col-span-1 space-y-8">
              <section>
                <h2 className="text-mono text-sm text-detox-green uppercase tracking-widest mb-4 flex items-center border-b border-white/10 pb-2">
                  <Database className="w-4 h-4 mr-2" />
                  Ingredients
                </h2>
                <ul className="space-y-3">
                  {serializedProtocol.ingredients.map((ing, i) => (
                    <li key={i} className="text-white/80 text-sm flex items-start">
                      <span className="text-detox-green mr-2 mt-0.5">›</span>
                      {ing}
                    </li>
                  ))}
                </ul>
              </section>

              <SubstitutionFeatures protocol={serializedProtocol} />

              {serializedProtocol.ingredientBenefits && serializedProtocol.ingredientBenefits.length > 0 && (
                <section>
                  <h2 className="text-mono text-sm text-detox-green uppercase tracking-widest mb-4 flex items-center border-b border-white/10 pb-2">
                    <Zap className="w-4 h-4 mr-2" />
                    Bio-Active Benefits
                  </h2>
                  <ul className="space-y-3">
                    {serializedProtocol.ingredientBenefits.map((benefit, i) => (
                      <li key={i} className="text-white/60 text-xs flex items-start">
                        <span className="text-detox-green/50 mr-2 mt-0.5">+</span>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            <div className="md:col-span-2 space-y-8">
              {serializedProtocol.rationale && (
                <section className="bg-white/5 p-6 border border-white/10">
                  <h2 className="text-mono text-xs text-detox-green uppercase tracking-widest mb-3">Protocol Rationale</h2>
                  <p className="text-white/80 text-sm leading-relaxed">{serializedProtocol.rationale}</p>
                </section>
              )}

              <section>
                <h2 className="text-mono text-sm text-detox-green uppercase tracking-widest mb-4 flex items-center border-b border-white/10 pb-2">
                  <Clock className="w-4 h-4 mr-2" />
                  Execution Steps
                </h2>
                <div className="space-y-4">
                  {serializedProtocol.instructions.split('\\n').filter(s => s.trim()).map((step, i) => (
                    <div key={i} className="flex items-start">
                      <div className="text-mono text-xs text-detox-green bg-detox-green/10 px-2 py-1 mr-4 mt-0.5 border border-detox-green/20">
                        {String(i + 1).padStart(2, '0')}
                      </div>
                      <p className="text-white/80 text-sm leading-relaxed pt-1">{step.trim()}</p>
                    </div>
                  ))}
                </div>
              </section>

              {serializedProtocol.outcome && (
                <section className="bg-detox-green/5 p-6 border border-detox-green/20 mt-8">
                  <h2 className="text-mono text-xs text-detox-green uppercase tracking-widest mb-3">Expected Outcome</h2>
                  <p className="text-detox-green/90 text-sm italic">&quot;{serializedProtocol.outcome}&quot;</p>
                </section>
              )}
              
              <ProtocolGallery protocol={serializedProtocol} />
              <CommunityInsightsFeatures protocol={serializedProtocol} />
            </div>
          </div>
        </article>
      </main>
    </div>
  );
}
