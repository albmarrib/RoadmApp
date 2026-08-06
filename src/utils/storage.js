import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Sube una imagen a Firebase Storage y devuelve la URL pública.
 * @param {File} file - El archivo de imagen a subir.
 * @param {string} path - La ruta en Storage (ej. `trips/${tripId}/covers`).
 * @returns {Promise<string>} - La URL de descarga de la imagen.
 */
export const uploadImage = async (file, path) => {
  try {
    const storage = getStorage();
    // Generar un nombre de archivo único para evitar colisiones
    const uniqueFileName = `${Date.now()}_${file.name}`;
    const fullPath = `${path}/${uniqueFileName}`;
    const fileRef = ref(storage, fullPath);
    
    // Subir archivo
    const snapshot = await uploadBytes(fileRef, file);
    
    // Obtener URL de descarga
    const url = await getDownloadURL(snapshot.ref);
    return url;
  } catch (error) {
    console.error("Error subiendo la imagen a Storage:", error);
    throw error;
  }
};
