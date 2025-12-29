'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { CreateYoursFlow } from '@/components/create-yours/CreateYoursFlow';

interface CreateYoursModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CreateYoursModal = ({ isOpen, onClose }: CreateYoursModalProps) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="relative w-full max-w-4xl bg-zinc-900 rounded-3xl shadow-2xl border border-white/10 my-8 mx-auto overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        <div className="overflow-y-auto flex-1 p-6 md:p-8 custom-scrollbar">
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-6 right-6 z-10 text-zinc-500 hover:text-white transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            <CreateYoursFlow onCancel={onClose} />
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
