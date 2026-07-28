import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cloud, Sun, Umbrella, Wind, CloudRain, ThermometerSun, Loader2, Sparkles, MapPin, CalendarDays, Droplets, Lock } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../../../config/firebase';
import { useAuthStore } from '../../../store/authStore';
import { useItineraryStore } from '../../../store/itineraryStore';

export default function WeatherAssistant({ trip, isOpen, onClose }) {
  const { profile } = useAuthStore();
  const { nodes } = useItineraryStore();
  const [activeTab, setActiveTab] = useState('forecast'); // 'forecast' | 'historical'
  
  // Forecast state
  const [forecastData, setForecastData] = useState(null);
  const [isForecastLoading, setIsForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState(null);
  
  // Historical state
  const [historicalData, setHistoricalData] = useState(null);
  const [isHistoricalLoading, setIsHistoricalLoading] = useState(false);
  const [historicalError, setHistoricalError] = useState(null);

  // Helper to get coordinates and fetch Open-Meteo
  const fetchForecast = async () => {
    if (!trip?.destination) return;
    setIsForecastLoading(true);
    setForecastError(null);
    try {
      // 1. Geocode destination using Nominatim
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(trip.destination)}`);
      const geoData = await geoRes.json();
      
      if (!geoData || geoData.length === 0) {
        throw new Error("No se pudieron encontrar las coordenadas de tu destino.");
      }
      
      const { lat, lon } = geoData[0];
      
      // 2. Fetch 7-day forecast from Open-Meteo
      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`);
      const weatherData = await weatherRes.json();
      
      setForecastData(weatherData.daily);
    } catch (err) {
      console.error("Error fetching forecast:", err);
      setForecastError(err.message || "Error al obtener la previsión.");
    } finally {
      setIsForecastLoading(false);
    }
  };

  // Helper to fetch historical advice from Firebase
  const fetchHistorical = async () => {
    if (!trip?.destination) return;
    setIsHistoricalLoading(true);
    setHistoricalError(null);
    try {
      const functions = getFunctions(app, 'europe-west1');
      const getClimateAdvice = httpsCallable(functions, 'getClimateAdvice');
      
      const uniqueLocations = [...new Set(nodes.map(n => n.location).filter(Boolean))];
      
      const result = await getClimateAdvice({
        destination: trip.destination,
        startDate: trip.startDate ? trip.startDate.toMillis ? trip.startDate.toMillis() : new Date(trip.startDate).getTime() : null,
        endDate: trip.endDate ? trip.endDate.toMillis ? trip.endDate.toMillis() : new Date(trip.endDate).getTime() : null,
        itineraryLocations: uniqueLocations
      });
      
      if (result.data && result.data.success) {
        setHistoricalData(result.data.data);
      } else {
        throw new Error("Respuesta inválida del servidor.");
      }
    } catch (err) {
      console.error("Error fetching historical:", err);
      setHistoricalError(err.message || "Error al obtener las recomendaciones históricas.");
    } finally {
      setIsHistoricalLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'forecast' && !forecastData && !isForecastLoading) {
        fetchForecast();
      } else if (activeTab === 'historical' && !historicalData && !isHistoricalLoading) {
        fetchHistorical();
      }
    }
  }, [isOpen, activeTab]);

  // Weather code to icon mapping (WMO codes)
  const getWeatherIcon = (code) => {
    if (code <= 3) return <Sun className="w-8 h-8 text-amber-400" />;
    if (code >= 45 && code <= 48) return <Cloud className="w-8 h-8 text-slate-400" />;
    if (code >= 51 && code <= 67) return <CloudRain className="w-8 h-8 text-sky-400" />;
    if (code >= 71 && code <= 77) return <Wind className="w-8 h-8 text-slate-300" />;
    if (code >= 80 && code <= 82) return <CloudRain className="w-8 h-8 text-sky-500" />;
    if (code >= 95) return <Umbrella className="w-8 h-8 text-indigo-400" />;
    return <Cloud className="w-8 h-8 text-slate-400" />;
  };

  const getWeatherDescription = (code) => {
    if (code === 0) return 'Despejado';
    if (code === 1 || code === 2 || code === 3) return 'Parcialmente nublado';
    if (code >= 45 && code <= 48) return 'Niebla';
    if (code >= 51 && code <= 55) return 'Llovizna';
    if (code >= 61 && code <= 65) return 'Lluvia';
    if (code >= 71 && code <= 77) return 'Nieve';
    if (code >= 80 && code <= 82) return 'Chubascos';
    if (code >= 95) return 'Tormenta';
    return 'Nublado';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <div className="relative z-10 flex-1 min-w-0 pr-4">
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 truncate">
                <ThermometerSun className="text-sky-400 w-5 h-5 sm:w-6 sm:h-6 shrink-0" /> Asistente Climático
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-1 flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 shrink-0" /> <span className="truncate">{trip?.destination || 'Destino Desconocido'}</span>
              </p>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-colors z-10 shrink-0">
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex bg-slate-900 p-2 border-b border-slate-800">
            <button
              onClick={() => setActiveTab('forecast')}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 ${activeTab === 'forecast' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
            >
              <CalendarDays className="w-4 h-4" /> Previsión 7 días
            </button>
            <button
              onClick={() => setActiveTab('historical')}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 ${activeTab === 'historical' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
            >
              <Sparkles className="w-4 h-4" /> Recomendaciones IA
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto hide-scrollbar flex-1">
            {activeTab === 'forecast' ? (
              <div className="space-y-4">
                {isForecastLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center text-sky-400">
                    <Loader2 className="w-10 h-10 animate-spin mb-4" />
                    <p className="font-medium">Consultando los satélites...</p>
                  </div>
                ) : forecastError ? (
                  <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-400 text-center">
                    {forecastError}
                    <button onClick={fetchForecast} className="block mx-auto mt-2 text-xs underline hover:text-red-300">Reintentar</button>
                  </div>
                ) : forecastData ? (
                  <div className="flex gap-3 overflow-x-auto pb-4 snap-x hide-scrollbar">
                    {forecastData.time.map((dateStr, index) => {
                      const date = new Date(dateStr);
                      const isToday = index === 0;
                      return (
                        <div key={dateStr} className={`min-w-[120px] sm:min-w-[140px] flex-shrink-0 snap-center bg-slate-950 border ${isToday ? 'border-sky-500/50 shadow-[0_0_15px_rgba(14,165,233,0.15)]' : 'border-slate-800'} rounded-2xl p-4 flex flex-col items-center justify-between text-center transition-transform hover:-translate-y-1`}>
                          <p className={`text-xs font-bold uppercase mb-2 ${isToday ? 'text-sky-400' : 'text-slate-400'}`}>
                            {isToday ? 'Hoy' : date.toLocaleDateString('es-ES', { weekday: 'short' })}
                          </p>
                          <div className="my-2">
                            {getWeatherIcon(forecastData.weathercode[index])}
                          </div>
                          <div className="mt-2 space-y-1 w-full">
                            <div className="flex justify-between items-center px-1">
                              <span className="text-sm font-bold text-white">{Math.round(forecastData.temperature_2m_max[index])}º</span>
                              <span className="text-sm font-medium text-slate-500">{Math.round(forecastData.temperature_2m_min[index])}º</span>
                            </div>
                            {forecastData.precipitation_probability_max?.[index] > 20 && (
                              <div className="flex items-center justify-center gap-1 text-[10px] text-sky-400 font-bold bg-sky-500/10 py-0.5 rounded">
                                <Droplets className="w-3 h-3" /> {forecastData.precipitation_probability_max[index]}%
                              </div>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-2 line-clamp-1" title={getWeatherDescription(forecastData.weathercode[index])}>
                            {getWeatherDescription(forecastData.weathercode[index])}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
                
                {!isForecastLoading && !forecastError && (
                  <p className="text-center text-xs text-slate-500 mt-4">
                    Datos meteorológicos proporcionados por Open-Meteo.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {profile?.tier !== 'premium' ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-4 border border-amber-500/20">
                      <Lock className="w-8 h-8 text-amber-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Función Premium</h3>
                    <p className="text-slate-400 text-sm max-w-sm mb-6">
                      La Inteligencia Artificial puede analizar todo tu itinerario para darte recomendaciones exactas de qué ropa llevar, pero requiere una cuenta Premium.
                    </p>
                    <button className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl transition-colors">
                      Hazte Premium
                    </button>
                  </div>
                ) : isHistoricalLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center text-amber-400">
                    <Loader2 className="w-10 h-10 animate-spin mb-4" />
                    <p className="font-medium">La IA está analizando históricos climáticos...</p>
                  </div>
                ) : historicalError ? (
                  <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-400 text-center">
                    {historicalError}
                    <button onClick={fetchHistorical} className="block mx-auto mt-2 text-xs underline hover:text-red-300">Reintentar</button>
                  </div>
                ) : historicalData ? (
                  <div className="space-y-4">
                    <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-2xl">
                      <h4 className="text-amber-400 font-bold flex items-center gap-2 mb-2">
                        <ThermometerSun className="w-5 h-5" /> ¿Qué tiempo suele hacer?
                      </h4>
                      <p className="text-slate-300 text-sm leading-relaxed">
                        {historicalData.climateSummary}
                      </p>
                    </div>
                    
                    <div className="bg-indigo-500/10 border border-indigo-500/20 p-5 rounded-2xl">
                      <h4 className="text-indigo-400 font-bold flex items-center gap-2 mb-2">
                        <Umbrella className="w-5 h-5" /> ¿Qué meter en la maleta?
                      </h4>
                      <p className="text-slate-300 text-sm leading-relaxed mb-4">
                        {historicalData.clothingAdvice}
                      </p>
                      
                      {historicalData.essentialItems && historicalData.essentialItems.length > 0 && (
                        <div>
                          <h5 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2">Imprescindibles</h5>
                          <div className="flex flex-wrap gap-2">
                            {historicalData.essentialItems.map((item, i) => (
                              <span key={i} className="bg-indigo-500/20 text-indigo-200 text-xs font-medium px-3 py-1.5 rounded-lg border border-indigo-500/30">
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
