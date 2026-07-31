import { useState, useEffect } from 'react';
import { useTripStore } from '../../../store/tripStore';
import { useAuthStore } from '../../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { X, Plane, MapPin, Calendar, Image as ImageIcon, UploadCloud } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

export default function CreateTripModal({ isOpen, onClose }) {
  const { trips, createTrip } = useTripStore();
  const { user, profile } = useAuthStore();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [origin, setOrigin] = useState('España');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [coverImagePreview, setCoverImagePreview] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const userTier = profile?.tier || 'free';
  const isFree = userTier === 'free';
  const isStandard = userTier === 'standard';
  const hasReachedLimit = (isFree && trips.length >= 1) || (isStandard && trips.length >= 2);

  const processFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      setCoverImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageChange = (e) => {
    processFile(e.target.files[0]);
  };

  const handlePaste = (e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        processFile(file);
        break;
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title) return;

    setIsLoading(true);
    try {
      const tripData = {
        title,
        destination,
        origin,
        startDate: startDate ? Timestamp.fromDate(new Date(startDate)) : null,
        endDate: endDate ? Timestamp.fromDate(new Date(endDate)) : null,
      };

      const newTripId = await createTrip(tripData, user.uid, coverImageFile);
      onClose();
      navigate(`/trip/${newTripId}`);
    } catch (error) {
      alert("Error creando viaje: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[1000] flex items-start sm:items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
      onPaste={handlePaste}
    >
      <div 
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl my-auto flex flex-col max-h-[95vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-800 shrink-0">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Plane className="w-5 h-5 text-teal-400" />
            Crear Nuevo Viaje
          </h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {hasReachedLimit ? (
          <div className="p-6 text-center space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl inline-block mb-2">
              <Plane className="w-8 h-8 text-amber-500 mx-auto" />
            </div>
            <h3 className="text-xl font-bold text-white">Límite Alcanzado</h3>
            {isFree ? (
              <>
                <p className="text-sm text-slate-400">
                  Prueba gratuita, crea 1 viaje y sube hasta 10 documentos.
                </p>
                <p className="text-sm text-slate-400">
                  Actualiza a la versión Standard o Premium para crear más viajes.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-400">
                  La versión Standard te permite tener un máximo de 2 viajes activos al mismo tiempo.
                </p>
                <p className="text-sm text-slate-400">
                  Hazte Premium para crear viajes ilimitados o elimina un viaje existente para hacer espacio.
                </p>
              </>
            )}
            <div className="pt-6">
              <button
                type="button"
                onClick={onClose}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto hide-scrollbar">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Nombre del Viaje *</label>
            <input 
              type="text" 
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ej: Aventura en Nueva Zelanda"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Origen (Casa)</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input 
                  type="text" 
                  value={origin}
                  onChange={e => setOrigin(e.target.value)}
                  placeholder="Ej: España"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Destino Principal</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input 
                  type="text" 
                  value={destination}
                  onChange={e => setDestination(e.target.value)}
                  placeholder="Ej: Nueva Zelanda"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-300 mb-1">Fecha de Inicio</label>
              <div className="relative min-w-0">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="date" 
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full min-w-0 bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-slate-200 focus:outline-none focus:border-teal-500 text-sm appearance-none"
                />
              </div>
            </div>
            <div className="min-w-0">
              <label className="block text-sm font-medium text-slate-300 mb-1">Fecha de Fin</label>
              <div className="relative min-w-0">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="date" 
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  min={startDate}
                  className="w-full min-w-0 bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-slate-200 focus:outline-none focus:border-teal-500 text-sm appearance-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Imagen de Portada (Opcional)</label>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-700 border-dashed rounded-xl cursor-pointer bg-slate-800/50 hover:bg-slate-800 transition-colors relative overflow-hidden">
              {coverImagePreview ? (
                <img src={coverImagePreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60" />
              ) : null}
              <div className="flex flex-col items-center justify-center pt-5 pb-6 z-10">
                <UploadCloud className="w-8 h-8 mb-2 text-slate-400" />
                <p className="text-sm text-slate-400">
                  <span className="font-semibold">Haz clic para subir</span> una foto
                </p>
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
            </label>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !title}
              className="bg-teal-500 hover:bg-teal-400 text-white font-bold py-2.5 px-6 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center min-w-[120px]"
            >
              {isLoading ? 'Creando...' : 'Crear Viaje'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
