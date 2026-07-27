import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Calendar as CalendarIcon, Upload, Trash2, Sparkles } from 'lucide-react';
import { useExpenseStore } from '../../../store/expenseStore';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { useCameraAI } from '../../utilities/hooks/useCameraAI';

export default function ExpenseModal({ trip, isOpen, onClose, editingExpense }) {
  const { addExpense, updateExpense, deleteExpense, isLoading } = useExpenseStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const { processImage, isProcessing: isAIProcessing } = useCameraAI();
  
  // Default values
  const defaultCategories = trip?.categories || ['Comida', 'Transporte', 'Ocio', 'Alojamiento', 'Vuelos', 'Gasolina', 'Supermercado', 'Otros'];
  const members = trip?.splitMembers || [];
  
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    localAmount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    category: defaultCategories[0] || 'Otros',
    paidBy: members[0] || '',
    splitBetween: members.slice() || [] // Array de nombres
  });

  useEffect(() => {
    if (isOpen) {
      if (editingExpense) {
        setFormData({
          title: editingExpense.title || '',
          amount: editingExpense.amount || '',
          localAmount: editingExpense.amount && trip?.exchangeRate ? (parseFloat(editingExpense.amount) * trip.exchangeRate).toFixed(2) : '',
          date: editingExpense.date ? format(editingExpense.date.toDate(), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
          category: editingExpense.category || defaultCategories[0],
          paidBy: editingExpense.paidBy || (members[0] || ''),
          splitBetween: editingExpense.splitBetween || members.slice()
        });
      } else {
        setFormData({
          title: '',
          amount: '',
          localAmount: '',
          date: format(new Date(), 'yyyy-MM-dd'),
          category: defaultCategories[0] || 'Otros',
          paidBy: members[0] || '',
          splitBetween: members.slice() || []
        });
      }
      setReceiptFile(null);
    }
  }, [isOpen, editingExpense, trip]);

  if (!isOpen) return null;

  const handleToggleSplitMember = (member) => {
    if (formData.splitBetween.includes(member)) {
      setFormData({
        ...formData,
        splitBetween: formData.splitBetween.filter(m => m !== member)
      });
    } else {
      setFormData({
        ...formData,
        splitBetween: [...formData.splitBetween, member]
      });
    }
  };

  const handleSelectAllMembers = () => {
    setFormData({ ...formData, splitBetween: members.slice() });
  };

  const handleAIAnalyze = async () => {
    if (!receiptFile) return;
    try {
      const prompt = `Analiza este ticket de compra/gasto. Extrae la siguiente información estrictamente en JSON:
      {
        "title": "Concepto o nombre del establecimiento (ej: Cena en Restaurante X)",
        "amount": "Cantidad total en formato numérico (ej: 45.50). EXTRAE SIEMPRE LA CANTIDAD ORIGINAL IMPRESA EN EL TICKET.",
        "currency": "La moneda en la que está el ticket (ej: EUR, USD, NZD)",
        "date": "Fecha en formato YYYY-MM-DD si aparece, sino null",
        "category": "Elige la más adecuada de esta lista: Comida, Transporte, Ocio, Alojamiento, Vuelos, Gasolina, Supermercado, Otros"
      }`;
      const aiResponse = await processImage(receiptFile, prompt, true);
      const cleanJson = aiResponse.replace(/```json/gi, '').replace(/```/gi, '').trim();
      const parsed = JSON.parse(cleanJson);
      
      const isBaseCurrency = parsed.currency?.toUpperCase() === (trip?.currency || 'EUR').toUpperCase();
      
      setFormData(prev => {
        let baseAmt = prev.amount;
        let localAmt = prev.localAmount;
        
        if (parsed.amount) {
          if (!isBaseCurrency && trip?.exchangeRate) {
            localAmt = String(parsed.amount);
            baseAmt = (parseFloat(parsed.amount) / trip.exchangeRate).toFixed(2);
          } else {
            baseAmt = String(parsed.amount);
            if (trip?.exchangeRate) {
              localAmt = (parseFloat(parsed.amount) * trip.exchangeRate).toFixed(2);
            }
          }
        }
        
        return {
          ...prev,
          title: parsed.title || prev.title,
          amount: baseAmt,
          localAmount: localAmt,
          date: parsed.date || prev.date,
          category: defaultCategories.includes(parsed.category) ? parsed.category : prev.category
        };
      });
    } catch(err) {
      alert("Error analizando con IA: " + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.amount || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const expenseData = {
        title: formData.title,
        amount: parseFloat(formData.amount),
        date: Timestamp.fromDate(new Date(`${formData.date}T12:00:00`)),
        category: formData.category,
        paidBy: trip.isGroupMode ? formData.paidBy : 'Usuario',
        splitBetween: trip.isGroupMode ? formData.splitBetween : ['Usuario']
      };

      if (editingExpense) {
        await updateExpense(trip.id, editingExpense.id, expenseData, receiptFile);
      } else {
        await addExpense(trip.id, expenseData, receiptFile);
      }
      onClose();
    } catch (error) {
      alert("Error guardando gasto: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('¿Eliminar este gasto?')) {
      try {
        await deleteExpense(trip.id, editingExpense.id);
        onClose();
      } catch (error) {
        alert("Error al eliminar: " + error.message);
      }
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-0 sm:p-6 overflow-hidden">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
          onClick={onClose}
        ></motion.div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full h-full sm:h-auto max-w-lg bg-slate-900 border-0 sm:border border-slate-700 rounded-none sm:rounded-3xl shadow-2xl p-4 sm:p-6 md:p-8 overflow-y-auto overflow-x-hidden hide-scrollbar flex flex-col pb-24"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">
              {editingExpense ? 'Editar Gasto' : 'Nuevo Gasto'}
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* 0. Ticket / Adjunto (MOVIDO ARRIBA) */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Foto del Ticket</label>
              <div className="relative border-2 border-dashed border-slate-700 rounded-xl p-4 text-center hover:border-slate-500 transition-colors bg-slate-950/50">
                <input 
                  type="file" 
                  accept="image/*,.pdf" 
                  onChange={(e) => setReceiptFile(e.target.files[0])} 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center text-slate-500">
                  <Upload className="w-6 h-6 mb-2" />
                  <span className="text-sm">
                    {receiptFile ? receiptFile.name : (editingExpense?.receiptUrl ? 'Cambiar ticket existente' : 'Toca para subir un ticket')}
                  </span>
                </div>
              </div>
              {receiptFile && (
                <button
                  type="button"
                  onClick={handleAIAnalyze}
                  disabled={isAIProcessing}
                  className="w-full mt-3 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/30 hover:border-indigo-500/50 p-3 rounded-xl transition-colors flex items-center justify-center gap-2 font-bold shadow-lg"
                >
                  <Sparkles className="w-5 h-5" />
                  {isAIProcessing ? 'Analizando con IA...' : 'Autocompletar con IA'}
                </button>
              )}
              {editingExpense?.receiptUrl && !receiptFile && (
                <a href={editingExpense.receiptUrl} target="_blank" rel="noreferrer" className="text-xs text-teal-400 mt-2 inline-block hover:underline">
                  Ver ticket guardado
                </a>
              )}
            </div>

            {/* 1. Datos Básicos */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-400 mb-1">Concepto</label>
                  <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 text-lg" placeholder="Ej. Cena en Roma" />
                </div>
                
                {trip?.exchangeRate ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-teal-400 mb-1">Importe Local</label>
                      <input 
                        type="number" min="0" step="0.01" 
                        value={formData.localAmount}
                        onChange={e => {
                          const localVal = parseFloat(e.target.value) || 0;
                          const baseVal = (localVal / trip.exchangeRate).toFixed(2);
                          setFormData({...formData, localAmount: e.target.value, amount: baseVal});
                        }} 
                        className="w-full bg-slate-950 border border-teal-500/50 rounded-xl px-4 py-3 text-white font-bold text-xl focus:outline-none focus:border-teal-500" 
                        placeholder="Moneda local" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Equivale a ({trip?.currency || 'EUR'})</label>
                      <input 
                        required type="number" min="0" step="0.01" 
                        value={formData.amount} 
                        onChange={e => {
                          const baseVal = parseFloat(e.target.value) || 0;
                          const localVal = (baseVal * trip.exchangeRate).toFixed(2);
                          setFormData({...formData, amount: e.target.value, localAmount: localVal});
                        }} 
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-300 font-bold text-xl focus:outline-none focus:border-slate-500" 
                        placeholder="0.00" 
                      />
                    </div>
                  </>
                ) : (
                  <div className="min-w-0">
                    <label className="block text-sm font-medium text-slate-400 mb-1">Importe ({trip?.currency || 'EUR'})</label>
                    <input required type="number" min="0" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full max-w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold text-xl focus:outline-none focus:border-teal-500 box-border" placeholder="0.00" />
                  </div>
                )}

                <div className={`${trip?.exchangeRate ? "col-span-1 sm:col-span-2" : ""} min-w-0 overflow-hidden`}>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Fecha</label>
                  <input 
                    type="date" 
                    value={formData.date} 
                    onChange={e => setFormData({...formData, date: e.target.value})} 
                    className="w-full min-w-0 appearance-none bg-slate-950 border border-slate-700 rounded-xl px-2 sm:px-4 py-3 text-white focus:outline-none focus:border-teal-500 box-border" 
                  />
                </div>

                <div className="col-span-1 sm:col-span-2 min-w-0">
                  <label className="block text-sm font-medium text-slate-400 mb-2">Categoría</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {defaultCategories.map(cat => (
                      <button 
                        key={cat}
                        type="button"
                        onClick={() => setFormData({...formData, category: cat})}
                        className={`w-full px-1 py-3 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center shadow-sm ${formData.category === cat ? 'bg-teal-500/20 text-teal-400 border-teal-500/50 shadow-teal-500/20' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
                      >
                        <span className="truncate">{cat}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Reparto (Solo si isGroupMode) */}
            {trip?.isGroupMode && members.length > 0 && (
              <div className="bg-indigo-900/10 p-5 rounded-2xl border border-indigo-500/20 space-y-4">
                <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider">Cuentas Claras</h3>
                
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">¿Quién pagó?</label>
                  <div className="flex flex-wrap gap-2">
                    {members.map(member => (
                      <button 
                        key={member}
                        type="button"
                        onClick={() => setFormData({...formData, paidBy: member})}
                        className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${formData.paidBy === member ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-md' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
                      >
                        {member}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-indigo-500/10">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-slate-400">¿A quiénes aplica este gasto?</label>
                    <button type="button" onClick={handleSelectAllMembers} className="text-xs text-indigo-400 hover:underline">Seleccionar Todos</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {members.map(member => {
                      const isSelected = formData.splitBetween.includes(member);
                      return (
                        <button 
                          key={member}
                          type="button"
                          onClick={() => handleToggleSplitMember(member)}
                          className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${isSelected ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' : 'bg-slate-800/50 text-slate-500 border-slate-700/50 hover:bg-slate-800'}`}
                        >
                          {member} {isSelected && '✓'}
                        </button>
                      );
                    })}
                  </div>
                  {formData.splitBetween.length === 0 && (
                    <p className="text-xs text-red-400 mt-2">Debes seleccionar al menos una persona.</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-slate-800">
              {editingExpense && (
                <button type="button" onClick={handleDelete} className="bg-red-500/10 text-red-500 hover:bg-red-500/20 p-4 rounded-xl border border-red-500/20 transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              <button 
                type="submit" 
                disabled={isSubmitting || (trip?.isGroupMode && formData.splitBetween.length === 0)} 
                className="flex-1 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold py-4 rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {isSubmitting ? 'Guardando...' : (editingExpense ? 'Actualizar Gasto' : 'Añadir Gasto')}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
