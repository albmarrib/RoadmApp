import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import CurrencyConverter from '../components/CurrencyConverter';
import LiveTranslator from '../components/LiveTranslator';
import TipCalculator from '../components/TipCalculator';
import UnitConverter from '../components/UnitConverter';
import { Coins, Languages, Percent, Ruler } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import PremiumOverlay from '../../../components/ui/PremiumOverlay';

export default function UtilitiesPage() {
  const { profile } = useAuthStore();
  const { trip } = useOutletContext();
  const [activeTab, setActiveTab] = useState('currency'); // currency | translate | tip | units

  const tabs = [
    { id: 'currency', label: 'Moneda', icon: Coins },
    { id: 'translate', label: 'Traductor', icon: Languages },
    { id: 'tip', label: 'Propinas', icon: Percent },
    { id: 'units', label: 'Medidas', icon: Ruler },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-white">Utilidades</h2>
        <p className="text-slate-400 text-sm mt-1">Herramientas útiles para sobrevivir en el destino.</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-900 rounded-xl p-1 mb-6 border border-slate-800">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-lg transition-all ${
                isActive ? 'bg-slate-800 text-teal-400 shadow-sm' : 'text-slate-500 hover:text-slate-400 hover:bg-slate-800/50'
              }`}
            >
              <tab.icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
              <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Contenido de la Utilidad Activa */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden relative min-h-[400px]">
        {activeTab === 'currency' && <CurrencyConverter trip={trip} />}
        {activeTab === 'translate' && (
          <PremiumOverlay isPremium={profile?.tier === 'premium'} featureName="el Traductor Simultáneo">
            <LiveTranslator trip={trip} />
          </PremiumOverlay>
        )}
        {activeTab === 'tip' && <TipCalculator />}
        {activeTab === 'units' && <UnitConverter />}
      </div>
    </div>
  );
}
