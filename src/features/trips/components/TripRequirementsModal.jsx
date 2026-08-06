import { X, ShieldAlert, FileText, ExternalLink, Activity, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TripRequirementsModal({ trip, isOpen, onClose }) {
  if (!isOpen || !trip) return null;

  const destination = encodeURIComponent(trip.destination || '');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative"
        >
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-xl">
                  <ShieldAlert className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Requisitos y Seguridad</h2>
                  <p className="text-sm text-slate-400">Información vital para {trip.destination}</p>
                </div>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Alertas de Seguridad - Ministerio Exteriores */}
              <a
                href={`https://www.google.com/search?q=site:exteriores.gob.es+recomendaciones+de+viaje+${destination}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-4 p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl transition-colors group"
              >
                <div className="mt-1 bg-red-500/20 p-2 rounded-lg shrink-0">
                  <Activity className="w-5 h-5 text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-200 group-hover:text-white flex items-center gap-2">
                    Alertas y Seguridad <ExternalLink className="w-3 h-3 opacity-50" />
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Busca las recomendaciones de seguridad oficiales del Ministerio de Asuntos Exteriores para tu destino.</p>
                </div>
              </a>

              {/* Visados y Pasaportes */}
              <a
                href="https://apply.joinsherpa.com/"
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-4 p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl transition-colors group"
              >
                <div className="mt-1 bg-blue-500/20 p-2 rounded-lg shrink-0">
                  <FileText className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-200 group-hover:text-white flex items-center gap-2">
                    Visados y Documentación <ExternalLink className="w-3 h-3 opacity-50" />
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Comprueba en Sherpa si necesitas visado o ESTA. Introduce tu destino para ver las normativas exactas.</p>
                </div>
              </a>

              {/* Vacunas */}
              <a
                href={`https://www.google.com/search?q=vacunas+obligatorias+recomendadas+viajar+${destination}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-4 p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl transition-colors group"
              >
                <div className="mt-1 bg-emerald-500/20 p-2 rounded-lg shrink-0">
                  <Info className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-200 group-hover:text-white flex items-center gap-2">
                    Vacunación y Salud <ExternalLink className="w-3 h-3 opacity-50" />
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Busca los requisitos sanitarios y vacunas obligatorias recomendadas para tu destino.</p>
                </div>
              </a>
            </div>
            
            <div className="mt-6 p-4 bg-amber-900/20 border border-amber-500/20 rounded-xl">
              <p className="text-[11px] text-amber-400/80 leading-tight">
                <strong>Aviso Legal:</strong> La información proporcionada por estos enlaces externos es orientativa. Es responsabilidad del viajero confirmar los requisitos vigentes con las autoridades competentes antes del viaje.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
