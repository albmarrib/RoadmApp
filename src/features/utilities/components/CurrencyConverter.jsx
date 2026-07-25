import React, { useState, useRef } from 'react';
import { Camera, RefreshCw, Loader2 } from 'lucide-react';
import { useCameraAI } from '../hooks/useCameraAI';

export default function CurrencyConverter({ trip }) {
  const [localAmount, setLocalAmount] = useState('');
  const exchangeRate = trip?.exchangeRate || 1; 
  const fileInputRef = useRef(null);
  const { processImage, isProcessing } = useCameraAI();

  const localVal = parseFloat(localAmount) || 0;
  const eurVal = localVal / exchangeRate;

  const handleCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const prompt = "Extrae únicamente el PRECIO numérico que veas en esta imagen. Devuelve SOLO EL NÚMERO, sin símbolos de moneda, sin texto adicional y usando un punto para los decimales (ej: 45.50). Si no ves ningún precio, devuelve 0.";
      const textResult = await processImage(file, prompt);
      
      const extractedNum = parseFloat(textResult.trim());
      if (!isNaN(extractedNum) && extractedNum > 0) {
        setLocalAmount(extractedNum.toString());
      } else {
        alert("No se ha podido detectar un precio claro en la imagen.");
      }
    } catch (error) {
      alert("Error al procesar la imagen: " + error.message);
    }
  };

  return (
    <div className="p-3 sm:p-4">
      <h3 className="text-lg font-bold text-white mb-3">Conversor de Moneda</h3>
      
      {!trip?.exchangeRate ? (
        <div className="bg-amber-900/20 border border-amber-500/20 text-amber-300 p-3 rounded-xl text-xs mb-4">
          <p>⚠️ No has configurado el <strong>Factor de Conversión</strong> para este viaje.</p>
          <p className="mt-1">Ve a la configuración del viaje y añade la tasa de cambio para que esta calculadora funcione.</p>
        </div>
      ) : (
        <div className="space-y-4">
          
          <div className="relative">
            <label className="block text-xs font-medium text-slate-400 mb-1">Importe en Moneda Local</label>
            {/* Contenedor principal con flex-1 y min-w-0 para evitar desbordamiento en iOS */}
            <div className="flex gap-2 w-full min-w-0">
              <input
                type="number"
                value={localAmount}
                onChange={(e) => setLocalAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 w-full min-w-0 bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-2xl font-black text-white placeholder-slate-600 focus:outline-none focus:border-teal-500 transition-colors appearance-none"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="w-12 flex-shrink-0 bg-slate-800 hover:bg-slate-700 text-teal-400 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50"
                title="Escanear precio con la cámara"
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
              </button>
              
              {/* Input oculto para abrir la cámara */}
              <input 
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                onChange={handleCapture}
                className="hidden"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Factor aplicado: 1 EUR = {exchangeRate} Local</p>
          </div>

          <div className="flex justify-center -my-1">
            <RefreshCw className="w-4 h-4 text-slate-600" />
          </div>

          <div className="bg-teal-950/30 border border-teal-500/30 rounded-xl p-4 text-center">
            <label className="block text-xs font-medium text-teal-400/70 mb-1">Equivale a (Euros)</label>
            <div className="text-3xl font-black text-teal-400 truncate">
              {eurVal.toFixed(2)} €
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
