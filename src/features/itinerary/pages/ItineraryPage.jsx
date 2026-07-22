import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useItineraryStore } from '../../../store/itineraryStore';
import TimelineNode from '../components/TimelineNode';
import NodeModal from '../components/NodeModal';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';

export default function ItineraryPage() {
  const { trip } = useOutletContext();
  const { nodes, subscribeToNodes, isLoading } = useItineraryStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);

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

  // Agrupar nodos por día (usando startDate como clave)
  const groupedNodes = nodes.reduce((acc, node) => {
    if (!node.startTime) return acc;
    const dateStr = format(node.startTime.toDate(), 'yyyy-MM-dd');
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(node);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedNodes).sort();

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-white">Tu Itinerario</h2>
        <button 
          onClick={openCreateModal}
          className="bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 border border-teal-500/30 font-medium py-2 px-4 rounded-xl transition-all flex items-center gap-2 shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span>Añadir Paso</span>
        </button>
      </div>

      {isLoading && nodes.length === 0 ? (
        <div className="text-slate-400 text-center py-10 animate-pulse">Cargando itinerario...</div>
      ) : sortedDates.length > 0 ? (
        <div className="space-y-10">
          {sortedDates.map((dateStr) => (
            <motion.div 
              key={dateStr}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
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
            </motion.div>
          ))}
        </div>
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
