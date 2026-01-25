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
    instantClips: MagicCard;
    videoEditing: MagicCard;
}

const defaultConfig: MagicVideoConfig = {
    livingBackgrounds: {
        mediaType: 'image',
        mediaUrl: '',
        link: '/magic-video/living-backgrounds',
        title: 'Living Backgrounds',
        description: 'POWERED BY KLING AI'
    },
    directorsCut: {
        mediaType: 'image',
        mediaUrl: '',
        link: '/magic-video/directors-cut',
        title: "Image to Video",
        description: 'POWERED BY SORA 2'
    },
    instantClips: {
        mediaType: 'image',
        mediaUrl: '',
        link: '/magic-video/instant-clips',
        title: 'Instant Product Clips',
        description: 'Magic is cooking...'
    },
    videoEditing: {
        mediaType: 'image',
        mediaUrl: '', // Will be fetched
        link: '/create-yours', // Links to Video Editing
        title: 'Video Editing',
        description: 'Transform your footage with AI'
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
                    videoEditing: {
                        ...prev.videoEditing,
                        ...(magicData?.recreateVideo || {}),
                        // Remap from recreateVideo
                        mediaUrl: magicData?.recreateVideo?.mediaUrl || prev.videoEditing.mediaUrl,
                        mediaType: magicData?.recreateVideo?.mediaType || prev.videoEditing.mediaType,
                        title: magicData?.recreateVideo?.title || prev.videoEditing.title,
                        description: magicData?.recreateVideo?.description || prev.videoEditing.description,
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
            className="relative w-full aspect-[16/9] rounded-2xl border border-white/10 bg-zinc-900/30 hover:bg-zinc-900/50 hover:border-white/20 transition-all duration-300 overflow-hidden group"
        >
            {renderCardContent(card)}

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-500" />

            {/* Content Bottom */}
            <div className="absolute inset-x-0 bottom-0 p-6 flex justify-between items-end z-10">
                <div className="space-y-1">
                    <h3 className="text-lg font-black text-white uppercase tracking-tighter">
                        {card.title}
                    </h3>
                    <p className="text-[10px] text-zinc-300 uppercase font-bold tracking-widest opacity-80">
                        {card.description}
                    </p>
                </div>
            </div>

            {/* Central Button */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                <div className="px-6 py-2.5 bg-white text-black font-black text-[10px] uppercase tracking-[0.2em] rounded-none hover:scale-105 transition-transform shadow-2xl">
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

    // Grid Layout: 2 columns, 2 rows. Full height container to fit screen without scroll if possible.
    return (
        <div className="min-h-screen w-full pt-28 pb-12 px-4 md:px-8 max-w-[1400px] mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* 1. Living Backgrounds */}
                {renderCard(config.livingBackgrounds)}

                {/* 2. Director's Cut */}
                {renderCard(config.directorsCut)}

                {/* 3. Instant Clips */}
                {renderCard(config.instantClips)}

                {/* 4. Video Editing (New) */}
                {renderCard(config.videoEditing)}
            </div>
        </div>
    );
}
