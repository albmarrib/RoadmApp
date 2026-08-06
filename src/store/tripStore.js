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
  },

  createTrip: async (tripData, userId, coverImageFile = null) => {
    set({ isLoading: true, error: null });
    try {
      const { addDoc } = await import('firebase/firestore');
      const { getStorage, ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
      const tripsRef = collection(db, 'trips');
      
      let coverImageUrl = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800';
      
      // Si el usuario sube un archivo local para la portada
      if (coverImageFile) {
        const storage = getStorage();
        const fileRef = ref(storage, `trips/covers/${Date.now()}_${coverImageFile.name}`);
        const snapshot = await uploadBytes(fileRef, coverImageFile);
        coverImageUrl = await getDownloadURL(snapshot.ref);
      } else if (tripData.coverImage && typeof tripData.coverImage === 'string') {
        // Fallback por si acaso envían una URL
        coverImageUrl = tripData.coverImage;
      }
      
      // Generar código de invitación aleatorio (6 caracteres, ej: NZ-8X4A)
      const generateCode = () => {
        const prefix = tripData.destination ? tripData.destination.substring(0, 2).toUpperCase() : 'TR';
        const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `${prefix}-${randomStr}`;
      };
      
      const inviteCode = generateCode();
      
      const newTrip = {
        title: tripData.title,
        destination: tripData.destination || '',
        origin: tripData.origin || 'España',
        startDate: tripData.startDate || null,
        endDate: tripData.endDate || null,
        coverImageUrl: coverImageUrl,
        inviteCode: inviteCode,
        members: {
          [userId]: 'owner' // El creador es el owner
        },
        // Extras
        emailAlias: tripData.emailAlias || '',
        agencyName: tripData.agencyName || '',
        agencyPhone: tripData.agencyPhone || '',
        agencyContact: tripData.agencyContact || '',
        insuranceName: tripData.insuranceName || '',
        insurancePolicy: tripData.insurancePolicy || '',
        insurancePhone: tripData.insurancePhone || '',
        budget: tripData.budget || 0,
        currency: tripData.currency || 'EUR',
        exchangeRate: tripData.exchangeRate || 1,
        isGroupMode: tripData.isGroupMode || false,
        splitMembers: tripData.splitMembers || [],
        categories: tripData.categories || ['Comida', 'Transporte', 'Ocio', 'Alojamiento', 'Vuelos', 'Gasolina', 'Supermercado', 'Otros'],
        defaultAlarmOffset: tripData.defaultAlarmOffset !== undefined ? tripData.defaultAlarmOffset : 1440,
        createdAt: new Date()
      };
      
      const docRef = await addDoc(tripsRef, newTrip);
      
      // Actualizar el estado local añadiendo el nuevo viaje
      const { trips } = get();
      set({ 
        trips: [{ id: docRef.id, ...newTrip }, ...trips],
        isLoading: false 
      });
      
      return docRef.id;
    } catch (err) {
      console.error("Error creating trip:", err);
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  joinTripByCode: async (inviteCode, userId) => {
    set({ isLoading: true, error: null });
    try {
      const { app } = await import('../config/firebase');
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      
      const functions = getFunctions(app, 'europe-west1');
      const joinTripFn = httpsCallable(functions, 'joinTripByCode');
      
      const result = await joinTripFn({ inviteCode });
      const tripId = result.data.tripId;
      
      // Recargar la lista de viajes para incluir el nuevo
      await get().fetchMyTrips(userId);
      
      return tripId;
    } catch (err) {
      console.error("Error joining trip:", err);
      // Extraer mensaje amigable si viene de Firebase Functions
      const errorMessage = err.message || "Error al unirse al viaje.";
      set({ error: errorMessage, isLoading: false });
      throw new Error(errorMessage);
    }
  },

  deleteTrip: async (tripId) => {
    set({ isLoading: true, error: null });
    try {
      const { deleteDoc, doc } = await import('firebase/firestore');
      const tripRef = doc(db, 'trips', tripId);
      await deleteDoc(tripRef);
      
      // Actualizar el estado local
      const { trips } = get();
      set({ 
        trips: trips.filter(t => t.id !== tripId),
        isLoading: false 
      });
      return true;
    } catch (err) {
      console.error("Error deleting trip:", err);
      set({ error: err.message, isLoading: false });
      throw err;
    }
  }
}));
