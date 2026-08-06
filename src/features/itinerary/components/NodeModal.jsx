import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UploadCloud, Plane, Hotel, Car, MapPin, Trash2, File as FileIcon, XCircle, Search, CarFront, Phone, MessageCircle, Mail, User, Route, Mic, Square, AlertTriangle, CheckCircle, Lock, Loader2 } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { useItineraryStore } from '../../../store/itineraryStore';
import { useTripStore } from '../../../store/tripStore';
import { useAuthStore } from '../../../store/authStore';
import { usePremiumCheckout } from '../../../hooks/usePremiumCheckout';
import { format } from 'date-fns';
import DocumentViewer from '../../../components/ui/DocumentViewer';

export default function NodeModal({ tripId, isOpen, onClose, editingNode = null }) {
  const { addNode, updateNode, deleteNode, nodes } = useItineraryStore();
  const { trips } = useTripStore();
  const currentTrip = trips.find(t => t.id === tripId);
  const defaultAlarm = currentTrip?.defaultAlarmOffset !== undefined ? currentTrip.defaultAlarmOffset : 1440;
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { profile } = useAuthStore();
  const isPremium = profile?.tier === 'premium';
  const { startCheckout, isCheckoutLoading } = usePremiumCheckout();

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  
  const [formData, setFormData] = useState({
    title: '',
    type: 'flight',
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
    fuelPrice: '',
    isPaid: true,
    alarmOffset: defaultAlarm,
    hasPendingAction: false,
    pendingActionText: '',
    personalNotes: ''
  });
  const [newFiles, setNewFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [viewerUrl, setViewerUrl] = useState(null);
  const [viewerName, setViewerName] = useState('');
  
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  
  const [dropoffLocationQuery, setDropoffLocationQuery] = useState('');
  const [dropoffLocationResults, setDropoffLocationResults] = useState([]);
  const [isSearchingDropoff, setIsSearchingDropoff] = useState(false);
  const [selectedDropoffLocation, setSelectedDropoffLocation] = useState(null);

  useEffect(() => {
    if (isOpen && editingNode) {
      const st = editingNode.startTime?.toDate();
      const et = editingNode.endTime?.toDate();
      setFormData({
        ...editingNode,
        startDate: st ? format(st, 'yyyy-MM-dd') : '',
        startTime: st ? format(st, 'HH:mm') : '',
        endDate: et ? format(et, 'yyyy-MM-dd') : '',
        endTime: et ? format(et, 'HH:mm') : '',
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
        fuelPrice: editingNode.fuelPrice || '',
        isPaid: editingNode.isPaid !== false,
        alarmOffset: editingNode.alarmOffset !== undefined ? editingNode.alarmOffset : defaultAlarm,
        hasPendingAction: editingNode.hasPendingAction || false,
        pendingActionText: editingNode.pendingActionText || '',
        personalNotes: editingNode.personalNotes || ''
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
      if (editingNode.dropoffLocation) {
        setSelectedDropoffLocation(editingNode.dropoffLocation);
        setDropoffLocationQuery(editingNode.dropoffLocation.address || '');
      } else {
        setSelectedDropoffLocation(null);
        setDropoffLocationQuery('');
      }
    } else if (isOpen && !editingNode) {
      setFormData({
        type: 'activity', title: '', startDate: '', startTime: '', endDate: '', endTime: '', 
        cost: '', currency: 'EUR', notes: '', externalUrl: '',
        contactPhone: '', contactWhatsapp: '', contactEmail: '', contactName: '',
        routeOrigin: '', routeDestination: '', routeMode: 'driving', routeDistanceKm: '', fuelConsumption: '', fuelPrice: '',
        isPaid: true, alarmOffset: defaultAlarm, hasPendingAction: false, pendingActionText: '', personalNotes: ''
      });
      setExistingAttachments([]);
      setNewFiles([]);
      setSelectedLocation(null);
      setLocationQuery('');
      setSelectedDropoffLocation(null);
      setDropoffLocationQuery('');
    }
  }, [isOpen, editingNode]);

  if (!isOpen) return null;

  const startRecording = async () => {
    if (!isPremium) {
      if (confirm("La grabación de notas de voz es una función Premium. ¿Quieres mejorar tu plan ahora?")) {
        startCheckout();
      }
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `NotaVoz_${format(new Date(), 'HHmmss')}.webm`, { type: 'audio/webm' });
        setNewFiles(prev => [...prev, audioFile]);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error al acceder al micrófono:", err);
      alert("No se pudo acceder al micrófono. Verifica los permisos de tu navegador.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
    }
  };

  const formatRecordingTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

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

  const searchDropoffLocation = async () => {
    if (!dropoffLocationQuery.trim()) return;
    setIsSearchingDropoff(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(dropoffLocationQuery)}`);
      const data = await res.json();
      setDropoffLocationResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingDropoff(false);
    }
  };

  const selectDropoffLocationResult = (res) => {
    setSelectedDropoffLocation({
      name: res.display_name.split(',')[0],
      address: res.display_name,
      lat: parseFloat(res.lat),
      lng: parseFloat(res.lon)
    });
    setDropoffLocationQuery(res.display_name);
    setDropoffLocationResults([]);
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
        if (formData.routeMode === 'driving') {
          const carRental = nodes.find(n => n.type === 'car_rental' && n.fuelConsumption && n.fuelPrice);
          const fC = formData.type === 'car_rental' ? formData.fuelConsumption : carRental?.fuelConsumption;
          const fP = formData.type === 'car_rental' ? formData.fuelPrice : carRental?.fuelPrice;
          if (fC && fP) {
            const cost = (distanceKm * (parseFloat(fC) / 100)) * parseFloat(fP);
            newCost = cost.toFixed(2);
          }
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

  const handleFileChange = async (e) => {
    const validFiles = [];
    const files = Array.from(e.target.files);
    
    for (const file of files) {
      const isFakeDriveFile = 
        file.name.endsWith('.gdoc') || file.name.endsWith('.desktop') || 
        file.name.endsWith('.url') || file.name.endsWith('.gsheet') ||
        file.size === 0 || (!file.name.includes('.') && file.type === '');
        
      if (isFakeDriveFile) {
        alert(`Error con "${file.name}": El sistema nos indica que este archivo está vacío o es un "enlace de nube" (como Google Drive), no el documento físico.\n\nPor favor, descarga el archivo directamente desde tu navegador a tu dispositivo e inténtalo de nuevo para asegurar que esté disponible sin conexión.`);
        continue;
      }

      let fileToUpload = file;

      if (file.name.toLowerCase().endsWith('.eml')) {
        try {
          const PostalMime = (await import('postal-mime')).default;
          const parser = new PostalMime();
          const email = await parser.parse(file);
          
          let content = email.html || email.text || 'Sin contenido';
          
          if (email.html && email.attachments && email.attachments.length > 0) {
            for (const att of email.attachments) {
              if (att.contentId && att.content) {
                const cid = att.contentId.replace(/^</, '').replace(/>$/, '');
                const dataUrl = await new Promise((resolve, reject) => {
                  const blob = new Blob([att.content], { type: att.mimeType });
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result);
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
                });
                const cidRegex = new RegExp(`cid:${cid}`, 'gi');
                content = content.replace(cidRegex, dataUrl);
              }
            }
          }

          const title = email.subject || file.name.replace('.eml', '.html');
          const newFileName = title.replace(/[^a-zA-Z0-9_.-]/g, '_') + '.html';
          
          fileToUpload = new File([content], newFileName, { type: 'text/html' });
        } catch (parseErr) {
          console.error("Error parseando .eml en frontend:", parseErr);
        }
      }
      
      validFiles.push(fileToUpload);
    }

    if (validFiles.length > 0) {
      setNewFiles(prev => [...prev, ...validFiles]);
    }

    e.target.value = '';
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
        dropoffLocation: selectedDropoffLocation,
        isPaid: formData.isPaid,
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
        fuelConsumption: formData.type === 'car_rental' ? formData.fuelConsumption : '',
        fuelPrice: formData.type === 'car_rental' ? formData.fuelPrice : '',
        alarmOffset: parseInt(formData.alarmOffset, 10),
        hasPendingAction: formData.hasPendingAction,
        pendingActionText: formData.pendingActionText,
        personalNotes: formData.personalNotes
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
      <div className="fixed inset-0 z-[999] flex items-start md:items-center justify-center p-0 md:p-4 overflow-hidden">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        ></motion.div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full h-full md:h-auto max-w-2xl bg-slate-900 md:border border-slate-700 rounded-none md:rounded-3xl shadow-2xl p-6 md:p-8 md:max-h-[90vh] overflow-y-auto overflow-x-hidden hide-scrollbar flex flex-col"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="min-w-0">
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  {formData.type === 'accommodation' ? 'Check-in' : formData.type === 'car_rental' ? 'Recogida (Día)' : 'Día (Obligatorio)'}
                </label>
                <input required type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full min-w-0 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 appearance-none" />
              </div>
              <div className="min-w-0">
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  {formData.type === 'accommodation' ? 'Hora entrada' : formData.type === 'car_rental' ? 'Recogida (Hora)' : 'Hora de inicio'}
                </label>
                <input type="time" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="w-full min-w-0 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 appearance-none" />
              </div>
            </div>

            {/* Fechas Fin (Hotel, Coche, Vuelos...) */}
            {(formData.type === 'accommodation' || formData.type === 'car_rental' || formData.type === 'flight') && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-800/20 p-3 rounded-xl border border-slate-800">
                  <div className="min-w-0">
                    <label className="block text-sm font-medium text-slate-400 mb-1">
                      {formData.type === 'accommodation' ? 'Check-out' : formData.type === 'car_rental' ? 'Devolución (Día)' : 'Día Fin'}
                    </label>
                    <input type={formData.type === 'accommodation' ? "date" : "date"} required={formData.type === 'accommodation'} value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="w-full min-w-0 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 appearance-none" />
                  </div>
                  <div className="min-w-0">
                    <label className="block text-sm font-medium text-slate-400 mb-1">
                      {formData.type === 'accommodation' ? 'Hora salida' : formData.type === 'car_rental' ? 'Devolución (Hora)' : 'Hora llegada'}
                    </label>
                    <input type="time" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} className="w-full min-w-0 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 appearance-none" />
                  </div>
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

                {/* Los campos de consumo han sido eliminados de aquí. Se leen automáticamente del coche de alquiler en los cálculos */}
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

            {/* Ubicación de Devolución (Solo Alquiler de Coches) */}
            {formData.type === 'car_rental' && (
              <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-700 space-y-4">
                <h3 className="text-sm font-medium text-teal-400 flex justify-between items-center">
                  <span>Buscar Ubicación de Devolución</span>
                </h3>
                
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={dropoffLocationQuery} 
                    onChange={e => setDropoffLocationQuery(e.target.value)} 
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); searchDropoffLocation(); } }}
                    placeholder="Ej. Aeropuerto de Wellington" 
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500" 
                  />
                  <button type="button" onClick={searchDropoffLocation} disabled={isSearchingDropoff} className="bg-teal-500 hover:bg-teal-400 text-slate-900 px-4 py-2.5 rounded-xl font-bold transition-colors flex items-center justify-center min-w-[48px]">
                    {isSearchingDropoff ? '...' : <Search size={18} />}
                  </button>
                </div>

                {dropoffLocationResults.length > 0 && (
                  <div className="max-h-40 overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl mt-2 hide-scrollbar">
                    {dropoffLocationResults.map((res, i) => (
                      <div 
                        key={i} 
                        onClick={() => selectDropoffLocationResult(res)}
                        className="p-3 border-b border-slate-800 hover:bg-teal-900/30 cursor-pointer text-sm text-slate-300 transition-colors"
                      >
                        {res.display_name}
                      </div>
                    ))}
                  </div>
                )}

                {selectedDropoffLocation && (
                  <div className="bg-slate-950 border border-teal-500/30 rounded-xl p-3 flex items-start gap-3 mt-2">
                    <MapPin className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-white font-medium">Devolución guardada:</p>
                      <p className="text-xs text-slate-400 mt-1">{selectedDropoffLocation.address}</p>
                      <button type="button" onClick={() => setSelectedDropoffLocation(null)} className="text-xs text-red-400 hover:underline mt-2">Eliminar ubicación</button>
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

            {/* Configuración de Alarma para Calendario */}
            <div className="bg-orange-900/10 p-4 rounded-2xl border border-orange-500/20 space-y-4">
              <h3 className="text-sm font-medium text-orange-400">Notificación de Calendario</h3>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Avisar antes del evento</label>
                <select 
                  value={formData.alarmOffset} 
                  onChange={e => setFormData({...formData, alarmOffset: e.target.value})} 
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="-1">Sin aviso</option>
                  <option value="0">A la hora del evento</option>
                  <option value="15">15 minutos antes</option>
                  <option value="30">30 minutos antes</option>
                  <option value="60">1 hora antes</option>
                  <option value="120">2 horas antes</option>
                  <option value="180">3 horas antes</option>
                  <option value="1440">1 día antes (24 horas)</option>
                  <option value="2880">2 días antes (48 horas)</option>
                  <option value="10080">1 semana antes</option>
                </select>
              </div>
            </div>

            {/* Notas y Coste */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-400 mb-1">Descripción (IA / Oficial)</label>
                <textarea 
                  rows="3" 
                  value={formData.notes} 
                  onChange={e => setFormData({...formData, notes: e.target.value})} 
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 resize-y" 
                  placeholder="Localizador, check-in, descripción de la IA..." 
                ></textarea>
              </div>
              <div className="sm:w-1/3">
                <label className="block text-sm font-medium text-slate-400 mb-1">Precio estimado</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={formData.cost} 
                  onChange={e => setFormData({...formData, cost: e.target.value})} 
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500" 
                  placeholder="0.00" 
                />
              </div>
              <div className="sm:w-1/3">
                <label className="block text-sm font-medium text-slate-400 mb-1">Estado de pago</label>
                <div className="flex bg-slate-950 rounded-xl p-1 border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isPaid: true })}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${formData.isPaid ? 'bg-teal-500/20 text-teal-400' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    Pagado
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isPaid: false })}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${!formData.isPaid ? 'bg-amber-500/20 text-amber-400' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    Pendiente
                  </button>
                </div>
              </div>
            </div>

            {/* Nueva Sección: Acción Pendiente */}
            <div className={`p-4 rounded-2xl border transition-all ${formData.hasPendingAction ? 'bg-red-900/10 border-red-500/30' : 'bg-slate-800/30 border-slate-700'}`}>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.hasPendingAction} 
                    onChange={e => setFormData({...formData, hasPendingAction: e.target.checked})} 
                    className="w-5 h-5 rounded border-slate-600 text-red-500 focus:ring-red-500 bg-slate-950 shrink-0" 
                  />
                  <span className={`text-sm font-medium ${formData.hasPendingAction ? 'text-red-400' : 'text-slate-400'}`}>
                    <AlertTriangle size={16} className="inline mr-1" /> Marcar con Acción Pendiente (To-Do)
                  </span>
                </label>
              </div>
              {formData.hasPendingAction && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3">
                  <input 
                    type="text" 
                    value={formData.pendingActionText} 
                    onChange={e => setFormData({...formData, pendingActionText: e.target.value})} 
                    className="w-full bg-slate-950 border border-red-500/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-red-500" 
                    placeholder="Ej. Llamar para confirmar reserva, Enviar email..." 
                  />
                </motion.div>
              )}
            </div>

            {/* Nueva Sección: Diario / Notas Personales */}
            <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-700 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-teal-400">Diario / Notas Personales</h3>
                
                {isRecording ? (
                  <button 
                    type="button" 
                    onClick={stopRecording} 
                    className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all animate-pulse"
                  >
                    <Square size={14} fill="currentColor" />
                    Detener ({formatRecordingTime(recordingTime)})
                  </button>
                ) : (
                  <button 
                    type="button" 
                    onClick={startRecording} 
                    className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border border-slate-600"
                  >
                    <Mic size={14} className={isPremium ? 'text-teal-400' : 'text-amber-400'} />
                    Grabar Nota de Voz {!isPremium && <Lock size={12} className="text-amber-400 ml-1" />}
                  </button>
                )}
              </div>
              
              <textarea 
                rows="4" 
                value={formData.personalNotes} 
                onChange={e => setFormData({...formData, personalNotes: e.target.value})} 
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 resize-y mb-2" 
                placeholder="Apunta tus impresiones, recordatorios, o lo que quieras..." 
              ></textarea>
              
              {/* Reproducir Audios Grabados */}
              {(existingAttachments.some(a => a.name.endsWith('.webm') || a.name.endsWith('.mp4') || a.name.endsWith('.mp3')) || newFiles.some(f => f.name.endsWith('.webm'))) && (
                <div className="space-y-2 mt-2">
                  <h4 className="text-xs font-semibold text-slate-400">Notas de Voz Guardadas:</h4>
                  {existingAttachments.filter(a => a.name.endsWith('.webm') || a.name.endsWith('.mp4') || a.name.endsWith('.mp3')).map((audio, idx) => (
                    <div key={`ext-audio-${idx}`} className="bg-slate-900 border border-slate-700 rounded-xl p-2 flex items-center justify-between gap-3">
                      <audio controls src={audio.url} className="h-8 max-w-[200px]" />
                      <button type="button" onClick={() => removeExistingAttachment(existingAttachments.indexOf(audio))} className="text-red-400 hover:text-red-300 p-1"><XCircle className="w-4 h-4" /></button>
                    </div>
                  ))}
                  {newFiles.filter(f => f.name.endsWith('.webm')).map((file, idx) => (
                    <div key={`new-audio-${idx}`} className="bg-slate-800/80 border border-teal-500/30 p-2 rounded-xl flex items-center justify-between gap-3">
                      <audio controls src={URL.createObjectURL(file)} className="h-8 max-w-[200px]" />
                      <button type="button" onClick={() => removeNewFile(newFiles.indexOf(file))} className="text-red-400 hover:text-red-300 p-1"><XCircle className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}
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
