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
    setSelectedNode(node);
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (trip?.id) {
      const unsubscribe = subscribeToNodes(trip.id);
      return () => unsubscribe && unsubscribe();
    }
  }, [trip?.id, subscribeToNodes]);

  // Aplicar filtro actual
  const filteredNodes = nodes.filter(node => {
    if (activeFilter === 'all') return true;
    return node.type === activeFilter;
  });

  // Agrupar nodos filtrados por día para la vista de lista
  const groupedNodes = filteredNodes.reduce((acc, node) => {
    if (!node.startTime) return acc;
    const dateStr = format(node.startTime.toDate(), 'yyyy-MM-dd');
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(node);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedNodes).sort();

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
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500 mr-1" />
          {[
            { id: 'all', label: 'Todos' },
            { id: 'flight', label: 'Vuelos' },
            { id: 'accommodation', label: 'Hoteles' },
            { id: 'activity', label: 'Actividades' },
            { id: 'drive', label: 'Rutas' },
            { id: 'car_rental', label: 'Alquiler' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                activeFilter === f.id 
                  ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' 
                  : 'bg-slate-900 text-slate-400 border border-slate-700 hover:bg-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
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
              <div className="space-y-10">
                {sortedDates.length > 0 ? sortedDates.map((dateStr) => (
                  <div key={dateStr}>
                    <h3 className="text-lg font-bold text-teal-400 mb-6 bg-slate-900 sticky top-20 z-10 py-2 border-b border-slate-800">
                      {format(new Date(dateStr), "EEEE, d 'de' MMMM", { locale: es })}
                    </h3>
                    <div className="ml-2">
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
