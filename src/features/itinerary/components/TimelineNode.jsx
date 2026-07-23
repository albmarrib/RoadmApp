import { useState } from 'react';
import { format } from 'date-fns';
import { Plane, Hotel, Car, MapPin, Paperclip, Clock, CarFront, ChevronDown, ChevronUp, Phone, MessageCircle, Mail, User, Route } from 'lucide-react';
import DocumentViewer from '../../../components/ui/DocumentViewer';

const getIcon = (type) => {
  switch (type) {
    case 'flight': return { icon: Plane, color: 'text-blue-400', bg: 'bg-blue-400/20', border: 'border-blue-400/30' };
    case 'accommodation': return { icon: Hotel, color: 'text-orange-400', bg: 'bg-orange-400/20', border: 'border-orange-400/30' };
    case 'car_rental': return { icon: CarFront, color: 'text-purple-400', bg: 'bg-purple-400/20', border: 'border-purple-400/30' };
    case 'drive': return { icon: Route, color: 'text-indigo-400', bg: 'bg-indigo-400/20', border: 'border-indigo-400/30' };
    default: return { icon: MapPin, color: 'text-teal-400', bg: 'bg-teal-400/20', border: 'border-teal-400/30' };
  }
};

export default function TimelineNode({ node, isLast, onClick }) {
  const [viewerUrl, setViewerUrl] = useState(null);
  const [viewerName, setViewerName] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  
  const startTime = node.startTime?.toDate();
  const endTime = node.endTime?.toDate();
  const { icon: Icon, color, bg, border } = getIcon(node.type);
  
  const formatDates = () => {
    if (!startTime) return null;
    if (node.type === 'accommodation' && endTime) {
      return `${format(startTime, "dd MMM")} - ${format(endTime, "dd MMM")}`;
    }
    if (node.type === 'car_rental' && endTime) {
      return `${format(startTime, "dd MMM HH:mm")} a ${format(endTime, "dd MMM HH:mm")}`;
    }
    return `${format(startTime, "HH:mm")} ${endTime ? `- ${format(endTime, "HH:mm")}` : ''}`;
  };

  return (
    <div className="flex gap-4 relative group">
      {/* Línea vertical conectora */}
      {!isLast && (
        <div className="absolute top-10 bottom-[-1rem] left-[1.15rem] w-[2px] bg-slate-800 rounded-full"></div>
      )}
      
      {/* Icono */}
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full ${bg} border ${border} flex items-center justify-center z-10 shadow-lg`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
      
      {/* Tarjeta de contenido */}
      <div className="flex-1 pb-8">
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className={`bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-2xl p-4 cursor-pointer hover:border-teal-500/50 hover:bg-slate-800/80 transition-all shadow-lg ${isExpanded ? 'border-teal-500/30' : ''}`}
        >
          {/* Vista Compacta (Siempre visible) */}
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1">
              <h4 className="text-base font-bold text-white mb-1.5 leading-tight pr-8 relative">
                {node.title}
                <button 
                  onClick={(e) => { e.stopPropagation(); onClick && onClick(node); }}
                  className="absolute -top-1 right-0 text-xs text-teal-400 hover:underline px-2 py-1 bg-slate-800 rounded-lg"
                >
                  Editar
                </button>
              </h4>
              <div className="flex items-center gap-3 text-slate-400 text-xs">
                {startTime && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-medium text-slate-300">{formatDates()}</span>
                  </div>
                )}
                {node.cost && (
                  <span className="bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded text-xs font-semibold border border-emerald-500/20">
                    {node.cost} {node.currency}
                  </span>
                )}
                {node.routeDistanceKm && (
                  <span className="bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded text-xs font-semibold border border-indigo-500/20">
                    {node.routeDistanceKm} km
                  </span>
                )}
              </div>
            </div>
            
            <div className="text-slate-500 p-1 bg-slate-800/50 rounded-full">
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </div>
          
          {/* Vista Expandida */}
          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-4" onClick={(e) => e.stopPropagation()}>
              
              {/* Información de Rutas */}
              {node.type === 'drive' && node.routeOrigin && node.routeDestination && (
                <div className="bg-indigo-900/20 border border-indigo-500/20 p-3 rounded-xl flex items-center gap-3">
                  <Route className="w-5 h-5 text-indigo-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400">Ruta ({node.routeMode})</p>
                    <p className="text-sm text-indigo-300 font-medium truncate">{node.routeOrigin} ➔ {node.routeDestination}</p>
                  </div>
                </div>
              )}

              {/* Notas */}
              {node.notes && (
                <p className="text-slate-300 text-sm bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                  {node.notes}
                </p>
              )}

              {/* Contactos */}
              {(node.contactPhone || node.contactWhatsapp || node.contactEmail || node.contactName) && (
                <div className="flex flex-wrap gap-2">
                  {node.contactName && (
                    <div className="w-full text-xs text-slate-400 flex items-center gap-1 mb-1">
                      <User size={12} /> Contacto: <span className="text-slate-200">{node.contactName}</span>
                    </div>
                  )}
                  {node.contactPhone && (
                    <a href={`tel:${node.contactPhone.replace(/\s/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-slate-700 transition-colors">
                      <Phone size={14} className="text-teal-400" /> Llamar
                    </a>
                  )}
                  {node.contactWhatsapp && (
                    <a href={`https://wa.me/${node.contactWhatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-300 text-xs px-3 py-1.5 rounded-lg border border-emerald-800/50 transition-colors">
                      <MessageCircle size={14} className="text-emerald-400" /> WhatsApp
                    </a>
                  )}
                  {node.contactEmail && (
                    <a href={`mailto:${node.contactEmail}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-slate-700 transition-colors">
                      <Mail size={14} className="text-blue-400" /> Email
                    </a>
                  )}
                </div>
              )}

              {/* Botón de Alarma */}
              {startTime && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const mins = prompt("¿Cuántos minutos antes quieres que suene la alarma? (ej. 15, 60, 1440 para un día)", "60");
                      if (mins && !isNaN(mins)) {
                        const alarmMins = parseInt(mins, 10);
                        const end = endTime || new Date(startTime.getTime() + 60 * 60 * 1000);
                        
                        const startISO = startTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                        const endISO = end.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                        const nowISO = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

                        const icsData = [
                          'BEGIN:VCALENDAR',
                          'VERSION:2.0',
                          'PRODID:-//RoadmApp//Itinerary//EN',
                          'BEGIN:VEVENT',
                          `UID:${node.id}@roadmapp.com`,
                          `DTSTAMP:${nowISO}`,
                          `DTSTART:${startISO}`,
                          `DTEND:${endISO}`,
                          `SUMMARY:${node.title}`,
                          `DESCRIPTION:${node.notes || ''}`,
                          'BEGIN:VALARM',
                          `TRIGGER:-PT${alarmMins}M`,
                          'ACTION:DISPLAY',
                          `DESCRIPTION:Recordatorio de ${node.title}`,
                          'END:VALARM',
                          'END:VEVENT',
                          'END:VCALENDAR'
                        ].join('\r\n');

                        const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `${node.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                      }
                    }}
                    className="flex items-center gap-1.5 bg-orange-900/30 hover:bg-orange-900/50 text-orange-300 text-xs px-3 py-1.5 rounded-lg border border-orange-800/50 transition-colors mt-2"
                  >
                    <Clock size={14} className="text-orange-400" />
                    Añadir Alarma ({format(startTime, "HH:mm")})
                  </button>
                </div>
              )}

              {node.tags && node.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {node.tags.map(tag => (
                    <span key={tag} className="text-[10px] uppercase font-bold tracking-wider bg-slate-800 text-slate-400 px-2 py-1 rounded-md border border-slate-700">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {node.externalUrl && (
                <a href={node.externalUrl} target="_blank" rel="noreferrer" className="text-sm text-teal-400 hover:underline break-all block">
                  Ver enlace adjunto
                </a>
              )}

              {/* Adjuntos */}
              {node.attachments && node.attachments.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {node.attachments.map((att, i) => (
                    <button 
                      key={i} 
                      onClick={() => { setViewerUrl(att.url); setViewerName(att.name); }}
                      className="flex items-center gap-2 bg-slate-800 hover:bg-teal-900/50 border border-slate-700 text-teal-400 text-xs py-2 px-3 rounded-xl transition-colors shadow-sm"
                    >
                      <Paperclip size={14} />
                      <span className="truncate max-w-[150px] font-medium">{att.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <DocumentViewer 
        url={viewerUrl} 
        name={viewerName} 
        isOpen={!!viewerUrl} 
        onClose={() => setViewerUrl(null)} 
      />
    </div>
  );
}
