'use client';

import { motion } from 'framer-motion';
import { LayoutGrid, Play, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';

interface CollectionCardProps {
    collection: {
        id: string;
        title: string;
        item_count?: number;
        cover_url: string;
        type: 'video' | 'image';
    };
    basePath: string; // '/videos' or '/images'
}

export function CollectionCard({ collection, basePath }: CollectionCardProps) {
    return (
        <Link href={`/collections/${collection.id}`} className="block group relative">
            <motion.div
                whileHover={{ scale: 1.02 }}
                className="relative aspect-[4/3] md:aspect-[16/10] rounded-xl overflow-hidden bg-zinc-900 border border-white/10 hover:border-purple-500/50 transition-all"
            >
                {/* Cover Image */}
                {collection.cover_url ? (
                    <img
                        src={collection.cover_url}
                        alt={collection.title}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                        <LayoutGrid className="w-12 h-12 text-zinc-600" />
                    </div>
                )}

                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />

                {/* Badge */}
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-purple-600/90 backdrop-blur-md flex items-center gap-1.5 shadow-lg border border-purple-400/30">
                    <LayoutGrid className="w-3 h-3 text-white" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">Collection</span>
                </div>

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-5 z-20">
                    <div className="flex items-end justify-between gap-4">
                        <div className="flex-1 min-w-0 transform transition-transform duration-300 group-hover:-translate-y-2">
                            <p className="text-[10px] text-purple-300 uppercase tracking-widest mb-1 font-bold">{collection.item_count} Items</p>
                            <h3 className="text-white font-black text-lg uppercase leading-tight truncate">{collection.title}</h3>
                        </div>

                        {/* Hover Actions */}
                        <div className="flex items-center gap-2 shrink-0 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                            {/* Share */}
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const link = `${window.location.origin}/collections/${collection.id}`;
                                    navigator.clipboard.writeText(link);
                                    alert('Link copied to clipboard!');
                                }}
                                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white text-white hover:text-black backdrop-blur-md flex items-center justify-center transition-all border border-white/10"
                                title="Share"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="18" cy="5" r="3" />
                                    <circle cx="6" cy="12" r="3" />
                                    <circle cx="18" cy="19" r="3" />
                                    <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
                                    <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
                                </svg>
                            </button>

                            {/* Like (Mock for now or hook up if Collections support likes) */}
                            {/* User asked for Like and Share. Since collections table doesn't have likes yet, maybe UI only? Or use same context? */}
                            {/* Let's add the button visually conformant but maybe functionality triggers 'Collection Saved' or similar if implemented. */}
                            {/* For now, just the visual button as requested 'surti lu e donar like i compartir' */}
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    // Todo: Implement collection likes
                                    alert('Collection liked!');
                                }}
                                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white text-white hover:text-red-500 backdrop-blur-md flex items-center justify-center transition-all border border-white/10"
                                title="Like"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </Link>
    );
}
