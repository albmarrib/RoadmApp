import { create } from 'zustand';
import { db } from '../config/firebase';
import { collection, query, onSnapshot, orderBy, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const useItineraryStore = create((set, get) => ({
  nodes: [],
  isLoading: false,
  error: null,
  unsubscribe: null,

  subscribeToNodes: (tripId) => {
    if (get().unsubscribe) {
      get().unsubscribe();
    }

    set({ isLoading: true, error: null });

    const nodesRef = collection(db, `trips/${tripId}/itineraryNodes`);
    const q = query(nodesRef, orderBy('startTime', 'asc'));

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const fetchedNodes = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        set({ nodes: fetchedNodes, isLoading: false });
      },
      (error) => {
        console.error("Error subscribiendo a itineraryNodes:", error);
        set({ error: error.message, isLoading: false });
      }
    );

    set({ unsubscribe });
    return unsubscribe;
  },

  addNode: async (tripId, nodeData, filesToUpload = []) => {
    try {
      const storage = getStorage();
      const uploadedAttachments = [];

      for (const file of filesToUpload) {
        const fileRef = ref(storage, `trips/${tripId}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(fileRef, file);
        const url = await getDownloadURL(snapshot.ref);
        uploadedAttachments.push({ name: file.name, url });
      }

      const nodesRef = collection(db, `trips/${tripId}/itineraryNodes`);
      await addDoc(nodesRef, {
        ...nodeData,
        attachments: uploadedAttachments
      });
      return true;
    } catch (err) {
      console.error("Error adding node:", err);
      throw err;
    }
  },

  updateNode: async (tripId, nodeId, nodeData, newFilesToUpload = [], existingAttachments = []) => {
    try {
      const storage = getStorage();
      const uploadedAttachments = [...existingAttachments];

      for (const file of newFilesToUpload) {
        const fileRef = ref(storage, `trips/${tripId}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(fileRef, file);
        const url = await getDownloadURL(snapshot.ref);
        uploadedAttachments.push({ name: file.name, url });
      }

      const nodeRef = doc(db, `trips/${tripId}/itineraryNodes/${nodeId}`);
      const updateData = { ...nodeData, attachments: uploadedAttachments };
      
      await updateDoc(nodeRef, updateData);
      return true;
    } catch (err) {
      console.error("Error updating node:", err);
      throw err;
    }
  },

  deleteNode: async (tripId, nodeId) => {
    try {
      const nodeRef = doc(db, `trips/${tripId}/itineraryNodes/${nodeId}`);
      await deleteDoc(nodeRef);
      return true;
    } catch (err) {
      console.error("Error deleting node:", err);
      throw err;
    }
  }
}));
