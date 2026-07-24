const { onCall, HttpsError } = require("firebase-functions/v2/https");
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
          { "type": "flight", "title": "Vuelo Ida: Madrid - Tokio", "startTime": "...", "endTime": "...", "cost": 1200, "location": {"name": "Madrid"} },
          { "type": "flight", "title": "Vuelo Vuelta: Tokio - Madrid", "startTime": "...", "endTime": "...", "cost": 0, "location": {"name": "Tokio"} }
        ]

        Estructura obligatoria del JSON para cada evento:
        {
          "type": "flight" | "accommodation" | "activity" | "drive" | "car_rental",
          "title": "Nombre claro (Ej: Vuelo QR149 Madrid-Tokio o Wellington Hotel)",
          "startTime": "YYYY-MM-DDTHH:mm:ss",
          "endTime": "YYYY-MM-DDTHH:mm:ss (si aplica)",
          "cost": "Número (coste INDIVIDUAL de este evento, ej: 478.50)",
          "currency": "Código de moneda en 3 letras (ej: EUR, USD, NZD)",
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
      if (mimeType === 'text/plain') {
        const textContent = buffer.toString('utf-8').substring(0, 30000); // Truncar a 30KB para ignorar attachments pesados en base64
        parts.push({ text: `\n\n--- INICIO DEL DOCUMENTO ---\n${textContent}\n--- FIN DEL DOCUMENTO ---` });
      } else {
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType || "application/pdf",
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
