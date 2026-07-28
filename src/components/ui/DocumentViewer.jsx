import { X, ExternalLink, DownloadCloud, FileWarning } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../../config/firebase';

export default function DocumentViewer({ url, name, isOpen, onClose }) {
  if (!isOpen || !url) return null;

  const isPdf = url.toLowerCase().includes('.pdf') || name.toLowerCase().endsWith('.pdf');
  const isEmail = url.toLowerCase().includes('.msg') || name.toLowerCase().endsWith('.msg') || name.toLowerCase().endsWith('.eml');
  const isText = url.toLowerCase().includes('.txt') || name.toLowerCase().endsWith('.txt') || url.toLowerCase().includes('email_body');
  const isHtml = url.toLowerCase().includes('.html') || name.toLowerCase().endsWith('.html');
  
  const [safeUrl, setSafeUrl] = useState(url);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [textContent, setTextContent] = useState('');
  const [isLoadingText, setIsLoadingText] = useState(false);

  useEffect(() => {
    const handleStatus = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  useEffect(() => {
    let objectUrl = null;
    async function loadFromCache() {
      if (!navigator.onLine) {
        try {
          const cache = await caches.open('firebase-storage-cache');
          const res = await cache.match(url, { ignoreSearch: true });
          if (res) {
            const blob = await res.blob();
            objectUrl = URL.createObjectURL(blob);
            setSafeUrl(objectUrl);
          }
        } catch (e) {
          console.error("Error cargando desde caché", e);
        }
      } else {
        setSafeUrl(url); 
      }
    }
    loadFromCache();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, isOffline]);

  useEffect(() => {
    if ((isText || isHtml) && safeUrl) {
      setIsLoadingText(true);
      const functions = getFunctions(app, 'europe-west1');
      const readText = httpsCallable(functions, 'readDocumentText');
      
      readText({ url: safeUrl })
        .then(result => {
          if (result.data?.success) {
            setTextContent(result.data.text);
          } else {
            setTextContent("No se pudo cargar el contenido del archivo.");
          }
        })
        .catch(err => {
          console.error("Error fetching text/html content via functions:", err);
          setTextContent("Error de conexión al cargar el documento.");
        })
        .finally(() => setIsLoadingText(false));
    }
  }, [isText, isHtml, safeUrl]);

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/95 backdrop-blur-sm p-2 md:p-8"
      >
        <div className="bg-slate-900 rounded-2xl w-full max-w-6xl h-full md:h-[90vh] flex flex-col shadow-2xl border border-slate-800 relative">
          <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50 rounded-t-2xl">
            <h3 className="text-white font-bold truncate pr-2 max-w-[50%]">{name}</h3>
            <div className="flex items-center gap-2">
              <a 
                href={isOffline ? safeUrl : url} 
                target="_blank" 
                rel="noreferrer"
                download={isOffline || isEmail ? name : undefined}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors text-sm font-bold shadow-lg ${isOffline ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-teal-500 hover:bg-teal-400 text-slate-900'}`}
              >
                {isOffline || isEmail ? <DownloadCloud size={16} /> : <ExternalLink size={16} />}
                <span>{isOffline || isEmail ? 'Descargar' : 'Pantalla Completa'}</span>
              </a>
              <button 
                onClick={onClose}
                className="p-2 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center p-2 md:p-8 overflow-auto relative">
            {isEmail ? (
              <div className="flex flex-col items-center justify-center text-slate-400 max-w-md text-center gap-4">
                <FileWarning size={64} className="text-slate-500" />
                <h3 className="text-xl font-bold text-white">Formato de Correo</h3>
                <p className="text-sm">Los navegadores web no pueden previsualizar archivos de correo electrónico (.msg, .eml). Por favor, descarga el archivo para abrirlo con tu cliente de correo (Outlook, Mail, etc).</p>
                <a href={safeUrl} download={name} className="mt-4 bg-teal-500 hover:bg-teal-400 text-slate-900 px-6 py-3 rounded-xl font-bold transition-colors">
                  Descargar {name}
                </a>
              </div>
            ) : isHtml ? (
              <div className="w-full h-full flex flex-col bg-white rounded-xl overflow-hidden shadow-2xl relative">
                {isLoadingText ? (
                  <div className="flex items-center justify-center h-full text-slate-400 bg-slate-800">
                    Cargando email original...
                  </div>
                ) : (
                  <iframe
                    srcDoc={textContent}
                    sandbox="allow-same-origin allow-popups"
                    title={name}
                    className="w-full h-full border-0"
                  />
                )}
              </div>
            ) : isText ? (
              <div className="w-full h-full flex flex-col bg-slate-800 rounded-xl overflow-hidden shadow-2xl relative">
                {isLoadingText ? (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    Cargando texto...
                  </div>
                ) : (
                  <div className="p-6 md:p-8 overflow-y-auto w-full h-full text-slate-200 bg-slate-900 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                    {textContent}
                  </div>
                )}
              </div>
            ) : isPdf ? (
              <div className="w-full h-full flex flex-col max-w-5xl bg-slate-800 rounded-xl overflow-hidden shadow-2xl relative">
                <div className="bg-slate-700/60 p-2 text-center text-xs text-slate-300 md:hidden flex-shrink-0">
                  Desliza para leer. Para hacer zoom, pulsa <strong>Pantalla Completa</strong> arriba.
                </div>
                <iframe 
                  src={`${safeUrl}${safeUrl.startsWith('blob:') ? '' : '#toolbar=0&navpanes=0&scrollbar=0'}`} 
                  className="w-full flex-1 bg-white" 
                  title={name} 
                />
              </div>
            ) : (
              <TransformWrapper initialScale={1} minScale={0.5} maxScale={8} centerOnInit={true}>
                {({ zoomIn, zoomOut, resetTransform }) => (
                  <div className="w-full h-full flex flex-col items-center justify-center relative">
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md p-2 rounded-2xl border border-slate-700/50 z-50 shadow-xl">
                      <button onClick={() => zoomOut()} className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-xl transition-colors font-bold text-xl">-</button>
                      <button onClick={() => resetTransform()} className="p-2 px-4 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-xl transition-colors font-semibold">Reset</button>
                      <button onClick={() => zoomIn()} className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-xl transition-colors font-bold text-xl">+</button>
                    </div>
                    <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <img 
                        src={safeUrl} 
                        alt={name} 
                        className="max-w-full max-h-full object-contain rounded-xl shadow-2xl pointer-events-auto" 
                      />
                    </TransformComponent>
                  </div>
                )}
              </TransformWrapper>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
