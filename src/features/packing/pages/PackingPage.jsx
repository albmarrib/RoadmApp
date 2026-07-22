import { useEffect, useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { usePackingStore } from '../../../store/packingStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Luggage, Check, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

export default function PackingPage() {
  const { trip } = useOutletContext();
  const { items, subscribeToPacking, toggleItem, deleteItem, addItem, deleteCategory, isLoading } = usePackingStore();
  
  const [expandedCategories, setExpandedCategories] = useState({});
  const [isAdding, setIsAdding] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('VARIOS');

  useEffect(() => {
    if (trip?.id) {
      const unsubscribe = subscribeToPacking(trip.id);
      return () => unsubscribe && unsubscribe();
    }
  }, [trip?.id, subscribeToPacking]);

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const handleDeleteCategory = async (e, category) => {
    e.stopPropagation(); // Evitar que colapse el acordeón
    if (window.confirm(`¿Estás seguro de que quieres borrar TODA la categoría "${category}" y todos sus ítems?`)) {
      await deleteCategory(trip.id, category);
    }
  };

  const handleQuickAdd = (e, category) => {
    e.stopPropagation();
    setNewItemCategory(category);
    setNewItemName('');
    setIsAdding(true);
  };

  const categories = useMemo(() => {
    const cats = {};
    items.forEach(item => {
      if (!cats[item.category]) {
        cats[item.category] = [];
      }
      cats[item.category].push(item);
    });
    return cats;
  }, [items]);

  const totalItems = items.length;
  const packedItems = items.filter(i => i.packed).length;
  const progress = totalItems === 0 ? 0 : Math.round((packedItems / totalItems) * 100);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemCategory.trim()) return;
    await addItem(trip.id, { name: newItemName.trim(), category: newItemCategory.trim().toUpperCase() });
    setNewItemName('');
    setIsAdding(false);
  };

  if (isLoading && totalItems === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-pulse flex flex-col items-center">
          <Luggage className="w-12 h-12 text-teal-500 mb-4 animate-bounce" />
          <p className="text-teal-400 font-medium">Preparando maletas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Dashboard Superior */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <Luggage className="text-teal-400" />
              Equipaje
            </h2>
            <p className="text-slate-400 text-sm">
              Tu lista de imprescindibles para {trip.destination}
            </p>
          </div>
          
          <div className="flex items-center gap-4 bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-800"
                  strokeWidth="3"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-teal-500 drop-shadow-md"
                  strokeDasharray={`${progress}, 100`}
                  strokeWidth="3"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute text-sm font-bold text-white">{progress}%</div>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{packedItems} <span className="text-sm font-normal text-slate-500">/ {totalItems}</span></p>
              <p className="text-xs text-teal-400 font-medium uppercase tracking-wider">Guardados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Botón Principal para Añadir (reemplaza al flotante oculto) */}
      <button 
        onClick={() => { setNewItemCategory(''); setNewItemName(''); setIsAdding(true); }}
        className="w-full bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-400 p-3 rounded-2xl flex items-center justify-center gap-2 font-bold transition-colors"
      >
        <Plus size={20} strokeWidth={3} />
        Añadir Nueva Categoría o Ítem
      </button>

      {/* Lista por Categorías */}
      <div className="space-y-3">
        {Object.entries(categories).map(([category, catItems]) => {
          const isExpanded = expandedCategories[category] !== false;
          const packedInCategory = catItems.filter(i => i.packed).length;
          const isAllPacked = packedInCategory === catItems.length && catItems.length > 0;

          return (
            <motion.div 
              key={category}
              layout
              className={`bg-slate-900 border rounded-xl overflow-hidden transition-colors ${isAllPacked ? 'border-teal-500/30' : 'border-slate-800'}`}
            >
              <button 
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-900/50 hover:bg-slate-800 transition-colors group"
              >
                <div className="flex items-center gap-2">
                  <h3 className={`text-sm font-bold ${isAllPacked ? 'text-teal-400' : 'text-white'}`}>{category}</h3>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-950 rounded text-slate-400">
                    {packedInCategory} / {catItems.length}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <div 
                    onClick={(e) => handleQuickAdd(e, category)}
                    className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1.5 bg-slate-800 hover:bg-teal-500/20 text-slate-400 hover:text-teal-400 rounded-lg transition-all"
                    title={`Añadir a ${category}`}
                  >
                    <Plus size={14} strokeWidth={3} />
                  </div>
                  <div 
                    onClick={(e) => handleDeleteCategory(e, category)}
                    className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1.5 bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-all"
                    title={`Borrar categoría ${category}`}
                  >
                    <Trash2 size={14} />
                  </div>
                  {isExpanded ? <ChevronUp className="text-slate-500 w-4 h-4 ml-1" /> : <ChevronDown className="text-slate-500 w-4 h-4 ml-1" />}
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-slate-800/50 divide-y divide-slate-800/50"
                  >
                    {catItems.map(item => (
                      <div 
                        key={item.id} 
                        onClick={() => toggleItem(trip.id, item.id, item.packed)}
                        className="flex items-center justify-between py-2.5 px-3 hover:bg-slate-800/30 transition-colors group cursor-pointer"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`w-6 h-6 rounded flex items-center justify-center transition-colors border ${item.packed ? 'bg-teal-500 border-teal-500' : 'bg-slate-950 border-slate-700'}`}>
                            {item.packed && <Check className="w-4 h-4 text-slate-900" strokeWidth={3} />}
                          </div>
                          <span className={`text-base font-medium transition-colors ${item.packed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                            {item.name}
                          </span>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteItem(trip.id, item.id); }}
                          className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-2 text-slate-500 hover:text-red-400 transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                    {/* Botón rápido final de lista */}
                    <div 
                      onClick={(e) => handleQuickAdd(e, category)}
                      className="py-2 px-3 hover:bg-slate-800/30 transition-colors flex items-center gap-3 cursor-pointer text-slate-500 hover:text-teal-400"
                    >
                      <div className="w-5 h-5 rounded flex items-center justify-center border border-dashed border-slate-600">
                        <Plus size={12} strokeWidth={3} />
                      </div>
                      <span className="text-sm font-medium">Añadir ítem a {category}...</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Modal para añadir Ítem */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 rounded-3xl p-6 w-full max-w-sm border border-slate-800 shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-4">Añadir a la maleta</h3>
              <form onSubmit={handleAddItem} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nombre del ítem</label>
                  <input 
                    type="text" 
                    value={newItemName}
                    onChange={e => setNewItemName(e.target.value)}
                    placeholder="Ej. Gafas de sol"
                    autoFocus
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Categoría (crea una nueva si quieres)</label>
                  <input 
                    type="text" 
                    value={newItemCategory}
                    onChange={e => setNewItemCategory(e.target.value.toUpperCase())}
                    placeholder="Ej. ESQUÍ"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors uppercase"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setIsAdding(false)}
                    className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 px-4 py-3 bg-teal-500 hover:bg-teal-400 text-slate-900 rounded-xl font-bold transition-colors"
                  >
                    Añadir
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
