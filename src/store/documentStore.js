import { create } from 'zustand';
import { db } from '../config/firebase';
import { collection, query, onSnapshot, orderBy, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const useDocumentStore = create((set, get) => ({
  documents: [],
  isLoading: true,

  subscribeToDocuments: (tripId) => {
    set({ isLoading: true });
    const docsRef = collection(db, `trips/${tripId}/documents`);
    const q = query(docsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedDocs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      set({ documents: fetchedDocs, isLoading: false });
    }, (error) => {
      console.error("Error fetching documents:", error);
      set({ isLoading: false });
    });

    return unsubscribe;
  },

  addDocument: async (tripId, title, fileToUpload) => {
    try {
      const storage = getStorage();
      const fileRef = ref(storage, `trips/${tripId}/documents/${Date.now()}_${fileToUpload.name}`);
      const snapshot = await uploadBytes(fileRef, fileToUpload);
      const url = await getDownloadURL(snapshot.ref);

      const docsRef = collection(db, `trips/${tripId}/documents`);
      await addDoc(docsRef, {
        title: title || fileToUpload.name,
        fileName: fileToUpload.name,
        url: url,
        createdAt: new Date()
      });
      return true;
    } catch (err) {
      console.error("Error adding document:", err);
      throw err;
    }
  },

  deleteDocument: async (tripId, documentId) => {
    try {
      const docRef = doc(db, `trips/${tripId}/documents/${documentId}`);
      await deleteDoc(docRef);
      return true;
    } catch (err) {
      console.error("Error deleting document:", err);
      throw err;
    }
  }
}));
