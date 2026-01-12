'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, ArrowLeft, LayoutGrid, Play, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth/AuthContext';
import { VideoCard } from '@/components/landing/VideoCard';

export default function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [collection, setCollection] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchCollectionData() {
            setLoading(true);

            // 1. Fetch Collection Info
            const { data: coll, error } = await supabase
                .from('collections')
                .select('*')
                .eq('id', id)
                .single();

            if (error || !coll) {
                console.error('Error fetching collection:', error);
                setLoading(false);
                return;
            }
            setCollection(coll);

            // 2. Fetch Items (Templates)
            const { data: colItems, error: itemsError } = await supabase
                .from('collection_items')
                .select(`
                    order_index,
                    templates (*)
                `)
                .eq('collection_id', id)
                .order('order_index', { ascending: true });

            if (!itemsError && colItems) {
                // Flatten structure: collection_items -> template
                const templates = colItems
                    .map((item: any) => item.templates)
                    .filter(Boolean)
                    .map((t: any) => {
                        return {
                            ...t,
                            // Map fields to what VideoCard might expect if different
                            beforeImage: t.before_image_url,
                            afterImage: t.after_image_url,
                            beforeVideo: t.before_video_url,
                            afterVideo: t.after_video_url,
                            productImage: t.product_image_url
                        };
                    });
                setItems(templates);
            }
            setLoading(false);
        }

        if (id) fetchCollectionData();
    }, [id]);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-black"><Loader2 className="animate-spin text-purple-500 w-8 h-8" /></div>;
    }

    if (!collection) {
        return <div className="min-h-screen flex items-center justify-center bg-black text-white">Collection not found.</div>;
    }

    const backLink = collection.type === 'video' ? '/videos' : '/images';
    const baseRoute = collection.type === 'video' ? '/recreate' : '/recreate-image';

    return (
        <div className="min-h-screen pt-24 px-6 md:px-12 pb-20 max-w-[1920px] mx-auto text-white">
            {/* Header */}
            <div className="flex flex-col gap-6 mb-12">
                <Link
                    href={backLink}
                    className="inline-flex items-center gap-2 text-zinc-500 hover:text-white uppercase tracking-widest text-xs font-bold transition-colors w-fit group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Library
                </Link>

                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${collection.type === 'video' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-pink-500/10 text-pink-400 border border-pink-500/20'}`}>
                            {collection.type} Collection
                        </span>
                        <span className="text-zinc-600 text-[10px] font-mono tracking-widest">{items.length} ITEMS</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white uppercase">
                        {collection.title}
                    </h1>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {items.length === 0 && (
                    <div className="col-span-full text-center py-20 text-zinc-600">
                        This collection has no items yet.
                    </div>
                )}

                {items.map((template, index) => (
                    <motion.div
                        key={template.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                    >
                        <VideoCard
                            video={template}
                            size="normal"
                            baseRoute={baseRoute}
                            additionalParams={`collectionId=${id}`}
                            index={index}
                        />
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
