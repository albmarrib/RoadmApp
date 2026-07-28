const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentDeleted } = require("firebase-functions/v2/firestore");
const { getStorage } = require("firebase-admin/storage");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();
const db = getFirestore();
const storage = getStorage();

// Límite generoso para un usuario real (evita bots)
const DAILY_LIMIT = 500; // Ajustado a 500 para las pruebas

// Simulacro temporal para evitar el error 429 de facturación
exports.analyzeDocument = onCall(
  {
    region: "europe-west1",
    maxInstances: 10,
    secrets: ["GEMINI_API_KEY"],
  },
  async (request) => {
    // 1. Verificación de Seguridad: Usuario Autenticado
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError("unauthenticated", "Debes iniciar sesión para usar la IA.");
    }

    const uid = request.auth.uid;
    
    // Check if user is premium
    const userDocRef = await db.collection("users").doc(uid).get();
    if (!userDocRef.exists || userDocRef.data().tier !== 'premium') {
      throw new HttpsError("permission-denied", "Esta función es exclusiva para usuarios Premium.");
    }

    const { fileUrl, mimeType } = request.data;

    if (!fileUrl) {
      throw new HttpsError("invalid-argument", "Se requiere una URL de archivo.");
    }

    // 2. Control de Uso (Rate Limiting)
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const usageRef = db.collection("users").doc(uid).collection("aiUsage").doc(today);
    
    const usageDoc = await usageRef.get();
    let currentUsage = 0;
    if (usageDoc.exists) {
      currentUsage = usageDoc.data().count || 0;
    }

    if (currentUsage >= DAILY_LIMIT) {
      throw new HttpsError(
        "resource-exhausted",
        "Has alcanzado el límite diario de escaneos (500). Inténtalo mañana."
      );
    }

    // 3. Obtener el archivo y procesarlo con Gemini
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
      
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error("No se pudo descargar el documento");
      
      // Override mimeType with the actual content-type from the server response if available
      let actualMimeType = mimeType;
      const serverContentType = response.headers.get('content-type');
      if (serverContentType && serverContentType !== 'application/octet-stream') {
        actualMimeType = serverContentType.split(';')[0].trim();
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Data = buffer.toString("base64");

      const prompt = `
        Eres un asistente experto en viajes. Voy a proporcionarte un documento (un PDF o imagen de un billete de avión, tren, reserva de hotel, etc.).
        
        Tu tarea es extraer los datos con la MAYOR PRECISIÓN posible. Devuelve ÚNICAMENTE un objeto JSON (o un array de objetos JSON si hay varios eventos).
        NO devuelvas texto markdown ni código de bloque.
        
        IMPORTANTE (Vuelos con escala): Si es un vuelo con escalas, el evento principal debe abarcar desde el ORIGEN INICIAL hasta el DESTINO FINAL.
        IMPORTANTE (Costes múltiples): Si un documento tiene varios eventos (ej: Coche de alquiler + Ferry), extrae eventos separados pero asegúrate de que el 'cost' de cada uno sea SOLO su subtotal individual. NUNCA pongas el precio Total del documento en todos los eventos para no duplicar el gasto.
        IMPORTANTE (Alquiler de Coche): Usa SIEMPRE el tipo "car_rental", NUNCA "drive". Genera UN SOLO evento para todo el periodo de alquiler. Extrae la fecha de recogida en 'startTime' y la de devolución en 'endTime'. Para la ubicación de recogida usa el objeto 'location'. SI y SOLO SI la ubicación de devolución es distinta a la de recogida, crea también el objeto 'dropoffLocation' con las coordenadas de la devolución.
        IMPORTANTE (Vuelos): Si el documento incluye un billete de vuelo de IDA y VUELTA, es OBLIGATORIO que devuelvas un ARRAY CON 2 OBJETOS. El primer objeto para el vuelo de Ida (con el coste total). El segundo objeto para el vuelo de Vuelta (con coste 0). NUNCA intentes meter la vuelta dentro de la ida.
        
        EJEMPLO PARA VUELOS DE IDA Y VUELTA:
        [
          { "type": "flight", "title": "Vuelo Ida: Madrid - Tokio", "startTime": "...", "endTime": "...", "cost": 1200, "isPaid": true, "location": {"name": "Madrid"} },
          { "type": "flight", "title": "Vuelo Vuelta: Tokio - Madrid", "startTime": "...", "endTime": "...", "cost": 0, "isPaid": true, "location": {"name": "Tokio"} }
        ]

        Estructura obligatoria del JSON para cada evento:
        {
          "type": "flight" | "accommodation" | "activity" | "drive" | "car_rental",
          "title": "Nombre claro (Ej: Vuelo QR149 Madrid-Tokio o Wellington Hotel)",
          "startTime": "YYYY-MM-DDTHH:mm:ss",
          "endTime": "YYYY-MM-DDTHH:mm:ss (si aplica)",
          "cost": "Número (coste INDIVIDUAL de este evento, ej: 478.50)",
          "currency": "Código de moneda en 3 letras (ej: EUR, USD, NZD)",
          "isPaid": "Booleano. true si está pagado o si no queda claro. false SI Y SOLO SI el documento dice explícitamente que el pago está pendiente (ej: pago a la llegada, pay at property, pending).",
          "location": {
            "name": "Dirección completa y exacta, ciudad, país.",
            "lat": "Número con la latitud GPS de este lugar (usa tu conocimiento general). Obligatorio para que aparezca en el mapa.",
            "lng": "Número con la longitud GPS de este lugar (usa tu conocimiento general). Obligatorio para que aparezca en el mapa."
          },
          "dropoffLocation": {
            "name": "Solo para car_rental: Dirección de devolución si es distinta.",
            "lat": "Número GPS.",
            "lng": "Número GPS."
          },
          "contactPhone": "Teléfono de contacto si aparece, si no null",
          "contactWhatsapp": "Teléfono de WhatsApp si aparece (a veces coincide con el teléfono), si no null",
          "contactEmail": "Email de contacto si aparece, si no null",
          "contactName": "Nombre de la persona o entidad de contacto si aparece, si no null",
          "externalUrl": "Página web de la reserva o proveedor si aparece, si no null",
          "details": "Solo información extra como habitaciones, asientos, reglas de equipaje, localizador de reserva, terminales, etc."
        }
      `;
      let parts = [{ text: prompt }];
      if (actualMimeType.includes('text/plain') || actualMimeType.includes('message/rfc822')) {
        const textContent = buffer.toString('utf-8').substring(0, 30000); // Truncar a 30KB para ignorar attachments pesados en base64
        parts.push({ text: `\n\n--- INICIO DEL DOCUMENTO ---\n${textContent}\n--- FIN DEL DOCUMENTO ---` });
      } else {
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: actualMimeType || "application/pdf",
          }
        });
      }

      const result = await model.generateContent({
        contents: [{ role: "user", parts: parts }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      });

      const textResponse = result.response.text();
      console.log("GEMINI RAW RESPONSE:\n", textResponse);
      
      let parsedData;
      try {
        parsedData = JSON.parse(textResponse);
      } catch (parseErr) {
        throw new Error(`Error de formato de IA. Respuesta recibida: ${textResponse.substring(0, 300)}...`);
      }

      // Incrementar el uso diario de este usuario
      await usageRef.set(
        { count: FieldValue.increment(1), lastUsed: FieldValue.serverTimestamp() },
        { merge: true }
      );

      return { success: true, data: parsedData };

    } catch (error) {
      console.error("Error analizando documento:", error);
      throw new HttpsError("internal", "Error procesando el documento con IA: " + error.message);
    }
  }
);

// --- Función Ligera para Utilidades (Cámara de Precios y Menús) ---
exports.analyzeImageUtility = onCall(
  {
    region: "europe-west1",
    maxInstances: 10,
    secrets: ["GEMINI_API_KEY"],
  },
  async (request) => {
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
    }
    
    const uid = request.auth.uid;
    const userDocRef = await db.collection("users").doc(uid).get();
    if (!userDocRef.exists || userDocRef.data().tier !== 'premium') {
      throw new HttpsError("permission-denied", "Esta función es exclusiva para usuarios Premium.");
    }

    const { fileUrl, mimeType, prompt, expectJson } = request.data;
    if (!fileUrl || !prompt) {
      throw new HttpsError("invalid-argument", "Se requiere fileUrl y prompt.");
    }

    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
      
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error("No se pudo descargar la imagen");
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Data = buffer.toString("base64");

      const generationConfig = {};
      if (expectJson) {
        generationConfig.responseMimeType = "application/json";
      }

      const aiResult = await model.generateContent({
        contents: [{ role: "user", parts: [
          { text: prompt },
          { inlineData: { data: base64Data, mimeType: mimeType || "image/jpeg" } }
        ] }],
        generationConfig: generationConfig
      });
      
      return { text: aiResult.response.text() };
    } catch (error) {
      console.error("Error en analyzeImageUtility:", error);
      throw new HttpsError("internal", error.message);
    }
  }
);

// --- Función para Transcribir Audio (Traductor de Voz) ---
exports.transcribeAudio = onCall(
  {
    region: "europe-west1",
    maxInstances: 10,
    secrets: ["GEMINI_API_KEY"],
  },
  async (request) => {
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
    }

    const uid = request.auth.uid;
    const userDocRef = await db.collection("users").doc(uid).get();
    if (!userDocRef.exists || userDocRef.data().tier !== 'premium') {
      throw new HttpsError("permission-denied", "Esta función es exclusiva para usuarios Premium.");
    }

    const { base64Audio, mimeType } = request.data;
    if (!base64Audio) {
      throw new HttpsError("invalid-argument", "Se requiere base64Audio.");
    }

    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
      
      const prompt = "Transcribe exactamente lo que escuchas en el idioma original. Devuelve solo el texto puro, sin comillas ni aclaraciones adicionales.";

      const aiResult = await model.generateContent({
        contents: [{ role: "user", parts: [
          { text: prompt },
          { inlineData: { data: base64Audio, mimeType: mimeType || "audio/webm" } }
        ] }]
      });
      
      return { text: aiResult.response.text().trim() };
    } catch (error) {
      console.error("Error en transcribeAudio:", error);
      throw new HttpsError("internal", error.message);
    }
  }
);

// --- Función para borrar datos huérfanos cuando se elimina un viaje ---
exports.onTripDeleted = onDocumentDeleted("trips/{tripId}", async (event) => {
  const tripId = event.params.tripId;
  console.log(`Borrando dependencias del viaje: ${tripId}`);
  
  // 1. Borrar todas las subcolecciones recursivamente
  try {
    const docRef = db.collection("trips").doc(tripId);
    await db.recursiveDelete(docRef);
    console.log(`Subcolecciones borradas correctamente para ${tripId}`);
  } catch (error) {
    console.error("Error borrando subcolecciones:", error);
  }

  // 2. Borrar todos los archivos de este viaje en Storage
  // Nota: Al borrar tripId en la base de datos, en storage guardamos los docs como:
  // trips/{tripId}/...
  try {
    const bucket = storage.bucket();
    await bucket.deleteFiles({
      prefix: `trips/${tripId}/`
    });
    console.log(`Archivos borrados correctamente para ${tripId} (trips/)`);
  } catch (error) {
    console.error("Error borrando archivos en trips/:", error);
  }
});

// --- STRIPE INTEGRATION ---
const { onRequest } = require("firebase-functions/v2/https");

exports.createCheckoutSession = onCall(
  {
    region: "europe-west1",
    maxInstances: 10,
  },
  async (request) => {
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError("unauthenticated", "Debes iniciar sesión.");
    }

    const uid = request.auth.uid;
    const origin = request.rawRequest.headers.origin || "https://roadmapp-e6c2c.web.app";

    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        client_reference_id: uid,
        line_items: [
          {
            price: process.env.STRIPE_PRICE_ID, // Definido en secrets o env
            quantity: 1,
          },
        ],
        success_url: `${origin}/?checkout=success`,
        cancel_url: `${origin}/?checkout=cancel`,
      });

      return { id: session.id, url: session.url };
    } catch (error) {
      console.error("Error creating checkout session:", error);
      throw new HttpsError("internal", error.message);
    }
  }
);

exports.stripeWebhook = onRequest(
  {
    region: "europe-west1",
  },
  async (req, res) => {
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody, 
        sig, 
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook signature verification failed.", err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    const dataObject = event.data.object;

    if (event.type === 'checkout.session.completed') {
      const uid = dataObject.client_reference_id;
      if (uid) {
        await db.collection("users").doc(uid).update({ tier: 'premium' });
        console.log(`Usuario ${uid} actualizado a Premium.`);
      }
    } else if (event.type === 'customer.subscription.deleted') {
      // Necesitamos mapear customer -> uid, asumiendo que lo guardamos o lo extraemos
      // Por simplicidad, si sabemos el UID, lo usamos. 
      // Si no, podríamos necesitar buscar al usuario por customer_id.
      // (Para modo pruebas basico de validación, asumiremos webhook básico).
      console.log('Suscripcion eliminada', dataObject);
    }

    res.json({received: true});
  }
);

const { simpleParser } = require("mailparser");
const { v4: uuidv4 } = require("uuid");

exports.receiveEmailWebhook = onRequest(
  {
    region: "europe-west1",
    cors: true,
  },
  async (req, res) => {
    // 1. Verificación de seguridad
    if (req.headers["x-roadmapp-token"] !== "roadmapp_secreto_seguro_2026") {
      res.status(403).send("Forbidden");
      return;
    }

    const senderEmail = req.headers["x-mail-from"];
    const toEmail = req.headers["x-mail-to"];
    
    if (!senderEmail || !toEmail) {
      res.status(400).send("Faltan headers");
      return;
    }

    try {
      const alias = toEmail.split("@")[0].toLowerCase().trim();

      // Buscar al usuario por remitente
      const usersRef = db.collection("users");
      const q = usersRef.where("email", "==", senderEmail).limit(1);
      const userSnap = await q.get();
      
      if (userSnap.empty) {
        console.log(`Usuario desconocido: ${senderEmail}`);
        res.status(404).send("User not found");
        return;
      }
      const uid = userSnap.docs[0].id;

      // Buscar el viaje del usuario
      const tripsRef = db.collection("trips");
      const tripsQ = tripsRef.where(`members.${uid}`, "in", ["owner", "editor", "viewer"]);
      const tripsSnap = await tripsQ.get();
      
      let matchedTrip = null;
      tripsSnap.forEach(doc => {
        const tripData = doc.data();
        const tripAlias = tripData.emailAlias ? tripData.emailAlias.toLowerCase() : "";
        if (tripAlias === alias || (!matchedTrip && tripData.title.toLowerCase().includes(alias))) {
          matchedTrip = { id: doc.id, ...tripData };
        }
      });

      if (!matchedTrip) {
        console.log(`Viaje no encontrado para alias: ${alias} del usuario ${uid}`);
        res.status(404).send("Trip not found");
        return;
      }

      // Parsear el email
      const parsed = await simpleParser(req.rawBody);
      const docsRef = db.collection(`trips/${matchedTrip.id}/documents`);
      
      let hasAttachments = false;
      const bucket = storage.bucket();

      if (parsed.attachments && parsed.attachments.length > 0) {
        for (const att of parsed.attachments) {
          hasAttachments = true;
          const fileName = `trips/${matchedTrip.id}/email_${Date.now()}_${att.filename || 'adjunto'}`;
          const file = bucket.file(fileName);
          
          const token = uuidv4();
          await file.save(att.content, {
            metadata: {
              contentType: att.contentType,
              metadata: {
                firebaseStorageDownloadTokens: token
              }
            }
          });
          
          const fileUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media&token=${token}`;
          
          await docsRef.add({
            title: att.filename || "Archivo Adjunto",
            url: fileUrl,
            type: "tickets",
            aiAnalyzed: false,
            createdAt: FieldValue.serverTimestamp(),
            source: "email"
          });
        }
      }

      // Si no tiene adjuntos, guardamos el cuerpo del correo como documento
      if (!hasAttachments && parsed.text) {
        const textContent = parsed.text.trim();
        if (textContent.length > 10) {
          const fileName = `trips/${matchedTrip.id}/email_body_${Date.now()}.txt`;
          const file = bucket.file(fileName);
          const token = uuidv4();
          
          await file.save(Buffer.from(textContent, 'utf-8'), {
            metadata: {
              contentType: 'text/plain',
              metadata: {
                firebaseStorageDownloadTokens: token
              }
            }
          });
          
          const fileUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileName)}?alt=media&token=${token}`;
          
          await docsRef.add({
            title: parsed.subject || "Cuerpo del Correo",
            url: fileUrl,
            type: "tickets",
            aiAnalyzed: false,
            createdAt: FieldValue.serverTimestamp(),
            source: "email"
          });
        }
      }

      res.status(200).send("OK");
    } catch (error) {
      console.error("Error procesando email:", error);
      res.status(500).send("Internal error");
    }
  }
);
