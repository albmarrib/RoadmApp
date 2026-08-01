import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import { useItineraryStore } from '../../../store/itineraryStore';
import { format } from 'date-fns';
import L from 'leaflet';
import NodeModal from '../../itinerary/components/NodeModal';
import { Navigation, Loader2, Navigation2, Layers, Bed, Car, Camera, Key, Check, Map as MapIcon, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  html: `<div class="w-6 h-6 bg-blue-500 rounded-full border-4 border-white shadow-[0_0_15px_rgba(59,130,246,0.8)] relative animate-pulse"><div class="absolute inset-0 rounded-full bg-blue-400 opacity-50 animate-ping"></div></div>`,
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const MapEventsHandler = ({ tripId }) => {
  useMapEvents({
    moveend: (e) => {
      if (!tripId) return;
      const map = e.target;
      const center = map.getCenter();
      localStorage.setItem(`map_state_${tripId}`, JSON.stringify({
        center: [center.lat, center.lng],
        zoom: map.getZoom()
      }));
    }
  });
  return null;
};

function LocationHandler({ setUserPos, setHasPermissionError }) {
  const map = useMap();
  useEffect(() => {
    map.locate({ setView: false, watch: true, enableHighAccuracy: true });
    const onLocationFound = (e) => { setUserPos([e.latlng.lat, e.latlng.lng]); setHasPermissionError(false); };
    const onLocationError = (e) => {
      console.warn("Location error:", e.message);
      if (e.code === 1) setHasPermissionError(true);
    };
    map.on('locationfound', onLocationFound);
    map.on('locationerror', onLocationError);
    return () => { map.off('locationfound', onLocationFound); map.off('locationerror', onLocationError); map.stopLocate(); };
  }, [map, setUserPos, setHasPermissionError]);
  return null;
}

function CenterUserButton({ userPos }) {
  const map = useMap();
  if (!userPos) return null;
  return (
    <button onClick={() => map.flyTo(userPos, 15)} className="absolute bottom-6 right-6 z-[400] bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-full shadow-2xl transition-all border border-blue-400/30">
      <Navigation2 size={24} className="fill-current" />
    </button>
  );
}

function NodePopupContent({ node, userPos, onEdit }) {
  const [routeInfo, setRouteInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showNavOptions, setShowNavOptions] = useState(false);

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

      {showNavOptions ? (
        <div className="mt-3 flex flex-col gap-1.5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 text-center">Abrir con...</p>
          <a 
            href={`https://www.google.com/maps/dir/?api=1&destination=${node.location.lat},${node.location.lng}`}
            target="_blank" rel="noreferrer"
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 border border-slate-200"
          >
            <MapIcon className="w-4 h-4 text-blue-500" /> Google Maps
          </a>
          <a 
            href={`http://maps.apple.com/?daddr=${node.location.lat},${node.location.lng}`}
            target="_blank" rel="noreferrer"
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 border border-slate-200"
          >
            <Navigation className="w-4 h-4 text-slate-900" /> Apple Maps
          </a>
          <a 
            href={`geo:0,0?q=${node.location.lat},${node.location.lng}`}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 border border-slate-200"
          >
            <Compass className="w-4 h-4 text-teal-600" /> Waze / Otra app
          </a>
          <button 
            onClick={() => setShowNavOptions(false)} 
            className="w-full mt-1 text-slate-400 text-xs font-bold hover:text-slate-600 py-1"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <div className="flex gap-2 mt-3">
          <button 
            onClick={() => setShowNavOptions(true)}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-center py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-1"
          >
            <Navigation className="w-4 h-4" /> Ir
          </button>
          <button onClick={() => onEdit(node)} className="flex-1 bg-teal-500 hover:bg-teal-600 text-white py-2 rounded-lg text-sm font-bold transition-colors">
            Editar
          </button>
        </div>
      )}
    </div>
  );
}

export default function MapPage() {
  const { trip } = useOutletContext();
  const { nodes, subscribeToNodes } = useItineraryStore();
  const [filters, setFilters] = useState({ accommodation: true, drive: true, activity: true, car_rental: true });
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
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
      const timeA = a.startTime && typeof a.startTime.toMillis === 'function' ? a.startTime.toMillis() : 
                   (a.startTime && typeof a.startTime.getTime === 'function' ? a.startTime.getTime() : 0);
      const timeB = b.startTime && typeof b.startTime.toMillis === 'function' ? b.startTime.toMillis() : 
                   (b.startTime && typeof b.startTime.getTime === 'function' ? b.startTime.getTime() : 0);
      return timeA - timeB;
    });

  const polylinePositions = nodesWithLocation.map(node => [parseFloat(node.location.lat), parseFloat(node.location.lng)]);
  
  const savedStateStr = localStorage.getItem(`map_state_${trip?.id}`);
  const savedState = savedStateStr ? JSON.parse(savedStateStr) : null;
  const defaultCenter = savedState?.center || [-41.2865, 174.7762]; 
  const defaultZoom = savedState?.zoom || 6;

  const handleEditNode = (node) => {
    setSelectedNode(node);
    setIsModalOpen(true);
  };

  return (
    <div className="h-[calc(100vh-12rem)] min-h-[500px] w-full rounded-3xl overflow-hidden border border-slate-700 shadow-2xl relative">
      {/* Botón y Menú Flotante de Filtros */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col items-end">
        <button 
          onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
          className={`p-3 rounded-full shadow-2xl transition-all border ${isFilterMenuOpen ? 'bg-teal-500 text-white border-teal-400' : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:bg-slate-800'} backdrop-blur-md`}
          title="Capas del mapa"
        >
          <Layers size={24} />
        </button>

        <AnimatePresence>
          {isFilterMenuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -10, transformOrigin: 'top right' }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ duration: 0.2 }}
              className="mt-3 bg-slate-900/90 backdrop-blur-xl border border-slate-700 p-2 rounded-2xl shadow-2xl flex flex-col gap-1 min-w-[200px]"
            >
              <div className="px-3 py-2 border-b border-slate-700/50 mb-1">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ver en mapa</h3>
              </div>
              {[
                { id: 'accommodation', label: 'Hoteles', color: 'text-orange-500', bg: 'bg-orange-500/10', icon: Bed },
                { id: 'drive', label: 'Rutas', color: 'text-purple-500', bg: 'bg-purple-500/10', icon: Car },
                { id: 'activity', label: 'Actividades', color: 'text-teal-500', bg: 'bg-teal-500/10', icon: Camera },
                { id: 'car_rental', label: 'Alquileres', color: 'text-sky-500', bg: 'bg-sky-500/10', icon: Key }
              ].map(f => {
                const Icon = f.icon;
                const isActive = filters[f.id];
                return (
                  <button 
                    key={f.id} 
                    onClick={() => toggleFilter(f.id)}
                    className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl transition-all ${isActive ? 'bg-slate-800' : 'hover:bg-slate-800/50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${isActive ? f.bg : 'bg-slate-800'}`}>
                        <Icon className={`w-4 h-4 ${isActive ? f.color : 'text-slate-500'}`} />
                      </div>
                      <span className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-slate-400'}`}>{f.label}</span>
                    </div>
                    {isActive && <Check className={`w-4 h-4 ${f.color}`} />}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <MapContainer center={defaultCenter} zoom={defaultZoom} style={{ height: '100%', width: '100%', zIndex: 0 }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapEventsHandler tripId={trip?.id} />
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
          <React.Fragment key={node.id}>
            <Marker position={[node.location.lat, node.location.lng]} icon={getCustomIcon(node.type)}>
              <Popup className="custom-popup" closeButton={false}>
                <NodePopupContent node={node} userPos={userPos} onEdit={handleEditNode} />
              </Popup>
            </Marker>
            
            {node.dropoffLocation && node.dropoffLocation.lat && node.dropoffLocation.lng && (
              <Marker position={[node.dropoffLocation.lat, node.dropoffLocation.lng]} icon={getCustomIcon(node.type)}>
                <Popup className="custom-popup" closeButton={false}>
                  <NodePopupContent node={{...node, title: `${node.title} (Devolución)`}} userPos={userPos} onEdit={handleEditNode} />
                </Popup>
              </Marker>
            )}
          </React.Fragment>
        ))}

        {polylinePositions.length > 1 && (
          <Polyline positions={polylinePositions} color="#2dd4bf" weight={3} opacity={0.7} dashArray="10, 10" />
        )}
      </MapContainer>

      <NodeModal tripId={trip?.id} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} editingNode={selectedNode} />
    </div>
  );
}
