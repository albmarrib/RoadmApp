import { Outlet, useParams, Link, useLocation } from 'react-router-dom';
import { Map, CalendarDays, Luggage, Wallet, ArrowLeft, FileText, CloudDownload, Loader2, Settings } from 'lucide-react';
import { useTripStore } from '../store/tripStore';
import { useAuthStore } from '../store/authStore';
import { useEffect, useState } from 'react';
import TripSettingsModal from '../features/trips/components/TripSettingsModal';

export default function TripLayout() {
  const { tripId } = useParams();
  const { trips, fetchMyTrips, isLoading } = useTripStore();
  const { user } = useAuthStore();
  const location = useLocation();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if (trips.length === 0 && user?.uid) {
      fetchMyTrips(user.uid);
    }
  }, [trips.length, user?.uid, fetchMyTrips]);

  const trip = trips.find(t => t.id === tripId);

  const handleSyncOffline = async () => {
    if (!window.caches) {
      alert("Tu navegador no soporta almacenamiento offline avanzado.");
      return;
    }
    
    setIsSyncing(true);
    try {
      const cache = await caches.open('firebase-storage-cache');
      
      const { collection, query, getDocs } = await import('firebase/firestore');
      const { db } = await import('../config/firebase');
      
      const qNodes = query(collection(db, 'trips', trip.id, 'itineraryNodes'));
      const nodesSnap = await getDocs(qNodes);
      
      const qDocs = query(collection(db, 'trips', trip.id, 'documents'));
      const docsSnap = await getDocs(qDocs);
      
      const qPacking = query(collection(db, 'trips', trip.id, 'packing'));
      const packingSnap = await getDocs(qPacking);
      
      let urls = [];
      nodesSnap.forEach(doc => {
        if (doc.data().attachments) {
          doc.data().attachments.forEach(att => urls.push(att.url));
        }
      });
      docsSnap.forEach(doc => {
        if (doc.data().url) urls.push(doc.data().url);
      });
      packingSnap.forEach(doc => {
        if (doc.data().photoUrl) urls.push(doc.data().photoUrl);
      });
      
      urls = [...new Set(urls)].filter(Boolean);
      
      let successCount = 0;
      let failedUrls = [];
      for (const url of urls) {
        try {
          // Intentar fetch directo
          const res = await fetch(url);
          if (res.ok) {
            const blob = await res.blob();
            // Crear una nueva respuesta con el blob para asegurar que no es opaca
            const cacheRes = new Response(blob, {
              headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/octet-stream' }
            });
            await cache.put(url, cacheRes);
            successCount++;
          } else {
            failedUrls.push(url);
          }
        } catch (e) {
          console.error("Error cacheando", url, e);
          failedUrls.push(url);
        }
      }
      
      if (failedUrls.length > 0) {
        alert(`Se han sincronizado ${successCount} archivos (documentos y fotos).\nHubo problemas con ${failedUrls.length} archivos (posible error de permisos o CORS en la nube).`);
      } else {
        alert(`¡Todo listo! Se han sincronizado y guardado ${successCount} archivos en tu dispositivo para uso sin conexión.\n\nRecuerda volver a usar este botón si añades nuevos archivos o fotos de maletas más adelante.`);
      }
    } catch (error) {
      console.error(error);
      alert('Hubo un problema sincronizando los documentos.');
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading && trips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white">
        <div className="animate-pulse font-medium text-lg text-teal-400">Cargando datos del viaje...</div>
      </div>
    );
  }

  if (!trip && trips.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white gap-4">
        <h2 className="text-2xl font-bold">Viaje no encontrado</h2>
        <p className="text-slate-400">El viaje no existe o no tienes permisos para verlo.</p>
        <Link to="/" className="bg-teal-500 hover:bg-teal-400 text-slate-950 px-6 py-2 rounded-xl font-bold transition-colors">Volver al Dashboard</Link>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white">
        <div className="animate-pulse font-medium text-lg text-teal-400">Sincronizando viaje...</div>
      </div>
    );
  }

  const tabs = [
    { id: 'itinerary', label: 'Itinerario', icon: CalendarDays, path: `/trip/${tripId}/itinerary` },
    { id: 'map', label: 'Mapa', icon: Map, path: `/trip/${tripId}/map` },
    { id: 'documents', label: 'Docs', icon: FileText, path: `/trip/${tripId}/documents` },
    { id: 'packing', label: 'Equipaje', icon: Luggage, path: `/trip/${tripId}/packing` },
    { id: 'expenses', label: 'Gastos', icon: Wallet, path: `/trip/${tripId}/expenses` },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center h-16 gap-4">
            <Link to="/" className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-white truncate">{trip.title}</h1>
              <p className="text-xs text-teal-400 truncate">{trip.destination}</p>
            </div>

            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded-full transition-colors"
              title="Configuración del Viaje y Contactos"
            >
              <Settings className="w-5 h-5" />
            </button>

            <button 
              onClick={handleSyncOffline}
              disabled={isSyncing}
              className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
              title="Guardar documentos para usarlos sin Internet"
            >
              {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudDownload className="w-4 h-4" />}
              <span className="hidden sm:inline">{isSyncing ? 'Guardando...' : 'Sincronizar Offline'}</span>
            </button>
          </div>
          
          <div className="hidden md:flex overflow-x-auto hide-scrollbar gap-6 mt-2">
            {tabs.map((tab) => {
              const isActive = location.pathname.includes(tab.path);
              return (
                <Link
                  key={tab.id}
                  to={tab.path}
                  className={`flex flex-col items-center gap-1 pb-3 px-1 border-b-2 transition-colors whitespace-nowrap min-w-16 ${
                    isActive ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* Contenido Dinámico de la Pestaña */}
      <main className="max-w-5xl mx-auto px-4 py-8 mb-20 md:mb-0">
        <Outlet context={{ trip }} /> 
      </main>

      {/* Bottom Navigation (Solo Móvil) */}
      <nav 
        className="md:hidden fixed bottom-0 left-0 w-full bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 z-[100]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-around h-16 px-2">
          {tabs.map((tab) => {
            const isActive = location.pathname.includes(tab.path);
            return (
              <Link
                key={tab.id}
                to={tab.path}
                className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all ${
                  isActive ? 'text-teal-400 scale-110' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <tab.icon className={`w-6 h-6 ${isActive ? 'fill-teal-500/20' : ''}`} />
                <span className="text-[10px] font-bold">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <TripSettingsModal 
        trip={trip} 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
}
