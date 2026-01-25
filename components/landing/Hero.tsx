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
    const { categories, loading } = useCategories();
    const [businessRows, setBusinessRows] = useState<string[][]>([]);
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

    useEffect(() => {
        if (categories.length > 0) {
            // Split categories into rows of 4
            const rows: string[][] = [];
            for (let i = 0; i < categories.length; i += 4) {
                rows.push(categories.slice(i, i + 4).map(c => c.name));
            }
            setBusinessRows(rows);
        }
    }, [categories]);

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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* 1. Recreate Video / Video Editing */}
                    <div className="w-full relative group rounded-xl overflow-hidden bg-zinc-900 border border-white/10 aspect-[3/4]">
                        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center">
                            {getMediaUrl(card1) ? (
                                <video
                                    src={getMediaUrl(card1)}
                                    className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                />
                            ) : (
                                <div className="w-full h-full opacity-50 bg-[url('https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center" />
                            )}
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
                        <div className="absolute inset-0 flex items-center justify-center z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <a href={card1.link || "/create-yours"} className="px-10 py-4 bg-white hover:bg-zinc-200 text-black font-semibold tracking-widest uppercase text-xs transition-all hover:scale-105 shadow-2xl">
                                {card1.title || "Create Video"}
                            </a>
                        </div>
                        <div className="absolute bottom-4 left-4 right-4 z-20">
                            <div className="w-full bg-black/60 backdrop-blur-xl border border-white/5 rounded-lg px-6 py-4 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <h3 className="text-white font-bold uppercase tracking-tight text-sm">{card1.title || "Video Editing"}</h3>
                                    <p className="text-zinc-400 text-[10px] font-medium uppercase tracking-wider">{card1.description || "Powered by Kling.ai"}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Recreate Image / Image Editing */}
                    <div className="w-full relative group rounded-xl overflow-hidden bg-zinc-900 border border-white/10 aspect-[3/4]">
                        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center">
                            {getMediaUrl(card2) ? (
                                (isVideo(card2)) ? (
                                    <video
                                        src={getMediaUrl(card2)}
                                        className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                                        autoPlay
                                        loop
                                        muted
                                        playsInline
                                    />
                                ) : (
                                    <img
                                        src={getMediaUrl(card2)}
                                        className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                                        alt="Hero Image"
                                    />
                                )
                            ) : (
                                <div className="w-full h-full opacity-50 bg-[url('https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1974&auto=format&fit=crop')] bg-cover bg-center" />
                            )}
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
                        <div className="absolute inset-0 flex items-center justify-center z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <a href={card2.link || "/create-image"} className="px-10 py-4 bg-white hover:bg-zinc-200 text-black font-semibold tracking-widest uppercase text-xs transition-all hover:scale-105 shadow-2xl">
                                {card2.title || "Create Image"}
                            </a>
                        </div>
                        <div className="absolute bottom-4 left-4 right-4 z-20">
                            <div className="w-full bg-black/60 backdrop-blur-xl border border-white/5 rounded-lg px-6 py-4 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <h3 className="text-white font-bold uppercase tracking-tight text-sm">{card2.title || "Image Editing"}</h3>
                                    <p className="text-zinc-400 text-[10px] font-medium uppercase tracking-wider">{card2.description || "Powered by Nano Banana Pro"}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. Living Backgrounds */}
                    {magicVideoConfig && (
                        <div className="w-full relative group rounded-xl overflow-hidden bg-zinc-900 border border-white/10 aspect-[3/4]">
                            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center">
                                {magicVideoConfig.livingBackgrounds?.mediaUrl && (
                                    magicVideoConfig.livingBackgrounds.mediaType === 'video' ? (
                                        <video src={magicVideoConfig.livingBackgrounds.mediaUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500" autoPlay loop muted playsInline />
                                    ) : (
                                        <img src={magicVideoConfig.livingBackgrounds.mediaUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
                                    )
                                )}
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
                            <div className="absolute inset-0 flex items-center justify-center z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <Link href="/magic-video/living-backgrounds" className="px-10 py-4 bg-white hover:bg-zinc-200 text-black font-semibold tracking-widest uppercase text-xs transition-all hover:scale-105 shadow-2xl">
                                    {magicVideoConfig.livingBackgrounds?.title || 'Living Backgrounds'}
                                </Link>
                            </div>
                            <div className="absolute bottom-4 left-4 right-4 z-20">
                                <div className="w-full bg-black/60 backdrop-blur-xl border border-white/5 rounded-lg px-6 py-4">
                                    <h3 className="text-white font-bold uppercase tracking-tight text-sm">
                                        {magicVideoConfig.livingBackgrounds?.title || 'Living Backgrounds'}
                                    </h3>
                                    <p className="text-zinc-400 text-[10px] font-medium uppercase tracking-wider">
                                        {magicVideoConfig.livingBackgrounds?.description || 'POWERED BY KLING AI'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 4. Director's Cut */}
                    {magicVideoConfig && (
                        <div className="w-full relative group rounded-xl overflow-hidden bg-zinc-900 border border-white/10 aspect-[3/4]">
                            <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center">
                                {magicVideoConfig.directorsCut?.mediaUrl && (
                                    magicVideoConfig.directorsCut.mediaType === 'video' ? (
                                        <video src={magicVideoConfig.directorsCut.mediaUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500" autoPlay loop muted playsInline />
                                    ) : (
                                        <img src={magicVideoConfig.directorsCut.mediaUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
                                    )
                                )}
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
                            <div className="absolute inset-0 flex items-center justify-center z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <Link href="/magic-video/directors-cut" className="px-10 py-4 bg-white hover:bg-zinc-200 text-black font-semibold tracking-widest uppercase text-xs transition-all hover:scale-105 shadow-2xl">
                                    {magicVideoConfig.directorsCut?.title || "Image to Video"}
                                </Link>
                            </div>
                            <div className="absolute bottom-4 left-4 right-4 z-20">
                                <div className="w-full bg-black/60 backdrop-blur-xl border border-white/5 rounded-lg px-6 py-4">
                                    <h3 className="text-white font-bold uppercase tracking-tight text-sm">
                                        {magicVideoConfig.directorsCut?.title || "Image to Video"}
                                    </h3>
                                    <p className="text-zinc-400 text-[10px] font-medium uppercase tracking-wider">
                                        {magicVideoConfig.directorsCut?.description || 'POWERED BY SORA 2'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </section>
    );
}
