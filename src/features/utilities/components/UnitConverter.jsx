import React, { useState } from 'react';
import { ArrowDownUp, Thermometer, Ruler, Scale, Droplet } from 'lucide-react';

export default function UnitConverter() {
  const [val, setVal] = useState('');
  const [category, setCategory] = useState('temp');
  
  const [fromUnit, setFromUnit] = useState('celsius');
  const [toUnit, setToUnit] = useState('fahrenheit');

  const categories = {
    temp: {
      label: 'Clima',
      icon: Thermometer,
      units: {
        celsius: { name: 'Celsius (°C)' },
        fahrenheit: { name: 'Fahrenheit (°F)' },
        kelvin: { name: 'Kelvin (K)' }
      },
      defaultFrom: 'celsius',
      defaultTo: 'fahrenheit',
      convert: (val, from, to) => {
        if (from === to) return val;
        let c = val;
        if (from === 'fahrenheit') c = (val - 32) * 5/9;
        if (from === 'kelvin') c = val - 273.15;
        
        if (to === 'celsius') return c;
        if (to === 'fahrenheit') return (c * 9/5) + 32;
        if (to === 'kelvin') return c + 273.15;
        return val;
      }
    },
    dist: {
      label: 'Distancia',
      icon: Ruler,
      units: {
        mm: { name: 'Milímetros (mm)', factor: 0.001 },
        cm: { name: 'Centímetros (cm)', factor: 0.01 },
        m: { name: 'Metros (m)', factor: 1 },
        km: { name: 'Kilómetros (km)', factor: 1000 },
        in: { name: 'Pulgadas (in)', factor: 0.0254 },
        ft: { name: 'Pies (ft)', factor: 0.3048 },
        yd: { name: 'Yardas (yd)', factor: 0.9144 },
        mi: { name: 'Millas (mi)', factor: 1609.344 }
      },
      defaultFrom: 'km',
      defaultTo: 'mi',
      convert: (val, from, to, units) => {
        if (from === to) return val;
        return val * (units[from].factor / units[to].factor);
      }
    },
    weight: {
      label: 'Peso',
      icon: Scale,
      units: {
        mg: { name: 'Miligramos (mg)', factor: 0.000001 },
        g: { name: 'Gramos (g)', factor: 0.001 },
        kg: { name: 'Kilos (kg)', factor: 1 },
        oz: { name: 'Onzas (oz)', factor: 0.02834952 },
        lb: { name: 'Libras (lb)', factor: 0.45359237 }
      },
      defaultFrom: 'kg',
      defaultTo: 'lb',
      convert: (val, from, to, units) => {
        if (from === to) return val;
        return val * (units[from].factor / units[to].factor);
      }
    },
    vol: {
      label: 'Volumen',
      icon: Droplet,
      units: {
        ml: { name: 'Mililitros (ml)', factor: 0.001 },
        l: { name: 'Litros (L)', factor: 1 },
        floz: { name: 'Onzas líq. (fl oz)', factor: 0.0295735 },
        cup: { name: 'Tazas (cup)', factor: 0.236588 },
        pt: { name: 'Pintas (pt)', factor: 0.473176 },
        gal: { name: 'Galones (gal)', factor: 3.78541178 }
      },
      defaultFrom: 'l',
      defaultTo: 'gal',
      convert: (val, from, to, units) => {
        if (from === to) return val;
        return val * (units[from].factor / units[to].factor);
      }
    }
  };

  const handleCategoryChange = (catKey) => {
    setCategory(catKey);
    setVal(''); 
    setFromUnit(categories[catKey].defaultFrom);
    setToUnit(categories[catKey].defaultTo);
  };

  const handleSwap = () => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
  };

  const numVal = parseFloat(val);
  const isValid = !isNaN(numVal) && val !== '';
  const result = isValid ? categories[category].convert(numVal, fromUnit, toUnit, categories[category].units) : 0;

  const formatResult = (num) => {
    if (Math.abs(num) < 0.01 && num !== 0) return num.toExponential(2);
    // Remove trailing zeros after decimal point
    return parseFloat(num.toFixed(4)).toString();
  };

  return (
    <div className="p-4 sm:p-6 w-full max-w-md mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">Conversor</h3>
        <div className="flex bg-slate-900/50 p-1 rounded-2xl backdrop-blur-sm border border-white/5">
          {Object.entries(categories).map(([key, cat]) => {
            const Icon = cat.icon;
            const isActive = category === key;
            return (
              <button 
                key={key}
                onClick={() => handleCategoryChange(key)} 
                className={`p-2 sm:p-2.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-gradient-to-br from-teal-400 to-emerald-500 text-slate-950 shadow-lg shadow-teal-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                title={cat.label}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={isActive ? 2.5 : 2} />
              </button>
            )
          })}
        </div>
      </div>

      <div className="relative group mt-4">
        {/* Glow effect behind the inputs */}
        <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 to-emerald-500/10 rounded-[32px] blur-xl transition-opacity opacity-50 group-hover:opacity-100" />
        
        <div className="relative bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-[32px] p-2 flex flex-col shadow-2xl">
          
          {/* Input section */}
          <div className="p-6 pb-8 bg-white/5 rounded-[24px] rounded-b-none border-b border-white/5 transition-colors focus-within:bg-white/10">
             <div className="flex justify-between items-center mb-3">
               <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">De</span>
             </div>
             <div className="flex flex-col gap-2">
               <input
                 type="number"
                 value={val}
                 onChange={(e) => setVal(e.target.value)}
                 placeholder="0"
                 className="w-full bg-transparent text-4xl sm:text-5xl font-black text-white placeholder-white/20 focus:outline-none appearance-none tracking-tighter"
               />
               <select 
                 value={fromUnit} 
                 onChange={(e) => setFromUnit(e.target.value)}
                 className="w-fit bg-transparent text-teal-400 font-semibold text-sm sm:text-base focus:outline-none cursor-pointer appearance-none hover:text-teal-300 transition-colors"
               >
                 {Object.entries(categories[category].units).map(([uKey, uData]) => (
                   <option key={uKey} value={uKey} className="bg-slate-900 text-white">{uData.name}</option>
                 ))}
               </select>
             </div>
          </div>

          {/* Swap button placed absolutely in the center */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
             <button 
               onClick={handleSwap}
               className="bg-slate-800 text-slate-400 p-3 sm:p-4 rounded-full border-[6px] border-slate-900 shadow-xl hover:bg-slate-700 hover:scale-105 hover:rotate-180 transition-all duration-500 group/btn"
               aria-label="Invertir"
             >
               <ArrowDownUp className="w-4 h-4 sm:w-5 sm:h-5 group-hover/btn:text-teal-400 transition-colors" />
             </button>
          </div>

          {/* Output section */}
          <div className="p-6 pt-8 bg-gradient-to-br from-teal-500/10 to-transparent rounded-[24px] rounded-t-none">
             <div className="flex justify-between items-center mb-3">
               <span className="text-xs font-bold text-teal-500 uppercase tracking-wider">A</span>
             </div>
             <div className="flex flex-col gap-2">
               <div className={`w-full text-4xl sm:text-5xl font-black truncate tracking-tighter ${val === '' ? 'text-white/20' : 'text-white'}`}>
                 {val === '' ? '0' : (isValid ? formatResult(result) : 'Error')}
               </div>
               <select 
                 value={toUnit} 
                 onChange={(e) => setToUnit(e.target.value)}
                 className="w-fit bg-transparent text-teal-400 font-semibold text-sm sm:text-base focus:outline-none cursor-pointer appearance-none hover:text-teal-300 transition-colors"
               >
                 {Object.entries(categories[category].units).map(([uKey, uData]) => (
                   <option key={uKey} value={uKey} className="bg-slate-900 text-white">{uData.name}</option>
                 ))}
               </select>
             </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
