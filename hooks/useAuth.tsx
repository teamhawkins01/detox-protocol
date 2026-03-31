'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  User as FirebaseUser,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink
} from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { logEvent, trackPageView } from '@/lib/logger';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: any | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  isAuthReady: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkEmailLink = async () => {
      if (isSignInWithEmailLink(auth, window.location.href)) {
        let email = window.localStorage.getItem('emailForSignIn');
        if (!email) {
          email = window.prompt('Please provide your email for confirmation');
        }
        if (email) {
          try {
            await signInWithEmailLink(auth, email, window.location.href);
            window.localStorage.removeItem('emailForSignIn');
          } catch (error) {
            console.error("Error signing in with email link:", error);
          }
        }
      }
    };
    checkEmailLink();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthReady(true);
      
      if (firebaseUser) {
        // Fetch profile with real-time updates
        const docRef = doc(db, 'users', firebaseUser.uid);
        const unsubscribeProfile = onSnapshot(docRef, async (docSnap) => {
          const isAdminEmail = firebaseUser.email?.toLowerCase() === 'teamhawkins01@gmail.com';
          
          if (docSnap.exists()) {
            const profileData = docSnap.data();
            
            // Check for ban
            if (profileData.status === 'banned') {
              await logEvent('auth_error', `Banned user attempted access: ${firebaseUser.email}`, firebaseUser.uid, firebaseUser.email || undefined);
              await signOut(auth);
              setUser(null);
              setProfile(null);
              router.push('/banned');
              setLoading(false);
              return;
            }

            // Ensure default gamification values if missing
            const enrichedProfile = {
              ...profileData,
              username: profileData.username || 'Anonymous',
              role: profileData.role || 'user',
              experiencePoints: profileData.experiencePoints || 0,
              currentLevel: profileData.currentLevel || 1,
              isMaster: profileData.isMaster || (profileData.currentLevel >= 10),
              isAdmin: profileData.isAdmin || (profileData.role === 'admin'),
              badges: profileData.badges || [],
              savedProtocols: profileData.savedProtocols || [],
              avatar: profileData.avatar || 'LeafyGreen', // Default avatar
              stats: profileData.stats || {
                protocolsGenerated: 0,
                reviewsLeft: 0,
                tweaksSuggested: 0,
                photosUploaded: 0,
                smoothiesGenerated: 0
              }
            };

            // Force admin overrides for the specific email
            if (isAdminEmail) {
              enrichedProfile.username = 'Medicine Man';
              enrichedProfile.currentLevel = 99;
              enrichedProfile.isAdmin = true;
              enrichedProfile.role = 'admin';
              enrichedProfile.isMaster = true;
            }

            setProfile(enrichedProfile);
            if (pathname === '/onboarding') {
              router.push('/');
            }
          } else {
            if (isAdminEmail) {
              // Auto-create admin profile if missing
              const adminProfile = {
                username: 'Medicine Man',
                email: firebaseUser.email,
                role: 'admin',
                status: 'active',
                createdAt: new Date().toISOString(),
                experiencePoints: 999999,
                currentLevel: 99,
                isMaster: true,
                isAdmin: true,
                badges: ['Alpha Tester', 'System Architect'],
                savedProtocols: [],
                avatar: 'LeafyGreen',
                stats: {
                  protocolsGenerated: 0,
                  reviewsLeft: 0,
                  tweaksSuggested: 0,
                  photosUploaded: 0,
                  smoothiesGenerated: 0
                }
              };
              setProfile(adminProfile);
            } else {
              setProfile(null);
              if (pathname !== '/onboarding' && pathname !== '/admin') {
                router.push('/onboarding');
              }
            }
          }
          setLoading(false);
        });

        return () => unsubscribeProfile();
      } else {
        setProfile(null);
        if (pathname === '/onboarding') {
          router.push('/');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [pathname, router]);

  useEffect(() => {
    if (isAuthReady) {
      trackPageView(pathname, user?.uid);
    }
  }, [pathname, isAuthReady, user?.uid]);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    try {
      // Do not await to prevent popup blocker
      logEvent('login_attempt', 'Google Sign-in initiated').catch(console.error);
      const result = await signInWithPopup(auth, provider);
      logEvent('login', `User logged in: ${result.user.email}`, result.user.uid, result.user.email || undefined).catch(console.error);
      router.push('/');
    } catch (error: any) {
      console.error("Error signing in with Google:", error);
      logEvent('auth_error', `Google Sign-in failed: ${error.message}`).catch(console.error);
    }
  };

  const logout = async () => {
    try {
      const email = user?.email;
      const uid = user?.uid;
      await signOut(auth);
      await logEvent('user_action', `User logged out: ${email}`, uid, email || undefined);
      router.push('/');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, logout, isAuthReady }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
