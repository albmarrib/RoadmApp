import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, ShieldAlert, Briefcase, MapPin, Calendar, Image as ImageIcon, Trash2 } from 'lucide-react';
import { useTripStore } from '../../../store/tripStore';
import { useAuthStore } from '../../../store/authStore';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function TripSettingsModal({ trip, isOpen, onClose }) {
  const { updateTrip, deleteTrip } = useTripStore();
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    origin: '',
    destination: '',
    startDate: '',
    endDate: '',
    coverImageUrl: '',
    agencyName: '',
    agencyPhone: '',
    agencyContact: '',
    emailAlias: '',
    insuranceName: '',
    insurancePolicy: '',
    insurancePhone: '',
    // Finances
    budget: '',
    currency: 'EUR',
    exchangeRate: '',
    isGroupMode: false,
    splitMembers: '',
    categories: '',
    defaultAlarmOffset: '1440' // 24 hours default
  });

  useEffect(() => {
    if (isOpen && trip) {
      setFormData({
        title: trip.title || '',
        origin: trip.origin || 'España',
        destination: trip.destination || '',
        startDate: trip.startDate ? format(trip.startDate.toDate(), 'yyyy-MM-dd') : '',
        endDate: trip.endDate ? format(trip.endDate.toDate(), 'yyyy-MM-dd') : '',
        coverImageUrl: trip.coverImageUrl || '',
        agencyName: trip.agencyName || '',
        agencyPhone: trip.agencyPhone || '',
        agencyContact: trip.agencyContact || '',
        emailAlias: trip.emailAlias || '',
        insuranceName: trip.insuranceName || '',
        insurancePolicy: trip.insurancePolicy || '',
        insurancePhone: trip.insurancePhone || '',
        budget: trip.budget || '',
        currency: trip.currency || 'EUR',
        exchangeRate: trip.exchangeRate || '',
        isGroupMode: trip.isGroupMode || false,
        splitMembers: trip.splitMembers ? trip.splitMembers.join(', ') : '',
        categories: trip.categories ? trip.categories.join(', ') : 'Comida, Transporte, Ocio, Alojamiento, Vuelos, Gasolina, Supermercado, Otros',
        defaultAlarmOffset: trip.defaultAlarmOffset !== undefined ? String(trip.defaultAlarmOffset) : '1440'
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
        origin: formData.origin,
        destination: formData.destination,
        coverImageUrl: formData.coverImageUrl,
        agencyName: formData.agencyName,
        agencyPhone: formData.agencyPhone,
        agencyContact: formData.agencyContact,
        emailAlias: formData.emailAlias ? formData.emailAlias.toLowerCase().trim() : '',
        insuranceName: formData.insuranceName,
        insurancePolicy: formData.insurancePolicy,
        insurancePhone: formData.insurancePhone,
        budget: formData.budget ? parseFloat(formData.budget) : 0,
        currency: formData.currency,
        exchangeRate: formData.exchangeRate ? parseFloat(formData.exchangeRate) : null,
        isGroupMode: formData.isGroupMode,
        splitMembers: formData.splitMembers.split(',').map(s => s.trim()).filter(Boolean),
        categories: formData.categories.split(',').map(s => s.trim()).filter(Boolean),
        defaultAlarmOffset: parseInt(formData.defaultAlarmOffset, 10)
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

  const handleDeleteTrip = async () => {
    if (confirm("¿Estás completamente seguro de que quieres eliminar este viaje? Esta acción no se puede deshacer y borrará todo el itinerario, documentos y gastos.")) {
      setIsDeleting(true);
      try {
        await deleteTrip(trip.id);
        onClose();
        navigate('/');
      } catch (error) {
        alert("Error al eliminar el viaje: " + error.message);
        setIsDeleting(false);
      }
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-start md:items-center justify-center p-0 md:p-6 overflow-hidden">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
          onClick={onClose}
        ></motion.div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full h-full md:h-auto max-w-2xl bg-slate-900 md:border border-slate-700 rounded-none md:rounded-3xl shadow-2xl p-6 md:p-8 md:max-h-[90vh] overflow-y-auto overflow-x-hidden hide-scrollbar flex flex-col"
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
            
            {/* Código de Invitación (Solo Lectura) */}
            <section className="bg-indigo-900/20 p-5 rounded-2xl border border-indigo-500/30 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-1">Código de Invitación</h3>
                <p className="text-xs text-slate-400">Pasa este código a tus amigos para que se unan al viaje.</p>
              </div>
              <div className="bg-slate-950 px-4 py-2 rounded-xl border border-indigo-500/50">
                <span className="font-mono text-xl font-bold tracking-widest text-white">{trip.inviteCode || 'N/A'}</span>
              </div>
            </section>

            {/* 1. Datos Básicos */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-teal-400 uppercase tracking-wider border-b border-slate-800 pb-2">Información Principal</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-400 mb-1">Título del Viaje</label>
                  <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500" placeholder="Ej. Ruta por Japón" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-indigo-400 mb-1">Alias para Recepción de Emails</label>
                  <div className="flex flex-col sm:flex-row rounded-xl overflow-hidden border border-indigo-500/30">
                    <input type="text" value={formData.emailAlias} onChange={e => setFormData({...formData, emailAlias: e.target.value.replace(/[^a-zA-Z0-9]/g, '')})} className="w-full bg-slate-950 px-4 py-2.5 text-white focus:outline-none focus:bg-slate-900" placeholder="Ej. japon2026" />
                    <div className="bg-indigo-900/30 text-indigo-300 px-4 py-2.5 flex items-center justify-center sm:justify-start text-sm font-mono whitespace-nowrap border-t sm:border-t-0 border-indigo-500/30">
                      @roadmapp.axonailabs.es
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Reenvía tus reservas a este email y se añadirán solas (solo letras y números, sin espacios).</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Origen (Casa)</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input type="text" value={formData.origin} onChange={e => setFormData({...formData, origin: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-teal-500" placeholder="Ej. España" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Destino Principal</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input required type="text" value={formData.destination} onChange={e => setFormData({...formData, destination: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-teal-500" placeholder="Ej. Tokio, Kioto..." />
                  </div>
                </div>
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-slate-400 mb-1">Fecha de Inicio</label>
                  <div className="relative min-w-0">
                    <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full min-w-0 bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-teal-500 appearance-none" />
                  </div>
                </div>
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-slate-400 mb-1">Fecha de Fin</label>
                  <div className="relative min-w-0">
                    <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="w-full min-w-0 bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-teal-500 appearance-none" />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-400 mb-1">URL Imagen de Portada</label>
                  <div className="relative">
                    <ImageIcon className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input type="url" value={formData.coverImageUrl} onChange={e => setFormData({...formData, coverImageUrl: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-teal-500" placeholder="https://..." />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-400 mb-1">Alarma de Calendario por Defecto</label>
                  <select 
                    value={formData.defaultAlarmOffset} 
                    onChange={e => setFormData({...formData, defaultAlarmOffset: e.target.value})} 
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-teal-500"
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
                  <p className="text-[10px] text-slate-500 mt-1">Esta alarma se aplicará por defecto al exportar los eventos al calendario del móvil.</p>
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

            {/* 4. Finanzas y Reparto */}
            <section className="bg-indigo-900/10 p-5 rounded-2xl border border-indigo-500/20 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                  <span className="text-lg">💰</span> Finanzas y Presupuesto
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Presupuesto Estimado</label>
                  <input type="number" min="0" step="0.01" value={formData.budget} onChange={e => setFormData({...formData, budget: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500" placeholder="Ej. 1500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Moneda Principal</label>
                  <input type="text" value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500 uppercase" placeholder="EUR, USD, GBP..." maxLength={3} />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-400 mb-1">Factor de Conversión (Moneda Local)</label>
                  <input type="number" min="0" step="0.0001" value={formData.exchangeRate} onChange={e => setFormData({...formData, exchangeRate: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500" placeholder="Ej. 160 (Si 1€ = 160 Yenes)" />
                  <p className="text-[10px] text-slate-500 mt-1">Si viajas a un país con otra moneda, pon a cuánto equivale 1 unidad de tu moneda principal. Dejar en blanco si no aplica.</p>
                </div>
                
                <div className="md:col-span-2 pt-2 border-t border-indigo-500/20">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox" 
                        checked={formData.isGroupMode} 
                        onChange={e => setFormData({...formData, isGroupMode: e.target.checked})}
                        className="sr-only" 
                      />
                      <div className={`block w-12 h-6 rounded-full transition-colors ${formData.isGroupMode ? 'bg-indigo-500' : 'bg-slate-700'}`}></div>
                      <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.isGroupMode ? 'transform translate-x-6' : ''}`}></div>
                    </div>
                    <div>
                      <span className="block text-sm font-bold text-white">Activar Modo Cuentas Claras (Grupos)</span>
                      <span className="block text-xs text-slate-400">Permite registrar quién paga qué y calcular deudas.</span>
                    </div>
                  </label>
                </div>

                {formData.isGroupMode && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-400 mb-1">Participantes del Gasto</label>
                    <input type="text" value={formData.splitMembers} onChange={e => setFormData({...formData, splitMembers: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500" placeholder="Ej. Juan, María, Paco" />
                    <p className="text-[10px] text-slate-500 mt-1">Nombres separados por comas. Útil para hacer caja al final del viaje.</p>
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-400 mb-1">Categorías de Gasto</label>
                  <input type="text" value={formData.categories} onChange={e => setFormData({...formData, categories: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500" placeholder="Comida, Taxis, Entradas..." />
                  <p className="text-[10px] text-slate-500 mt-1">Categorías separadas por comas. Podrás elegir entre ellas al añadir un gasto.</p>
                </div>
              </div>
            </section>

            <button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold py-4 rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              <Save className="w-5 h-5" />
              {isSubmitting ? 'Guardando...' : 'Guardar Configuración'}
            </button>
            
            <div className="pt-6 mt-6 border-t border-red-500/20">
              <h3 className="text-sm font-bold text-red-500 uppercase tracking-wider mb-4">Zona de Peligro</h3>
              
              {profile?.tier === 'free' ? (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl mb-4">
                  <p className="text-sm text-red-400 text-center">
                    En la versión de prueba no es posible eliminar viajes. Actualiza a Standard o Premium para desbloquear la gestión completa.
                  </p>
                </div>
              ) : null}

              <button 
                type="button" 
                onClick={handleDeleteTrip}
                disabled={isDeleting || profile?.tier === 'free'}
                className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-5 h-5" />
                {isDeleting ? 'Eliminando...' : 'Eliminar Viaje'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
