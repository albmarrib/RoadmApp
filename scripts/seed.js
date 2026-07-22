import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, setDoc, doc, Timestamp, writeBatch } from 'firebase/firestore';

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

// Data structure
const nodes = [
  { date: "2026-11-23T10:00:00Z", type: "flight", title: "Vuelos y Llegada", startTime: "2026-11-23T10:00:00Z", endTime: "2026-11-24T00:30:00Z", notes: "Salida desde España. Tránsito. Aterrizaje a las 00:30 am." },
  { date: "2026-11-24T01:00:00Z", type: "accommodation", title: "Ibis Budget Auckland Airport", startTime: "2026-11-24T01:00:00Z", endTime: "2026-11-24T08:00:00Z", notes: "Caminando frente a la terminal." },
  { date: "2026-11-24T09:30:00Z", type: "drive", title: "Ruta: Auckland ➔ Matamata ➔ Rotorua", startTime: "2026-11-24T09:30:00Z", endTime: "2026-11-24T12:15:00Z", notes: "~210 km | 2h 45m totales. Recogida del coche de alquiler." },
  { date: "2026-11-24T13:00:00Z", type: "activity", title: "Hobbiton Movie Set", startTime: "2026-11-24T13:00:00Z", endTime: "2026-11-24T15:00:00Z", notes: "Tour al mediodía (Reserva en hobbitontours.com)", tags: ["Cine", "Naturaleza"] },
  { date: "2026-11-24T18:00:00Z", type: "accommodation", title: "Aura Accommodation", startTime: "2026-11-24T18:00:00Z", endTime: "2026-11-25T09:00:00Z", notes: "Rotorua" },
  
  { date: "2026-11-25T10:00:00Z", type: "activity", title: "Te Puia", startTime: "2026-11-25T10:00:00Z", endTime: "2026-11-25T13:00:00Z", notes: "Talla de madera y arte ancestral del Ta Moko.", tags: ["Cultura Maorí"] },
  { date: "2026-11-25T18:00:00Z", type: "accommodation", title: "Aura Accommodation", startTime: "2026-11-25T18:00:00Z", endTime: "2026-11-26T09:00:00Z", notes: "Rotorua (Segunda noche)" },

  { date: "2026-11-26T09:00:00Z", type: "drive", title: "Ruta: Rotorua ➔ PN Tongariro", startTime: "2026-11-26T09:00:00Z", endTime: "2026-11-26T10:45:00Z", notes: "~140 km | 1h 45m" },
  { date: "2026-11-26T11:00:00Z", type: "activity", title: "Taranaki Falls Track", startTime: "2026-11-26T11:00:00Z", endTime: "2026-11-26T13:00:00Z", notes: "Caminata llana, 2 horas. Territorio Volcánico.", tags: ["Físico", "Naturaleza"] },
  { date: "2026-11-26T18:00:00Z", type: "accommodation", title: "The Park Hotel Ruapehu", startTime: "2026-11-26T18:00:00Z", endTime: "2026-11-27T09:00:00Z", notes: "National Park Village" },

  { date: "2026-11-27T09:00:00Z", type: "drive", title: "Ruta: Tongariro ➔ Wellington", startTime: "2026-11-27T09:00:00Z", endTime: "2026-11-27T13:15:00Z", notes: "~330 km | 4h 15m" },
  { date: "2026-11-27T18:00:00Z", type: "accommodation", title: "Apollo Lodge Motel", startTime: "2026-11-27T18:00:00Z", endTime: "2026-11-28T09:00:00Z", notes: "Wellington" },

  { date: "2026-11-28T10:00:00Z", type: "activity", title: "Museo Te Papa", startTime: "2026-11-28T10:00:00Z", endTime: "2026-11-28T13:00:00Z", notes: "Mañana dedicada a fondo al Museo Te Papa.", tags: ["Cultura"] },
  { date: "2026-11-28T18:00:00Z", type: "accommodation", title: "Apollo Lodge Motel", startTime: "2026-11-28T18:00:00Z", endTime: "2026-11-29T08:00:00Z", notes: "Segunda noche" },

  { date: "2026-11-29T08:30:00Z", type: "drive", title: "Wellington ➔ Picton ➔ Motueka", startTime: "2026-11-29T08:30:00Z", endTime: "2026-11-29T14:00:00Z", notes: "Ferry Interislander y ruta ~160 km | 2h" },
  { date: "2026-11-29T15:00:00Z", type: "activity", title: "Cloudy Bay", startTime: "2026-11-29T15:00:00Z", endTime: "2026-11-29T16:30:00Z", notes: "Cata de blancos en Marlborough", tags: ["Gastronomía"] },
  { date: "2026-11-29T18:00:00Z", type: "accommodation", title: "Motueka TOP 10 Holiday Park", startTime: "2026-11-29T18:00:00Z", endTime: "2026-11-30T08:00:00Z", notes: "Cabaña Self-Contained" },

  { date: "2026-11-30T09:00:00Z", type: "activity", title: "Freedom Kayak en Abel Tasman", startTime: "2026-11-30T09:00:00Z", endTime: "2026-11-30T14:00:00Z", notes: "Reserva abeltasmankayaks.co.nz", tags: ["Deporte", "Agua"] },
  { date: "2026-11-30T18:00:00Z", type: "accommodation", title: "Motueka TOP 10 Holiday Park", startTime: "2026-11-30T18:00:00Z", endTime: "2026-12-01T08:00:00Z" },

  { date: "2026-12-01T08:30:00Z", type: "drive", title: "Ruta: Motueka ➔ Punakaiki ➔ Franz Josef", startTime: "2026-12-01T08:30:00Z", endTime: "2026-12-01T15:30:00Z", notes: "~480 km | 6h. Día largo y precioso." },
  { date: "2026-12-01T21:00:00Z", type: "activity", title: "Bosque de luciérnagas de Hokitika", startTime: "2026-12-01T21:00:00Z", endTime: "2026-12-01T22:30:00Z", notes: "Visita nocturna" },
  { date: "2026-12-01T18:00:00Z", type: "accommodation", title: "Bella Vista Motel", startTime: "2026-12-01T18:00:00Z", endTime: "2026-12-02T08:00:00Z", notes: "Franz Josef" },

  { date: "2026-12-02T09:00:00Z", type: "drive", title: "Cruzando los Alpes: Franz Josef ➔ Wanaka", startTime: "2026-12-02T09:00:00Z", endTime: "2026-12-02T13:00:00Z", notes: "~280 km | 4h por Haast Pass." },
  { date: "2026-12-02T18:00:00Z", type: "accommodation", title: "Clearbrook Motel", startTime: "2026-12-02T18:00:00Z", endTime: "2026-12-03T09:00:00Z", notes: "Wanaka" },

  { date: "2026-12-03T10:00:00Z", type: "activity", title: "Descanso en Wanaka", startTime: "2026-12-03T10:00:00Z", endTime: "2026-12-03T18:00:00Z", notes: "Día sin coche. Paseos bordeando el lago para recargar piernas.", tags: ["Relax"] },
  { date: "2026-12-03T18:00:00Z", type: "accommodation", title: "Clearbrook Motel", startTime: "2026-12-03T18:00:00Z", endTime: "2026-12-04T08:00:00Z" },

  { date: "2026-12-04T08:30:00Z", type: "drive", title: "Ruta: Wanaka ➔ Queenstown ➔ Te Anau", startTime: "2026-12-04T08:30:00Z", endTime: "2026-12-04T11:30:00Z", notes: "~230 km | 3h" },
  { date: "2026-12-04T10:00:00Z", type: "activity", title: "Rafting Río Shotover", startTime: "2026-12-04T10:00:00Z", endTime: "2026-12-04T13:00:00Z", notes: "Grado 3-5 (Reserva realnz.com)", tags: ["Adrenalina"] },
  { date: "2026-12-04T20:00:00Z", type: "activity", title: "Te Anau Glowworm Caves", startTime: "2026-12-04T20:00:00Z", endTime: "2026-12-04T22:00:00Z" },
  { date: "2026-12-04T18:00:00Z", type: "accommodation", title: "Aden Motel", startTime: "2026-12-04T18:00:00Z", endTime: "2026-12-05T08:00:00Z", notes: "Te Anau" },

  { date: "2026-12-05T09:00:00Z", type: "activity", title: "Crucero Doubtful Sound", startTime: "2026-12-05T09:00:00Z", endTime: "2026-12-05T17:00:00Z", notes: "El Silencio Absoluto (Reserva realnz.com)", tags: ["Naturaleza"] },
  { date: "2026-12-05T18:00:00Z", type: "accommodation", title: "Aden Motel", startTime: "2026-12-05T18:00:00Z", endTime: "2026-12-06T08:00:00Z" },
  
  { date: "2026-12-06T09:00:00Z", type: "drive", title: "Ruta: Te Anau ➔ The Catlins", startTime: "2026-12-06T09:00:00Z", endTime: "2026-12-06T12:00:00Z", notes: "~220 km | 3h panorámicas" },
  { date: "2026-12-06T13:00:00Z", type: "activity", title: "Surat Bay y Cascadas", startTime: "2026-12-06T13:00:00Z", endTime: "2026-12-06T16:00:00Z", notes: "Caminar entre leones marinos. Cascadas Purakaunui.", tags: ["Fauna"] },
  { date: "2026-12-06T18:00:00Z", type: "accommodation", title: "Catlins Area Motel", startTime: "2026-12-06T18:00:00Z", endTime: "2026-12-07T09:00:00Z" },

  { date: "2026-12-07T10:00:00Z", type: "drive", title: "Ruta: The Catlins ➔ Península de Otago", startTime: "2026-12-07T10:00:00Z", endTime: "2026-12-07T12:00:00Z", notes: "~130 km | 2h" },
  { date: "2026-12-07T18:00:00Z", type: "accommodation", title: "Portobello Motel", startTime: "2026-12-07T18:00:00Z", endTime: "2026-12-08T09:00:00Z", notes: "Otago" },
  
  { date: "2026-12-08T10:00:00Z", type: "activity", title: "Santuario Privado", startTime: "2026-12-08T10:00:00Z", endTime: "2026-12-08T13:00:00Z", notes: "Tour de conservación (pingüinos y albatros reales)", tags: ["Fauna"] },
  { date: "2026-12-08T18:00:00Z", type: "accommodation", title: "Portobello Motel", startTime: "2026-12-08T18:00:00Z", endTime: "2026-12-09T09:00:00Z" },

  { date: "2026-12-09T09:00:00Z", type: "drive", title: "Ruta: Otago ➔ Omarama / Twizel", startTime: "2026-12-09T09:00:00Z", endTime: "2026-12-09T12:00:00Z", notes: "~250 km | 3h" },
  { date: "2026-12-09T18:00:00Z", type: "activity", title: "Bañeras termales de cedro", startTime: "2026-12-09T18:00:00Z", endTime: "2026-12-09T19:30:00Z", notes: "Al atardecer (Reserva hottubsomarama.co.nz)", tags: ["Relax"] },
  { date: "2026-12-09T20:00:00Z", type: "accommodation", title: "Mountain Chalets Motel", startTime: "2026-12-09T20:00:00Z", endTime: "2026-12-10T08:00:00Z", notes: "Twizel" },

  { date: "2026-12-10T09:00:00Z", type: "activity", title: "Lancha Glacier Explorers", startTime: "2026-12-10T09:00:00Z", endTime: "2026-12-10T11:00:00Z", notes: "Navegación entre los icebergs", tags: ["Naturaleza"] },
  { date: "2026-12-10T14:00:00Z", type: "activity", title: "Hooker Valley Track", startTime: "2026-12-10T14:00:00Z", endTime: "2026-12-10T17:00:00Z", notes: "3 horas, vistas brutales de alta montaña", tags: ["Físico"] },
  { date: "2026-12-10T18:00:00Z", type: "accommodation", title: "Mountain Chalets Motel", startTime: "2026-12-10T18:00:00Z", endTime: "2026-12-11T09:00:00Z" },

  { date: "2026-12-11T09:30:00Z", type: "drive", title: "Ruta: Twizel ➔ Lago Tekapo ➔ Kaikoura", startTime: "2026-12-11T09:30:00Z", endTime: "2026-12-11T15:30:00Z", notes: "~490 km | 6h" },
  { date: "2026-12-11T18:00:00Z", type: "accommodation", title: "Kaikoura Boutique Motel", startTime: "2026-12-11T18:00:00Z", endTime: "2026-12-12T08:00:00Z" },

  { date: "2026-12-12T09:00:00Z", type: "activity", title: "Avistamiento de Ballenas", startTime: "2026-12-12T09:00:00Z", endTime: "2026-12-12T12:00:00Z", notes: "En barco (Reserva whalewatch.co.nz)", tags: ["Fauna"] },
  { date: "2026-12-12T15:00:00Z", type: "activity", title: "Kaikoura Peninsula Walkway", startTime: "2026-12-12T15:00:00Z", endTime: "2026-12-12T18:00:00Z", notes: "Trekking costero" },
  { date: "2026-12-12T18:30:00Z", type: "accommodation", title: "Kaikoura Boutique Motel", startTime: "2026-12-12T18:30:00Z", endTime: "2026-12-13T08:00:00Z" },

  { date: "2026-12-13T09:00:00Z", type: "activity", title: "Pedal Kayak con Lobos Marinos", startTime: "2026-12-13T09:00:00Z", endTime: "2026-12-13T12:00:00Z", notes: "Tomas idóneas para trabajar color.", tags: ["Fotografía", "Fauna"] },
  { date: "2026-12-13T14:00:00Z", type: "drive", title: "Ruta: Kaikoura ➔ Christchurch", startTime: "2026-12-13T14:00:00Z", endTime: "2026-12-13T16:30:00Z", notes: "~180 km | 2h 30m" },
  { date: "2026-12-13T18:00:00Z", type: "accommodation", title: "City Centre Motel", startTime: "2026-12-13T18:00:00Z", endTime: "2026-12-14T09:00:00Z", notes: "Christchurch" },

  { date: "2026-12-14T10:00:00Z", type: "activity", title: "Últimos compases", startTime: "2026-12-14T10:00:00Z", endTime: "2026-12-14T16:00:00Z", notes: "Paseo por Christchurch y devolución del vehículo." },
  { date: "2026-12-14T18:00:00Z", type: "accommodation", title: "Sudima Christchurch Airport", startTime: "2026-12-14T18:00:00Z", endTime: "2026-12-15T06:00:00Z" },

  { date: "2026-12-15T09:00:00Z", type: "flight", title: "Vuelo de Regreso", startTime: "2026-12-15T09:00:00Z", endTime: "2026-12-16T10:00:00Z", notes: "Vuelo de salida hacia España." },
];

async function seedItinerary() {
  console.log("Iniciando inyección del RoadMap de Nueva Zelanda en Firestore...");

  try {
    await signInWithEmailAndPassword(auth, 'albmarrib@gmail.com', '123456');
    console.log("Logueado como Owner.");
  } catch (err) {
    console.error("No se pudo loguear como Owner. Asegúrate de haber ejecutado el seed anterior.", err.message);
    process.exit(1);
  }

  const tripId = "trip_nz_2026";
  const batch = writeBatch(db);
  
  let i = 1;
  for (const n of nodes) {
    const docRef = doc(db, `trips/${tripId}/itineraryNodes`, `node_${i}`);
    
    const firestoreNode = {
      ...n,
      date: Timestamp.fromDate(new Date(n.date)),
      startTime: Timestamp.fromDate(new Date(n.startTime)),
      endTime: n.endTime ? Timestamp.fromDate(new Date(n.endTime)) : null,
    };

    batch.set(docRef, firestoreNode);
    i++;
  }

  try {
    await batch.commit();
    console.log(`¡Éxito total! Se han inyectado ${nodes.length} pasos en el Itinerario de Nueva Zelanda.`);
  } catch (err) {
    console.error("Error inyectando el roadmap:", err);
  }

  process.exit(0);
}

seedItinerary();
