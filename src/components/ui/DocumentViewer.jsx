import { X, ExternalLink, DownloadCloud, FileWarning } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function DocumentViewer({ url, name, isOpen, onClose }) {
  if (!isOpen || !url) return null;

  const isPdf = url.toLowerCase().includes('.pdf') || name.toLowerCase().endsWith('.pdf');
  const isEmail = url.toLowerCase().includes('.msg') || name.toLowerCase().endsWith('.msg') || name.toLowerCase().endsWith('.eml');
  
  const [safeUrl, setSafeUrl] = useState(url);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

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
            <h3 className="text-white font-bold truncate pr-4">{name}</h3>
            <div className="flex items-center gap-2">
              <a 
                href={isOffline ? safeUrl : url} 
                target="_blank" 
                rel="noreferrer"
                download={isOffline || isEmail ? name : undefined}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors text-sm font-semibold ${isOffline ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'}`}
              >
                {isOffline || isEmail ? <DownloadCloud size={16} /> : <ExternalLink size={16} />}
                <span className="hidden sm:inline">{isOffline || isEmail ? 'Descargar Archivo' : 'Abrir original'}</span>
              </a>
              <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X size={24} />
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
            ) : isPdf ? (
              <iframe 
                src={`${safeUrl}${safeUrl.startsWith('blob:') ? '' : '#toolbar=0&navpanes=0&scrollbar=0'}`} 
                className="w-full h-full max-w-5xl rounded-xl bg-white shadow-2xl" 
                title={name} 
              />
            ) : (
              <img 
                src={safeUrl} 
                alt={name} 
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" 
              />
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
