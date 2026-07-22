import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, updateDoc } from 'firebase/firestore';

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

const locations = {
  "Auckland": [-36.8485, 174.7633],
  "Rotorua": [-38.1368, 176.2497],
  "Tongariro": [-39.13, 175.65],
  "Wellington": [-41.2865, 174.7762],
  "Picton": [-41.2905, 174.0041],
  "Motueka": [-41.1099, 173.0135],
  "Abel Tasman": [-40.9329, 172.9772],
  "Franz Josef": [-43.3888, 170.1818],
  "Wanaka": [-44.7032, 169.1321],
  "Queenstown": [-45.0312, 168.6626],
  "Te Anau": [-45.4144, 167.7181],
  "Doubtful Sound": [-45.3, 166.98],
  "Catlins": [-46.505, 169.585],
  "Otago": [-45.85, 170.65],
  "Twizel": [-44.257, 170.103],
  "Mount Cook": [-43.7333, 170.1],
  "Tekapo": [-44.0046, 170.4771],
  "Kaikoura": [-42.4005, 173.6814],
  "Christchurch": [-43.5321, 172.6362],
  "España": [40.4168, -3.7038]
};

async function addCoords() {
  await signInWithEmailAndPassword(auth, 'albmarrib@gmail.com', '123456');
  
  const tripId = "trip_nz_2026";
  const nodesRef = collection(db, `trips/${tripId}/itineraryNodes`);
  const snap = await getDocs(nodesRef);
  
  let updated = 0;
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const text = (data.title + " " + (data.notes || "")).toLowerCase();
    
    let assigned = null;
    for (const [name, coords] of Object.entries(locations)) {
      if (text.includes(name.toLowerCase())) {
        assigned = coords;
        break;
      }
    }
    
    if (assigned) {
      await updateDoc(docSnap.ref, { location: { lat: assigned[0], lng: assigned[1] } });
      updated++;
    }
  }
  
  console.log(`Se añadieron coordenadas a ${updated} nodos.`);
  process.exit(0);
}

addCoords();
