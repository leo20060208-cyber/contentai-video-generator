'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Play, Upload, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { VideoCard } from './VideoCard';

// Loading skeleton component
function VideoSkeleton({ isLarge = false }: { isLarge?: boolean }) {
    return (
        <div className={`rounded-md bg-zinc-900 animate-pulse ${isLarge ? 'aspect-video md:aspect-[21/9]' : 'aspect-[16/10]'}`}>
            <div className="absolute inset-0 flex">
                <div className="w-1/2 bg-zinc-800/50" />
                <div className="w-1/2 bg-zinc-700/50" />
            </div>
        </div>
    );
}

export function VideoLibraryPreview({ selectedCategory = 'All' }: { selectedCategory?: string }) {
    const [trendingVideos, setTrendingVideos] = useState<any[]>([]);
    const [trendingImages, setTrendingImages] = useState<any[]>([]);
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
                    trending: t.is_trending,
                    type: t.type, // Ensure type is preserved
                    maskUrl: t.replaced_object_mask_url || t.mask_video_url
                }));

                // Filter Trending Items
                const BLACKLIST = [
                    'Product Showcase', 'Unboxing Experience', 'Skincare Routine', 'Food Commercial',
                    'Fashion Reel', 'Tech Product Demo', 'Lifestyle Shot', 'Makeup Tutorial',
                    'Dropship Winner', 'Street Style', 'Before & After', 'Hero Video', 'Hero Image',
                    'VISUAL', 'MESSI', 'BOTTLE TRICK' // Added explicit titles to blacklist
                ];

                const trending = mapped.filter(v =>
                    v.trending === true &&
                    !BLACKLIST.includes(v.title) &&
                    !v.title.toUpperCase().includes('MESSI') && // Extra safety
                    v.beforeImage // Must have image property
                );

                // DATA CLEANING:
                // 1. Blacklist specific titles that might be remnants (e.g. strict "VISUAL" or "Hero")
                const CLEAN_TRENDING = trending.filter(t =>
                    t.title !== 'VISUAL' &&
                    !t.title.includes('Hero Video') &&
                    !t.title.includes('Hero Image')
                );

                // Split into Videos and Images
                // VIDEOS: Must have video content OR be explicitly video type
                const videos = CLEAN_TRENDING.filter(t =>
                    (t.type === 'video' || t.beforeVideo || t.afterVideo) &&
                    t.type !== 'image' // Sanity check
                );

                // IMAGES: STRICT WHITELIST APPROACH
                // 1. Must NOT have video content
                // 2. Must be in specific Visual categories OR explicitly type='image'
                const IMAGE_CATEGORIES = ['Visual', 'VISUAL', 'VISUAL TEMPLATES', 'Visuals'];

                const images = CLEAN_TRENDING.filter(t =>
                    !t.beforeVideo &&
                    !t.afterVideo &&
                    !t.title.toLowerCase().includes('messi') && // HARD FIX for specific problematic template
                    (
                        t.type === 'image' ||
                        IMAGE_CATEGORIES.includes(t.category)
                    )
                    // Removed CLOTHING BRANDS restriction - if type='image' and no videos, it's valid
                );

                setTrendingVideos(videos.slice(0, 12));
                setTrendingImages(images.slice(0, 12));
            } catch (e) {
                console.error('Failed to load home preview', e);
            } finally {
                setIsLoading(false);
            }
        }
        loadVideos();
    }, []);

    // Effect for category filtering (optional, if we want to filter the already split lists)
    // For now, let's keep it simple and just show top trending in each category.

    // Show loading skeletons while loading
    if (isLoading) {
        return (
            <section className="pt-8 pb-32 bg-black border-t border-white/5 relative overflow-hidden">
                <div className="container mx-auto px-4">

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

    if (trendingVideos.length === 0 && trendingImages.length === 0 && !isLoading) {
        // Render nothing or a simplified state if no data
        return null;
    }

    return (
        <section className="pt-8 pb-32 relative overflow-hidden">
            <div className="w-full px-4">


                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[85%] mx-auto">

                    {/* Column Headers / Buttons */}
                    <Link href="/videos" className="group relative w-full">
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-red-600/20 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <button className="relative w-full py-4 px-6 bg-transparent border border-white/10 group-hover:border-orange-500/50 rounded-xl flex items-center justify-between transition-all duration-300 group-hover:-translate-y-1 backdrop-blur-sm">
                            <span className="font-black italic uppercase tracking-wider text-white text-lg">
                                Recreate Viral <span className="text-orange-500">Video</span> Templates
                            </span>
                            <ArrowRight className="w-5 h-5 text-white/50 group-hover:text-orange-500 transition-colors" />
                        </button>
                    </Link>

                    <Link href="/images" className="group relative w-full">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-600/20 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <button className="relative w-full py-4 px-6 bg-transparent border border-white/10 group-hover:border-purple-500/50 rounded-xl flex items-center justify-between transition-all duration-300 group-hover:-translate-y-1 backdrop-blur-sm">
                            <span className="font-black italic uppercase tracking-wider text-white text-lg">
                                Recreate Viral <span className="text-purple-500">Images</span> Templates
                            </span>
                            <ArrowRight className="w-5 h-5 text-white/50 group-hover:text-purple-500 transition-colors" />
                        </button>
                    </Link>

                    {Array.from({ length: Math.max(trendingVideos.length, trendingImages.length) }).map((_, index) => {
                        const video = trendingVideos[index];
                        const image = trendingImages[index];

                        return (
                            <div key={index} className="contents">
                                {/* Left Column: Trending Video */}
                                {video ? (
                                    <VideoCard video={video} index={index} size="vertical" />
                                ) : (
                                    <div className="hidden md:block" />
                                )}

                                {/* Right Column: Trending Image */}
                                {image ? (
                                    <VideoCard video={image} index={index} size="vertical" baseRoute="/recreate-image" />
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

function CreateYoursCard() {
    // Component code remains but is unused in this new layout. 
    // Keeping it in case user wants it back or we move it elsewhere.
    return (
        <Link href="/create-yours" prefetch={false}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="group relative rounded-2xl overflow-hidden bg-gradient-to-br from-orange-500/20 via-red-600/20 to-purple-600/20 aspect-square cursor-pointer hover:scale-[1.02] transition-transform"
            >
                {/* ... content ... */}
            </motion.div>
        </Link>
    );
}
