import { useState } from 'react';
import { useTripStore } from '../../../store/tripStore';
import { useAuthStore } from '../../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { X, Users, KeyRound } from 'lucide-react';

export default function JoinTripModal({ isOpen, onClose }) {
  const { trips, joinTripByCode } = useTripStore();
  const { user, profile } = useAuthStore();
  const navigate = useNavigate();

  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const isStandard = profile?.tier === 'standard' || !profile?.tier;
  const hasReachedLimit = isStandard && trips.length >= 2;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const tripId = await joinTripByCode(inviteCode.trim(), user.uid);
      onClose();
      navigate(`/trip/${tripId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            Unirse a un Viaje
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
              <Users className="w-8 h-8 text-amber-500 mx-auto" />
            </div>
            <h3 className="text-xl font-bold text-white">Límite Alcanzado</h3>
            <p className="text-sm text-slate-400">
              La versión Standard te permite tener un máximo de 2 viajes activos al mismo tiempo.
            </p>
            <p className="text-sm text-slate-400">
              Hazte Premium para unirte a viajes ilimitados o elimina un viaje existente para hacer espacio.
            </p>
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
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <p className="text-sm text-slate-400 mb-4">
              Introduce el código de 6 caracteres que te ha compartido el creador del viaje para unirte como compañero.
            </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Código de Invitación</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input 
                type="text" 
                required
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Ej: NZ-8X4A"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-center text-lg tracking-widest font-mono"
              />
            </div>
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
              disabled={isLoading || !inviteCode.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-6 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center min-w-[120px]"
            >
              {isLoading ? 'Comprobando...' : 'Unirse'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
