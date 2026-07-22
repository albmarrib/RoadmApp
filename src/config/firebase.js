import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCF1_dENxaDBGO8msdOAC8rGIAW0CK-e34",
  authDomain: "roadmapp-e6c2c.firebaseapp.com",
  projectId: "roadmapp-e6c2c",
  storageBucket: "roadmapp-e6c2c.firebasestorage.app",
  messagingSenderId: "989129193466",
  appId: "1:989129193466:web:1293785bd7b58fc7bdd643"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Activar caché offline para Firestore
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code == 'failed-precondition') {
    console.warn("Múltiples pestañas abiertas, persistencia solo en una.");
  } else if (err.code == 'unimplemented') {
    console.warn("El navegador actual no soporta persistencia offline.");
  }
});
