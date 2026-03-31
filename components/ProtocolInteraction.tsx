'use client';

import { useState, useEffect } from 'react';
import { db, storage, auth } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Upload, MessageSquare, Send, Loader2 } from 'lucide-react';

export default function ProtocolInteraction({ protocolId }: { protocolId: string }) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(setUser);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'protocols', protocolId, 'comments'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, [protocolId]);

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;
    setUploading(true);
    const file = e.target.files[0];
    const storageRef = ref(storage, `protocols/${protocolId}/${user.uid}/${file.name}`);
    await uploadBytes(storageRef, file);
    const photoUrl = await getDownloadURL(storageRef);
    await updateDoc(doc(db, 'protocols', protocolId), { photoUrl });
    setUploading(false);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;
    await addDoc(collection(db, 'protocols', protocolId, 'comments'), {
      text: newComment,
      userId: user.uid,
      userName: user.displayName || 'Anonymous',
      createdAt: serverTimestamp()
    });
    setNewComment('');
  };

  if (!user) return <div className="text-white/40 text-sm mt-8">Log in to upload photos and leave comments.</div>;

  return (
    <div className="mt-12 space-y-8 border-t border-white/10 pt-8">
      <section>
        <h2 className="text-mono text-sm text-detox-green uppercase tracking-widest mb-4">Executed this? Share visual evidence!</h2>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 px-4 py-2 bg-zinc-800 border border-white/10 text-white cursor-pointer hover:bg-zinc-700 transition-colors">
            <Upload className="w-4 h-4" />
            {uploading ? 'Uploading...' : 'Upload Visual Evidence'}
            <input type="file" className="hidden" onChange={handleUploadPhoto} accept="image/*" />
          </label>
        </div>
      </section>

      <section>
        <h2 className="text-mono text-sm text-detox-green uppercase tracking-widest mb-4">Community Insights</h2>
        <div className="flex gap-2">
          <input 
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex-1 bg-zinc-800 border border-white/10 p-2 text-white"
            placeholder="Share Your Tips & Substitutions"
          />
          <button onClick={handleAddComment} className="p-2 bg-detox-green text-black">
            <Send className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-4 space-y-4">
          {comments.map(comment => (
            <div key={comment.id} className="bg-zinc-800 p-4">
              <div className="text-mono text-xs text-detox-green mb-1">{comment.userName}</div>
              <div className="text-white/80 text-sm">{comment.text}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
