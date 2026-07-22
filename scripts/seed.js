import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore, setDoc, doc, Timestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCF1_dENxaDBGO8msdOAC8rGIAW0CK-e34",
  authDomain: "roadmapp-e6c2c.firebaseapp.com",
  projectId: "roadmapp-e6c2c",
  storageBucket: "roadmapp-e6c2c.firebasestorage.app",
  messagingSenderId: "989129193466",
  appId: "1:989129193466:web:1293785bd7b58fc7bdd643"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createUser(email, password, name) {
  try {
    let user;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      user = userCredential.user;
      await updateProfile(user, { displayName: name });
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log(`El usuario ${email} ya existe en Auth, iniciando sesión para recuperar su UID...`);
        const loginCredential = await signInWithEmailAndPassword(auth, email, password);
        user = loginCredential.user;
      } else {
        throw error;
      }
    }
    
    // Set hasPaid = true for our test users
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      displayName: name,
      hasPaid: true,
      createdAt: new Date().toISOString()
    });
    
    console.log(`Datos de Firestore creados/actualizados para: ${email} (${user.uid})`);
    return user.uid;
  } catch (error) {
    console.error(`Error procesando ${email}:`, error.message);
    return null;
  }
}

async function seed() {
  console.log("Iniciando seed de datos...");
  
  // 1. Crear usuarios
  const uid1 = await createUser('albmarrib@gmail.com', '123456', 'Albert');
  const uid2 = await createUser('mabolet26.fcb@gmail.com', '123456', 'Mabolet');
  
  // 2. Si logramos obtener el uid del owner, creamos el viaje
  if (uid1) {
    const tripId = "trip_nz_2026";
    const tripRef = doc(db, 'trips', tripId);
    
    const members = {
      [uid1]: 'owner'
    };
    
    // Si mabolet también se obtuvo, lo añadimos como editor
    if (uid2) {
      members[uid2] = 'editor';
    }
    
    await setDoc(tripRef, {
      title: "Nueva Zelanda Épico",
      destination: "Nueva Zelanda",
      startDate: Timestamp.fromDate(new Date("2026-11-24T00:00:00Z")),
      endDate: Timestamp.fromDate(new Date("2026-12-15T00:00:00Z")),
      coverImageUrl: "https://images.unsplash.com/photo-1507699622108-4be3abd695ad?q=80&w=2000&auto=format&fit=crop", 
      inviteCode: "NZ-2026-SECRET",
      members: members,
      settings: {
        baseCurrency: "EUR"
      }
    });
    console.log(`Viaje '${tripId}' creado y asignado a los usuarios de prueba.`);
    
    // 3. Crear nodo de Itinerario de prueba (un vuelo)
    const nodeRef = doc(db, `trips/${tripId}/itineraryNodes`, "node_1");
    await setDoc(nodeRef, {
      date: Timestamp.fromDate(new Date("2026-11-25T00:00:00Z")),
      type: "flight",
      title: "Vuelo Madrid - Auckland",
      startTime: Timestamp.fromDate(new Date("2026-11-25T10:00:00Z")),
      endTime: Timestamp.fromDate(new Date("2026-11-26T23:00:00Z")),
      cost: 1500,
      currency: "EUR",
      notes: "Escala en Dubai. Comprar agua para el viaje.",
      tags: ["Larga duración"],
      attachments: []
    });
    console.log(`Nodo de itinerario de ejemplo creado.`);
  } else {
    console.log("No se pudo crear el Viaje de prueba porque el usuario principal falló.");
  }

  console.log("Seed finalizado. Saliendo...");
  process.exit(0);
}

seed();
