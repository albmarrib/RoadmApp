import { create } from 'zustand';
import { db } from '../config/firebase';
import { collection, query, onSnapshot, addDoc, deleteDoc, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import defaultPackingList from '../config/defaultPackingList.json';

export const usePackingStore = create((set, get) => ({
  items: [],
  isLoading: true,
  unsubscribe: null,

  subscribeToPacking: (tripId) => {
    if (get().unsubscribe) {
      get().unsubscribe();
    }

    set({ isLoading: true });
    const packingRef = collection(db, `trips/${tripId}/packing`);
    const q = query(packingRef);

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      // Si la colección está vacía y es la primera vez que entramos, inyectar el Excel (seed)
      if (snapshot.empty && get().items.length === 0) {
        await get().seedDefaultList(tripId);
        return; // El onSnapshot se volverá a disparar cuando termine el seed
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

  seedDefaultList: async (tripId) => {
    try {
      const batch = writeBatch(db);
      const packingRef = collection(db, `trips/${tripId}/packing`);
      
      // Añadir cada ítem de defaultPackingList.json a la base de datos
      defaultPackingList.forEach(item => {
        const docRef = doc(packingRef);
        batch.set(docRef, {
          name: item.name,
          category: item.category,
          packed: false,
          quantity: item.quantity,
          createdAt: new Date()
        });
      });

      await batch.commit();
      console.log("Plantilla base inyectada con éxito.");
    } catch (err) {
      console.error("Error seeding default list:", err);
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
