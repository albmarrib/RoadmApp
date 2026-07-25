import { useState } from 'react';
import { storage, auth } from '../../../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';

export function useCameraAI() {
  const [isProcessing, setIsProcessing] = useState(false);

  const processImage = async (file, prompt) => {
    if (!file) return null;
    if (!auth.currentUser) throw new Error("No estás autenticado.");
    
    setIsProcessing(true);
    try {
      // 1. Subir la imagen temporalmente
      const timestamp = Date.now();
      const storageRef = ref(storage, `users/${auth.currentUser.uid}/temp/${timestamp}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // 2. Llamar a la función
      const functions = getFunctions(auth.app, 'europe-west1');
      const analyzeImageUtility = httpsCallable(functions, 'analyzeImageUtility');
      
      const result = await analyzeImageUtility({
        fileUrl: downloadURL,
        mimeType: file.type,
        prompt: prompt
      });
      
      return result.data.text;
    } catch (error) {
      console.error("Error procesando imagen:", error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  return { processImage, isProcessing };
}
