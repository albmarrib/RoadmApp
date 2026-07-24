const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getStorage } = require("firebase-admin/storage");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();
const db = getFirestore();
const storage = getStorage();

// Límite generoso para un usuario real (evita bots)
const DAILY_LIMIT = 50; // Ajustado a 50 como máximo de seguridad

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
        "Has alcanzado el límite diario de escaneos (50). Inténtalo mañana."
      );
    }

    // 3. Obtener el archivo y procesarlo con Gemini
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error("No se pudo descargar el documento");
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64Data = buffer.toString("base64");

      const prompt = `
        Eres un asistente experto en viajes. Voy a proporcionarte un documento (puede ser un PDF o imagen de un billete de avión, tren, reserva de hotel, o entrada a actividad).
        
        Tu tarea es extraer los datos clave y devolver ÚNICAMENTE un objeto JSON válido con la siguiente estructura (NO devuelvas texto markdown ni código de bloque, solo el JSON):
        
        {
          "type": "flight" | "accommodation" | "activity" | "drive",
          "title": "Ej: Vuelo Madrid-Tokio o Hotel Ritz",
          "startTime": "YYYY-MM-DDTHH:mm:ss",
          "endTime": "YYYY-MM-DDTHH:mm:ss (si aplica)",
          "cost": "Número (coste total si aparece)",
          "currency": "EUR, USD, etc (si aparece)",
          "location": {
            "name": "Dirección o nombre del lugar/aeropuerto"
          },
          "details": "Texto con detalles extra: número de reserva, asientos, terminal, compañía, teléfono, etc."
        }
        
        Si faltan datos, déjalos como null. Si detectas varios eventos, devuelve un array de objetos JSON en su lugar.
      `;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType || "application/pdf",
          },
        },
      ]);

      const textResponse = result.response.text();
      
      // Limpiar markdown residual (```json ... ```)
      let cleanJson = textResponse.trim();
      if (cleanJson.startsWith("```json")) {
        cleanJson = cleanJson.replace(/```json/g, "").replace(/```/g, "").trim();
      } else if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson.replace(/```/g, "").trim();
      }

      const parsedData = JSON.parse(cleanJson);

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
