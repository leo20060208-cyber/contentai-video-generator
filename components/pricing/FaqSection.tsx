'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle, Plus, Minus } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface FAQ {
    id: string;
    question: string;
    answer: string;
    order: number;
}

export function FaqSection() {
    const [faqs, setFaqs] = useState<FAQ[]>([]);
    const [loading, setLoading] = useState(true);
    const [openIndex, setOpenIndex] = useState<string | null>(null);

    useEffect(() => {
        const fetchFaqs = async () => {
            try {
                // If table doesn't exist yet, this might fail silently or return error
                // We handle gracefully
                const { data, error } = await supabase
                    .from('faqs')
                    .select('*')
                    .eq('is_active', true)
                    .order('order', { ascending: true });

                if (error) {
                    console.error('Error fetching FAQs:', error);
                    return;
                }

                if (data) setFaqs(data);
            } catch (err) {
                console.error('Failed to load FAQs:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchFaqs();
    }, []);

    const toggleFaq = (id: string) => {
        setOpenIndex(openIndex === id ? null : id);
    };

    if (loading) return null; // Or a skeleton
    if (faqs.length === 0) return null;

    return (
        <section className="py-20 px-4 relative overflow-hidden">
            <div className="container mx-auto max-w-4xl relative z-10">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-zinc-400 mb-4">
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Support</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Frequently Asked Questions</h2>
                    <p className="text-zinc-400 max-w-2xl mx-auto">
                        Everything you need to know about our platform, billing, and capabilities.
                    </p>
                </div>

                <div className="grid gap-4">
                    {faqs.map((faq, index) => (
                        <motion.div
                            key={faq.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className={`rounded-2xl border transition-all duration-300 ${openIndex === faq.id
                                    ? 'bg-zinc-900/80 border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.05)]'
                                    : 'bg-zinc-900/30 border-white/5 hover:border-white/10'
                                }`}
                        >
                            <button
                                onClick={() => toggleFaq(faq.id)}
                                className="w-full text-left p-6 flex items-center justify-between gap-4"
                            >
                                <span className={`font-bold text-base md:text-lg transition-colors ${openIndex === faq.id ? 'text-white' : 'text-zinc-300'}`}>
                                    {faq.question}
                                </span>
                                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300 ${openIndex === faq.id
                                        ? 'bg-orange-500 text-white border-orange-500'
                                        : 'bg-white/5 text-zinc-500 border-white/5 group-hover:bg-white/10'
                                    }`}>
                                    {openIndex === faq.id ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                </div>
                            </button>

                            <AnimatePresence>
                                {openIndex === faq.id && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                                        className="overflow-hidden"
                                    >
                                        <div className="px-6 pb-6 text-zinc-400 text-sm md:text-base leading-relaxed">
                                            {faq.answer}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
