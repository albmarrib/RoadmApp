import { useState } from 'react';
import { format, eachDayOfInterval, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Plane, Hotel, CarFront, MapPin, Route, CalendarDays } from 'lucide-react';
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
    
    return { start, end };
  };

  const { start, end } = getTripInterval();
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

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-2">
          {days.map((day, idx) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayNodes = nodesByDate[dateKey] || [];
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            
            return (
              <div 
                key={idx}
                onClick={() => setSelectedDate(day)}
                className={`
                  relative min-h-[70px] p-2 rounded-2xl cursor-pointer transition-all border flex flex-col
                  ${isSelected ? 'bg-slate-800 border-teal-500 ring-1 ring-teal-500/50 shadow-md' : 'bg-slate-900/50 border-slate-700/50 hover:border-slate-500 hover:bg-slate-800/50'}
                `}
              >
                <div className="flex flex-col mb-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-teal-400' : 'text-slate-500'}`}>
                    {format(day, 'EEEE', { locale: es })}
                  </span>
                  <span className={`text-lg font-black leading-none ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                    {format(day, 'd')}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400">
                    {format(day, 'MMM', { locale: es })}
                  </span>
                </div>
                
                {/* Eventos del día (Puntos o iconos) */}
                <div className="flex flex-wrap gap-1 mt-auto pt-2">
                  {dayNodes.map((node, i) => (
                    <div 
                      key={node.id} 
                      className={`w-4 h-4 rounded-md flex items-center justify-center border ${getBgColor(node.type)}`}
                      title={node.title}
                    >
                      {getIcon(node.type)}
                    </div>
                  ))}
                  {dayNodes.length === 0 && (
                    <div className="w-full h-4 rounded-md border border-dashed border-slate-700/50"></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lista de eventos del día seleccionado */}
      <AnimatePresence mode="wait">
        {selectedDate && (
          <motion.div 
            key={selectedDate.toString()}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-slate-900/50 rounded-3xl p-6 border border-slate-700"
          >
            <h4 className="text-teal-400 font-bold mb-6 border-b border-slate-700 pb-2">
              Eventos del {format(selectedDate, "d 'de' MMMM", { locale: es })}
            </h4>
            
            {selectedNodes.length > 0 ? (
              <div className="space-y-8 ml-2">
                {selectedNodes.map((node, index) => (
                  <TimelineNode 
                    key={node.id} 
                    node={node} 
                    isLast={index === selectedNodes.length - 1}
                    onClick={onNodeClick}
                  />
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-sm italic">Día libre. No hay eventos planificados.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
