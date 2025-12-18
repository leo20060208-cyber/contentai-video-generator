'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Play, Upload, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { VideoCard } from './VideoCard';

// Loading skeleton component
function VideoSkeleton({ isLarge = false }: { isLarge?: boolean }) {
    return (
        <div className={`rounded-2xl bg-zinc-900 animate-pulse ${isLarge ? 'aspect-video md:aspect-[21/9]' : 'aspect-[9/16]'}`}>
            <div className="absolute inset-0 flex">
                <div className="w-1/2 bg-zinc-800/50" />
                <div className="w-1/2 bg-zinc-700/50" />
            </div>
        </div>
    );
}

export function VideoLibraryPreview({ selectedCategory = 'All' }: { selectedCategory?: string }) {
    const [allVideos, setAllVideos] = useState<any[]>([]);
    const [displayVideos, setDisplayVideos] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadVideos() {
            try {
                const { getTemplates } = await import('@/lib/db/videos');
                const data = await getTemplates();
                // Map to frontend structure
                const mapped = data.map(t => ({
                    id: t.id,
                    title: t.title,
                    category: t.category,
                    beforeImage: t.before_image_url,
                    afterImage: t.after_image_url,
                    beforeVideo: t.before_video_url,
                    afterVideo: t.after_video_url,
                    views: t.views_count,
                    trending: t.is_trending
                }));
                setAllVideos(mapped);
            } catch (e) {
                console.error('Failed to load home preview', e);
            } finally {
                setIsLoading(false);
            }
        }
        loadVideos();
    }, []);

    useEffect(() => {
        // ALWAYS filter by trending on landing page
        let filtered = allVideos.filter(v => v.trending === true);

        // Then filter by category if not 'All'
        if (selectedCategory !== 'All') {
            filtered = filtered.filter(v => v.category === selectedCategory);
        }

        setDisplayVideos(filtered.slice(0, 12)); // Show max 12 trending templates
    }, [selectedCategory, allVideos]);

    // Show loading skeletons while loading
    if (isLoading) {
        return (
            <section className="py-32 bg-black border-t border-white/5 relative overflow-hidden">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
                        <div>
                            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
                                Viral <span className="text-orange-500">Templates</span>
                            </h2>
                            <p className="text-zinc-400 max-w-xl text-lg">
                                Start with professional templates optimized for engagement.
                            </p>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-600/20 aspect-[9/16] animate-pulse" />
                            <VideoSkeleton />
                            <VideoSkeleton />
                        </div>
                        <VideoSkeleton isLarge />
                    </div>
                </div>
            </section>
        );
    }

    if (allVideos.length === 0 && !isLoading) {
        // Render nothing or a simplified state if no data
        return null;
    }

    return (
        <section className="py-32 bg-black border-t border-white/5 relative overflow-hidden">
            <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
                    <div>
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            className="text-4xl md:text-5xl font-black text-white mb-4"
                        >
                            Viral <span className="text-orange-500">Templates</span>
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-zinc-400 max-w-xl text-lg"
                        >
                            Start with professional templates optimized for engagement.
                        </motion.p>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Link href="/videos">
                            <Button variant="secondary" className="group">
                                Browse Library
                                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                    </motion.div>
                </div>

                <div className="space-y-6">
                    {/* First Row: 3 small cards (CreateYours + 2 videos) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <CreateYoursCard />
                        {displayVideos.slice(0, 2).map((video, index) => (
                            <VideoCard key={video.id} video={video} index={index + 1} size="normal" />
                        ))}
                    </div>

                    {/* Alternating pattern: 1 large, then 3 small */}
                    {(() => {
                        const remaining = displayVideos.slice(2);
                        const rows = [];
                        let i = 0;
                        let isLargeRow = true;

                        while (i < remaining.length) {
                            if (isLargeRow) {
                                // 1 large card
                                if (remaining[i]) {
                                    rows.push(
                                        <div key={`large-${i}`} className="w-full">
                                            <VideoCard video={remaining[i]} index={i + 3} size="large" />
                                        </div>
                                    );
                                }
                                i += 1;
                            } else {
                                // 3 small cards
                                const smallCards = remaining.slice(i, i + 3);
                                if (smallCards.length > 0) {
                                    rows.push(
                                        <div key={`small-${i}`} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {smallCards.map((v, idx) => (
                                                <VideoCard key={v.id} video={v} index={i + idx + 3} size="normal" />
                                            ))}
                                        </div>
                                    );
                                }
                                i += 3;
                            }
                            isLargeRow = !isLargeRow;
                        }

                        return rows;
                    })()}
                </div>
            </div>
        </section>
    );
}

function CreateYoursCard() {
    return (
        <Link href="/create-yours">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="group relative rounded-2xl overflow-hidden bg-gradient-to-br from-orange-500/20 via-red-600/20 to-purple-600/20 aspect-[16/10] cursor-pointer hover:scale-[1.02] transition-transform"
            >
                {/* Animated Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/30 via-red-600/30 to-purple-600/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-10">
                    <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6 text-orange-500" />
                    </div>

                    <h3 className="text-lg font-bold text-white mb-1">
                        Create Yours
                    </h3>

                    <p className="text-zinc-400 text-xs mb-4 px-2">
                        Recreate your own video with AI in 3 easy steps
                    </p>

                    <div className="flex items-center gap-1 text-orange-500 font-medium text-xs group-hover:gap-2 transition-all">
                        <span>Get Started</span>
                        <ArrowRight className="w-3 h-3" />
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-2 right-2 w-12 h-12 rounded-full bg-orange-500/10 blur-xl" />
                <div className="absolute bottom-2 left-2 w-10 h-10 rounded-full bg-purple-500/10 blur-xl" />
            </motion.div>
        </Link>
    );
}
