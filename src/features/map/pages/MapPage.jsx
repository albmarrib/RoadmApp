import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { useItineraryStore } from '../../../store/itineraryStore';
import { format } from 'date-fns';
import L from 'leaflet';
import NodeModal from '../../itinerary/components/NodeModal';
import { Navigation, Loader2, Navigation2 } from 'lucide-react';

const getCustomIcon = (type) => {
  const baseClass = "w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white text-white";
  let htmlStr = '';
  switch (type) {
    case 'flight': htmlStr = `<div class="${baseClass} bg-blue-500"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.2-1.1.6L2.5 8l6.5 4.5L5 16.5l-3.2-1.2-1.3 1.2 3.5 3.5 1.2 1.3 1.2-3.2L11 15l4.5 6.5 1.2-1.2c.4-.2.7-.6.6-1.1z"/></svg></div>`; break;
    case 'accommodation': htmlStr = `<div class="${baseClass} bg-orange-500"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 22v-6.57"/><path d="M12 11h.01"/><path d="M12 7h.01"/><path d="M14 15.43V22"/><path d="M15 16a5 5 0 0 0-6 0"/><path d="M16 11h.01"/><path d="M16 7h.01"/><path d="M8 11h.01"/><path d="M8 7h.01"/><rect x="4" y="2" width="16" height="20" rx="2"/></svg></div>`; break;
    case 'drive': htmlStr = `<div class="${baseClass} bg-purple-500"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg></div>`; break;
    default: htmlStr = `<div class="${baseClass} bg-teal-500"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`;
  }
  return L.divIcon({ html: htmlStr, className: '', iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -16] });
};

const userIcon = L.divIcon({
  html: `<div class="w-6 h-6 bg-blue-500 rounded-full border-4 border-white shadow-xl shadow-blue-500/50 animate-pulse"></div>`,
  className: '', iconSize: [24, 24], iconAnchor: [12, 12], popupAnchor: [0, -12]
});

// Componente para manejar la geolocalización
function LocationHandler({ setUserPos, setHasPermissionError }) {
  const map = useMap();
  useEffect(() => {
    map.locate({ watch: true, enableHighAccuracy: true });
    
    map.on('locationfound', (e) => setUserPos(e.latlng));
    map.on('locationerror', () => setHasPermissionError(true));

    return () => {
      map.off('locationfound');
      map.off('locationerror');
      map.stopLocate();
    };
  }, [map, setUserPos, setHasPermissionError]);
  return null;
}

// Botón para centrar mapa en el usuario
function CenterUserButton({ userPos }) {
  const map = useMap();
  return (
    <button 
      onClick={() => userPos && map.flyTo(userPos, 14)}
      disabled={!userPos}
      className={`absolute bottom-6 right-6 z-[400] p-3 rounded-full shadow-2xl transition-all ${userPos ? 'bg-blue-500 text-white hover:bg-blue-400 hover:scale-110' : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}
      title="Centrar en mi ubicación"
    >
      <Navigation2 size={24} />
    </button>
  );
}

// Contenido del Popup con cálculo OSRM
function NodePopupContent({ node, userPos, onEdit }) {
  const [routeInfo, setRouteInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userPos && node.location) {
      setLoading(true);
      const url = `https://router.project-osrm.org/route/v1/driving/${userPos.lng},${userPos.lat};${node.location.lng},${node.location.lat}?overview=false`;
      fetch(url)
        .then(res => res.json())
        .then(data => {
          if (data.code === 'Ok' && data.routes.length > 0) {
            const r = data.routes[0];
            setRouteInfo({ distKm: (r.distance / 1000).toFixed(1), timeMin: Math.round(r.duration / 60) });
          }
        }).catch(console.error).finally(() => setLoading(false));
    }
  }, [userPos, node.location]);

  return (
    <div className="text-slate-900 font-sans min-w-[220px]">
      <h3 className="font-bold text-base mb-1">{node.title}</h3>
      <p className="text-xs text-slate-500 mb-2">
        {node.startTime ? format(node.startTime.toDate(), 'dd/MM/yyyy HH:mm') : ''}
      </p>
      
      {userPos && (
        <div className="mb-3 bg-slate-100 p-2 rounded-lg border border-slate-200">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Desde tu ubicación</p>
          {loading ? (
            <div className="flex items-center gap-1 text-xs text-slate-500"><Loader2 className="w-3 h-3 animate-spin"/> Calculando...</div>
          ) : routeInfo ? (
            <p className="text-sm font-semibold text-slate-800">
              🚗 {routeInfo.distKm} km • {routeInfo.timeMin} min
            </p>
          ) : (
            <p className="text-xs text-slate-400">Ruta no disponible</p>
          )}
        </div>
      )}

      <div className="flex gap-2 mt-3">
        <a 
          href={`https://www.google.com/maps/dir/?api=1&destination=${node.location.lat},${node.location.lng}`}
          target="_blank" rel="noreferrer"
          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-center py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-1"
        >
          <Navigation className="w-4 h-4" /> Ir
        </a>
        <button onClick={() => onEdit(node)} className="flex-1 bg-teal-500 hover:bg-teal-600 text-white py-2 rounded-lg text-sm font-bold transition-colors">
          Editar
        </button>
      </div>
    </div>
  );
}

export default function MapPage() {
  const { trip } = useOutletContext();
  const { nodes, subscribeToNodes } = useItineraryStore();
  const [filters, setFilters] = useState({ accommodation: true, drive: true, activity: true });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  
  const [userPos, setUserPos] = useState(null);
  const [hasPermissionError, setHasPermissionError] = useState(false);

  useEffect(() => {
    if (trip?.id) {
      const unsubscribe = subscribeToNodes(trip.id);
      return () => unsubscribe && unsubscribe();
    }
  }, [trip?.id, subscribeToNodes]);

  const toggleFilter = (type) => setFilters(prev => ({ ...prev, [type]: !prev[type] }));

  const nodesWithLocation = nodes
    .filter(node => node.type !== 'flight' && node.location && node.location.lat && node.location.lng && filters[node.type])
    .sort((a, b) => {
      if (!a.startTime || !b.startTime) return 0;
      return a.startTime.toMillis() - b.startTime.toMillis();
    });

  const polylinePositions = nodesWithLocation.map(node => [node.location.lat, node.location.lng]);
  const defaultCenter = [-41.2865, 174.7762]; 

  const handleEditNode = (node) => {
    setSelectedNode(node);
    setIsModalOpen(true);
  };

  return (
    <div className="h-[calc(100vh-12rem)] w-full rounded-3xl overflow-hidden border border-slate-700 shadow-2xl relative">
      <div className="absolute top-4 left-4 right-4 z-[400] flex flex-wrap gap-2 pointer-events-none">
        <div className="pointer-events-auto flex gap-2 overflow-x-auto hide-scrollbar w-full p-1">
          <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-700 mr-2 shadow-lg shrink-0">
            <h2 className="text-sm font-bold text-teal-400">Ver en mapa:</h2>
          </div>
          {[
            { id: 'accommodation', label: 'Hoteles', color: 'bg-orange-500' },
            { id: 'drive', label: 'Rutas', color: 'bg-purple-500' },
            { id: 'activity', label: 'Actividades', color: 'bg-teal-500' }
          ].map(f => (
            <button key={f.id} onClick={() => toggleFilter(f.id)} className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border transition-all shadow-lg ${filters[f.id] ? f.color + ' text-white border-transparent' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <MapContainer center={defaultCenter} zoom={6} style={{ height: '100%', width: '100%', zIndex: 0 }}>
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        <LocationHandler setUserPos={setUserPos} setHasPermissionError={setHasPermissionError} />
        <CenterUserButton userPos={userPos} />

        {userPos && (
          <Marker position={userPos} icon={userIcon}>
            <Popup className="custom-popup" closeButton={false}>
              <div className="text-slate-900 font-bold p-1">Tú estás aquí 📍</div>
            </Popup>
          </Marker>
        )}

        {nodesWithLocation.map((node) => (
          <Marker key={node.id} position={[node.location.lat, node.location.lng]} icon={getCustomIcon(node.type)}>
            <Popup className="custom-popup" closeButton={false}>
              <NodePopupContent node={node} userPos={userPos} onEdit={handleEditNode} />
            </Popup>
          </Marker>
        ))}

        {polylinePositions.length > 1 && (
          <Polyline positions={polylinePositions} color="#2dd4bf" weight={3} opacity={0.7} dashArray="10, 10" />
        )}
      </MapContainer>

      <NodeModal tripId={trip?.id} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} editingNode={selectedNode} />
    </div>
  );
}
