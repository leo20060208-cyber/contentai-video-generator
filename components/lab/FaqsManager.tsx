'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Plus, Trash2, Edit2, Save, X, GripVertical, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, Reorder } from 'framer-motion';

interface FAQ {
    id: string;
    question: string;
    answer: string;
    order: number;
    is_active: boolean;
}

export function FaqsManager() {
    const [faqs, setFaqs] = useState<FAQ[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Form States
    const [editForm, setEditForm] = useState({ question: '', answer: '' });
    const [createForm, setCreateForm] = useState({ question: '', answer: '' });

    const fetchFaqs = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('faqs')
            .select('*')
            .order('order', { ascending: true });

        if (data) setFaqs(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchFaqs();
    }, []);

    const handleCreate = async () => {
        if (!createForm.question || !createForm.answer) return;

        const { error } = await supabase.from('faqs').insert({
            question: createForm.question,
            answer: createForm.answer,
            order: faqs.length
        });

        if (!error) {
            setCreateForm({ question: '', answer: '' });
            setIsCreating(false);
            fetchFaqs();
        }
    };

    const handleUpdate = async (id: string) => {
        if (!editForm.question || !editForm.answer) return;

        const { error } = await supabase.from('faqs').update({
            question: editForm.question,
            answer: editForm.answer
        }).eq('id', id);

        if (!error) {
            setIsEditing(null);
            fetchFaqs();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure?')) return;
        const { error } = await supabase.from('faqs').delete().eq('id', id);
        if (!error) fetchFaqs();
    };

    const handleToggleActive = async (id: string, currentState: boolean) => {
        await supabase.from('faqs').update({ is_active: !currentState }).eq('id', id);
        fetchFaqs();
    };

    const handleReorder = (newOrder: FAQ[]) => {
        setFaqs(newOrder);
    };

    // Save reorder to DB when drag ends (implied by effect or explicit save button if real-time is too heavy)
    // For simplicity, we just save order when user clicks a "Save Order" button or we could do it on every drop.
    // Let's do a Save Order button for robustness.
    const saveOrder = async () => {
        const updates = faqs.map((f, index) => ({
            id: f.id,
            order: index,
            question: f.question, // Required by upsert usually if not partial, but update is better
            answer: f.answer
        }));

        // Batch update is tricky in Supabase without RPC, so we loop or upsert.
        // Simplified: Loop (not efficient for many items but ok for FAQs)
        for (let i = 0; i < faqs.length; i++) {
            await supabase.from('faqs').update({ order: i }).eq('id', faqs[i].id);
        }
        alert('Order saved!');
    };

    return (
        <div className="max-w-4xl mx-auto p-6 bg-zinc-900 border border-white/10 rounded-2xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-white">FAQs Manager</h2>
                    <p className="text-zinc-500 text-sm">Manage the questions appearing on the pricing page.</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={saveOrder} variant="outline" className="text-xs h-9">
                        Save Order
                    </Button>
                    <Button
                        onClick={() => setIsCreating(true)}
                        className="bg-white text-black hover:bg-zinc-200 h-9 text-xs"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Question
                    </Button>
                </div>
            </div>

            {isCreating && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 p-6 bg-zinc-950 rounded-xl border border-white/10"
                >
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase">Question</label>
                            <input
                                value={createForm.question}
                                onChange={e => setCreateForm({ ...createForm, question: e.target.value })}
                                className="w-full bg-zinc-900 border border-white/10 rounded-lg p-3 text-white mt-1 focus:outline-none focus:border-orange-500"
                                placeholder="E.g. How much does it cost?"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase">Answer</label>
                            <textarea
                                value={createForm.answer}
                                onChange={e => setCreateForm({ ...createForm, answer: e.target.value })}
                                className="w-full bg-zinc-900 border border-white/10 rounded-lg p-3 text-white mt-1 focus:outline-none focus:border-orange-500 min-h-[100px]"
                                placeholder="Enter the detailed answer..."
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
                            <Button onClick={handleCreate}>Create FAQ</Button>
                        </div>
                    </div>
                </motion.div>
            )}

            <Reorder.Group axis="y" values={faqs} onReorder={handleReorder} className="space-y-3">
                {faqs.map((faq) => (
                    <Reorder.Item key={faq.id} value={faq}>
                        <div className={`p-4 rounded-xl border flex items-start gap-4 bg-zinc-800/50 ${isEditing === faq.id ? 'border-orange-500' : 'border-white/5 hover:border-white/10'}`}>
                            <div className="mt-2 cursor-grab active:cursor-grabbing text-zinc-600 hover:text-white">
                                <GripVertical className="w-5 h-5" />
                            </div>

                            <div className="flex-1">
                                {isEditing === faq.id ? (
                                    <div className="space-y-3">
                                        <input
                                            value={editForm.question}
                                            onChange={e => setEditForm({ ...editForm, question: e.target.value })}
                                            className="w-full bg-zinc-900 border border-white/10 rounded p-2 text-white text-sm"
                                        />
                                        <textarea
                                            value={editForm.answer}
                                            onChange={e => setEditForm({ ...editForm, answer: e.target.value })}
                                            className="w-full bg-zinc-900 border border-white/10 rounded p-2 text-white text-sm min-h-[80px]"
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <h3 className={`font-bold text-white text-sm ${!faq.is_active && 'opacity-50 line-through'}`}>{faq.question}</h3>
                                        <p className={`text-zinc-400 text-xs mt-1 ${!faq.is_active && 'opacity-50'}`}>{faq.answer}</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                {isEditing === faq.id ? (
                                    <>
                                        <button onClick={() => handleUpdate(faq.id)} className="p-2 bg-green-500/10 text-green-500 rounded hover:bg-green-500/20"><Save className="w-4 h-4" /></button>
                                        <button onClick={() => setIsEditing(null)} className="p-2 bg-zinc-800 text-zinc-400 rounded hover:bg-zinc-700"><X className="w-4 h-4" /></button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => { setIsEditing(faq.id); setEditForm({ question: faq.question, answer: faq.answer }); }} className="p-2 bg-white/5 text-zinc-300 rounded hover:bg-white/10"><Edit2 className="w-4 h-4" /></button>
                                        <button onClick={() => handleToggleActive(faq.id, faq.is_active)} className={`p-2 rounded ${faq.is_active ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}>
                                            {faq.is_active ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                        </button>
                                        <button onClick={() => handleDelete(faq.id)} className="p-2 bg-red-500/10 text-red-500 rounded hover:bg-red-500/20"><Trash2 className="w-4 h-4" /></button>
                                    </>
                                )}
                            </div>
                        </div>
                    </Reorder.Item>
                ))}
            </Reorder.Group>

            {faqs.length === 0 && !loading && (
                <div className="text-center py-10 text-zinc-500">
                    No FAQs found. Create one to get started.
                </div>
            )}
        </div>
    );
}
