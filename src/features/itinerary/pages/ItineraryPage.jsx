import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useItineraryStore } from '../../../store/itineraryStore';
import TimelineNode from '../components/TimelineNode';
import NodeModal from '../components/NodeModal';
import ItineraryCalendar from '../components/ItineraryCalendar';
import { Plus, List, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

export default function ItineraryPage() {
  const { trip } = useOutletContext();
  const { nodes, subscribeToNodes, isLoading } = useItineraryStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  
  // Filtros rápidos
  const [activeFilter, setActiveFilter] = useState('all');

  const openCreateModal = () => {
    setSelectedNode(null);
    setIsModalOpen(true);
  };

  const openEditModal = (node) => {
    // Si es un nodo virtual (ej. devolución), buscar el original en la lista real
    const realNode = node.originalId ? nodes.find(n => n.id === node.originalId) : node;
    setSelectedNode(realNode || node);
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (trip?.id) {
      const unsubscribe = subscribeToNodes(trip.id);
      return () => unsubscribe && unsubscribe();
    }
  }, [trip?.id, subscribeToNodes]);

  // Expandir nodos para que los alquileres de coche generen un evento virtual de devolución
  const expandedNodes = [];
  nodes.forEach(node => {
    expandedNodes.push(node);
    if (node.type === 'car_rental' && node.endTime) {
      const clone = {
        ...node,
        id: `${node.id}-dropoff`,
        originalId: node.id,
        title: `${node.title} (Devolución)`,
        startTime: node.endTime,
        location: node.dropoffLocation || node.location,
        isDropoff: true,
        cost: 0 
      };
      expandedNodes.push(clone);
    }
  });

  // Aplicar filtro actual
  const filteredNodes = expandedNodes.filter(node => {
    if (activeFilter === 'all') return true;
    return node.type === activeFilter;
  });

  // Agrupar nodos filtrados por día para la vista de lista
  const groupedNodes = filteredNodes.reduce((acc, node) => {
    const dateStr = node.startTime ? format(node.startTime.toDate(), 'yyyy-MM-dd') : 'Sin Fecha';
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(node);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedNodes).sort((a, b) => {
    if (a === 'Sin Fecha') return -1; // Sin Fecha al principio
    if (b === 'Sin Fecha') return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Tu Itinerario</h2>
        <button 
          onClick={openCreateModal}
          className="bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 border border-teal-500/30 font-medium py-2 px-4 rounded-xl transition-all flex items-center gap-2 shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Añadir Paso</span>
        </button>
      </div>

      {/* Controles: Vista y Filtros */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        
        {/* Toggle Vista */}
        <div className="flex p-1 bg-slate-900 border border-slate-700 rounded-xl">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'list' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <List className="w-4 h-4" /> Lista
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'calendar' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <CalendarIcon className="w-4 h-4" /> Calendario
          </button>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-500 hidden sm:block" />
          <div className="relative w-full sm:w-auto">
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="w-full sm:w-auto appearance-none bg-slate-900 border border-slate-700 text-slate-300 text-sm font-medium rounded-xl px-4 py-2 pr-8 hover:border-teal-500/50 focus:outline-none focus:border-teal-500 transition-colors"
            >
              <option value="all">Todos los eventos</option>
              <option value="flight">Vuelos</option>
              <option value="accommodation">Hoteles</option>
              <option value="activity">Actividades</option>
              <option value="drive">Rutas</option>
              <option value="car_rental">Coches de Alquiler</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>
      </div>

      {isLoading && nodes.length === 0 ? (
        <div className="text-slate-400 text-center py-10 animate-pulse">Cargando itinerario...</div>
      ) : nodes.length > 0 ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {viewMode === 'calendar' ? (
              <ItineraryCalendar 
                nodes={filteredNodes} 
                trip={trip} 
                onNodeClick={openEditModal} 
              />
            ) : (
              <div className="space-y-4">
                {sortedDates.length > 0 ? sortedDates.map((dateStr) => (
                  <div key={dateStr} className="pb-2">
                    <div className="flex justify-center sticky top-20 z-10 py-2 bg-slate-950/90 backdrop-blur-md -mx-4 px-4 mb-1">
                      <span className="text-[10px] sm:text-xs font-bold text-teal-400 uppercase tracking-widest bg-teal-500/10 border border-teal-500/30 shadow-lg px-4 py-1.5 rounded-full">
                        {dateStr === 'Sin Fecha' ? 'Sin Fecha' : format(new Date(dateStr), "EEEE, d 'de' MMMM", { locale: es })}
                      </span>
                    </div>
                    <div>
                      {groupedNodes[dateStr].map((node, index) => (
                        <TimelineNode 
                          key={node.id} 
                          node={node} 
                          isLast={index === groupedNodes[dateStr].length - 1} 
                          onClick={openEditModal}
                        />
                      ))}
                    </div>
                  </div>
                )) : (
                  <p className="text-slate-400 text-center py-10 italic">No hay eventos que coincidan con este filtro.</p>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      ) : (
        <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-dashed border-slate-700">
          <p className="text-slate-400 mb-4">Aún no hay paradas en tu viaje.</p>
          <button 
            onClick={openCreateModal}
            className="bg-slate-800 text-white font-medium py-2 px-4 rounded-xl hover:bg-slate-700 transition-colors"
          >
            Crea la primera parada
          </button>
        </div>
      )}

      {/* Modal para crear y editar nodos */}
      <NodeModal 
        tripId={trip?.id} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        editingNode={selectedNode}
      />
    </div>
  );
}
