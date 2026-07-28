import { create } from 'zustand';
import { db } from '../config/firebase';
import { collection, query, onSnapshot, addDoc, deleteDoc, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import defaultPackingList from '../config/defaultPackingList.json';

export const usePackingStore = create((set, get) => ({
  items: [],
  isLoading: true,
  unsubscribe: null,

  subscribeToPacking: (tripId, userId) => {
    if (get().unsubscribe) {
      get().unsubscribe();
    }

    set({ isLoading: true });
    const packingRef = collection(db, `trips/${tripId}/packing`);
    const q = query(packingRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Si la colección está vacía y es la primera vez que entramos, inyectar la plantilla en background
      if (snapshot.empty && get().items.length === 0) {
        get().seedDefaultList(tripId, userId).catch(console.error);
      }

      const fetchedItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      set({ items: fetchedItems, isLoading: false });
    }, (error) => {
      console.error("Error fetching packing list:", error);
      set({ isLoading: false });
    });

    set({ unsubscribe });
    return unsubscribe;
  },

  seedDefaultList: async (tripId, userId) => {
    try {
      const { getDoc } = await import('firebase/firestore');
      let templateToUse = defaultPackingList;
      
      if (userId) {
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().packingTemplate) {
          templateToUse = userDoc.data().packingTemplate;
        }
      }

      const batch = writeBatch(db);
      const packingRef = collection(db, `trips/${tripId}/packing`);
      
      templateToUse.forEach(item => {
        const docRef = doc(packingRef);
        batch.set(docRef, {
          name: item.name,
          category: item.category,
          packed: false,
          quantity: item.quantity || 1,
          createdAt: new Date()
        });
      });

      await batch.commit();
      console.log("Plantilla inyectada con éxito.");
    } catch (err) {
      console.error("Error seeding default list:", err);
    }
  },

  saveUserTemplate: async (userId) => {
    try {
      const { getDoc, setDoc } = await import('firebase/firestore');
      const items = get().items;
      if (items.length === 0) return;
      
      const template = items.map(item => ({
        name: item.name,
        category: item.category,
        quantity: item.quantity || 1
      }));
      
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        await updateDoc(userDocRef, { packingTemplate: template });
      } else {
        await setDoc(userDocRef, { packingTemplate: template });
      }
      return true;
    } catch (error) {
      console.error("Error saving template:", error);
      throw error;
    }
  },

  uploadLuggagePhoto: async (tripId, file) => {
    try {
      const storage = getStorage();
      const fileRef = ref(storage, `trips/${tripId}/luggage/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(fileRef, file);
      const url = await getDownloadURL(snapshot.ref);
      return url;
    } catch (err) {
      console.error("Error uploading luggage photo:", err);
      throw err;
    }
  },

  addItem: async (tripId, itemData) => {
    try {
      const packingRef = collection(db, `trips/${tripId}/packing`);
      await addDoc(packingRef, {
        ...itemData,
        packed: false,
        quantity: itemData.quantity || 1,
        createdAt: new Date()
      });
      return true;
    } catch (err) {
      console.error("Error adding item:", err);
      throw err;
    }
  },

  toggleItem: async (tripId, itemId, currentPackedState) => {
    try {
      const itemRef = doc(db, `trips/${tripId}/packing/${itemId}`);
      await updateDoc(itemRef, { packed: !currentPackedState });
      return true;
    } catch (err) {
      console.error("Error toggling item:", err);
      throw err;
    }
  },

  updateQuantity: async (tripId, itemId, newQuantity) => {
    try {
      const itemRef = doc(db, `trips/${tripId}/packing/${itemId}`);
      await updateDoc(itemRef, { quantity: newQuantity });
      return true;
    } catch (err) {
      console.error("Error updating quantity:", err);
      throw err;
    }
  },

  updateItem: async (tripId, itemId, updates) => {
    try {
      const itemRef = doc(db, `trips/${tripId}/packing/${itemId}`);
      await updateDoc(itemRef, updates);
      return true;
    } catch (err) {
      console.error("Error updating item:", err);
      throw err;
    }
  },

  deleteItem: async (tripId, itemId) => {
    try {
      const itemRef = doc(db, `trips/${tripId}/packing/${itemId}`);
      await deleteDoc(itemRef);
      return true;
    } catch (err) {
      console.error("Error deleting item:", err);
      throw err;
    }
  },

  deleteCategory: async (tripId, category) => {
    try {
      const itemsToDelete = get().items.filter(i => i.category === category);
      if (itemsToDelete.length === 0) return;
      
      const batch = writeBatch(db);
      itemsToDelete.forEach(item => {
        const itemRef = doc(db, `trips/${tripId}/packing/${item.id}`);
        batch.delete(itemRef);
      });
      await batch.commit();
      return true;
    } catch (err) {
      console.error("Error deleting category:", err);
      throw err;
    }
  }
}));
