'use client';

import { motion } from 'framer-motion';
import { Eye, Heart, Play, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { LazyVideo } from '@/components/LazyVideo';
import { useLikedTemplates } from '@/lib/contexts/LikedTemplatesContext';

export function VideoCard({ video, index, size = 'normal', baseRoute = '/recreate', previewMode = 'reference', additionalParams }: { video: any; index: number; size?: 'normal' | 'large' | 'square' | 'vertical'; baseRoute?: string; previewMode?: 'reference' | 'product'; additionalParams?: string }) {
    const isLarge = size === 'large';
    const isSquare = size === 'square';
    const isVertical = size === 'vertical';
    const { isLiked: checkIsLiked, toggleLike: globalToggleLike } = useLikedTemplates();
    const isLiked = checkIsLiked(video.id);

    // Determine content layout
    const hasBefore = video.beforeVideo || video.before_video_url || video.beforeImage || video.before_image_url;
    const hasResult = video.afterVideo || video.after_video_url || video.afterImage || video.after_image_url;
    const isSplit = hasBefore && hasResult;

    // Toggle like/save
    const toggleLike = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        await globalToggleLike(video);
    };

    // Share - copy link
    const handleShare = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const link = `${window.location.origin}${baseRoute}/${video.id}`;
        navigator.clipboard.writeText(link);
        alert('Link copied to clipboard!');
    };

    return (
        <Link href={`${baseRoute}/${video.id}${additionalParams ? `?${additionalParams}` : ''}`} prefetch={false}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className={`group relative rounded-md overflow-hidden bg-black border border-white/10 ${isSquare ? 'aspect-square' : isVertical ? (isSplit ? 'aspect-[4/3]' : 'aspect-[9/16]') : isLarge ? 'aspect-[21/9]' : 'aspect-[4/3] md:aspect-[16/10]'}`}
            >
                <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105 flex">
                    {(() => {
                        const renderMedia = (vidUrl?: string, imgUrl?: string, alt?: string, isPlaceholder: boolean = false) => {
                            if (isPlaceholder) {
                                return (
                                    <div className="w-full h-full bg-zinc-900 flex flex-col items-center justify-center border border-white/5 relative group/prod">
                                        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover/prod:opacity-100 transition-opacity" />
                                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center mb-2 group-hover/prod:scale-110 transition-transform">
                                            <Sparkles className="w-4 h-4 text-zinc-400" />
                                        </div>
                                        <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Product</span>
                                    </div>
                                );
                            }

                            if (vidUrl) {
                                return (
                                    <LazyVideo
                                        src={vidUrl}
                                        className="w-full h-full object-cover"
                                    />
                                );
                            }
                            if (imgUrl) {
                                return (
                                    <Image
                                        src={imgUrl}
                                        alt={alt || 'Media'}
                                        fill
                                        className="object-cover"
                                        loading="lazy"
                                        sizes="(max-width: 768px) 33vw, 20vw"
                                    />
                                );
                            }
                            return <div className="w-full h-full bg-zinc-900" />;
                        };

                        const beforeContent = previewMode === 'product'
                            ? renderMedia(
                                undefined,
                                video.productImage || video.product_image_url,
                                "Product",
                                !video.productImage && !video.product_image_url
                            )
                            : renderMedia(
                                video.beforeVideo || video.before_video_url,
                                video.beforeImage || video.before_image_url,
                                "Reference"
                            );

                        const resultContent = renderMedia(
                            video.afterVideo || video.after_video_url,
                            video.afterImage || video.after_image_url,
                            "Result"
                        );

                        if (isSplit) {
                            return (
                                <>
                                    <div className="w-1/2 h-full relative border-r border-white/10">
                                        {beforeContent}
                                        {/* Tag Overlay */}
                                        <div className="absolute top-4 left-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <span className="px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-wider border border-white/10">
                                                {previewMode === 'product' ? 'Product' : 'Reference'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="w-1/2 h-full relative">
                                        {resultContent}
                                        <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <span className="px-3 py-1.5 rounded-lg bg-orange-500 text-[10px] font-bold text-white uppercase tracking-wider shadow-lg shadow-orange-900/20">
                                                Result
                                            </span>
                                        </div>
                                    </div>
                                </>
                            );
                        }

                        return hasResult ? resultContent : beforeContent;
                    })()}
                </div>

                {/* Gradient Overlay - Always visible at bottom for text, darker on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60 group-hover:opacity-90 group-hover:from-black/90 group-hover:via-black/40 transition-all duration-300 z-10" />

                {/* Content - Bottom Layout */}
                <div className="absolute bottom-0 left-0 right-0 p-5 z-20">
                    <div className="flex items-end justify-between gap-4">
                        {/* Left: Text Info */}
                        <div className="flex-1 min-w-0 transform transition-transform duration-300 group-hover:-translate-y-2">
                            <div className="mb-1 text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
                                {video.category || 'Recreate'}
                            </div>
                            <h3 className="text-white font-black text-lg uppercase leading-tight truncate pr-2">
                                {video.title}
                            </h3>
                        </div>

                        {/* Right: Actions (Hidden by default, slide/fade in on hover) */}
                        <div className="flex items-center gap-2 shrink-0 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                            {/* Share */}
                            <button
                                onClick={handleShare}
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

                            {/* Like */}
                            <button
                                onClick={toggleLike}
                                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white text-white hover:text-red-500 backdrop-blur-md flex items-center justify-center transition-all border border-white/10"
                                title="Like"
                            >
                                <Heart className={`w-5 h-5 ${isLiked ? 'fill-red-500 text-red-500' : 'fill-none'}`} />
                            </button>

                            {/* Recreate Button - Orange Pill */}
                            <div className="h-10 px-6 rounded-md bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs uppercase tracking-wider flex items-center shadow-lg shadow-orange-900/40 transition-transform hover:scale-105 cursor-pointer ml-1">
                                Recreate
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </Link >
    );
}
