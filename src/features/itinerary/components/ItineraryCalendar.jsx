import { useState } from 'react';
import { format, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plane, Hotel, CarFront, MapPin, Route, CalendarDays, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TimelineNode from './TimelineNode';

const getIcon = (type) => {
  switch (type) {
    case 'flight': return <Plane className="w-3 h-3 text-blue-400" />;
    case 'accommodation': return <Hotel className="w-3 h-3 text-orange-400" />;
    case 'car_rental': return <CarFront className="w-3 h-3 text-purple-400" />;
    case 'drive': return <Route className="w-3 h-3 text-indigo-400" />;
    default: return <MapPin className="w-3 h-3 text-teal-400" />;
  }
};

const getBgColor = (type) => {
  switch (type) {
    case 'flight': return 'bg-blue-400/20 border-blue-400/30';
    case 'accommodation': return 'bg-orange-400/20 border-orange-400/30';
    case 'car_rental': return 'bg-purple-400/20 border-purple-400/30';
    case 'drive': return 'bg-indigo-400/20 border-indigo-400/30';
    default: return 'bg-teal-400/20 border-teal-400/30';
  }
};

export default function ItineraryCalendar({ nodes, trip, onNodeClick }) {
  const [selectedDate, setSelectedDate] = useState(null);

  // Determinar el rango del viaje, garantizando que todos los nodos queden incluidos
  const getTripInterval = () => {
    let start = trip?.startDate ? trip.startDate.toDate() : new Date();
    let end = trip?.endDate ? trip.endDate.toDate() : new Date();

    const nodeDates = nodes.map(n => n.startTime?.toDate()).filter(Boolean).sort((a, b) => a - b);
    
    if (nodeDates.length > 0) {
      if (nodeDates[0] < start) start = nodeDates[0];
      if (nodeDates[nodeDates.length - 1] > end) end = nodeDates[nodeDates.length - 1];
    }
    
    // Extender a semanas completas (Lunes a Domingo)
    const calendarStart = startOfWeek(start, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(end, { weekStartsOn: 1 });
    
    return { start: calendarStart, end: calendarEnd, tripStart: start, tripEnd: end };
  };

  const { start, end, tripStart, tripEnd } = getTripInterval();
  const days = eachDayOfInterval({ start, end });

  // Agrupar nodos por día para el calendario
  const nodesByDate = nodes.reduce((acc, node) => {
    if (!node.startTime) return acc;
    const dateStr = format(node.startTime.toDate(), 'yyyy-MM-dd');
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(node);
    return acc;
  }, {});

  // Nodos del día seleccionado para mostrarlos debajo
  const selectedNodes = selectedDate ? (nodesByDate[format(selectedDate, 'yyyy-MM-dd')] || []) : [];

  return (
    <div className="space-y-6">
      {/* Scroll horizontal de días del viaje */}
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-4 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays className="w-5 h-5 text-teal-400" />
          <h3 className="text-lg font-bold text-white">Días del Viaje</h3>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-slate-500 mb-1">{d}</div>
          ))}
          {days.map((day, idx) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayNodes = nodesByDate[dateKey] || [];
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            
            // Comprobar si el día está dentro del viaje real o es relleno de semana
            const isWithinTrip = isWithinInterval(day, { start: tripStart, end: tripEnd }) || dayNodes.length > 0;
            
            return (
              <div 
                key={idx}
                onClick={() => isWithinTrip && setSelectedDate(day)}
                className={`
                  relative min-h-[70px] p-2 rounded-2xl transition-all border flex flex-col
                  ${isWithinTrip ? 'cursor-pointer' : 'opacity-30 cursor-not-allowed'}
                  ${isSelected ? 'bg-slate-800 border-teal-500 ring-1 ring-teal-500/50 shadow-md' : 'bg-slate-900/50 border-slate-700/50 hover:border-slate-500 hover:bg-slate-800/50'}
                `}
              >
                <div className="flex flex-col mb-1 items-center">
                  <span className={`text-lg font-black leading-none ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                    {format(day, 'd')}
                  </span>
                  <span className="text-[9px] font-medium text-slate-400 mt-1">
                    {format(day, 'MMM', { locale: es })}
                  </span>
                </div>
                
                {/* Eventos del día (Puntos o iconos) */}
                <div className="flex flex-wrap gap-1 mt-auto justify-center">
                  {dayNodes.map((node, i) => (
                    <div 
                      key={node.id} 
                      className={`w-3 h-3 rounded-full border ${getBgColor(node.type)}`}
                      title={node.title}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de eventos del día seleccionado */}
      <AnimatePresence>
        {selectedDate && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setSelectedDate(null)}
            ></motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 flex flex-col max-h-[85vh] overflow-hidden"
            >
              <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
                <h4 className="text-xl font-bold text-white">
                  {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                </h4>
                <button 
                  onClick={() => setSelectedDate(null)}
                  className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="overflow-y-auto hide-scrollbar flex-1 pr-1">
                {selectedNodes.length > 0 ? (
                  <div className="space-y-0">
                    {selectedNodes.map((node, index) => (
                      <TimelineNode 
                        key={node.id} 
                        node={node} 
                        isLast={index === selectedNodes.length - 1}
                        onClick={(n) => { setSelectedDate(null); onNodeClick(n); }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 bg-slate-800/50 rounded-2xl border border-dashed border-slate-700">
                    <p className="text-slate-400 font-medium">Día libre. No hay eventos planificados.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
