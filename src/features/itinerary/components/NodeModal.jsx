import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UploadCloud, Plane, Hotel, Car, MapPin, Trash2, File as FileIcon, XCircle, Search, CarFront, Phone, MessageCircle, Mail, User, Route } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { useItineraryStore } from '../../../store/itineraryStore';
import { format } from 'date-fns';
import DocumentViewer from '../../../components/ui/DocumentViewer';

export default function NodeModal({ tripId, isOpen, onClose, editingNode = null }) {
  const { addNode, updateNode, deleteNode } = useItineraryStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    type: 'activity',
    title: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    cost: '',
    currency: 'EUR',
    notes: '',
    externalUrl: '',
    contactPhone: '',
    contactWhatsapp: '',
    contactEmail: '',
    contactName: '',
    routeOrigin: '',
    routeDestination: '',
    routeMode: 'driving',
    routeDistanceKm: '',
    fuelConsumption: '',
    fuelPrice: ''
  });
  const [newFiles, setNewFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [viewerUrl, setViewerUrl] = useState(null);
  const [viewerName, setViewerName] = useState('');
  
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);

  useEffect(() => {
    if (isOpen && editingNode) {
      const st = editingNode.startTime?.toDate();
      const et = editingNode.endTime?.toDate();
      setFormData({
        type: editingNode.type || 'activity',
        title: editingNode.title || '',
        startDate: st ? format(st, 'yyyy-MM-dd') : '',
        startTime: st ? format(st, 'HH:mm') : '',
        endDate: et ? format(et, 'yyyy-MM-dd') : '',
        endTime: et ? format(et, 'HH:mm') : '',
        cost: editingNode.cost || '',
        currency: editingNode.currency || 'EUR',
        notes: editingNode.notes || '',
        externalUrl: editingNode.externalUrl || '',
        contactPhone: editingNode.contactPhone || '',
        contactWhatsapp: editingNode.contactWhatsapp || '',
        contactEmail: editingNode.contactEmail || '',
        contactName: editingNode.contactName || '',
        routeOrigin: editingNode.routeOrigin || '',
        routeDestination: editingNode.routeDestination || '',
        routeMode: editingNode.routeMode || 'driving',
        routeDistanceKm: editingNode.routeDistanceKm || '',
        fuelConsumption: editingNode.fuelConsumption || '',
        fuelPrice: editingNode.fuelPrice || ''
      });
      setExistingAttachments(editingNode.attachments || []);
      setNewFiles([]);
      if (editingNode.location) {
        setSelectedLocation(editingNode.location);
        setLocationQuery(editingNode.location.address || '');
      } else {
        setSelectedLocation(null);
        setLocationQuery('');
      }
    } else if (isOpen && !editingNode) {
      setFormData({
        type: 'activity', title: '', startDate: '', startTime: '', endDate: '', endTime: '', 
        cost: '', currency: 'EUR', notes: '', externalUrl: '',
        contactPhone: '', contactWhatsapp: '', contactEmail: '', contactName: '',
        routeOrigin: '', routeDestination: '', routeMode: 'driving', routeDistanceKm: '', fuelConsumption: '', fuelPrice: ''
      });
      setExistingAttachments([]);
      setNewFiles([]);
      setSelectedLocation(null);
      setLocationQuery('');
    }
  }, [isOpen, editingNode]);

  if (!isOpen) return null;

  const searchLocation = async () => {
    if (!locationQuery.trim()) return;
    setIsSearchingLocation(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationQuery)}`);
      const data = await res.json();
      setLocationResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const calculateOSRM = async () => {
    if (!formData.routeOrigin || !formData.routeDestination) {
      alert("Por favor, introduce Origen y Destino.");
      return;
    }
    setIsSearchingLocation(true);
    try {
      // 1. Geocode Origin
      const resOrig = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.routeOrigin)}`);
      const dataOrig = await resOrig.json();
      if (dataOrig.length === 0) throw new Error("No se encontró el origen.");
      const origCoords = `${dataOrig[0].lon},${dataOrig[0].lat}`;
      
      // Esperar 1s por la limitación de Nominatim (1 req/sec)
      await new Promise(r => setTimeout(r, 1000));

      // 2. Geocode Destination
      const resDest = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.routeDestination)}`);
      const dataDest = await resDest.json();
      if (dataDest.length === 0) throw new Error("No se encontró el destino.");
      const destCoords = `${dataDest[0].lon},${dataDest[0].lat}`;

      // 3. OSRM Profile
      let profile = 'driving';
      if (formData.routeMode === 'walking') profile = 'foot';
      if (formData.routeMode === 'cycling') profile = 'bike';
      // Kayak no existe en OSRM, usamos foot como aproximado para distancia recta o dejamos vacío
      
      const osrmUrl = `https://router.project-osrm.org/route/v1/${profile}/${origCoords};${destCoords}?overview=false`;
      const resOsrm = await fetch(osrmUrl);
      const dataOsrm = await resOsrm.json();
      
      if (dataOsrm.routes && dataOsrm.routes.length > 0) {
        const distanceKm = (dataOsrm.routes[0].distance / 1000).toFixed(1);
        
        let newCost = formData.cost;
        if (formData.routeMode === 'driving' && formData.fuelConsumption && formData.fuelPrice) {
          const cost = (distanceKm * (parseFloat(formData.fuelConsumption) / 100)) * parseFloat(formData.fuelPrice);
          newCost = cost.toFixed(2);
        }
        
        setFormData(prev => ({
          ...prev,
          routeDistanceKm: distanceKm,
          cost: newCost || prev.cost
        }));
      } else {
        throw new Error("No se pudo calcular la ruta en OSRM.");
      }
    } catch (err) {
      alert("Error calculando ruta: " + err.message);
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const selectLocationResult = (res) => {
    setSelectedLocation({
      lat: parseFloat(res.lat),
      lng: parseFloat(res.lon),
      address: res.display_name
    });
    setLocationQuery(res.display_name);
    setLocationResults([]);
  };

  const handleFileChange = (e) => {
    const validFiles = [];
    Array.from(e.target.files).forEach(file => {
      const isFakeDriveFile = 
        file.name.endsWith('.gdoc') || file.name.endsWith('.desktop') || 
        file.name.endsWith('.url') || file.name.endsWith('.gsheet') ||
        file.size === 0 || (!file.name.includes('.') && file.type === '');
        
      if (isFakeDriveFile) {
        alert(`Error con "${file.name}": El sistema nos indica que este archivo está vacío o es un "enlace de nube" (como Google Drive), no el documento físico.\n\nPor favor, descarga el archivo directamente desde tu navegador a tu dispositivo e inténtalo de nuevo para asegurar que esté disponible sin conexión.`);
        return;
      }
      validFiles.push(file);
    });
    if (validFiles.length > 0) {
      setNewFiles([...newFiles, ...validFiles]);
    }
  };

  const removeNewFile = (index) => setNewFiles(newFiles.filter((_, i) => i !== index));
  const removeExistingAttachment = (index) => setExistingAttachments(existingAttachments.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const startDateTimeStr = `${formData.startDate}T${formData.startTime || '00:00'}:00`;
      let endDateTimeStr = null;
      if (formData.endDate) {
        endDateTimeStr = `${formData.endDate}T${formData.endTime || '00:00'}:00`;
      }
      
      const nodeData = {
        type: formData.type,
        title: formData.title,
        startTime: Timestamp.fromDate(new Date(startDateTimeStr)),
        endTime: endDateTimeStr ? Timestamp.fromDate(new Date(endDateTimeStr)) : null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        currency: formData.currency,
        notes: formData.notes,
        externalUrl: formData.externalUrl,
        location: selectedLocation,
        // Contactos
        contactPhone: formData.contactPhone,
        contactWhatsapp: formData.contactWhatsapp,
        contactEmail: formData.contactEmail,
        contactName: formData.contactName,
        // Rutas y coches
        routeOrigin: formData.routeOrigin,
        routeDestination: formData.routeDestination,
        routeMode: formData.routeMode,
        routeDistanceKm: formData.routeDistanceKm,
        fuelConsumption: formData.fuelConsumption,
        fuelPrice: formData.fuelPrice
      };

      if (editingNode) {
        await updateNode(tripId, editingNode.id, nodeData, newFiles, existingAttachments);
      } else {
        await addNode(tripId, nodeData, newFiles);
      }
      
      onClose();
    } catch (err) {
      alert("Error al guardar: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (confirm("¿Seguro que deseas eliminar este paso de forma permanente?")) {
      setIsSubmitting(true);
      try {
        await deleteNode(tripId, editingNode.id);
        onClose();
      } catch (err) {
        alert("Error al eliminar: " + err.message);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        ></motion.div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto hide-scrollbar"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">{editingNode ? 'Editar Paso' : 'Añadir Nuevo Paso'}</h2>
            
            <div className="flex items-center gap-2">
              {editingNode && (
                <button type="button" onClick={handleDelete} className="text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500 p-2 rounded-full transition-colors" title="Eliminar paso">
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              <button onClick={onClose} className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tipo */}
            <div className="grid grid-cols-5 gap-2">
              {[
                { id: 'flight', icon: Plane, label: 'Vuelo' },
                { id: 'accommodation', icon: Hotel, label: 'Hotel' },
                { id: 'car_rental', icon: CarFront, label: 'Alquiler' },
                { id: 'drive', icon: Route, label: 'Ruta' },
                { id: 'activity', icon: MapPin, label: 'Actividad' }
              ].map(t => (
                <button
                  key={t.id} type="button"
                  onClick={() => setFormData({...formData, type: t.id})}
                  className={`flex flex-col items-center justify-center py-3 rounded-2xl border transition-all ${formData.type === t.id ? 'bg-teal-500/20 border-teal-500 text-teal-400' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800'}`}
                >
                  <t.icon className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-semibold text-center leading-tight">{t.label}</span>
                </button>
              ))}
            </div>

            {/* Titulo */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Título / Descripción breve</label>
              <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500" placeholder="Ej. Vuelo a Auckland, Cena en..." />
            </div>

            {/* Fechas Inicio */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  {formData.type === 'accommodation' ? 'Check-in' : formData.type === 'car_rental' ? 'Recogida (Día)' : 'Día (Obligatorio)'}
                </label>
                <input required type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  {formData.type === 'accommodation' ? 'Hora entrada' : formData.type === 'car_rental' ? 'Recogida (Hora)' : 'Hora de inicio'}
                </label>
                <input type="time" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500" />
              </div>
            </div>

            {/* Fechas Fin (Hotel, Coche, Vuelos...) */}
            {(formData.type === 'accommodation' || formData.type === 'car_rental' || formData.type === 'flight') && (
              <div className="grid grid-cols-2 gap-4 bg-slate-800/20 p-3 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    {formData.type === 'accommodation' ? 'Check-out' : formData.type === 'car_rental' ? 'Devolución (Día)' : 'Día Fin'}
                  </label>
                  <input type={formData.type === 'accommodation' ? "date" : "date"} required={formData.type === 'accommodation'} value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    {formData.type === 'accommodation' ? 'Hora salida' : formData.type === 'car_rental' ? 'Devolución (Hora)' : 'Hora llegada'}
                  </label>
                  <input type="time" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500" />
                </div>
              </div>
            )}

            {/* Rutas */}
            {formData.type === 'drive' && (
              <div className="bg-indigo-900/20 p-4 rounded-2xl border border-indigo-500/30 space-y-4">
                <h3 className="text-sm font-medium text-indigo-400">Configuración de Ruta</h3>
                
                <div className="flex gap-2 mb-2">
                  {['driving', 'walking', 'cycling', 'kayak'].map(mode => (
                    <button 
                      key={mode} type="button"
                      onClick={() => setFormData({...formData, routeMode: mode})}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg border ${formData.routeMode === mode ? 'bg-indigo-500 text-slate-900 border-indigo-500' : 'bg-slate-900 text-slate-400 border-slate-700 hover:bg-slate-800'}`}
                    >
                      {mode === 'driving' ? 'Coche' : mode === 'walking' ? 'Pie' : mode === 'cycling' ? 'Bici' : 'Kayak'}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Origen</label>
                    <input type="text" value={formData.routeOrigin} onChange={e => setFormData({...formData, routeOrigin: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500" placeholder="Ej. Barcelona" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Destino</label>
                    <input type="text" value={formData.routeDestination} onChange={e => setFormData({...formData, routeDestination: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500" placeholder="Ej. Madrid" />
                  </div>
                </div>

                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-400 mb-1">Distancia (Km)</label>
                    <input type="number" step="0.1" value={formData.routeDistanceKm} onChange={e => setFormData({...formData, routeDistanceKm: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500" placeholder="Ej. 600" />
                  </div>
                  <button type="button" onClick={calculateOSRM} disabled={isSearchingLocation} className="bg-indigo-500 hover:bg-indigo-400 text-slate-900 px-4 py-2 rounded-xl font-bold transition-colors mb-0.5">
                    {isSearchingLocation ? 'Calculando...' : 'Autocalcular'}
                  </button>
                </div>

                {formData.routeMode === 'driving' && (
                  <div className="grid grid-cols-2 gap-4 mt-2 pt-4 border-t border-indigo-500/20">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Consumo (L/100km)</label>
                      <input type="number" step="0.1" value={formData.fuelConsumption} onChange={e => setFormData({...formData, fuelConsumption: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500" placeholder="Ej. 7.5" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Precio Gasolina (€/L)</label>
                      <input type="number" step="0.01" value={formData.fuelPrice} onChange={e => setFormData({...formData, fuelPrice: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500" placeholder="Ej. 1.60" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Consumo de Coche de Alquiler */}
            {formData.type === 'car_rental' && (
              <div className="bg-purple-900/20 p-4 rounded-2xl border border-purple-500/30 space-y-4">
                <h3 className="text-sm font-medium text-purple-400">Datos del Vehículo</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Consumo Medio (L/100km)</label>
                    <input type="number" step="0.1" value={formData.fuelConsumption} onChange={e => setFormData({...formData, fuelConsumption: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500" placeholder="Ej. 7.5" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Precio Gasolina Est. (€/L)</label>
                    <input type="number" step="0.01" value={formData.fuelPrice} onChange={e => setFormData({...formData, fuelPrice: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500" placeholder="Ej. 1.60" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">Define estos valores para que, cuando crees "Rutas", el sistema pueda autocalcular el coste de gasolina.</p>
              </div>
            )}

            {/* Ubicación (Solo si no es Ruta) */}
            {formData.type !== 'drive' && (
              <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-700 space-y-4">
                <h3 className="text-sm font-medium text-teal-400 flex justify-between items-center">
                  <span>Buscar Dirección en el Mapa</span>
                </h3>
                
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={locationQuery} 
                    onChange={e => setLocationQuery(e.target.value)} 
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); searchLocation(); } }}
                    placeholder="Ej. Hobbiton, Matamata" 
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500" 
                  />
                  <button type="button" onClick={searchLocation} disabled={isSearchingLocation} className="bg-teal-500 hover:bg-teal-400 text-slate-900 px-4 py-2.5 rounded-xl font-bold transition-colors flex items-center justify-center min-w-[48px]">
                    {isSearchingLocation ? '...' : <Search size={18} />}
                  </button>
                </div>

                {locationResults.length > 0 && (
                  <div className="max-h-40 overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl mt-2 hide-scrollbar">
                    {locationResults.map((res, i) => (
                      <div 
                        key={i} 
                        onClick={() => selectLocationResult(res)}
                        className="p-3 border-b border-slate-800 hover:bg-teal-900/30 cursor-pointer text-sm text-slate-300 transition-colors"
                      >
                        {res.display_name}
                      </div>
                    ))}
                  </div>
                )}

                {selectedLocation && (
                  <div className="bg-slate-950 border border-teal-500/30 rounded-xl p-3 flex items-start gap-3 mt-2">
                    <MapPin className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-white font-medium">Ubicación guardada:</p>
                      <p className="text-xs text-slate-400 mt-1">{selectedLocation.address}</p>
                      <button type="button" onClick={() => setSelectedLocation(null)} className="text-xs text-red-400 hover:underline mt-2">Eliminar ubicación</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Contactos */}
            <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-700 space-y-4">
              <h3 className="text-sm font-medium text-teal-400">Información de Contacto</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-1"><Phone size={14} /> Teléfono</label>
                  <input type="tel" value={formData.contactPhone} onChange={e => setFormData({...formData, contactPhone: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500" placeholder="+34 600..." />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-1"><MessageCircle size={14} /> WhatsApp</label>
                  <input type="tel" value={formData.contactWhatsapp} onChange={e => setFormData({...formData, contactWhatsapp: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500" placeholder="+34 600..." />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-1"><Mail size={14} /> Email</label>
                  <input type="email" value={formData.contactEmail} onChange={e => setFormData({...formData, contactEmail: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500" placeholder="contacto@..." />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-1"><User size={14} /> Persona Contacto</label>
                  <input type="text" value={formData.contactName} onChange={e => setFormData({...formData, contactName: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500" placeholder="Ej. María (Guía)" />
                </div>
              </div>
            </div>

            {/* Adjuntos y URLs */}
            <div className="bg-slate-800/30 p-4 rounded-2xl border border-dashed border-slate-700 space-y-4">
              <h3 className="text-sm font-medium text-teal-400">Archivos y Enlaces</h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Documentos (Múltiples permitidos)</label>
                
                {/* Lista de archivos actuales */}
                <div className="space-y-2 mb-3">
                  {existingAttachments.map((att, i) => (
                    <div key={`ext-${i}`} className="flex justify-between items-center bg-slate-900 border border-slate-700 p-2 rounded-lg">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileIcon className="w-4 h-4 text-teal-400 shrink-0" />
                        <button type="button" onClick={() => { setViewerUrl(att.url); setViewerName(att.name); }} className="text-sm text-slate-300 truncate hover:text-teal-400 hover:underline">{att.name}</button>
                      </div>
                      <button type="button" onClick={() => removeExistingAttachment(i)} className="text-red-400 hover:text-red-300 ml-2"><XCircle className="w-4 h-4" /></button>
                    </div>
                  ))}
                  {newFiles.map((file, i) => (
                    <div key={`new-${i}`} className="flex justify-between items-center bg-slate-800/80 border border-teal-500/30 p-2.5 rounded-xl">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <FileIcon className="w-4 h-4 text-slate-400 shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm text-slate-200 truncate">{file.name}</span>
                          <span className="text-[10px] text-teal-400 font-semibold uppercase tracking-wider">Pendiente de guardar</span>
                        </div>
                      </div>
                      <button type="button" onClick={() => removeNewFile(i)} className="text-red-400 hover:text-red-300 ml-2 p-1 bg-red-400/10 rounded-lg"><XCircle className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 cursor-pointer px-4 py-2.5 rounded-xl border border-slate-700 transition-colors">
                    <UploadCloud className="w-5 h-5 text-slate-300" />
                    <span className="text-sm font-medium text-slate-300">Añadir archivos</span>
                    {/* Quitamos las restricciones del accept para evitar problemas en Linux */}
                    <input type="file" multiple className="hidden" onChange={handleFileChange} />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Enlace (Página del hotel, info, reserva...)</label>
                <input type="url" value={formData.externalUrl} onChange={e => setFormData({...formData, externalUrl: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500" placeholder="https://..." />
              </div>
            </div>

            {/* Notas y Coste */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-400 mb-1">Notas extras</label>
                <input type="text" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500" placeholder="Localizador, check-in, etc." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Precio estimado</label>
                <input type="number" step="0.01" value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500" placeholder="0.00" />
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold py-4 rounded-xl shadow-lg transition-all disabled:opacity-50">
              {isSubmitting ? 'Guardando...' : editingNode ? 'Actualizar Paso' : 'Guardar y Añadir a la Ruta'}
            </button>
          </form>
        </motion.div>
      </div>

      <DocumentViewer 
        url={viewerUrl} 
        name={viewerName} 
        isOpen={!!viewerUrl} 
        onClose={() => setViewerUrl(null)} 
      />
    </AnimatePresence>
  );
}
