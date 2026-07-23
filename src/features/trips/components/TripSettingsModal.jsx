import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, ShieldAlert, Briefcase, MapPin, Calendar, Image as ImageIcon } from 'lucide-react';
import { useTripStore } from '../../../store/tripStore';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';

export default function TripSettingsModal({ trip, isOpen, onClose }) {
  const { updateTrip } = useTripStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    destination: '',
    startDate: '',
    endDate: '',
    coverImageUrl: '',
    agencyName: '',
    agencyPhone: '',
    agencyContact: '',
    insuranceName: '',
    insurancePolicy: '',
    insurancePhone: ''
  });

  useEffect(() => {
    if (isOpen && trip) {
      setFormData({
        title: trip.title || '',
        destination: trip.destination || '',
        startDate: trip.startDate ? format(trip.startDate.toDate(), 'yyyy-MM-dd') : '',
        endDate: trip.endDate ? format(trip.endDate.toDate(), 'yyyy-MM-dd') : '',
        coverImageUrl: trip.coverImageUrl || '',
        agencyName: trip.agencyName || '',
        agencyPhone: trip.agencyPhone || '',
        agencyContact: trip.agencyContact || '',
        insuranceName: trip.insuranceName || '',
        insurancePolicy: trip.insurancePolicy || '',
        insurancePhone: trip.insurancePhone || ''
      });
    }
  }, [isOpen, trip]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const updates = {
        title: formData.title,
        destination: formData.destination,
        coverImageUrl: formData.coverImageUrl,
        agencyName: formData.agencyName,
        agencyPhone: formData.agencyPhone,
        agencyContact: formData.agencyContact,
        insuranceName: formData.insuranceName,
        insurancePolicy: formData.insurancePolicy,
        insurancePhone: formData.insurancePhone
      };

      if (formData.startDate) {
        updates.startDate = Timestamp.fromDate(new Date(`${formData.startDate}T12:00:00`));
      }
      if (formData.endDate) {
        updates.endDate = Timestamp.fromDate(new Date(`${formData.endDate}T12:00:00`));
      }

      await updateTrip(trip.id, updates);
      onClose();
    } catch (error) {
      alert("Error al actualizar el viaje: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
          onClick={onClose}
        ></motion.div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto hide-scrollbar"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span className="text-teal-400">⚙️</span> Configuración del Viaje
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* 1. Datos Básicos */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-teal-400 uppercase tracking-wider border-b border-slate-800 pb-2">Información Principal</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Título del Viaje</label>
                  <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500" placeholder="Ej. Ruta por Japón" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Destino Principal</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input required type="text" value={formData.destination} onChange={e => setFormData({...formData, destination: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-teal-500" placeholder="Ej. Tokio, Kioto..." />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Fecha de Inicio</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-teal-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Fecha de Fin</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-teal-500" />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-400 mb-1">URL Imagen de Portada</label>
                  <div className="relative">
                    <ImageIcon className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input type="url" value={formData.coverImageUrl} onChange={e => setFormData({...formData, coverImageUrl: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-teal-500" placeholder="https://..." />
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Agencia */}
            <section className="bg-slate-800/30 p-5 rounded-2xl border border-slate-700 space-y-4">
              <h3 className="text-sm font-bold text-teal-400 uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="w-4 h-4" /> Agencia de Viajes
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Nombre de la Agencia</label>
                  <input type="text" value={formData.agencyName} onChange={e => setFormData({...formData, agencyName: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-teal-500" placeholder="Ej. Viajes El Corte Inglés" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Persona de Contacto</label>
                  <input type="text" value={formData.agencyContact} onChange={e => setFormData({...formData, agencyContact: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-teal-500" placeholder="Ej. Ana García" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-400 mb-1">Teléfono de Emergencias (Agencia)</label>
                  <input type="tel" value={formData.agencyPhone} onChange={e => setFormData({...formData, agencyPhone: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-teal-500" placeholder="+34 900..." />
                </div>
              </div>
            </section>

            {/* 3. Seguro */}
            <section className="bg-emerald-900/10 p-5 rounded-2xl border border-emerald-500/20 space-y-4">
              <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" /> Seguro de Viaje
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Compañía Aseguradora</label>
                  <input type="text" value={formData.insuranceName} onChange={e => setFormData({...formData, insuranceName: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500" placeholder="Ej. IATI Seguros, Mapfre" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Nº de Póliza</label>
                  <input type="text" value={formData.insurancePolicy} onChange={e => setFormData({...formData, insurancePolicy: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500" placeholder="Ej. POL-123456" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-400 mb-1">Teléfono Asistencia 24h</label>
                  <input type="tel" value={formData.insurancePhone} onChange={e => setFormData({...formData, insurancePhone: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-emerald-500" placeholder="+34..." />
                </div>
              </div>
            </section>

            <button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold py-4 rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              <Save className="w-5 h-5" />
              {isSubmitting ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
