import { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useExpenseStore } from '../../../store/expenseStore';
import { useItineraryStore } from '../../../store/itineraryStore';
import ExpenseModal from '../components/ExpenseModal';
import { Plus, Receipt, PieChart, Users, ArrowRight, Plane, Hotel, CarFront, MapPin, Route, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ExpensesPage() {
  const { trip } = useOutletContext();
  const { expenses, subscribeToExpenses, isLoading: isExpensesLoading } = useExpenseStore();
  const { nodes, subscribeToNodes, isLoading: isNodesLoading } = useItineraryStore();
  
  const [activeTab, setActiveTab] = useState('summary'); // summary, list, split
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  useEffect(() => {
    if (trip?.id) {
      const unsubExpenses = subscribeToExpenses(trip.id);
      const unsubNodes = subscribeToNodes(trip.id);
      return () => {
        if (unsubExpenses) unsubExpenses();
        if (unsubNodes) unsubNodes();
      };
    }
  }, [trip?.id, subscribeToExpenses, subscribeToNodes]);

  // Fusionar nodos con coste y gastos manuales
  const unifiedExpenses = useMemo(() => {
    const nodeExpenses = nodes
      .filter(n => n.cost > 0)
      .map(n => ({
        id: n.id,
        isNode: true,
        title: n.title,
        amount: parseFloat(n.cost),
        currency: n.currency || 'EUR',
        category: n.type,
        date: n.startTime,
        // Los nodos del itinerario por defecto no entran en Splitwise a menos que se hayan editado para ello (futuro)
        paidBy: null,
        splitBetween: [] 
      }));

    const manualExpenses = expenses.map(e => ({
      ...e,
      isNode: false
    }));

    return [...nodeExpenses, ...manualExpenses].sort((a, b) => {
      const dateA = a.date ? a.date.toDate().getTime() : 0;
      const dateB = b.date ? b.date.toDate().getTime() : 0;
      return dateB - dateA;
    });
  }, [nodes, expenses]);

  // Cálculos de Resumen
  const totalSpent = unifiedExpenses.reduce((acc, exp) => acc + exp.amount, 0);
  const budget = trip?.budget ? parseFloat(trip.budget) : 0;
  const budgetPercentage = budget > 0 ? Math.min((totalSpent / budget) * 100, 100) : 0;
  
  const spentByCategory = useMemo(() => {
    const categories = {};
    unifiedExpenses.forEach(exp => {
      const cat = exp.category || 'Otros';
      categories[cat] = (categories[cat] || 0) + exp.amount;
    });
    return Object.entries(categories).sort((a, b) => b[1] - a[1]);
  }, [unifiedExpenses]);

  // Cálculos Splitwise
  const splitwiseData = useMemo(() => {
    if (!trip?.isGroupMode || !trip?.splitMembers || trip.splitMembers.length === 0) return null;
    
    const balances = {};
    const members = trip.splitMembers;
    members.forEach(m => balances[m] = 0);

    let totalGroupSpent = 0;

    unifiedExpenses.forEach(exp => {
      const { paidBy, splitBetween, amount } = exp;
      if (paidBy && splitBetween && splitBetween.length > 0) {
        totalGroupSpent += amount;
        
        if (balances[paidBy] !== undefined) {
          balances[paidBy] += amount;
        }

        const share = amount / splitBetween.length;
        splitBetween.forEach(m => {
          if (balances[m] !== undefined) {
            balances[m] -= share;
          }
        });
      }
    });

    const debtors = [];
    const creditors = [];

    for (const [member, balance] of Object.entries(balances)) {
      if (balance < -0.01) debtors.push({ member, amount: -balance });
      else if (balance > 0.01) creditors.push({ member, amount: balance });
    }

    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    const transfers = [];
    let d = 0, c = 0;
    
    while (d < debtors.length && c < creditors.length) {
      const debtor = debtors[d];
      const creditor = creditors[c];
      const amount = Math.min(debtor.amount, creditor.amount);
      
      if (amount > 0.01) {
        transfers.push({ from: debtor.member, to: creditor.member, amount });
      }
      
      debtor.amount -= amount;
      creditor.amount -= amount;
      
      if (debtor.amount < 0.01) d++;
      if (creditor.amount < 0.01) c++;
    }

    return { balances, transfers, totalGroupSpent };
  }, [unifiedExpenses, trip]);

  const openCreateModal = () => {
    setEditingExpense(null);
    setIsModalOpen(true);
  };

  const getIconForCategory = (cat) => {
    switch (cat?.toLowerCase()) {
      case 'flight': case 'vuelos': return <Plane className="w-4 h-4" />;
      case 'accommodation': case 'alojamiento': return <Hotel className="w-4 h-4" />;
      case 'drive': case 'gasolina': case 'transporte': return <CarFront className="w-4 h-4" />;
      default: return <Receipt className="w-4 h-4" />;
    }
  };

  if (!trip) return null;

  return (
    <div className="max-w-3xl mx-auto pb-24">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          💰 Finanzas
        </h2>
        {trip.isGroupMode && (
          <span className="bg-indigo-500/20 text-indigo-300 text-xs font-bold px-3 py-1 rounded-full border border-indigo-500/30">
            Modo Grupo
          </span>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex p-1 bg-slate-900 border border-slate-700 rounded-2xl mb-8 shadow-sm">
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex-1 flex justify-center items-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'summary' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <PieChart className="w-4 h-4" /> Resumen
        </button>
        <button
          onClick={() => setActiveTab('list')}
          className={`flex-1 flex justify-center items-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'list' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <Receipt className="w-4 h-4" /> Gastos
        </button>
        {trip.isGroupMode && (
          <button
            onClick={() => setActiveTab('split')}
            className={`flex-1 flex justify-center items-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'split' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <Users className="w-4 h-4" /> Hacer Caja
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* TAB 1: RESUMEN */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
              {/* Tarjeta de Presupuesto Global */}
              <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-bl-full -mr-8 -mt-8"></div>
                
                <h3 className="text-slate-400 font-medium mb-1">Gasto Total</h3>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-4xl font-black text-white">{totalSpent.toFixed(2)}</span>
                  <span className="text-xl font-bold text-teal-400">{trip.currency || 'EUR'}</span>
                </div>

                {budget > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Progreso del Presupuesto</span>
                      <span className={budgetPercentage > 100 ? 'text-red-400 font-bold' : 'text-teal-400 font-bold'}>
                        {budgetPercentage.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${budgetPercentage > 100 ? 'bg-red-500' : 'bg-teal-500'}`}
                        style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-slate-500 text-right mt-1">
                      Presupuestado: {budget} {trip.currency || 'EUR'}
                    </p>
                  </div>
                )}
                {budget === 0 && (
                  <p className="text-xs text-slate-500 mt-4 italic">
                    💡 Puedes establecer un presupuesto en los ajustes del viaje para ver tu progreso.
                  </p>
                )}
              </div>

              {/* Por Categorías */}
              {spentByCategory.length > 0 && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
                  <h3 className="text-white font-bold mb-4">Gasto por Categorías</h3>
                  <div className="space-y-4">
                    {spentByCategory.map(([cat, amount], idx) => (
                      <div key={idx}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-300 flex items-center gap-2 capitalize">
                            <span className="text-teal-500">{getIconForCategory(cat)}</span> {cat}
                          </span>
                          <span className="font-bold text-white">{amount.toFixed(2)} {trip.currency || 'EUR'}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-slate-600 rounded-full"
                            style={{ width: `${Math.max((amount / totalSpent) * 100, 2)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LISTA DE GASTOS */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              {unifiedExpenses.length === 0 ? (
                <div className="text-center py-20 bg-slate-900/50 rounded-3xl border border-dashed border-slate-700">
                  <Receipt className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 mb-4">Aún no hay gastos registrados.</p>
                </div>
              ) : (
                unifiedExpenses.map(exp => (
                  <div 
                    key={exp.id}
                    onClick={() => !exp.isNode && setEditingExpense(exp) && setIsModalOpen(true)}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      exp.isNode 
                        ? 'bg-slate-900/40 border-slate-800/50 cursor-default' 
                        : 'bg-slate-900 border-slate-700 hover:border-slate-500 cursor-pointer shadow-sm hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${exp.isNode ? 'bg-slate-800 text-slate-500' : 'bg-teal-900/30 text-teal-400'}`}>
                        {getIconForCategory(exp.category)}
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-sm">{exp.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-400 capitalize">{exp.category}</span>
                          {exp.isNode && (
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                              Itinerario
                            </span>
                          )}
                          {!exp.isNode && exp.paidBy && trip.isGroupMode && (
                            <span className="text-[10px] bg-indigo-900/30 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded">
                              Pagó: {exp.paidBy}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="block text-white font-black text-lg">
                        {exp.amount.toFixed(2)}
                      </span>
                      {exp.date && (
                        <span className="text-xs text-slate-500">
                          {format(exp.date.toDate(), "d MMM", { locale: es })}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: HACER CAJA (SPLITWISE) */}
          {activeTab === 'split' && splitwiseData && (
            <div className="space-y-6">
              
              {/* Tarjeta Resumen Grupo */}
              <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-3xl p-6 text-center shadow-lg">
                <h3 className="text-indigo-400 text-sm font-bold uppercase tracking-wider mb-2">Total Gastado por el Grupo</h3>
                <div className="text-3xl font-black text-white">
                  {splitwiseData.totalGroupSpent.toFixed(2)} <span className="text-indigo-400 text-xl">{trip.currency || 'EUR'}</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">Solo contabiliza los gastos marcados para repartir.</p>
              </div>

              {/* Balances Individuales */}
              <div>
                <h3 className="text-white font-bold mb-4 ml-2">Balances Personales</h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(splitwiseData.balances).map(([member, balance]) => (
                    <div key={member} className="bg-slate-900 border border-slate-700 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                      <span className="text-slate-300 font-bold mb-1">{member}</span>
                      {balance > 0.01 ? (
                        <span className="text-emerald-400 font-black text-lg text-emerald-500 flex items-center gap-1">
                          + {balance.toFixed(2)}
                        </span>
                      ) : balance < -0.01 ? (
                        <span className="text-red-400 font-black text-lg flex items-center gap-1">
                          - {Math.abs(balance).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-500 font-bold text-lg">0.00</span>
                      )}
                      <span className="text-[10px] text-slate-500 uppercase mt-1">
                        {balance > 0.01 ? 'Le deben' : balance < -0.01 ? 'Debe' : 'En paz'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transferencias Sugeridas */}
              <div>
                <h3 className="text-white font-bold mb-4 ml-2">Pagos para cuadrar cuentas</h3>
                {splitwiseData.transfers.length > 0 ? (
                  <div className="space-y-3">
                    {splitwiseData.transfers.map((t, idx) => (
                      <div key={idx} className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-red-400">{t.from}</span>
                          <ArrowRight className="w-4 h-4 text-slate-500" />
                          <span className="font-bold text-emerald-400">{t.to}</span>
                        </div>
                        <div className="font-black text-white text-lg bg-slate-900 px-3 py-1 rounded-lg border border-slate-700">
                          {t.amount.toFixed(2)} <span className="text-sm font-medium text-slate-400">{trip.currency || 'EUR'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 bg-slate-900/50 rounded-3xl border border-dashed border-slate-700">
                    <p className="text-slate-400 font-medium">¡Cuentas saldadas! 🎉</p>
                    <p className="text-slate-500 text-sm mt-1">Nadie le debe nada a nadie.</p>
                  </div>
                )}
              </div>

            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* FAB para añadir gasto manual */}
      {activeTab === 'list' && (
        <button 
          onClick={openCreateModal}
          className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full shadow-[0_0_20px_rgba(20,184,166,0.4)] flex items-center justify-center text-slate-950 hover:scale-105 transition-transform z-40"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Modal de Nuevo/Editar Gasto */}
      <ExpenseModal 
        trip={trip}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingExpense={editingExpense}
      />
    </div>
  );
}
