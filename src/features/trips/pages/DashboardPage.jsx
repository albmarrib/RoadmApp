import { useEffect } from 'react';
import { useTripStore } from '../../../store/tripStore';
import { useAuthStore } from '../../../store/authStore';
import TripCard from '../components/TripCard';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  const { user, profile } = useAuthStore();
  const { trips, isLoading, fetchMyTrips, error } = useTripStore();

  useEffect(() => {
    if (user?.uid) {
      fetchMyTrips(user.uid);
    }
  }, [user, fetchMyTrips]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-bold text-white mb-2"
          >
            Hola, <span className="text-teal-400">{profile?.displayName || 'Viajero'}</span>
          </motion.h1>
          <p className="text-slate-400">¿A dónde vamos hoy?</p>
        </div>
        
        <button className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white font-semibold py-2.5 px-5 rounded-xl shadow-lg shadow-teal-500/25 transition-all flex items-center justify-center gap-2 whitespace-nowrap">
          <Plus className="w-5 h-5" />
          <span>Nuevo Viaje</span>
        </button>
      </header>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl">
          Error al cargar viajes: {error}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-slate-800/50 rounded-3xl animate-pulse border border-slate-700/30"></div>
          ))}
        </div>
      ) : trips.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip, idx) => (
            <TripCard key={trip.id} trip={trip} userId={user.uid} delay={idx * 0.1} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-900/30 rounded-3xl border border-dashed border-slate-700/50">
          <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <Plus className="w-10 h-10 text-slate-500" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No tienes viajes planeados</h3>
          <p className="text-slate-400 max-w-sm text-center">
            Crea tu primer viaje para empezar a planificar tu itinerario, controlar los gastos y organizar tu equipaje.
          </p>
        </div>
      )}
    </div>
  );
}
