'use client';

import { motion } from 'framer-motion';
import { Eye, Heart, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useLikedTemplates } from '@/lib/contexts/LikedTemplatesContext';

// Simplified ImageCard for the Image Library
export function ImageCard({ image, index, size = 'normal' }: { image: any; index: number; size?: 'normal' | 'large' }) {
    const isLarge = size === 'large';
    // Reusing the same liked context - it works for IDs, assuming we have unique IDs for images too.
    const { isLiked: checkIsLiked, toggleLike: globalToggleLike } = useLikedTemplates();
    const isLiked = checkIsLiked(image.id);

    // Toggle like/save
    const toggleLike = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        await globalToggleLike(image);
    };

    // Share - copy link
    const handleShare = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const link = `${window.location.origin}/recreate-image/${image.id}`;
        navigator.clipboard.writeText(link);
        alert('Link copied to clipboard!');
    };

    // Use Before/After logic if available, otherwise just show main image
    // For images, "Before" could be the template, "After" is the result with product
    const beforeSrc = image.beforeImage || image.before_image_url || image.url;
    const afterSrc = image.afterImage || image.after_image_url || image.url;

    return (
        <Link href={`/recreate-image/${image.id}`} prefetch={false}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className={`group relative rounded-md overflow-hidden bg-zinc-900 ${isLarge ? 'aspect-[16/7]' : 'aspect-[16/10]'}`}
            >
                {/* Image Display */}
                <div className="absolute inset-0 flex">
                    {/* Before Side */}
                    <div className="relative w-1/2 overflow-hidden border-r border-white/10">
                        <Image
                            src={beforeSrc}
                            alt="Before"
                            fill
                            className="object-cover"
                            loading="lazy"
                            sizes="(max-width: 768px) 50vw, 25vw"
                        />
                        <span className="absolute top-3 left-3 px-2 py-1 rounded bg-zinc-800/80 backdrop-blur-sm text-[10px] font-bold text-white z-10">TEMPLATE</span>
                    </div>

                    {/* After Side */}
                    <div className="relative w-1/2 overflow-hidden">
                        <Image
                            src={afterSrc}
                            alt="After"
                            fill
                            className="object-cover"
                            loading="lazy"
                            sizes="(max-width: 768px) 50vw, 25vw"
                        />
                        <span className="absolute top-3 right-3 px-2 py-1 rounded bg-purple-500 text-[10px] font-bold text-white z-10">RESULT</span>
                    </div>
                </div>

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-zinc-900/20 to-transparent" />

                {/* Content - Bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                    {/* Category Badge */}
                    <div className="mb-2">
                        <span className="px-2 py-1 rounded-md bg-zinc-900/50 backdrop-blur-md border border-white/10 text-[10px] font-bold uppercase tracking-wider text-purple-300">
                            {image.category || 'Product Shot'}
                        </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-white font-bold text-base mb-3 line-clamp-1">
                        {image.title || 'Untitled Template'}
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
                    <div className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-transparent border border-white/20 group-hover:bg-purple-500/20 text-white font-medium text-sm transition-colors cursor-pointer group-hover:border-purple-500/50">
                        <Sparkles className="w-4 h-4 text-purple-400 fill-purple-400/20" />
                        Recreate Image
                    </div>
                </div>
            </motion.div>
        </Link>
    );
}
