import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, Users, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import TripSettingsModal from './TripSettingsModal';

export default function TripCard({ trip, userId, delay = 0 }) {
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const role = trip.members[userId];
  const startDate = trip.startDate?.toDate();
  const endDate = trip.endDate?.toDate();
  
  const formattedDates = startDate && endDate 
    ? `${format(startDate, "d MMM", { locale: es })} - ${format(endDate, "d MMM, yyyy", { locale: es })}`
    : 'Fechas por definir';

  const handleSettingsClick = (e) => {
    e.stopPropagation();
    setIsSettingsOpen(true);
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        whileHover={{ y: -5, scale: 1.02 }}
        onClick={() => navigate(`/trip/${trip.id}`)}
        className="group relative h-64 rounded-3xl overflow-hidden cursor-pointer shadow-xl border border-slate-700/50"
      >
        {/* Background Image */}
        <img 
          src={trip.coverImageUrl || "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800"} 
          alt={trip.title} 
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent opacity-90 group-hover:opacity-80 transition-opacity"></div>
        
        {/* Content */}
        <div className="absolute inset-0 p-6 flex flex-col justify-end">
          {/* Settings Button (Top Left) */}
          <button 
            onClick={handleSettingsClick}
            className="absolute top-4 left-4 bg-slate-900/50 hover:bg-slate-900/80 backdrop-blur-md p-2 rounded-full border border-slate-700/50 transition-colors opacity-0 group-hover:opacity-100"
            title="Configurar Viaje"
          >
            <Settings className="w-4 h-4 text-slate-300 hover:text-teal-400 transition-colors" />
          </button>

          {/* Role Badge */}
          <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full border border-slate-700/50 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-teal-400" />
            <span className="text-xs font-medium text-slate-300 capitalize">{role}</span>
          </div>

          <h3 className="text-2xl font-bold text-white mb-1 drop-shadow-lg">{trip.title}</h3>
          
          <div className="flex items-center gap-2 text-teal-300 font-medium mb-3">
            <MapPin className="w-4 h-4" />
            <span className="drop-shadow-md">{trip.destination}</span>
          </div>
          
          <div className="flex items-center gap-2 text-slate-300 text-sm">
            <Calendar className="w-4 h-4 opacity-70" />
            <span>{formattedDates}</span>
          </div>
        </div>
      </motion.div>

      <TripSettingsModal 
        trip={trip} 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </>
  );
}
