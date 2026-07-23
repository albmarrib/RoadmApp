import { useEffect, useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { usePackingStore } from '../../../store/packingStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Luggage, Check, Plus, Trash2, ChevronDown, ChevronUp, ScanBarcode, X, Camera, Eye } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

export default function PackingPage() {
  const { trip } = useOutletContext();
  const { items, subscribeToPacking, toggleItem, deleteItem, addItem, deleteCategory, isLoading } = usePackingStore();
  
  const [expandedCategories, setExpandedCategories] = useState({});
  const [isAdding, setIsAdding] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('VARIOS');

  // Scanner States
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState('');
  const [suitcaseName, setSuitcaseName] = useState('');
  const [flightLeg, setFlightLeg] = useState('');
  const [luggagePhotoFile, setLuggagePhotoFile] = useState(null);
  const [luggagePhotoPreview, setLuggagePhotoPreview] = useState(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isTagDetailsModalOpen, setIsTagDetailsModalOpen] = useState(false);

  // View Card State
  const [selectedTag, setSelectedTag] = useState(null);

  useEffect(() => {
    if (trip?.id) {
      const unsubscribe = subscribeToPacking(trip.id);
      return () => unsubscribe && unsubscribe();
    }
  }, [trip?.id, subscribeToPacking]);

  useEffect(() => {
    let html5QrCode;
    if (isScanning) {
      html5QrCode = new Html5Qrcode("reader");
      html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          setScannedCode(decodedText);
          html5QrCode.stop().then(() => {
            setIsScanning(false);
            setIsTagDetailsModalOpen(true);
            setSuitcaseName('Maleta Principal');
            setFlightLeg('');
          });
        },
        () => {} // Ignorar errores de frame
      ).catch(err => {
        console.error("Error al iniciar cámara", err);
        alert("No se pudo iniciar la cámara. Revisa los permisos.");
        setIsScanning(false);
      });
    }

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(console.error);
      }
    };
  }, [isScanning]);

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

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLuggagePhotoFile(file);
      setLuggagePhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveScannedTag = async (e) => {
    e.preventDefault();
    setIsUploadingPhoto(true);
    try {
      const tagName = flightLeg.trim() 
        ? `Etiqueta: ${scannedCode} (${flightLeg})`
        : `Etiqueta: ${scannedCode}`;
        
      let photoUrl = null;
      if (luggagePhotoFile) {
        photoUrl = await usePackingStore.getState().uploadLuggagePhoto(trip.id, luggagePhotoFile);
      }
        
      await addItem(trip.id, { 
        name: tagName, 
        category: 'ETIQUETAS FACTURACIÓN',
        suitcaseName: suitcaseName.trim() || 'Maleta',
        flightLeg: flightLeg.trim(),
        scannedCode: scannedCode,
        photoUrl: photoUrl
      });
      
      setIsTagDetailsModalOpen(false);
      setScannedCode('');
      setLuggagePhotoFile(null);
      setLuggagePhotoPreview(null);
    } catch (err) {
      alert("Error al guardar la etiqueta.");
    } finally {
      setIsUploadingPhoto(false);
    }
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

      {/* Botones de Acción Principales */}
      <div className="flex gap-3">
        <button 
          onClick={() => { setNewItemCategory(''); setNewItemName(''); setIsAdding(true); }}
          className="flex-1 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-400 p-3 rounded-2xl flex items-center justify-center gap-2 font-bold transition-colors"
        >
          <Plus size={20} strokeWidth={3} />
          Nueva Categoría
        </button>
        <button 
          onClick={() => setIsScanning(true)}
          className="flex-1 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 p-3 rounded-2xl flex items-center justify-center gap-2 font-bold transition-colors"
        >
          <ScanBarcode size={20} strokeWidth={3} />
          Escanear Etiqueta
        </button>
      </div>

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
                        onClick={() => {
                          if (item.category === 'ETIQUETAS FACTURACIÓN' || item.scannedCode) {
                            setSelectedTag(item);
                          } else {
                            toggleItem(trip.id, item.id, item.packed);
                          }
                        }}
                        className="flex items-center justify-between py-2.5 px-3 hover:bg-slate-800/30 transition-colors group cursor-pointer"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div 
                            onClick={(e) => {
                              if (item.category === 'ETIQUETAS FACTURACIÓN' || item.scannedCode) {
                                e.stopPropagation();
                                toggleItem(trip.id, item.id, item.packed);
                              }
                            }}
                            className={`w-6 h-6 rounded flex items-center justify-center transition-colors border ${item.packed ? 'bg-teal-500 border-teal-500' : 'bg-slate-950 border-slate-700'}`}
                          >
                            {item.packed && <Check className="w-4 h-4 text-slate-900" strokeWidth={3} />}
                          </div>
                          <span className={`text-base font-medium transition-colors flex-1 ${item.packed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                            {item.name}
                            {item.suitcaseName && (
                              <span className="block text-xs text-indigo-400 mt-0.5 no-underline">
                                🧳 {item.suitcaseName}
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center">
                          {(item.category === 'ETIQUETAS FACTURACIÓN' || item.scannedCode) && (
                            <div className="opacity-100 p-2 text-indigo-400 transition-all mr-1">
                              <Eye size={18} />
                            </div>
                          )}
                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteItem(trip.id, item.id); }}
                            className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-2 text-slate-500 hover:text-red-400 transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
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

        {/* Modal de Escáner */}
        {isScanning && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 p-4 backdrop-blur-md">
            <div className="w-full max-w-md bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <ScanBarcode className="text-indigo-400" /> Escanea tu Etiqueta
                </h3>
                <button onClick={() => setIsScanning(false)} className="p-2 text-slate-400 hover:text-white rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="bg-black relative">
                <div id="reader" className="w-full min-h-[300px]"></div>
              </div>
              <div className="p-4 text-center text-sm text-slate-400 bg-slate-900">
                Apunta con la cámara al código de barras de la maleta.
              </div>
            </div>
          </div>
        )}

        {/* Modal de Detalles de Etiqueta (Post-Scan) */}
        {isTagDetailsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 rounded-3xl p-6 w-full max-w-sm border border-indigo-500/30 shadow-[0_0_40px_rgba(99,102,241,0.15)]"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl">
                  <ScanBarcode size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">¡Etiqueta Leída!</h3>
                  <p className="text-indigo-400 font-mono text-sm">{scannedCode}</p>
                </div>
              </div>

              <form onSubmit={handleSaveScannedTag} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">¿De qué maleta es?</label>
                  <input 
                    type="text" 
                    value={suitcaseName}
                    onChange={e => setSuitcaseName(e.target.value)}
                    placeholder="Ej. Maleta Grande Roja"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tramo / Vuelo (Opcional)</label>
                  <input 
                    type="text" 
                    value={flightLeg}
                    onChange={e => setFlightLeg(e.target.value)}
                    placeholder="Ej. BCN - DBX (EK142)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Foto de la maleta (Opcional)</label>
                  {!luggagePhotoPreview ? (
                    <label className="w-full bg-slate-950/50 border border-dashed border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-800/50 transition-colors">
                      <Camera className="text-slate-500" size={24} />
                      <span className="text-sm font-medium text-slate-400">Tocar para echar foto</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="relative w-full h-32 rounded-xl overflow-hidden border border-indigo-500/30">
                      <img src={luggagePhotoPreview} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => { setLuggagePhotoFile(null); setLuggagePhotoPreview(null); }}
                        className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full backdrop-blur-md"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button" 
                    onClick={() => { setIsTagDetailsModalOpen(false); setScannedCode(''); setLuggagePhotoFile(null); setLuggagePhotoPreview(null); }}
                    className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors"
                    disabled={isUploadingPhoto}
                  >
                    Descartar
                  </button>
                  <button 
                    type="submit" 
                    disabled={isUploadingPhoto}
                    className="flex-1 px-4 py-3 bg-indigo-500 hover:bg-indigo-400 text-slate-900 rounded-xl font-bold transition-colors disabled:opacity-50"
                  >
                    {isUploadingPhoto ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Claim Card Modal */}
        {selectedTag && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4" onClick={() => setSelectedTag(null)}>
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl relative"
            >
              {selectedTag.photoUrl ? (
                <div className="w-full h-64 bg-slate-200">
                  <img src={selectedTag.photoUrl} alt="Maleta" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-full h-32 bg-slate-100 flex flex-col items-center justify-center text-slate-400">
                  <Luggage size={48} className="opacity-20 mb-2" />
                  <span className="text-sm font-medium">Sin foto adjunta</span>
                </div>
              )}
              
              <button 
                onClick={() => setSelectedTag(null)}
                className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-colors"
              >
                <X size={20} />
              </button>

              <div className="p-8 text-center bg-white relative">
                <div className="absolute top-0 left-0 w-full h-4 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#f87171_10px,#f87171_20px)] opacity-20 -mt-4"></div>
                
                <h2 className="text-2xl font-black text-slate-900 mb-1 tracking-tight">
                  {selectedTag.scannedCode || selectedTag.name.split('Etiqueta: ')[1]?.split(' (')[0] || 'SIN CÓDIGO'}
                </h2>
                <div className="w-full max-w-[200px] mx-auto h-16 opacity-80 mb-6 bg-[repeating-linear-gradient(90deg,#0f172a_0px,#0f172a_2px,transparent_2px,transparent_4px,#0f172a_4px,#0f172a_8px,transparent_8px,transparent_10px)]"></div>
                
                <div className="space-y-4 text-left">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Identificación Maleta</p>
                    <p className="font-medium text-slate-900">{selectedTag.suitcaseName || 'Equipaje Facturado'}</p>
                  </div>
                  
                  {selectedTag.flightLeg && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Trayecto / Vuelo</p>
                      <p className="font-medium text-slate-900">{selectedTag.flightLeg}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
