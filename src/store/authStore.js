import { create } from 'zustand';
import { auth, db } from '../config/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export const useAuthStore = create((set) => ({
  user: null,
  profile: null,
  isLoading: true,
  
  initialize: () => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const docRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            set({ user: firebaseUser, profile: docSnap.data(), isLoading: false });
          } else {
            set({ user: firebaseUser, profile: null, isLoading: false });
          }
        } catch (error) {
          console.error("Error fetching user profile", error);
          set({ user: firebaseUser, profile: null, isLoading: false });
        }
      } else {
        set({ user: null, profile: null, isLoading: false });
      }
    });
  },

  logout: async () => {
    await signOut(auth);
    set({ user: null, profile: null });
  },
  
  setProfile: (profileData) => set({ profile: profileData })
}));
