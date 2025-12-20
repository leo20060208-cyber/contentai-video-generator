'use client';

import { motion } from 'framer-motion';
import { Eye, Heart, Play } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { LazyVideo } from '@/components/LazyVideo';

export function VideoCard({ video, index, size = 'normal' }: { video: any; index: number; size?: 'normal' | 'large' }) {
    const isLarge = size === 'large';
    const [isLiked, setIsLiked] = useState(false);
    const [isHovering, setIsHovering] = useState(false);

    // Toggle like/save
    const toggleLike = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsLiked(!isLiked);
        // TODO: Implement save to database when user auth is ready
    };

    // Share - copy link
    const handleShare = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const link = `${window.location.origin}/recreate/${video.id}`;
        navigator.clipboard.writeText(link);
        alert('Link copied to clipboard!');
    };

    return (
        <Link href={`/recreate/${video.id}`}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className={`group relative rounded-2xl overflow-hidden bg-zinc-900 ${isLarge ? 'aspect-video md:aspect-[21/9]' : 'aspect-[16/10]'}`}
            >
                {/* Before/After Split View */}
                <div
                    className="absolute inset-0 flex"
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                >
                    {/* Before Side */}
                    <div className="relative w-1/2 overflow-hidden">
                        {video.beforeImage ? (
                            <Image
                                src={video.beforeImage}
                                alt="Before"
                                fill
                                className="object-cover"
                                loading="lazy"
                                sizes="(max-width: 768px) 50vw, 25vw"
                            />
                        ) : null}
                        {video.beforeVideo ? (
                            <LazyVideo
                                src={video.beforeVideo}
                                className="w-full h-full object-cover"
                                shouldLoad={isHovering}
                                autoPlay={isHovering}
                                muted
                            />
                        ) : null}
                        <span className="absolute top-3 left-3 px-2 py-1 rounded bg-zinc-800/80 backdrop-blur-sm text-[10px] font-bold text-white z-10">BEFORE</span>
                    </div>

                    {/* After Side */}
                    <div className="relative w-1/2 overflow-hidden">
                        {video.afterImage ? (
                            <Image
                                src={video.afterImage}
                                alt="After"
                                fill
                                className="object-cover"
                                loading="lazy"
                                sizes="(max-width: 768px) 50vw, 25vw"
                            />
                        ) : null}
                        {video.afterVideo ? (
                            <LazyVideo
                                src={video.afterVideo}
                                className="w-full h-full object-cover"
                                shouldLoad={isHovering}
                                autoPlay={isHovering}
                                muted
                            />
                        ) : null}
                        <span className="absolute top-3 right-3 px-2 py-1 rounded bg-orange-500 text-[10px] font-bold text-white z-10">AFTER</span>
                    </div>
                </div>

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Content - Bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                    {/* Category Badge */}
                    <div className="mb-2">
                        <span className="px-2 py-1 rounded-md bg-black/50 backdrop-blur-md border border-white/10 text-[10px] font-bold uppercase tracking-wider text-zinc-300">
                            {video.category}
                        </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-white font-bold text-base mb-3 line-clamp-1">
                        {video.title}
                    </h3>

                    {/* Action Buttons Row */}
                    <div className="flex items-center justify-end gap-2 mb-3">
                        {/* Share Button */}
                        <button
                            onClick={handleShare}
                            className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
                            title="Share"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white w-3.5 h-3.5">
                                <circle cx="18" cy="5" r="3" />
                                <circle cx="6" cy="12" r="3" />
                                <circle cx="18" cy="19" r="3" />
                                <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
                                <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
                            </svg>
                        </button>

                        {/* Like/Save Button */}
                        <button
                            onClick={toggleLike}
                            className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
                            title={isLiked ? "Remove from saved" : "Save template"}
                        >
                            <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                        </button>
                    </div>

                    {/* Recreate Button */}
                    <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-transparent border border-white/20 hover:bg-white/10 text-white font-medium text-sm transition-colors">
                        <Play className="w-4 h-4 fill-current" />
                        Recreate
                    </button>
                </div>
            </motion.div>
        </Link>
    );
}
