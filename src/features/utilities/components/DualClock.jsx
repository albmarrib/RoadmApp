import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

export default function DualClock({ destination }) {
  const [localTime, setLocalTime] = useState(new Date());
  const [destTimeOffset, setDestTimeOffset] = useState(null); // Offset in minutes
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let interval = setInterval(() => {
      setLocalTime(new Date());
    }, 60000); // Actualiza cada minuto para ahorrar recursos

    const fetchDestTimezone = async () => {
      if (!destination) return;
      setIsLoading(true);
      try {
        // 1. Obtener coordenadas del destino
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destination)}`);
        const geoData = await geoRes.json();
        if (geoData && geoData.length > 0) {
          const lat = geoData[0].lat;
          const lon = geoData[0].lon;
          
          // 2. Obtener la zona horaria (offset) desde timeapi.io
          const tzRes = await fetch(`https://timeapi.io/api/TimeZone/coordinate?latitude=${lat}&longitude=${lon}`);
          if (tzRes.ok) {
            const tzData = await tzRes.json();
            // timeapi devuelve currentUtcOffset en un objeto
            if (tzData.currentUtcOffset && tzData.currentUtcOffset.seconds !== undefined) {
               setDestTimeOffset(tzData.currentUtcOffset.seconds / 60);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching timezone:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDestTimezone();
    return () => clearInterval(interval);
  }, [destination]);

  if (isLoading || destTimeOffset === null) return null; // Ocultar si falla o está cargando

  // Calcular la hora del destino aplicando el offset
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const destDate = new Date(utc + (60000 * destTimeOffset));

  const formatTime = (d) => d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex items-center justify-center gap-2 text-sm font-bold text-teal-400 flex-shrink-0">
      <Clock className="w-4 h-4" />
      <span>{formatTime(destDate)}</span>
      <span className="text-slate-400 font-medium">({formatTime(now)})</span>
    </div>
  );
}
