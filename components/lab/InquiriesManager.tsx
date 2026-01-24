'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Check, Mail, Phone, Calendar, Archive, Trash2, Clock } from 'lucide-react';

interface Inquiry {
    id: string;
    email: string;
    phone: string | null;
    message: string | null;
    status: 'new' | 'contacted' | 'archived';
    created_at: string;
}

export function InquiriesManager() {
    const [inquiries, setInquiries] = useState<Inquiry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'new' | 'contacted' | 'archived'>('all');

    const fetchInquiries = async () => {
        setLoading(true);
        let query = supabase.from('business_inquiries').select('*').order('created_at', { ascending: false });

        if (filter !== 'all') {
            query = query.eq('status', filter);
        }

        const { data } = await query;
        if (data) setInquiries(data as Inquiry[]);
        setLoading(false);
    };

    useEffect(() => {
        fetchInquiries();
    }, [filter]);

    const updateStatus = async (id: string, status: Inquiry['status']) => {
        const { error } = await supabase.from('business_inquiries').update({ status }).eq('id', id);
        if (!error) fetchInquiries();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Permanently delete this inquiry?')) return;
        const { error } = await supabase.from('business_inquiries').delete().eq('id', id);
        if (!error) fetchInquiries();
    };

    return (
        <div className="max-w-6xl mx-auto p-6 bg-zinc-900 border border-white/10 rounded-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-white">Business Inquiries</h2>
                    <p className="text-zinc-500 text-sm">Manage enterprise requests from the pricing page.</p>
                </div>
                <div className="flex gap-2">
                    {(['all', 'new', 'contacted', 'archived'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${filter === f ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-12 text-zinc-500">Loading inquiries...</div>
                ) : inquiries.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500 bg-zinc-950/50 rounded-xl border border-dashed border-white/5">
                        No inquiries found.
                    </div>
                ) : (
                    inquiries.map(inquiry => (
                        <div key={inquiry.id} className="p-6 rounded-xl border border-white/5 bg-zinc-950 flex flex-col md:flex-row gap-6 group hover:border-white/10 transition-colors">
                            <div className="flex-1 space-y-3">
                                <div className="flex items-start justify-between">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        {inquiry.email}
                                        {inquiry.status === 'new' && <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] uppercase">New</span>}
                                        {inquiry.status === 'contacted' && <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] uppercase">Contacted</span>}
                                        {inquiry.status === 'archived' && <span className="px-2 py-0.5 rounded-full bg-zinc-500/20 text-zinc-400 text-[10px] uppercase">Archived</span>}
                                    </h3>
                                    <span className="text-xs text-zinc-500 font-mono flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(inquiry.created_at).toLocaleDateString()} {new Date(inquiry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>

                                {inquiry.phone && (
                                    <div className="flex items-center gap-2 text-zinc-400 text-sm">
                                        <Phone className="w-4 h-4" />
                                        {inquiry.phone}
                                    </div>
                                )}

                                <div className="p-4 rounded-lg bg-zinc-900 border border-white/5 text-sm text-zinc-300 leading-relaxed">
                                    {inquiry.message || <span className="text-zinc-600 italic">No details provided.</span>}
                                </div>
                            </div>

                            <div className="flex md:flex-col gap-2 shrink-0 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-4 justify-center">
                                {inquiry.status !== 'contacted' && (
                                    <button
                                        onClick={() => updateStatus(inquiry.id, 'contacted')}
                                        className="p-2 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20 flex items-center justify-center gap-2 text-xs font-bold transition-colors w-full md:w-32"
                                    >
                                        <Check className="w-4 h-4" /> Mark Contacted
                                    </button>
                                )}
                                {inquiry.status !== 'new' && (
                                    <button
                                        onClick={() => updateStatus(inquiry.id, 'new')}
                                        className="p-2 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 flex items-center justify-center gap-2 text-xs font-bold transition-colors w-full md:w-32"
                                    >
                                        <Clock className="w-4 h-4" /> Mark New
                                    </button>
                                )}
                                {inquiry.status !== 'archived' && (
                                    <button
                                        onClick={() => updateStatus(inquiry.id, 'archived')}
                                        className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 flex items-center justify-center gap-2 text-xs font-bold transition-colors w-full md:w-32"
                                    >
                                        <Archive className="w-4 h-4" /> Archive
                                    </button>
                                )}
                                <button
                                    onClick={() => handleDelete(inquiry.id)}
                                    className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 flex items-center justify-center gap-2 text-xs font-bold transition-colors w-full md:w-32 mt-auto"
                                >
                                    <Trash2 className="w-4 h-4" /> Delete
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
