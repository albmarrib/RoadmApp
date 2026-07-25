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
    <div className="hidden print:block bg-white text-black font-sans p-4 max-w-4xl mx-auto">
      <div className="border-b-4 border-black pb-4 mb-6">
        <h1 className="text-4xl font-black uppercase tracking-tight">{trip.title}</h1>
        <p className="text-xl text-gray-700 font-medium">{trip.destination}</p>
      </div>

      {Object.entries(groupedByDay).map(([dateStr, dayNodes]) => (
        <div key={dateStr} className="mb-8 avoid-page-break">
          <h2 className="text-xl font-bold border-b-2 border-black pb-1 mb-4 bg-gray-100 px-3 py-2">
            {format(parseISO(dateStr), "EEEE, d 'de' MMMM yyyy", { locale: es }).toUpperCase()}
          </h2>
          <div className="space-y-4 px-2">
            {dayNodes.map(node => {
              const time = node.startTime?.toMillis ? node.startTime.toMillis() : new Date(node.startTime).getTime();
              const timeStr = format(time, 'HH:mm');
              return (
                <div key={node.id} className="flex flex-row items-start gap-4 pb-3 border-b border-gray-300 avoid-page-break">
                  <div className="w-14 flex-shrink-0 font-bold text-lg pt-0.5">{timeStr}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-lg flex items-start sm:items-center gap-2 mb-1 flex-col sm:flex-row">
                      <span className="text-[10px] font-bold border border-black px-1.5 py-0.5 bg-black text-white">
                        {typeLabels[node.type] || 'EVENTO'}
                      </span>
                      <span>{node.title}</span>
                    </div>
                    {node.location?.name && (
                      <div className="text-sm text-gray-800 break-words">
                        <strong>Lugar:</strong> {node.location.name}
                      </div>
                    )}
                    {(node.contactPhone || node.contactEmail || node.externalUrl) && (
                      <div className="text-sm text-gray-800 flex flex-wrap gap-x-4 gap-y-1 mt-1">
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
          @page { margin: 1.5cm; }
          body { 
            background-color: white !important; 
            color: black !important;
          }
          .avoid-page-break { 
            page-break-inside: avoid; 
            break-inside: avoid;
          }
        }
      `}} />
    </div>
  );
}
