'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Phone, Mail, MessageSquare, Building2, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface BusinessContactModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function BusinessContactModal({ isOpen, onClose }: BusinessContactModalProps) {
    const [step, setStep] = useState<'form' | 'success'>('form');
    const [isLoading, setIsLoading] = useState(false);

    const [form, setForm] = useState({ email: '', phone: '', message: '' });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { error } = await import('@/lib/supabase').then(m => m.supabase.from('business_inquiries').insert({
                email: form.email,
                phone: form.phone,
                message: form.message
            }));

            if (error) throw error;

            setStep('success');
        } catch (error) {
            console.error('Error submitting inquiry:', error);
            alert('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/90 backdrop-blur-md"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 shadow-2xl"
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 z-10 p-2 text-zinc-500 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="p-8 md:p-10">
                            {step === 'form' ? (
                                <>
                                    <div className="mb-10 text-center">
                                        <div className="w-12 h-12 flex items-center justify-center mx-auto mb-4 border border-zinc-800 bg-zinc-900/50">
                                            <Building2 className="w-5 h-5 text-white" />
                                        </div>
                                        <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">Enterprise</h2>
                                        <p className="text-zinc-500 text-xs tracking-wide">
                                            CUSTOM SOLUTIONS & VOLUME
                                        </p>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="space-y-4">
                                            <div className="group relative">
                                                <input
                                                    type="email"
                                                    required
                                                    placeholder="WORK EMAIL"
                                                    value={form.email}
                                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                                    className="w-full pb-2 bg-transparent border-b border-zinc-800 text-white placeholder-zinc-700 text-sm focus:outline-none focus:border-white transition-colors rounded-none"
                                                />
                                            </div>

                                            <div className="group relative">
                                                <input
                                                    type="tel"
                                                    placeholder="PHONE (OPTIONAL)"
                                                    value={form.phone}
                                                    onChange={e => setForm({ ...form, phone: e.target.value })}
                                                    className="w-full pb-2 bg-transparent border-b border-zinc-800 text-white placeholder-zinc-700 text-sm focus:outline-none focus:border-white transition-colors rounded-none"
                                                />
                                            </div>

                                            <div className="group relative">
                                                <textarea
                                                    rows={1}
                                                    placeholder="PROJECT DETAILS"
                                                    value={form.message}
                                                    onChange={e => setForm({ ...form, message: e.target.value })}
                                                    className="w-full pb-2 bg-transparent border-b border-zinc-800 text-white placeholder-zinc-700 text-sm focus:outline-none focus:border-white transition-colors resize-none rounded-none"
                                                />
                                            </div>
                                        </div>

                                        <Button
                                            type="submit"
                                            className="w-full py-4 bg-transparent border border-zinc-800 text-white hover:bg-white hover:text-black transition-all text-xs font-bold uppercase tracking-widest rounded-none h-auto"
                                            disabled={isLoading}
                                        >
                                            {isLoading ? 'SENDING...' : 'REQUEST ACCESS'}
                                        </Button>
                                    </form>
                                </>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 border border-zinc-800 flex items-center justify-center mx-auto mb-6">
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                        >
                                            <Check className="w-6 h-6 text-white" />
                                        </motion.div>
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-wide">RECEIVED</h3>
                                    <p className="text-zinc-500 text-xs mb-8 tracking-wide">
                                        WE WILL CONTACT YOU SHORTLY.
                                    </p>
                                    <Button
                                        onClick={onClose}
                                        className="w-full bg-transparent border border-zinc-800 text-white hover:bg-white hover:text-black transition-all text-xs font-bold uppercase tracking-widest rounded-none"
                                    >
                                        CLOSE
                                    </Button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

