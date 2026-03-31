'use client';

import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/firebase';

interface RatingComponentProps {
  protocolId: string;
  initialRating?: number;
}

export default function RatingComponent({ protocolId, initialRating = 0 }: RatingComponentProps) {
  const [starRating, setStarRating] = useState(initialRating);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [isLogging, setIsLogging] = useState(false);
  const [loading, setLoading] = useState(false);

  // Listen for real-time updates to the protocol's average rating
  useEffect(() => {
    const protocolRef = doc(db, 'protocols', protocolId);
    const unsubscribe = onSnapshot(protocolRef, (doc) => {
      if (doc.exists()) {
        setStarRating(doc.data().starRating || 0);
      }
    });
    return () => unsubscribe();
  }, [protocolId]);

  // Fetch user's existing rating
  useEffect(() => {
    const fetchUserRating = async () => {
      if (auth.currentUser) {
        const ratingDoc = await getDoc(doc(db, 'protocols', protocolId, 'ratings', auth.currentUser.uid));
        if (ratingDoc.exists()) {
          setUserRating(ratingDoc.data().rating);
        }
      }
    };
    fetchUserRating();
  }, [protocolId]);

  const handleRate = async (newRating: number) => {
    if (!auth.currentUser) {
      alert('Please sign in to rate.');
      return;
    }

    setIsLogging(true);
    setLoading(true);
    try {
      const ratingRef = doc(db, 'protocols', protocolId, 'ratings', auth.currentUser.uid);
      const protocolRef = doc(db, 'protocols', protocolId);

      await setDoc(ratingRef, { rating: newRating, timestamp: serverTimestamp() });
      setUserRating(newRating);
      
      // Calculate and update average rating
      const ratingsSnapshot = await getDocs(collection(db, 'protocols', protocolId, 'ratings'));
      const total = ratingsSnapshot.docs.reduce((acc, doc) => acc + doc.data().rating, 0);
      const average = total / ratingsSnapshot.docs.length;
      
      await updateDoc(protocolRef, { starRating: average });
      
      // Wait 2 seconds before showing the new average
      setTimeout(() => {
        setIsLogging(false);
        setLoading(false);
      }, 2000);
    } catch (error) {
      console.error('Error rating:', error);
      setIsLogging(false);
      setLoading(false);
    }
  };

  if (isLogging) {
    return (
      <span className="text-mono text-[10px] font-bold uppercase tracking-widest text-detox-green animate-pulse">
        [ EFFICACY LOGGED ]
      </span>
    );
  }

  if (starRating === 0) {
    return (
      <span className="text-mono text-[10px] font-bold uppercase tracking-widest text-detox-green border border-detox-green/30 px-2 py-0.5">
        [ EFFICACY: PENDING ]
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            disabled={loading}
            onClick={() => handleRate(star)}
            className="focus:outline-none"
          >
            <Star
              className={`w-4 h-4 ${
                star <= Math.round(starRating)
                  ? 'fill-detox-green text-detox-green'
                  : 'text-white/20'
              }`}
            />
          </button>
        ))}
      </div>
      <span className="text-mono text-xs text-white font-bold">
        {starRating.toFixed(1)}
      </span>
    </div>
  );
}
