import { create } from 'zustand';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

export const useTripStore = create((set, get) => ({
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
      const fetchedTrips = snapshot.docs.map(document => ({
        id: document.id,
        ...document.data()
      }));
      
      set({ trips: fetchedTrips, isLoading: false });
    } catch (err) {
      console.error("Error fetching trips:", err);
      set({ error: err.message, isLoading: false });
    }
  },

  updateTrip: async (tripId, updates) => {
    set({ isLoading: true, error: null });
    try {
      const tripRef = doc(db, 'trips', tripId);
      await updateDoc(tripRef, updates);
      
      // Actualizar el estado local
      const { trips } = get();
      const updatedTrips = trips.map(t => 
        t.id === tripId ? { ...t, ...updates } : t
      );
      set({ trips: updatedTrips, isLoading: false });
    } catch (err) {
      console.error("Error updating trip:", err);
      set({ error: err.message, isLoading: false });
      throw err;
    }
  }
}));
