import React, { useEffect } from 'react';
import { useItineraryStore } from '../../../store/itineraryStore';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function PrintableItinerary({ trip }) {
  const { nodes, subscribeToNodes } = useItineraryStore();

  useEffect(() => {
    if (trip?.id) {
      subscribeToNodes(trip.id);
    }
  }, [trip?.id, subscribeToNodes]);

  if (!trip) return null;

  // Filtrar eventos base y ordenar cronológicamente
  const sortedNodes = [...nodes]
    .filter(n => n.startTime && !n.isReturnFlight)
    .sort((a, b) => {
      const timeA = a.startTime?.toMillis ? a.startTime.toMillis() : new Date(a.startTime).getTime();
      const timeB = b.startTime?.toMillis ? b.startTime.toMillis() : new Date(b.startTime).getTime();
      return timeA - timeB;
    });

  // Agrupar por días
  const groupedByDay = sortedNodes.reduce((acc, node) => {
    const time = node.startTime?.toMillis ? node.startTime.toMillis() : new Date(node.startTime).getTime();
    const dateStr = format(time, 'yyyy-MM-dd');
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(node);
    return acc;
  }, {});

  const typeLabels = { 
    flight: 'VUELO', 
    accommodation: 'HOTEL', 
    activity: 'ACTIVIDAD', 
    drive: 'RUTA', 
    car_rental: 'COCHE' 
  };

  return (
    <div style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
      <div 
        id="printable-itinerary-container"
        className="bg-white text-black font-sans p-8 w-[800px]"
        style={{ minHeight: '1122px' }} // A4 height approx
      >
      <div className="border-b-2 border-black pb-1 mb-2">
        <h1 className="text-2xl font-black uppercase tracking-tight leading-none">{trip.title}</h1>
        <p className="text-sm text-gray-700 font-medium">{trip.destination}</p>
      </div>

      {Object.entries(groupedByDay).map(([dateStr, dayNodes]) => (
        <div key={dateStr} className="mb-3 avoid-page-break">
          <h2 className="text-sm font-bold border-b border-black pb-0.5 mb-1 bg-gray-200 px-1 py-0.5">
            {format(parseISO(dateStr), "EEEE, d 'de' MMMM yyyy", { locale: es }).toUpperCase()}
          </h2>
          <div className="space-y-1 px-1">
            {dayNodes.map(node => {
              const time = node.startTime?.toMillis ? node.startTime.toMillis() : new Date(node.startTime).getTime();
              const timeStr = format(time, 'HH:mm');
              return (
                <div key={node.id} className="flex flex-row items-start gap-2 pb-1 border-b border-gray-300 avoid-page-break">
                  <div className="w-10 flex-shrink-0 font-bold text-sm pt-0">{timeStr}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm flex items-center gap-1.5 mb-0">
                      <span className="text-[8px] font-bold border border-black px-1 py-0 bg-black text-white leading-tight">
                        {typeLabels[node.type] || 'EVENTO'}
                      </span>
                      <span className="leading-tight">{node.title}</span>
                    </div>
                    {node.location?.name && (
                      <div className="text-[10px] text-gray-800 break-words leading-tight mt-0.5">
                        <strong>Lugar:</strong> {node.location.name}
                      </div>
                    )}
                    {(node.contactPhone || node.contactEmail || node.externalUrl) && (
                      <div className="text-[10px] text-gray-800 flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 leading-tight">
                        {node.contactPhone && <span><strong>Telf:</strong> {node.contactPhone}</span>}
                        {node.contactEmail && <span><strong>Email:</strong> {node.contactEmail}</span>}
                        {node.externalUrl && <span><strong>Web:</strong> {node.externalUrl}</span>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { margin: 0.5cm; }
          body { 
            background-color: white !important; 
            color: black !important;
            font-size: 12px;
          }
          .avoid-page-break { 
            page-break-inside: avoid; 
            break-inside: avoid;
          }
        }
      `}} />
      </div>
    </div>
  );
}
