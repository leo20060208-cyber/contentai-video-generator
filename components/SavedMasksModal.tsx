'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Image as ImageIcon, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { useEffect, useState } from 'react';
import { UserMask, getUserMasks, deleteUserMask } from '@/lib/db/masks';
import { useAuth } from '@/lib/auth/AuthContext';

interface SavedMasksModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (maskUrl: string) => void;
}

export function SavedMasksModal({ isOpen, onClose, onSelect }: SavedMasksModalProps) {
    const { user } = useAuth();
    const [masks, setMasks] = useState<UserMask[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && user) {
            setLoading(true);
            getUserMasks(user.id).then((data) => {
                setMasks(data);
                setLoading(false);
            });
        }
    }, [isOpen, user]);

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this mask?')) {
            const success = await deleteUserMask(id);
            if (success) {
                setMasks(prev => prev.filter(m => m.id !== id));
            }
        }
    };

    const handleConfirm = () => {
        const selected = masks.find(m => m.id === selectedId);
        if (selected) {
            onSelect(selected.url);
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="bg-zinc-900 w-full max-w-4xl max-h-[80vh] rounded-2xl border border-white/10 flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-white">Select Saved Mask</h2>
                                <p className="text-sm text-zinc-400">Choose a previously segmented product</p>
                            </div>
                            <Button variant="ghost" onClick={onClose}><X className="w-5 h-5" /></Button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {loading ? (
                                <div className="text-center py-20">
                                    <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
                                </div>
                            ) : masks.length === 0 ? (
                                <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-2xl">
                                    <ImageIcon className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                                    <p className="text-zinc-400">No saved masks yet.</p>
                                    <p className="text-xs text-zinc-600 mt-2">Create and save masks during the product upload steps.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {masks.map((mask) => (
                                        <div
                                            key={mask.id}
                                            onClick={() => setSelectedId(mask.id)}
                                            className={`group relative aspect-square rounded-xl border-2 cursor-pointer overflow-hidden transition-all ${selectedId === mask.id
                                                ? 'border-orange-500 bg-orange-500/10'
                                                : 'border-white/5 bg-zinc-800 hover:border-white/20'
                                                }`}
                                        >
                                            <div className="absolute inset-0 p-2">
                                                <Image
                                                    src={mask.url}
                                                    alt={mask.name || 'Mask'}
                                                    fill
                                                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 20vw"
                                                    className="object-contain"
                                                />
                                            </div>

                                            {selectedId === mask.id && (
                                                <div className="absolute top-2 right-2 bg-orange-500 rounded-full p-1 shadow-lg">
                                                    <Check className="w-3 h-3 text-white" />
                                                </div>
                                            )}

                                            <button
                                                onClick={(e) => handleDelete(e, mask.id)}
                                                className="absolute bottom-2 right-2 p-2 bg-black/60 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>

                                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 text-xs text-white truncate">
                                                {mask.name || new Date(mask.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-white/5 flex justify-end gap-3">
                            <Button variant="ghost" onClick={onClose}>Cancel</Button>
                            <Button
                                variant="primary"
                                onClick={handleConfirm}
                                disabled={!selectedId}
                                className="bg-orange-500 hover:bg-orange-600"
                            >
                                Use Selected
                            </Button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
