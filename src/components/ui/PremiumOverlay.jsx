import React from 'react';
import { Lock, Loader2 } from 'lucide-react';
import { usePremiumCheckout } from '../../hooks/usePremiumCheckout';

export default function PremiumOverlay({ children, isPremium, featureName = "esta función" }) {
  const { startCheckout, isCheckoutLoading } = usePremiumCheckout();

  if (isPremium) {
    return <>{children}</>;
  }

  return (
    <div className="relative w-full h-full min-h-[300px]">
      <div className="absolute inset-0 blur-[3px] opacity-40 pointer-events-none">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-slate-950/60 rounded-xl">
        <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-full mb-4">
          <Lock className="w-10 h-10 text-amber-500" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">Exclusivo Premium</h3>
        <p className="text-slate-300 max-w-sm mb-6">
          Actualiza tu plan para desbloquear {featureName} impulsada por Inteligencia Artificial y crear viajes ilimitados.
        </p>
        <button
          onClick={startCheckout}
          disabled={isCheckoutLoading}
          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 min-w-[200px]"
        >
          {isCheckoutLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Actualizar a Premium'}
        </button>
      </div>
    </div>
  );
}
