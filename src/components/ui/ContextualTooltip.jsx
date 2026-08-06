import { motion, AnimatePresence } from 'framer-motion';
import { X, Lightbulb } from 'lucide-react';
import { useOnboardingStore } from '../../store/onboardingStore';

/**
 * Tooltip contextual para el onboarding progresivo.
 * @param {string} id - ID del tooltip (Map, Packing, Expenses, Docs).
 * @param {string} title - Título del tooltip.
 * @param {string} text - Texto explicativo.
 * @param {string} position - Clases de Tailwind para posicionarlo (ej. 'top-20 right-4').
 */
export default function ContextualTooltip({ id, title, text, position = 'bottom-4 right-4 md:bottom-8 md:right-8' }) {
  const { [`hasSeen${id}Tooltip`]: hasSeen, markTooltipAsSeen } = useOnboardingStore();

  if (hasSeen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`fixed z-50 ${position} w-72 max-w-[calc(100vw-2rem)]`}
      >
        <div className="bg-slate-900 border border-teal-500/50 shadow-2xl shadow-teal-500/20 rounded-2xl p-4 relative overflow-hidden">
          {/* Fondo decorativo */}
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-teal-500/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <button 
            onClick={() => markTooltipAsSeen(id)}
            className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex gap-3 items-start">
            <div className="bg-teal-500/20 p-2 rounded-xl shrink-0">
              <Lightbulb className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm mb-1 pr-4">{title}</h4>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                {text}
              </p>
              <button 
                onClick={() => markTooltipAsSeen(id)}
                className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold py-1.5 px-4 rounded-lg text-xs transition-colors"
              >
                ¡Entendido!
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
