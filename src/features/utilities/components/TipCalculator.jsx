import React, { useState } from 'react';

export default function TipCalculator() {
  const [bill, setBill] = useState('');
  const [tipPercent, setTipPercent] = useState(15);
  
  const billAmount = parseFloat(bill) || 0;
  const tipAmount = billAmount * (tipPercent / 100);
  const totalAmount = billAmount + tipAmount;

  return (
    <div className="p-6">
      <h3 className="text-xl font-bold text-white mb-6">Calculadora de Propinas</h3>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">Cuenta Total</label>
          <div className="relative">
            <input
              type="number"
              value={bill}
              onChange={(e) => setBill(e.target.value)}
              placeholder="0.00"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 px-4 text-2xl font-bold text-white placeholder-slate-600 focus:outline-none focus:border-teal-500 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-3">Porcentaje de Propina</label>
          <div className="grid grid-cols-3 gap-3">
            {[10, 15, 20].map(percent => (
              <button
                key={percent}
                onClick={() => setTipPercent(percent)}
                className={`py-3 rounded-xl font-bold text-lg transition-all ${
                  tipPercent === percent 
                    ? 'bg-teal-500 text-slate-950 scale-[1.02] shadow-lg shadow-teal-500/20' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {percent}%
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 mt-6 space-y-3">
          <div className="flex justify-between items-center text-slate-400">
            <span>Propina ({tipPercent}%)</span>
            <span className="font-bold text-white">{tipAmount.toFixed(2)}</span>
          </div>
          <div className="h-px bg-slate-800 w-full"></div>
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium text-slate-300">Total a Pagar</span>
            <span className="text-3xl font-black text-teal-400">{totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
