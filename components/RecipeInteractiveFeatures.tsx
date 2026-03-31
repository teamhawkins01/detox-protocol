'use client';

import { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Loader2, Camera, Zap, MessageSquare, ImageIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { db, storage } from '@/firebase';
import { addDoc, collection, serverTimestamp, query, orderBy, onSnapshot, updateDoc, doc, increment, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { logEvent } from '@/lib/logger';
import Image from 'next/image';
import ProfileImage from '@/components/ProfileImage';

export function SubstitutionFeatures({ protocol }: { protocol: any }) {
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [substitution, setSubstitution] = useState('');
  const [isSubstituting, setIsSubstituting] = useState(false);

  const handleSubstitute = async () => {
    if (!selectedIngredient || !protocol) return;
    setIsSubstituting(true);
    setSubstitution('');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY! });
      const prompt = `Suggest a substitute for "${selectedIngredient}" in the protocol "${protocol.title}". Explain why it works as a substitute. Keep it concise.`;
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      setSubstitution(response.text || 'No substitution found.');
    } catch (error) {
      console.error('Substitution error:', error);
      setSubstitution('Failed to get substitution. Please try again.');
    } finally {
      setIsSubstituting(false);
    }
  };

  return (
    <div className="p-6 bg-white/5 border border-white/10 space-y-4">
      <h4 className="text-mono text-[10px] text-white/60 uppercase tracking-widest">Need_A_Substitute?</h4>
      <select 
        value={selectedIngredient}
        onChange={(e) => setSelectedIngredient(e.target.value)}
        className="w-full bg-black border border-white/10 p-2 text-white font-mono text-xs"
      >
        <option value="">SELECT_INGREDIENT</option>
        {protocol.ingredients.map((ing: string, i: number) => (
          <option key={i} value={ing}>{ing}</option>
        ))}
      </select>
      <button 
        onClick={handleSubstitute}
        disabled={isSubstituting || !selectedIngredient}
        className="w-full bg-detox-green/10 text-detox-green border border-detox-green/20 py-2 text-mono text-[10px] uppercase tracking-widest hover:bg-detox-green hover:text-black transition-all disabled:opacity-50"
      >
        {isSubstituting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'GET_SUBSTITUTION'}
      </button>
      {substitution && (
        <div className="mt-4 p-4 bg-black border border-detox-green/20 text-white/80 font-mono text-xs leading-relaxed">
          {substitution}
        </div>
      )}
    </div>
  );
}

export function ProtocolGallery({ protocol }: { protocol: any }) {
  const { user, profile } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photos, setPhotos] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'protocols', protocol.id, 'photos'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPhotos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, [protocol.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedFile) return;

    setIsSubmitting(true);
    try {
      const storageRef = ref(storage, `gallery/${protocol.id}/${user.uid}_${Date.now()}`);
      await uploadBytes(storageRef, selectedFile);
      const photoUrl = await getDownloadURL(storageRef);

      await addDoc(collection(db, 'protocols', protocol.id, 'photos'), {
        photoUrl,
        userId: user.uid,
        userName: profile?.username || 'Anonymous',
        createdAt: serverTimestamp()
      });

      // If this is the first photo and there is no pioneer yet, make them the pioneer
      if (photos.length === 0 && !protocol.pioneerUserId) {
        const protocolRef = doc(db, 'protocols', protocol.id);
        await updateDoc(protocolRef, {
          pioneerUserId: user.uid,
          pioneerUserName: profile?.username || 'Anonymous',
          pioneerUserAvatar: profile?.avatar || 'LeafyGreen',
          photoUrl: photoUrl
        });
        alert('Congratulations! You are the Protocol Pioneer for this protocol!');
      } else {
        alert('Photo added to the protocol gallery!');
      }

      await logEvent('user_action', `Uploaded protocol photo: ${protocol.title}`, user.uid, user.email || undefined);
      
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (error) {
      console.error("Error uploading photo:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="protocol-gallery" className="p-6 bg-white/5 border border-white/10 space-y-6 scroll-mt-24">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <h4 className="text-mono text-[10px] text-detox-green uppercase tracking-widest flex items-center gap-2">
          <Camera className="w-4 h-4" />
          Protocol_Gallery
        </h4>
        <span className="text-mono text-[10px] text-white/40">{photos.length} IMAGES</span>
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map(photo => (
            <div key={photo.id} className="relative aspect-square border border-white/10 overflow-hidden group">
              <Image src={photo.photoUrl} alt="Protocol execution" fill className="object-cover transition-transform group-hover:scale-110" sizes="(max-width: 768px) 33vw, 20vw" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                <span className="text-mono text-[8px] text-detox-green truncate">BY: {photo.userName}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {user ? (
        <form onSubmit={handleUpload} className="space-y-4 pt-2">
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 p-6 hover:border-detox-green/50 transition-colors relative">
            {previewUrl ? (
              <div className="relative w-full aspect-video">
                <Image src={previewUrl} alt="Preview" fill className="object-contain" />
                <button type="button" onClick={() => { setSelectedFile(null); setPreviewUrl(null); }} className="absolute top-2 right-2 bg-black/80 text-white p-1 text-xs font-mono z-10">X</button>
              </div>
            ) : (
              <>
                <Camera className="w-8 h-8 text-white/20 mb-2" />
                <span className="text-mono text-[10px] text-white/60 uppercase text-center">
                  {photos.length === 0 ? 'Be the first! Upload to become the Protocol Pioneer.' : 'Upload your execution of this protocol.'}
                </span>
                <input type="file" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" />
              </>
            )}
          </div>
          {selectedFile && (
            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-detox-green/10 text-detox-green border border-detox-green/20 py-3 text-mono text-[10px] font-bold uppercase tracking-widest hover:bg-detox-green hover:text-black transition-all disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'UPLOAD_TO_GALLERY'}
            </button>
          )}
        </form>
      ) : (
        <p className="text-white/40 text-[10px] font-mono uppercase text-center border border-white/5 p-4">Login to upload photos to the gallery.</p>
      )}
    </div>
  );
}

export function CommunityInsightsFeatures({ protocol }: { protocol: any }) {
  const { user, profile } = useAuth();
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comments, setComments] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'protocols', protocol.id, 'comments'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort client-side by upvotes to avoid needing a composite index immediately
      fetched.sort((a: any, b: any) => {
        const aVotes = a.upvotes || 0;
        const bVotes = b.upvotes || 0;
        if (bVotes !== aVotes) return bVotes - aVotes;
        return 0; // fallback to createdAt desc
      });
      setComments(fetched);
    });
    return unsubscribe;
  }, [protocol.id]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !comment.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'protocols', protocol.id, 'comments'), {
        text: comment.trim(),
        userId: user.uid,
        userName: profile?.username || 'Anonymous',
        userAvatar: profile?.avatar || 'LeafyGreen',
        upvotes: 0,
        upvotedBy: [],
        createdAt: serverTimestamp()
      });

      await logEvent('user_action', `Posted community insight: ${protocol.title}`, user.uid, user.email || undefined);
      
      setComment('');
    } catch (error) {
      console.error("Error submitting comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleZap = async (commentId: string, currentUpvotedBy: string[]) => {
    if (!user) {
      alert('Please log in to energize comments!');
      return;
    }
    
    const hasZapped = currentUpvotedBy?.includes(user.uid);
    const commentRef = doc(db, 'protocols', protocol.id, 'comments', commentId);
    
    try {
      if (hasZapped) {
        await updateDoc(commentRef, {
          upvotes: increment(-1),
          upvotedBy: arrayRemove(user.uid)
        });
      } else {
        await updateDoc(commentRef, {
          upvotes: increment(1),
          upvotedBy: arrayUnion(user.uid)
        });
      }
    } catch (error) {
      console.error("Error zapping comment:", error);
    }
  };

  return (
    <div className="p-6 bg-black border border-white/10 space-y-6">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <h4 className="text-mono text-[10px] text-detox-green uppercase tracking-widest flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Community_Insights
        </h4>
        <span className="text-mono text-[10px] text-white/40">{comments.length} TRANSMISSIONS</span>
      </div>

      {user ? (
        <form onSubmit={handleSubmitComment} className="space-y-3">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share a tip, modification, or ask a question..."
            className="w-full bg-white/5 border border-white/10 p-4 text-white placeholder:text-white/20 focus:outline-none focus:border-detox-green transition-colors font-mono text-xs resize-none"
            rows={3}
          />
          <div className="flex justify-end">
            <button 
              type="submit"
              disabled={isSubmitting || !comment.trim()}
              className="bg-detox-green text-black px-6 py-2 text-mono text-[10px] font-bold uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'BROADCAST'}
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-white/5 border border-white/10 p-6 text-center">
          <p className="text-white/60 text-xs font-mono uppercase tracking-widest mb-4">Authentication Required to Broadcast</p>
        </div>
      )}
      
      <div className="space-y-4 pt-4">
        {comments.length === 0 ? (
          <p className="text-white/20 text-xs font-mono text-center py-8 italic">No transmissions yet. Be the first to share an insight.</p>
        ) : (
          comments.map(c => {
            const hasZapped = user && c.upvotedBy?.includes(user.uid);
            return (
              <div key={c.id} className="bg-white/5 p-5 border border-white/5 hover:border-white/10 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <ProfileImage src={c.userAvatar} className="w-8 h-8" iconClassName="w-4 h-4" />
                    <div className="text-mono text-[10px] text-detox-green font-bold tracking-widest">{c.userName}</div>
                  </div>
                  <button 
                    onClick={() => handleZap(c.id, c.upvotedBy || [])}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all ${
                      hasZapped 
                        ? 'border-detox-green bg-detox-green/10 text-detox-green shadow-[0_0_10px_rgba(0,255,0,0.2)]' 
                        : 'border-white/10 text-white/40 hover:text-detox-green hover:border-detox-green/50'
                    }`}
                    title="Energize this insight!"
                  >
                    <Zap className={`w-3 h-3 ${hasZapped ? 'fill-detox-green' : ''}`} />
                    <span className="text-mono text-[10px] font-bold">{c.upvotes || 0}</span>
                  </button>
                </div>
                <div className="text-white/80 text-sm leading-relaxed">{c.text}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
