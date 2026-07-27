import React, { useState, useRef } from 'react';
import { Mic, Volume2, Loader2, StopCircle, Camera } from 'lucide-react';
import { useCameraAI } from '../hooks/useCameraAI';

export default function LiveTranslator() {
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [targetLang, setTargetLang] = useState('en'); 
  const [activeMic, setActiveMic] = useState(null); 
  const [lastDirection, setLastDirection] = useState('es-to-target');
  
  const recognitionRef = useRef(null);
  const currentTextRef = useRef('');
  const fileInputRef = useRef(null);
  const { processImage, isProcessing: isScanning } = useCameraAI();

  const languages = [
    { code: 'en', bcp: 'en-US', name: 'Inglés' },
    { code: 'ja', bcp: 'ja-JP', name: 'Japonés' },
    { code: 'fr', bcp: 'fr-FR', name: 'Francés' },
    { code: 'de', bcp: 'de-DE', name: 'Alemán' },
    { code: 'it', bcp: 'it-IT', name: 'Italiano' },
    { code: 'pt', bcp: 'pt-BR', name: 'Portugués' },
    { code: 'zh', bcp: 'zh-CN', name: 'Chino' },
    { code: 'ar', bcp: 'ar-SA', name: 'Árabe' },
  ];

  const handleCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setInputText("Analizando imagen...");
      setTranslatedText("");
      setLastDirection('target-to-es'); // Traducimos a español
      const prompt = "Eres un traductor experto. Traduce al español todo el texto legible que encuentres en esta imagen. IMPORTANTE: Devuelve ÚNICAMENTE la traducción directa. NADA DE TEXTO ORIGINAL, nada de saludos tipo 'Aquí tienes', nada de comillas. SOLO EL TEXTO RESULTANTE PURO.";
      const textResult = await processImage(file, prompt);
      
      setInputText("Imagen escaneada con éxito.");
      setTranslatedText(textResult);
    } catch (error) {
      alert("Error al procesar la imagen: " + error.message);
      setInputText("");
    }
  };

  const handleTranslate = async (text, direction = 'es-to-target') => {
    if (!text.trim()) return;
    setIsTranslating(true);
    setLastDirection(direction);
    try {
      const langpair = direction === 'es-to-target' ? `es|${targetLang}` : `${targetLang}|es`;
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langpair}`);
      const data = await res.json();
      if (data && data.responseData && data.responseData.translatedText) {
        setTranslatedText(data.responseData.translatedText);
        // NOTA: No reproducimos automáticamente el audio aquí porque 
        // en iOS Safari la síntesis de voz falla si no se invoca DIRECTAMENTE 
        // desde un evento onClick, lo que puede romper el flujo.
      }
    } catch (err) {
      console.error("Translation error", err);
      alert("Error al traducir. Comprueba tu conexión.");
    } finally {
      setIsTranslating(false);
    }
  };

  const startListening = async (langCode, direction) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Tu navegador no soporta reconocimiento de voz nativo. Si estás en iOS, asegúrate de usar Safari.");
      return;
    }

    // Solicitar permiso de micrófono explícitamente (soluciona bloqueos en iOS)
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }
    } catch (err) {
      alert("Permiso de micrófono denegado. Por favor, permítelo en los ajustes del navegador y recarga la página.");
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort(); // Usar abort en lugar de stop para matar la instancia anterior sin disparar eventos
      } catch (e) {
        console.warn(e);
      }
    }

    const recognition = new SpeechRecognition();
    recognition.lang = langCode;
    recognition.interimResults = true;
    
    recognition.onstart = () => {
      setActiveMic(langCode);
      setInputText('');
      setTranslatedText('');
      currentTextRef.current = '';
    };
    
    recognition.onresult = (event) => {
      let current = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        current += event.results[i][0].transcript;
      }
      currentTextRef.current = current;
      setInputText(current);
      
      // Si el navegador decide que ha terminado la frase por sí solo (silencio prolongado)
      if (event.results[0].isFinal) {
         handleTranslate(current, direction);
         setActiveMic(null);
         recognition.stop();
      }
    };
    
    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      if (event.error === 'not-allowed') {
        alert("El micrófono está bloqueado por el navegador. Revisa los permisos.");
      }
      setActiveMic(null);
    };
    
    recognition.onend = () => {
      setActiveMic(null);
    };

    recognitionRef.current = recognition;
    // Sobrescribimos el stopListening para que tenga acceso al direction y texto actual
    recognitionRef.customStop = () => {
      recognition.stop();
      if (currentTextRef.current) {
        handleTranslate(currentTextRef.current, direction);
      }
    };

    try {
      recognition.start();
    } catch (e) {
      console.error("Microphone start error", e);
    }
  };

  const stopListening = () => {
    if (recognitionRef.customStop) {
      recognitionRef.customStop();
    } else if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const activeTargetBcp = languages.find(l => l.code === targetLang)?.bcp || 'en-US';

  return (
    <div className="p-6 flex flex-col h-full">
      
      {/* Cabecera Responsiva */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h3 className="text-xl font-bold text-white">Traductor Simultáneo</h3>
        <div className="flex gap-2 w-full sm:w-auto">
          <select 
            value={targetLang} 
            onChange={(e) => setTargetLang(e.target.value)}
            className="flex-1 sm:flex-none bg-slate-800 border border-slate-700 text-teal-400 font-bold rounded-lg px-4 py-2 focus:outline-none"
          >
            {languages.map(l => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
            className="bg-slate-800 hover:bg-slate-700 text-teal-400 px-4 py-2 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
            title="Escanear menú o cartel con cámara"
          >
            {isScanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
          </button>
          <input 
            type="file"
            accept="image/*"
            capture="environment"
            ref={fileInputRef}
            onChange={handleCapture}
            className="hidden"
          />
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-4">
        
        {/* Controles de Micrófono (Los Walkie Talkies) */}
        <div className="grid grid-cols-2 gap-4">
           {/* Botón Español */}
           <div className="flex flex-col gap-2">
             {activeMic === 'es-ES' ? (
                <button 
                  onClick={stopListening}
                  className="bg-red-500 hover:bg-red-400 text-white rounded-xl p-4 flex flex-col items-center justify-center gap-2 animate-pulse shadow-lg shadow-red-500/30 transition-all"
                >
                  <StopCircle className="w-8 h-8" />
                  <span className="text-xs font-bold uppercase">Parar</span>
                </button>
             ) : (
                <button 
                  onClick={() => startListening('es-ES', 'es-to-target')}
                  className={`bg-slate-800 hover:bg-slate-700 text-white rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all ${activeMic && activeMic !== 'es-ES' ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <Mic className="w-8 h-8 text-teal-400" />
                  <span className="text-xs font-bold uppercase">Hablar Español</span>
                </button>
             )}
           </div>

           {/* Botón Local */}
           <div className="flex flex-col gap-2">
             {activeMic === activeTargetBcp ? (
                <button 
                  onClick={stopListening}
                  className="bg-red-500 hover:bg-red-400 text-white rounded-xl p-4 flex flex-col items-center justify-center gap-2 animate-pulse shadow-lg shadow-red-500/30 transition-all"
                >
                  <StopCircle className="w-8 h-8" />
                  <span className="text-xs font-bold uppercase">Parar</span>
                </button>
             ) : (
                <button 
                  onClick={() => startListening(activeTargetBcp, 'target-to-es')}
                  className={`bg-slate-800 hover:bg-slate-700 text-white rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all ${activeMic && activeMic !== activeTargetBcp ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <Mic className="w-8 h-8 text-amber-400" />
                  <span className="text-xs font-bold uppercase text-center leading-tight">
                    Escuchar<br/>{languages.find(l => l.code === targetLang)?.name}
                  </span>
                </button>
             )}
           </div>
        </div>

        {/* Pantalla de Resultados */}
        <div className="flex-1 mt-2 flex flex-col gap-2">
          
          {/* Lo que se escuchó */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 min-h-[80px]">
            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Transcripción Original</span>
            <p className="text-slate-300 text-lg">
              {activeMic ? <span className="animate-pulse text-slate-600">Escuchando...</span> : inputText}
            </p>
          </div>

          {/* Traducción Final */}
          <div className="flex-1 bg-teal-950/20 border border-teal-500/20 rounded-xl p-4 flex flex-col min-h-[120px]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-teal-600 uppercase">Traducción</span>
              {translatedText && (
                 <button 
                  onClick={() => {
                    const utterance = new SpeechSynthesisUtterance(translatedText);
                    utterance.lang = lastDirection === 'es-to-target' ? targetLang : 'es';
                    window.speechSynthesis.speak(utterance);
                  }}
                  className="text-teal-400 p-1 hover:bg-teal-900/30 rounded-full"
                 >
                   <Volume2 className="w-5 h-5" />
                 </button>
              )}
            </div>
            <div className="flex-1 text-white text-2xl font-medium">
              {isTranslating ? (
                <div className="flex items-center gap-2 text-teal-500/50">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Traduciendo...</span>
                </div>
              ) : (
                translatedText
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
