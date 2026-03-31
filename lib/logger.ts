import { db } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export type LogType = 'login' | 'login_attempt' | 'auth_error' | 'admin_action' | 'user_action' | 'page_view';

export async function logEvent(type: LogType, details: string, userId?: string, email?: string) {
  try {
    await addDoc(collection(db, 'system_logs'), {
      type,
      userId: userId || null,
      email: email || null,
      details,
      timestamp: serverTimestamp(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server'
    });
  } catch (error) {
    console.error('Failed to log event:', error);
  }
}

export async function trackPageView(page: string, userId?: string) {
  try {
    console.log('Tracking page view:', page, userId);
    await addDoc(collection(db, 'analytics'), {
      page,
      userId: userId || null,
      timestamp: serverTimestamp(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server'
    });
  } catch (error) {
    console.error('Failed to track page view:', error);
  }
}
