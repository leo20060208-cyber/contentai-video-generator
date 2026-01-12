'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';

interface MaskPositionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (slotIndex: number) => void;
    slots: { name?: string; timeRange?: { startSecond: number; endSecond: number } }[];
    imageDescriptions?: string[];
}

export function MaskPositionModal({ isOpen, onClose, onConfirm, slots, imageDescriptions }: MaskPositionModalProps) {
    // If no slots defined but description exists, mock some slots? 
    // Usually logic in parent handles this, but let's be safe.
    const displaySlots: { name?: string; timeRange?: { startSecond: number; endSecond: number } }[] = slots.length > 0 ? slots : (imageDescriptions || []).map(d => ({ name: d, timeRange: undefined }));

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/90 backdrop-blur-md z-[110] flex items-center justify-center p-4"
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="bg-zinc-900 border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl relative"
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center mb-8">
                            <h2 className="text-xl font-bold text-white mb-2">Assign to Product Slot</h2>
                            <p className="text-sm text-zinc-400">Where should this product appear in the video?</p>
                        </div>

                        <div className="grid gap-3">
                            {displaySlots.map((slot, index) => (
                                <button
                                    key={index}
                                    onClick={() => onConfirm(index)}
                                    className="group relative flex items-center p-4 rounded-xl border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 hover:border-orange-500/50 transition-all text-left"
                                >
                                    <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                                        {index + 1}
                                    </div>
                                    <div className="ml-4 flex-1">
                                        <h4 className="text-sm font-medium text-white group-hover:text-orange-400 transition-colors">
                                            {slot.name || `Product ${index + 1}`}
                                        </h4>
                                        {slot.timeRange && (
                                            <p className="text-xs text-zinc-500 mt-0.5">
                                                Appears at {slot.timeRange.startSecond}s - {slot.timeRange.endSecond}s
                                            </p>
                                        )}
                                    </div>
                                    <Check className="w-4 h-4 text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            ))}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
