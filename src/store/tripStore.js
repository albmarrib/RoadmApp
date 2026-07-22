import { create } from 'zustand';
import { db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export const useTripStore = create((set) => ({
  trips: [],
  isLoading: false,
  error: null,

  fetchMyTrips: async (userId) => {
    if (!userId) return;
    set({ isLoading: true, error: null });
    try {
      const tripsRef = collection(db, 'trips');
      // Consultamos los viajes donde el usuario actual tiene un rol asignado
      const q = query(tripsRef, where(`members.${userId}`, 'in', ['owner', 'editor', 'viewer']));
      
      const snapshot = await getDocs(q);
      const fetchedTrips = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      set({ trips: fetchedTrips, isLoading: false });
    } catch (err) {
      console.error("Error fetching trips:", err);
      set({ error: err.message, isLoading: false });
    }
  }
}));
