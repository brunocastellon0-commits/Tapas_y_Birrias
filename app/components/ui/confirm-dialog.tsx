'use client';

import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  onMantener: () => void;
  onSalir: () => void;
}

export function ConfirmDialog({
  isOpen,
  title = '¿Cancelar cambios?',
  message = 'Se perderán los datos no guardados.',
  onMantener,
  onSalir,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onMantener}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#141822] border border-[rgba(6,182,212,0.15)] rounded-2xl w-full max-w-sm mx-4 shadow-2xl shadow-black/50 p-6"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[#F0F4FF] font-semibold text-base mb-1">
                  {title}
                </h3>
                <p className="text-[rgba(240,244,255,0.4)] text-sm">
                  {message}
                </p>
              </div>
              <button
                onClick={onMantener}
                className="p-1 rounded-lg text-[rgba(240,244,255,0.3)] hover:text-[#F0F4FF] hover:bg-[rgba(6,182,212,0.1)] transition-colors cursor-pointer shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={onMantener}
                className="flex-1 py-2.5 px-4 bg-[#07080B] border border-[rgba(6,182,212,0.08)] rounded-xl text-sm text-[rgba(240,244,255,0.6)] hover:text-[#F0F4FF] hover:border-[rgba(6,182,212,0.2)] transition-all font-medium cursor-pointer"
              >
                Mantener
              </button>
              <button
                onClick={onSalir}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-red-700 to-red-500 hover:from-red-600 hover:to-red-400 text-white text-sm font-medium rounded-xl transition-all border border-[rgba(239,68,68,0.2)] shadow-lg shadow-[rgba(239,68,68,0.15)] cursor-pointer"
              >
                Salir
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
