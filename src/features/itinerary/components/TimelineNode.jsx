import { useState } from 'react';
import { format } from 'date-fns';
import { Plane, Hotel, Car, MapPin, Paperclip, Clock } from 'lucide-react';
import DocumentViewer from '../../../components/ui/DocumentViewer';

const getIcon = (type) => {
  switch (type) {
    case 'flight': return { icon: Plane, color: 'text-blue-400', bg: 'bg-blue-400/20', border: 'border-blue-400/30' };
    case 'accommodation': return { icon: Hotel, color: 'text-orange-400', bg: 'bg-orange-400/20', border: 'border-orange-400/30' };
    case 'drive': return { icon: Car, color: 'text-purple-400', bg: 'bg-purple-400/20', border: 'border-purple-400/30' };
    default: return { icon: MapPin, color: 'text-teal-400', bg: 'bg-teal-400/20', border: 'border-teal-400/30' };
  }
};

export default function TimelineNode({ node, isLast, onClick }) {
  const [viewerUrl, setViewerUrl] = useState(null);
  const [viewerName, setViewerName] = useState('');
  
  const startTime = node.startTime?.toDate();
  const endTime = node.endTime?.toDate();
  const { icon: Icon, color, bg, border } = getIcon(node.type);
  
  return (
    <div 
      className="flex gap-4 relative group cursor-pointer"
      onClick={() => onClick && onClick(node)}
    >
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
        <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-2xl p-5 group-hover:border-teal-500/50 group-hover:bg-slate-800/80 transition-all shadow-lg">
          <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
            <h4 className="text-lg font-bold text-white">{node.title}</h4>
            {node.cost && (
              <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-lg text-sm font-semibold border border-emerald-500/20">
                {node.cost} {node.currency}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-slate-400 text-sm mb-3">
            {startTime && (
              <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>{format(startTime, "HH:mm")} {endTime ? `- ${format(endTime, "HH:mm")}` : ''}</span>
              </div>
            )}
          </div>
          
          {node.notes && (
            <p className="text-slate-300 text-sm bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
              {node.notes}
            </p>
          )}

          {node.tags && node.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {node.tags.map(tag => (
                <span key={tag} className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded-full border border-slate-700">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {node.externalUrl && (
            <a href={node.externalUrl} target="_blank" rel="noreferrer" className="text-sm text-teal-400 hover:underline break-all mt-2 block" onClick={(e) => e.stopPropagation()}>
              Ver enlace adjunto
            </a>
          )}

          {/* Adjuntos */}
          {node.attachments && node.attachments.length > 0 && (
            <div className="mt-4 flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
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
