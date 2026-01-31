'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useCategories } from '@/hooks/useCategories';
import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

export interface HeroInitialData {
    heroVideo: any;
    heroImage: any;
    libraryContent: any;
    magicVideoConfig: any;
}

interface HeroProps {
    selectedCategory?: string;
    onCategoryChange?: (category: string) => void;
    initialData: HeroInitialData;
}

export function Hero({ selectedCategory, onCategoryChange, initialData }: HeroProps) {
    const [internalCategory, setInternalCategory] = useState('All');

    // Use prop if provided, otherwise internal state
    const currentCategory = selectedCategory ?? internalCategory;

    // Use initial data directly, no need for effect to fetch it
    const { heroVideo, heroImage, libraryContent, magicVideoConfig } = initialData;

    // Helper to determine media url
    const getMediaUrl = (item: any) => {
        if (!item) return null;
        return item.after_video_url || item.after_image_url || item.video_url || item.url || item.mediaUrl;
    };

    // Helper for media type check
    const isVideo = (item: any) => {
        if (!item) return false;
        const url = getMediaUrl(item);
        if (!url) return false;
        if (item.mediaType === 'video') return true;
        return url.match(/\.(mp4|webm|mov)$/i) || item.after_video_url;
    };

    const handleBusinessClick = (business: string) => {
        const newCategory = business === currentCategory ? 'All' : business;
        if (onCategoryChange) {
            onCategoryChange(newCategory);
        } else {
            setInternalCategory(newCategory);
        }
    };

    // Card 1 Data
    const card1 = magicVideoConfig?.recreateVideo || {
        mediaUrl: heroVideo ? (heroVideo.after_video_url || heroVideo.video_url) : null,
        mediaType: 'video',
        title: 'Video Editing',
        description: 'Powered by Kling.ai',
        link: '/create-yours'
    };

    // Card 2 Data
    const card2 = magicVideoConfig?.recreateImage || {
        mediaUrl: heroImage ? (heroImage.after_image_url || heroImage.url) : null,
        mediaType: 'image',
        title: 'Image Editing',
        description: 'Powered by Nano Banana Pro',
        link: '/create-image'
    };

    return (
        <section className="pt-24 pb-4 w-full px-2">
            <div className="max-w-[1200px] mx-auto text-center mb-12">

                {/* Main Title - LARGE ORANGE TEXT */}
                <h1
                    className="text-orange-500 font-black uppercase leading-[0.95] tracking-tight mb-8"
                    style={{
                        fontSize: 'clamp(2rem, 7vw, 4.5rem)',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        letterSpacing: '-0.02em'
                    }}
                >
                    GENERATE VIRAL CONTENT IN SECONDS
                </h1>

                {/* Scrolling Marquee of Buttons */}
                <div className="w-full overflow-hidden relative py-4">
                    {/* Gradient Masks */}
                    <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-black via-black/80 to-transparent z-20 pointer-events-none" />
                    <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-black via-black/80 to-transparent z-20 pointer-events-none" />

                    <motion.div
                        className="flex gap-6 w-max"
                        animate={{ x: "-50%" }}
                        transition={{
                            ease: "linear",
                            duration: 30,
                            repeat: Infinity,
                        }}
                    >
                        {/* Repeat buttons enough times to fill screen and loop smoothly */}
                        {[...Array(20)].map((_, i) => {
                            const texts = ['EXPLORE', 'HOW?', 'WHAT CAN YOU CREATE'];
                            const text = texts[i % texts.length];
                            return (
                                <Link
                                    key={i}
                                    href="/what-we-do"
                                    className="group relative px-6 py-2 bg-transparent border border-zinc-800 hover:border-orange-500/50 transition-all duration-300 active:scale-95 flex items-center justify-center"
                                >
                                    {/* Glow effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                    {/* Main Text */}
                                    <span className="relative text-white font-bold tracking-widest text-xs z-10 whitespace-nowrap uppercase">
                                        {text}
                                    </span>
                                </Link>
                            );
                        })}
                    </motion.div>
                </div>
            </div>

            {/* Layout Container */}
            <div className="w-full max-w-[1200px] mx-auto pb-12">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">

                    {/* Card Rendering Helper */}
                    {[
                        {
                            id: 'motion-control',
                            title: magicVideoConfig?.motionControl?.title || 'Motion Control',
                            description: 'POWERED BY KLING AI',
                            link: '/magic-video/motion-control',
                            mediaUrl: magicVideoConfig?.motionControl?.mediaUrl,
                            mediaType: magicVideoConfig?.motionControl?.mediaType || 'image',
                            colSpan: 'md:col-span-2',
                            fallbackImage: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1974&auto=format&fit=crop'
                        },
                        {
                            id: 'video-editing',
                            title: card1.title || "Video Editing",
                            description: card1.description || "Powered by Kling.ai",
                            link: card1.link || "/create-yours",
                            mediaUrl: getMediaUrl(card1),
                            mediaType: isVideo(card1) ? 'video' : 'image',
                            colSpan: 'md:col-span-2',
                            fallbackImage: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=2000&auto=format&fit=crop'
                        },
                        {
                            id: 'image-editing',
                            title: card2.title || "Image Editing",
                            description: card2.description || "Powered by Nano Banana Pro",
                            link: card2.link || "/create-image",
                            mediaUrl: getMediaUrl(card2),
                            mediaType: isVideo(card2) ? 'video' : 'image',
                            colSpan: 'md:col-span-2',
                            fallbackImage: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1974&auto=format&fit=crop'
                        },
                        {
                            id: 'living-bg',
                            title: magicVideoConfig?.livingBackgrounds?.title || 'Living Backgrounds',
                            description: magicVideoConfig?.livingBackgrounds?.description || 'POWERED BY KLING AI',
                            link: '/magic-video/living-backgrounds',
                            mediaUrl: magicVideoConfig?.livingBackgrounds?.mediaUrl,
                            mediaType: magicVideoConfig?.livingBackgrounds?.mediaType || 'video',
                            colSpan: 'md:col-span-2 md:col-start-2',
                            fallbackImage: 'https://images.unsplash.com/photo-1542281286-9e0a16bb7366?q=80&w=2070&auto=format&fit=crop'
                        },
                        {
                            id: 'directors-cut',
                            title: magicVideoConfig?.directorsCut?.title || "Image to Video",
                            description: magicVideoConfig?.directorsCut?.description || 'POWERED BY SORA 2',
                            link: '/magic-video/directors-cut',
                            mediaUrl: magicVideoConfig?.directorsCut?.mediaUrl,
                            mediaType: magicVideoConfig?.directorsCut?.mediaType || 'video',
                            colSpan: 'md:col-span-2',
                            fallbackImage: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop'
                        }
                    ].map((card, idx) => (
                        <div key={card.id || idx} className={`w-full relative group rounded-xl overflow-hidden bg-zinc-900 border border-white/10 aspect-[3/4] ${card.colSpan}`}>
                            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center">
                                {card.mediaUrl ? (
                                    card.mediaType === 'video' ? (
                                        <video
                                            src={card.mediaUrl}
                                            className="w-full h-full object-cover transition-opacity duration-500"
                                            autoPlay
                                            loop
                                            muted
                                            playsInline
                                        />
                                    ) : (
                                        <img
                                            src={card.mediaUrl}
                                            className="w-full h-full object-cover transition-opacity duration-500"
                                            alt={card.title}
                                        />
                                    )
                                ) : (
                                    <div
                                        className="w-full h-full opacity-50 bg-cover bg-center"
                                        style={{ backgroundImage: `url('${card.fallbackImage}')` }}
                                    />
                                )}
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
                            <div className="absolute inset-0 flex items-center justify-center z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <Link href={card.link} className="px-10 py-4 bg-white hover:bg-zinc-200 text-black font-semibold tracking-widest uppercase text-xs transition-all hover:scale-105 shadow-2xl">
                                    {card.title}
                                </Link>
                            </div>
                            <div className="absolute bottom-4 left-4 right-4 z-20">
                                <div className="w-full bg-black/60 backdrop-blur-xl border border-white/5 rounded-lg px-6 py-4">
                                    <h3 className="text-white font-bold uppercase tracking-tight text-sm">
                                        {card.title}
                                    </h3>
                                    <p className="text-zinc-400 text-[10px] font-medium uppercase tracking-wider">
                                        {card.description}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}

                </div>
            </div>
        </section>
    );
}
