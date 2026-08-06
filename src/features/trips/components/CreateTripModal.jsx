import { useState } from 'react';
import { useTripStore } from '../../../store/tripStore';
import { useAuthStore } from '../../../store/authStore';
import { useOnboardingStore } from '../../../store/onboardingStore';
import { useNavigate } from 'react-router-dom';
import { X, Plane, MapPin, Calendar, Image as ImageIcon, UploadCloud, ChevronRight, ChevronLeft, ShieldAlert, Briefcase, Mail, CloudDownload, Printer, Sparkles, Smartphone, Download } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';

export default function CreateTripModal({ isOpen, onClose }) {
  const { trips, createTrip } = useTripStore();
  const { user, profile } = useAuthStore();
  const { resetOnboarding } = useOnboardingStore();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [resetHints, setResetHints] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    origin: 'España',
    destination: '',
    startDate: '',
    endDate: '',
    budget: '',
    currency: 'EUR',
    exchangeRate: 1,
    isGroupMode: false,
    splitMembersStr: '',
    insuranceName: '',
    agencyName: '',
    emailAlias: '',
  });
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [coverImagePreview, setCoverImagePreview] = useState('');

  if (!isOpen) return null;

  const userTier = profile?.tier || 'free';
  const isFree = userTier === 'free';
  const isStandard = userTier === 'standard';
  const hasReachedLimit = (isFree && trips.length >= 1) || (isStandard && trips.length >= 2);

  const processFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      setCoverImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setCoverImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleNext = () => setStep(s => Math.min(s + 1, 6));
  const handlePrev = () => setStep(s => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const tripData = {
        ...formData,
        budget: formData.budget ? parseFloat(formData.budget) : 0,
        exchangeRate: parseFloat(formData.exchangeRate) || 1,
        startDate: formData.startDate ? Timestamp.fromDate(new Date(`${formData.startDate}T12:00:00`)) : null,
        endDate: formData.endDate ? Timestamp.fromDate(new Date(`${formData.endDate}T12:00:00`)) : null,
        emailAlias: formData.emailAlias ? formData.emailAlias.toLowerCase().trim() : '',
        splitMembers: formData.isGroupMode && formData.splitMembersStr ? formData.splitMembersStr.split(',').map(m => m.trim()).filter(Boolean) : [],
      };

      const newTripId = await createTrip(tripData, user.uid, coverImageFile);
      if (resetHints) {
        resetOnboarding();
      }
      onClose();
      navigate(`/trip/${newTripId}/itinerary`); // Redirect directly to itinerary to start adding
    } catch (error) {
      alert("Error creando viaje: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- RENDERS DE PASOS ---

  const renderStep0 = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-left space-y-5 py-2">
      <div className="flex items-center gap-4 mb-2">
        <div className="w-14 h-14 bg-teal-500/20 rounded-full flex items-center justify-center shrink-0">
          <Smartphone className="w-7 h-7 text-teal-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white leading-tight">¿Ya tienes la App instalada?</h3>
          <p className="text-sm text-teal-400 font-medium mt-1">Mejora tu experiencia al 100%</p>
        </div>
      </div>
      
      <p className="text-slate-300 text-sm">
        Para disfrutar de RoadmApp sin conexión a internet y tener un acceso rápido, te recomendamos guardar esta página como una App nativa en tu teléfono:
      </p>

      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-4">
        <div>
          <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2 mb-1">
            <span className="text-xl">🍏</span> En iPhone (iOS)
          </h4>
          <p className="text-xs text-slate-400">Toca el botón <span className="inline-block border border-slate-600 rounded px-1">Compartir</span> en la barra de Safari y selecciona <strong>"Añadir a la pantalla de inicio"</strong>.</p>
        </div>
        <div className="h-px bg-slate-800"></div>
        <div>
          <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2 mb-1">
            <span className="text-xl">🤖</span> En Android
          </h4>
          <p className="text-xs text-slate-400">Toca el menú de opciones <span className="inline-block border border-slate-600 rounded px-1">⋮</span> de Chrome y selecciona <strong>"Añadir a la pantalla de inicio"</strong> o "Instalar Aplicación".</p>
        </div>
      </div>

      <p className="text-slate-400 text-xs text-center italic mt-4">
        Si ya lo has hecho o prefieres seguir en el navegador, pulsa en Continuar.
      </p>
    </motion.div>
  );

  const renderStep1 = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5 w-full">
      <h3 className="text-xl font-bold text-teal-400 flex items-center gap-2 mb-4"><Plane /> Lo Esencial</h3>
      
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Nombre del Viaje *</label>
        <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ej: Ruta por Japón" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500" />
      </div>
      <div className="flex flex-col sm:grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Origen</label>
          <input type="text" value={formData.origin} onChange={e => setFormData({...formData, origin: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Destino *</label>
          <input required type="text" value={formData.destination} onChange={e => setFormData({...formData, destination: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500" />
        </div>
      </div>
      <div className="flex flex-col sm:grid sm:grid-cols-2 gap-4">
        <div className="w-full min-w-0">
          <label className="block text-sm font-medium text-slate-300 mb-1">Inicio</label>
          <input 
            type="date" 
            value={formData.startDate} 
            onChange={e => {
              const newStart = e.target.value;
              let newEnd = formData.endDate;
              if (newStart && newEnd && newStart > newEnd) {
                newEnd = newStart;
              }
              setFormData({...formData, startDate: newStart, endDate: newEnd});
            }} 
            className="w-full min-w-0 max-w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-teal-500 appearance-none box-border" 
          />
        </div>
        <div className="w-full min-w-0">
          <label className="block text-sm font-medium text-slate-300 mb-1">Fin</label>
          <input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} min={formData.startDate} className="w-full min-w-0 max-w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-teal-500 appearance-none box-border" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Foto de Portada</label>
        <label className="flex items-center justify-center w-full h-24 border-2 border-slate-700 border-dashed rounded-xl cursor-pointer bg-slate-950 hover:bg-slate-900 transition-colors relative overflow-hidden">
          {coverImagePreview ? (
            <img src={coverImagePreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60" />
          ) : (
            <div className="flex flex-col items-center justify-center">
              <UploadCloud className="w-6 h-6 text-slate-400 mb-1" />
              <span className="text-xs text-slate-400">Clic para subir foto</span>
            </div>
          )}
          <input type="file" className="hidden" accept="image/*" onChange={e => processFile(e.target.files[0])} />
        </label>
      </div>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5 w-full">
      <h3 className="text-xl font-bold text-teal-400 flex items-center gap-2 mb-4"><Briefcase /> Detalles Extra</h3>
      
      <div className="flex flex-col sm:grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Presupuesto</label>
          <input type="number" value={formData.budget} onChange={e => setFormData({...formData, budget: e.target.value})} placeholder="Ej: 2000" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Moneda</label>
          <input type="text" value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} placeholder="EUR" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 uppercase" maxLength={3} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Factor de Conversión</label>
        <p className="text-xs text-slate-400 mb-2">
          ¿A cuánto equivale 1 unidad de la moneda local en tu moneda base (Ej. EUR)? <br/>
          Si viajas a USA y 1 USD = 0.92 EUR, pon <b>0.92</b>.
        </p>
        <input type="number" step="0.0001" value={formData.exchangeRate} onChange={e => setFormData({...formData, exchangeRate: e.target.value})} placeholder="Ej: 0.92" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Agencia (Opcional)</label>
        <input type="text" value={formData.agencyName} onChange={e => setFormData({...formData, agencyName: e.target.value})} placeholder="Ej: Viajes El Corte Inglés" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Seguro (Opcional)</label>
        <input type="text" value={formData.insuranceName} onChange={e => setFormData({...formData, insuranceName: e.target.value})} placeholder="Ej: IATI Seguros" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500" />
      </div>
      
      <label className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl cursor-pointer mt-4">
        <input type="checkbox" checked={formData.isGroupMode} onChange={e => setFormData({...formData, isGroupMode: e.target.checked})} className="w-5 h-5 rounded border-slate-600 text-teal-500 focus:ring-teal-500 bg-slate-950" />
        <div>
          <span className="block text-sm font-bold text-white">¿Es un viaje en grupo?</span>
          <span className="block text-xs text-slate-400">Activa el modo Cuentas Claras para dividir gastos.</span>
        </div>
      </label>
      
      {formData.isGroupMode && (
        <motion.div initial={{opacity: 0, height: 0}} animate={{opacity: 1, height: 'auto'}} className="mt-3">
          <label className="block text-sm font-medium text-slate-300 mb-1">Miembros del Grupo</label>
          <p className="text-xs text-slate-400 mb-2">Pon los nombres separados por coma. Ej: Ana, Juan, Pedro</p>
          <input type="text" value={formData.splitMembersStr} onChange={e => setFormData({...formData, splitMembersStr: e.target.value})} placeholder="Ej: Ana, Juan, Pedro" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500" />
        </motion.div>
      )}
    </motion.div>
  );

  const renderStep3 = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-center space-y-6 py-4 w-full">
      <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-700">
        <ShieldAlert className="w-8 h-8 text-emerald-400" />
      </div>
      <h3 className="text-xl font-bold text-emerald-400">Tus Documentos a Salvo</h3>
      <p className="text-slate-300 text-left">
        Una vez creado el viaje, tendrás una sección llamada <strong>Docs / Personales</strong>.
      </p>
      <p className="text-slate-400 text-left text-sm">
        Te recomiendo subir ahí fotos de tu <strong>Pasaporte, DNI o Carnet de Conducir</strong>. RoadmApp es tu caja fuerte digital. Si pierdes la cartera, lo tendrás todo a un clic.
      </p>
    </motion.div>
  );

  const renderStep4 = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 w-full">
      <div className="flex justify-center mb-2">
        <Mail className="w-12 h-12 text-indigo-400" />
      </div>
      <h3 className="text-xl font-bold text-indigo-400 text-center">La Magia del Itinerario</h3>
      <p className="text-sm text-slate-300">
        Puedes crear tu itinerario manualmente añadiendo cada parada, ruta, hotel etc y luego adjuntando los documentos que desees en cada paso, PERO! hay una forma automática con nuestra IA:
      </p>
      <div className="bg-indigo-500/10 border border-indigo-500/30 p-4 rounded-xl text-sm text-slate-300 space-y-2">
        <p>1. Sube tus documentos (PDF, word, emails...) a la pestaña <strong>DOCS</strong>, o reenvíalos al email único de tu viaje.</p>
        <p>2. Pulsa en <strong>Analizar con IA</strong>.</p>
        <p>3. <strong>Nuestra IA extrae los datos y crea todas las paradas y vuelos por ti.</strong></p>
      </div>
      <div>
        <label className="block text-sm font-medium text-indigo-300 mb-1">Crea tu Alias de Email ahora:</label>
        <div className="flex flex-col sm:flex-row rounded-xl overflow-hidden border border-indigo-500/30">
          <input type="text" value={formData.emailAlias} onChange={e => setFormData({...formData, emailAlias: e.target.value.replace(/[^a-zA-Z0-9]/g, '')})} className="w-full bg-slate-950 px-4 py-3 text-white focus:outline-none" placeholder="Ej: japon26" />
          <div className="bg-indigo-900/30 text-indigo-300 px-4 py-3 flex items-center text-sm font-mono whitespace-nowrap">
            @roadmapp.axonailabs.es
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderStep5 = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-center space-y-6 py-4 w-full">
      <div className="flex justify-center gap-4 mb-4">
        <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700">
          <CloudDownload className="w-8 h-8 text-blue-400" />
        </div>
        <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700">
          <Printer className="w-8 h-8 text-slate-300" />
        </div>
      </div>
      <h3 className="text-xl font-bold text-blue-400">Siempre Disponible</h3>
      <p className="text-slate-300 text-left">
        ¿Viajas a un país sin datos móviles en la calle? No hay problema.
      </p>
      <ul className="text-slate-400 text-left text-sm list-disc pl-5 space-y-2">
        <li>Pulsa el <strong>icono de la Nube</strong> para guardar todos tus PDFs de reservas en el móvil.</li>
        <li>Usa el <strong>icono de la Impresora</strong> para sacar una copia en papel de toda tu ruta.</li>
      </ul>
    </motion.div>
  );

  const renderStep6 = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-center space-y-6 py-4 w-full">
      <div className="w-20 h-20 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <Plane className="w-10 h-10 text-teal-400" />
      </div>
      <h3 className="text-2xl font-bold text-white">¡Todo Listo!</h3>
      <p className="text-slate-300">
        Tu viaje {formData.title ? <strong>"{formData.title}"</strong> : ""} está configurado. Ahora mismo tu lienzo está en blanco.
      </p>
      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-left text-sm text-slate-300">
        <p className="font-bold text-teal-400 mb-2">Siguientes pasos:</p>
        <p className="mb-2">A) <strong>La Vía Rápida:</strong> Ve a Docs y sube un archivo, o reenvía un email a tu nuevo alias para usar la IA.</p>
        <p>B) <strong>Paso a Paso:</strong> Ve al Itinerario y crea tu primer evento manualmente.</p>
      </div>
      
      <label className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl cursor-pointer mt-4 text-left">
        <input type="checkbox" checked={resetHints} onChange={e => setResetHints(e.target.checked)} className="w-5 h-5 rounded border-slate-600 text-teal-500 focus:ring-teal-500 bg-slate-950 shrink-0" />
        <div>
          <span className="block text-sm font-bold text-white">Reactivar globos de ayuda</span>
          <span className="block text-xs text-slate-400">Si lo marcas, volverás a ver los consejos interactivos en el Mapa, Equipaje y Finanzas.</span>
        </div>
      </label>
      
      <p className="text-lg font-bold text-white pt-2">¿Creamos el viaje?</p>
    </motion.div>
  );

  const stepsContent = [renderStep0, renderStep1, renderStep2, renderStep3, renderStep4, renderStep5, renderStep6];
  const canGoNext = step !== 1 || (formData.title && formData.destination); // Required fields in step 1

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md">
        
        {hasReachedLimit ? (
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg p-8 text-center shadow-2xl relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X /></button>
            <Plane className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">Límite Alcanzado</h3>
            <p className="text-slate-400 mb-6">Actualiza tu plan para crear más viajes.</p>
            <button onClick={onClose} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors">Cerrar</button>
          </div>
        ) : (
          
          <motion.form 
            onSubmit={(e) => {
              e.preventDefault();
              if (step < stepsContent.length - 1 && canGoNext) {
                handleNext();
              } else if (step === stepsContent.length - 1) {
                handleSubmit();
              }
            }}
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
          >
            {/* Progress Bar */}
            <div className="w-full bg-slate-800 h-1.5 flex">
              {stepsContent.map((_, i) => (
                <div key={i} className={`h-full flex-1 ${i <= step ? 'bg-teal-500' : ''} transition-colors duration-300`} />
              ))}
            </div>

            <div className="flex justify-between items-center p-4 border-b border-slate-800/50">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Paso {step + 1} de {stepsContent.length}</span>
              <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 md:p-8 min-h-[350px] flex flex-col justify-center overflow-y-auto overflow-x-hidden w-full box-border">
              <AnimatePresence mode="wait">
                <div key={step} className="w-full">
                  {stepsContent[step]()}
                </div>
              </AnimatePresence>
            </div>

            <div className="p-4 bg-slate-950/50 flex justify-between items-center border-t border-slate-800/50">
              {step > 0 ? (
                <button type="button" onClick={handlePrev} className="text-slate-400 hover:text-white px-4 py-2 font-medium flex items-center gap-1 transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Atrás
                </button>
              ) : <div></div>}

              {step < stepsContent.length - 1 ? (
                <button 
                  type="submit"
                  disabled={!canGoNext}
                  className="bg-teal-500 hover:bg-teal-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold px-6 py-2.5 rounded-xl transition-colors flex items-center gap-1"
                >
                  Siguiente <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold px-8 py-2.5 rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isLoading ? 'Viajando...' : '¡Crear Viaje!'} <Plane className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.form>
        )}
      </div>
    </AnimatePresence>
  );
}
