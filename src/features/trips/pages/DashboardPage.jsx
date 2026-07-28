import { useEffect, useState } from 'react';
import { useTripStore } from '../../../store/tripStore';
import { useAuthStore } from '../../../store/authStore';
import TripCard from '../components/TripCard';
import CreateTripModal from '../components/CreateTripModal';
import JoinTripModal from '../components/JoinTripModal';
import { Plus, Users } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  const { user, profile } = useAuthStore();
  const { trips, isLoading, fetchMyTrips, error } = useTripStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [filterType, setFilterType] = useState('active'); // 'active' | 'past'

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
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto mt-4 md:mt-0">
          <button 
            onClick={() => setIsJoinModalOpen(true)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 px-5 rounded-xl border border-slate-700 hover:border-slate-600 transition-all flex items-center justify-center gap-2 whitespace-nowrap shadow-lg w-full sm:w-auto"
          >
            <Users className="w-5 h-5 text-indigo-400" />
            <span>Unirse a viaje</span>
          </button>
          
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white font-semibold py-2.5 px-5 rounded-xl shadow-lg shadow-teal-500/25 transition-all flex items-center justify-center gap-2 whitespace-nowrap w-full sm:w-auto"
          >
            <Plus className="w-5 h-5" />
            <span>Nuevo Viaje</span>
          </button>
        </div>
      </header>

      {/* Tabs / Filters */}
      <div className="flex gap-4 border-b border-slate-800 pb-2">
        <button
          onClick={() => setFilterType('active')}
          className={`font-semibold transition-colors ${filterType === 'active' ? 'text-teal-400 border-b-2 border-teal-400 pb-2 -mb-[10px]' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Viajes Activos
        </button>
        <button
          onClick={() => setFilterType('past')}
          className={`font-semibold transition-colors ${filterType === 'past' ? 'text-teal-400 border-b-2 border-teal-400 pb-2 -mb-[10px]' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Viajes Pasados
        </button>
      </div>

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
      ) : (() => {
        const now = new Date();
        now.setHours(0,0,0,0);
        
        const filteredTrips = trips.filter(trip => {
          let isPast = false;
          if (trip.endDate) {
            const end = trip.endDate.toDate ? trip.endDate.toDate() : new Date(trip.endDate);
            // Si el viaje terminó ayer o antes
            if (end < now) isPast = true;
          }
          return filterType === 'active' ? !isPast : isPast;
        });

        // Check if user is standard and identify which trips to lock (only keep 2 most recent unlocked)
        const isStandard = profile?.tier === 'standard' || !profile?.tier;
        
        // Sort trips by createdAt descending to find the newest ones across all trips
        const sortedAllTrips = [...trips].sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return dateB - dateA;
        });

        // The top 2 are unlocked, the rest are locked if standard
        const unlockedTripIds = new Set(sortedAllTrips.slice(0, 2).map(t => t.id));

        if (filteredTrips.length > 0) {
          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTrips.map((trip, idx) => {
                const isLocked = isStandard && !unlockedTripIds.has(trip.id);
                return (
                  <TripCard 
                    key={trip.id} 
                    trip={trip} 
                    userId={user.uid} 
                    delay={idx * 0.1} 
                    isLocked={isLocked}
                  />
                );
              })}
            </div>
          );
        }
        
        if (trips.length > 0) {
          return (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-900/30 rounded-3xl border border-dashed border-slate-700/50">
              <p className="text-slate-400">No hay viajes en esta sección.</p>
            </div>
          );
        }

        return (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-900/30 rounded-3xl border border-dashed border-slate-700/50">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <Plus className="w-10 h-10 text-slate-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No tienes viajes planeados</h3>
            <p className="text-slate-400 max-w-sm text-center mb-6">
              Crea tu primer viaje para empezar a planificar tu itinerario, controlar los gastos y organizar tu equipaje.
            </p>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 px-6 py-2 rounded-xl font-medium transition-colors"
            >
              Crear viaje ahora
            </button>
          </div>
        );
      })()}


      <CreateTripModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      <JoinTripModal isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} />
    </div>
  );
}
