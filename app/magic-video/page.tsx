'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getSectionContent } from '@/lib/db/content';
import { Loader2 } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

interface MagicCard {
    mediaType: 'video' | 'image';
    mediaUrl: string;
    link: string;
    title: string;
    description: string;
}

interface MagicVideoConfig {
    livingBackgrounds: MagicCard;
    directorsCut: MagicCard;
    recreateVideo: MagicCard;
    motionControl: MagicCard;
}

const defaultConfig: MagicVideoConfig = {
    livingBackgrounds: {
        mediaType: 'image',
        mediaUrl: '/images/what-we-do/recreate-template-video-1.png',
        link: '/magic-video/living-backgrounds',
        title: 'Living Backgrounds',
        description: 'POWERED BY KLING AI'
    },
    directorsCut: {
        mediaType: 'image',
        mediaUrl: '/images/what-we-do/create-yours-video-1.png',
        link: '/magic-video/directors-cut',
        title: "Image to Video",
        description: 'POWERED BY SORA 2'
    },
    recreateVideo: {
        mediaType: 'video',
        mediaUrl: '/videos/video-editing-demo.mp4', // Fallback
        link: '/create-yours',
        title: 'Video Editing',
        description: 'POWERED BY KLING AI'
    },
    motionControl: {
        mediaType: 'image',
        mediaUrl: '/images/what-we-do/recreate-template-video-2.png', // Fallback
        link: '/magic-video/motion-control',
        title: 'Motion Control',
        description: 'POWERED BY LUMA DREAM MACHINE'
    }
};

export default function MagicVideoPage() {
    const [config, setConfig] = useState<MagicVideoConfig>(defaultConfig);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchContent() {
            try {
                // Fetch Magic Video Hub content
                const magicData = await getSectionContent('magic_video_hub');
                console.log("Magic Data Loaded:", magicData);

                setConfig(prev => ({
                    ...prev,
                    ...(magicData || {}),
                    // Force correct descriptions
                    livingBackgrounds: {
                        ...prev.livingBackgrounds,
                        ...(magicData?.livingBackgrounds || {}),
                        description: 'POWERED BY KLING AI'
                    },
                    directorsCut: {
                        ...prev.directorsCut,
                        ...(magicData?.directorsCut || {}),
                        title: 'Image to Video',
                        description: 'POWERED BY SORA 2'
                    },
                    recreateVideo: {
                        ...prev.recreateVideo,
                        ...(magicData?.recreateVideo || {}),
                        title: 'Video Editing',
                        description: 'POWERED BY KLING AI'
                    },
                    motionControl: {
                        ...prev.motionControl,
                        ...(magicData?.motionControl || {}),
                        title: 'Motion Control',
                        description: 'POWERED BY LUMA DREAM MACHINE'
                    }
                }));

            } catch (e) {
                console.error("Failed to load content", e);
            } finally {
                setLoading(false);
            }
        }
        fetchContent();
    }, []);

    const renderCardContent = (card: MagicCard) => {
        if (!card.mediaUrl) return null;

        if (card.mediaType === 'video') {
            return (
                <video
                    src={card.mediaUrl}
                    className="absolute inset-0 w-full h-full object-cover"
                    autoPlay
                    muted
                    loop
                    playsInline
                />
            );
        }
        return (
            <img
                src={card.mediaUrl}
                alt="Card Background"
                className="absolute inset-0 w-full h-full object-cover"
            />
        );
    };

    const renderCard = (card: MagicCard) => (
        <Link
            href={card.link}
            className="relative w-full aspect-[3/4] rounded-2xl border border-white/10 bg-zinc-900/30 hover:bg-zinc-900/50 hover:border-white/20 transition-all duration-300 overflow-hidden group"
        >
            {renderCardContent(card)}

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-500" />

            {/* Content Bottom */}
            <div className="absolute inset-x-0 bottom-0 p-8 flex justify-between items-end z-10">
                <div className="space-y-2">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">
                        {card.title}
                    </h3>
                    <p className="text-xs text-zinc-300 uppercase font-bold tracking-widest opacity-80">
                        {card.description}
                    </p>
                </div>
            </div>

            {/* Central Button */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                <div className="px-8 py-3 bg-white text-black font-black text-xs uppercase tracking-[0.2em] rounded-none hover:scale-105 transition-transform shadow-2xl">
                    {card.title}
                </div>
            </div>
        </Link>
    );

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        );
    }

    // Grid Layout: 2 columns.
    return (
        <div className="min-h-screen w-full flex items-center justify-center py-20 px-4 md:px-8 max-w-[2200px] mx-auto">
            <div className="w-full grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
                {/* 1. Living Backgrounds */}
                {renderCard(config.livingBackgrounds)}

                {/* 2. Director's Cut */}
                {config.directorsCut && renderCard(config.directorsCut)}

                {/* 3. Video Editing - Fallback safe */}
                {(config.recreateVideo || defaultConfig.recreateVideo) && renderCard(config.recreateVideo || defaultConfig.recreateVideo)}

                {/* 4. Motion Control - Fallback safe */}
                {(config.motionControl || defaultConfig.motionControl) && renderCard(config.motionControl || defaultConfig.motionControl)}
            </div>
        </div>
    );
}
