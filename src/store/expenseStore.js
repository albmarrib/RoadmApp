import { create } from 'zustand';
import { db, storage } from '../config/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const useExpenseStore = create((set, get) => ({
  expenses: [],
  isLoading: false,
  error: null,
  activeTripId: null,
  unsubscribe: null,

  subscribeToExpenses: (tripId) => {
    if (!tripId) return;

    // Si ya estábamos suscritos a otro viaje, nos desuscribimos
    const currentUnsubscribe = get().unsubscribe;
    if (currentUnsubscribe) {
      currentUnsubscribe();
    }

    set({ isLoading: true, error: null, activeTripId: tripId });

    try {
      const expensesRef = collection(db, 'trips', tripId, 'expenses');
      const q = query(expensesRef, orderBy('date', 'desc'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const expensesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        set({ expenses: expensesData, isLoading: false });
      }, (error) => {
        console.error("Error subscribing to expenses:", error);
        set({ error: error.message, isLoading: false });
      });

      set({ unsubscribe });
      return unsubscribe;
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  addExpense: async (tripId, expenseData, receiptFile) => {
    set({ isLoading: true, error: null });
    try {
      let receiptUrl = null;

      if (receiptFile) {
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const storageRef = ref(storage, `trips/${tripId}/receipts/${fileName}`);
        
        const snapshot = await uploadBytes(storageRef, receiptFile);
        receiptUrl = await getDownloadURL(snapshot.ref);
      }

      const expensesRef = collection(db, 'trips', tripId, 'expenses');
      await addDoc(expensesRef, {
        ...expenseData,
        receiptUrl,
        createdAt: new Date()
      });

      set({ isLoading: false });
    } catch (error) {
      console.error("Error adding expense:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateExpense: async (tripId, expenseId, updates, newReceiptFile) => {
    set({ isLoading: true, error: null });
    try {
      let receiptUrl = updates.receiptUrl;

      if (newReceiptFile) {
        const fileExt = newReceiptFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const storageRef = ref(storage, `trips/${tripId}/receipts/${fileName}`);
        
        const snapshot = await uploadBytes(storageRef, newReceiptFile);
        receiptUrl = await getDownloadURL(snapshot.ref);
      }

      const expenseRef = doc(db, 'trips', tripId, 'expenses', expenseId);
      await updateDoc(expenseRef, {
        ...updates,
        ...(receiptUrl !== undefined && { receiptUrl })
      });

      set({ isLoading: false });
    } catch (error) {
      console.error("Error updating expense:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteExpense: async (tripId, expenseId) => {
    set({ isLoading: true, error: null });
    try {
      const expenseRef = doc(db, 'trips', tripId, 'expenses', expenseId);
      await deleteDoc(expenseRef);
      set({ isLoading: false });
    } catch (error) {
      console.error("Error deleting expense:", error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  }
}));
