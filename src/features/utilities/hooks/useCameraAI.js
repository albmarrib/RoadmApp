import { useState } from 'react';
import { storage, auth } from '../../../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import imageCompression from 'browser-image-compression';

export function useCameraAI() {
  const [isProcessing, setIsProcessing] = useState(false);

  const processImage = async (file, prompt, expectJson = false) => {
    if (!file) return null;
    if (!auth.currentUser) throw new Error("No estás autenticado.");
    
    setIsProcessing(true);
    try {
      // 1. Comprimir la imagen para redes móviles (5G/4G)
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1200,
        useWebWorker: true
      };
      const compressedFile = await imageCompression(file, options);

      // 2. Subir la imagen temporalmente
      const timestamp = Date.now();
      const storageRef = ref(storage, `users/${auth.currentUser.uid}/temp/${timestamp}_${compressedFile.name}`);
      await uploadBytes(storageRef, compressedFile);
      const downloadURL = await getDownloadURL(storageRef);

      // 2. Llamar a la función
      const functions = getFunctions(auth.app, 'europe-west1');
      const analyzeImageUtility = httpsCallable(functions, 'analyzeImageUtility');
      
      const result = await analyzeImageUtility({
        fileUrl: downloadURL,
        mimeType: file.type,
        prompt: prompt,
        expectJson: expectJson
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
