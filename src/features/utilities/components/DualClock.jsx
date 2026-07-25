import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

export default function DualClock({ destination, origin }) {
  const [localTime, setLocalTime] = useState(new Date());
  const [destInfo, setDestInfo] = useState(null); // { offset, countryCode }
  const [originInfo, setOriginInfo] = useState(null); // { offset, countryCode }
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let interval = setInterval(() => {
      setLocalTime(new Date());
    }, 60000); // Actualiza cada minuto para ahorrar recursos

    const fetchTimezone = async (locationName) => {
      if (!locationName) return null;
      try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}&addressdetails=1`);
        const geoData = await geoRes.json();
        if (geoData && geoData.length > 0) {
          const lat = geoData[0].lat;
          const lon = geoData[0].lon;
          const countryCode = geoData[0].address?.country_code || null;

          const tzRes = await fetch(`https://timeapi.io/api/TimeZone/coordinate?latitude=${lat}&longitude=${lon}`);
          if (tzRes.ok) {
            const tzData = await tzRes.json();
            if (tzData.currentUtcOffset && tzData.currentUtcOffset.seconds !== undefined) {
               return {
                 offset: tzData.currentUtcOffset.seconds / 60,
                 countryCode
               };
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching timezone for ${locationName}:`, error);
      }
      return null;
    };

    const fetchOffsets = async () => {
      setIsLoading(true);
      const destData = await fetchTimezone(destination);
      setDestInfo(destData);
      
      if (origin) {
        const origData = await fetchTimezone(origin);
        setOriginInfo(origData);
      } else {
        setOriginInfo(null);
      }
      setIsLoading(false);
    };

    fetchOffsets();
    return () => clearInterval(interval);
  }, [destination, origin]);

  if (isLoading || !destInfo) return null; // Ocultar si falla o está cargando

  const getFlagEmoji = (countryCode) => {
    if (!countryCode) return '📍';
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  // Calcular la hora aplicando offsets
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const destDate = new Date(utc + (60000 * destInfo.offset));
  const originDate = originInfo ? new Date(utc + (60000 * originInfo.offset)) : now;

  const formatTime = (d) => d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex items-center justify-center gap-2 text-sm font-bold text-teal-400 flex-shrink-0">
      <div className="flex items-center gap-1 bg-teal-500/10 px-2 py-1 rounded-lg">
        <span className="text-base leading-none">{getFlagEmoji(destInfo.countryCode)}</span>
        <span>{formatTime(destDate)}</span>
      </div>
      <div className="flex items-center gap-0.5 text-slate-400 font-medium opacity-80">
        <span className="text-xs leading-none">{getFlagEmoji(originInfo?.countryCode)}</span>
        <span>{formatTime(originDate)}</span>
      </div>
    </div>
  );
}
