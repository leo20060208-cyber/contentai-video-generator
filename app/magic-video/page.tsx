'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { getSectionContent } from '@/lib/db/content';
import { Loader2 } from 'lucide-react';

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
}

const defaultConfig: MagicVideoConfig = {
    livingBackgrounds: {
        mediaType: 'image',
        mediaUrl: '',
        link: '/magic-video/living-backgrounds',
        title: 'Living Backgrounds',
        description: 'Animate products with high-end motion'
    },
    directorsCut: {
        mediaType: 'image',
        mediaUrl: '',
        link: '/magic-video/directors-cut',
        title: "Director's Cut",
        description: 'Professional scene-to-scene transitions'
    },
    instantClips: {
        mediaType: 'image',
        mediaUrl: '',
        link: '/magic-video/instant-clips',
        title: 'Instant Product Clips',
        description: 'Magic is cooking...'
    }
};

export default function MagicVideoPage() {
    const [config, setConfig] = useState<MagicVideoConfig>(defaultConfig);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchContent() {
            try {
                const data = await getSectionContent('magic_video_hub');
                if (data && data.livingBackgrounds) {
                    setConfig(prev => ({ ...prev, ...data }));
                }
            } catch (e) {
                console.error("Failed to load magic video content", e);
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
            className="relative w-full aspect-[21/9] rounded-3xl border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/50 hover:border-zinc-700 transition-all duration-300 overflow-hidden group"
        >
            {renderCardContent(card)}

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-500" />

            {/* Content Bottom */}
            <div className="absolute inset-x-0 bottom-0 p-8 flex justify-between items-end z-10">
                <div className="space-y-1">
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">
                        {card.title}
                    </h3>
                    <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest opacity-60">
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
            <div className="min-h-screen pt-24 pb-12 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 pb-10 px-4 md:px-8 w-full max-w-[1200px] mx-auto flex flex-col justify-center">
            <div className="flex flex-col gap-6 py-8">
                {renderCard(config.livingBackgrounds)}
                {renderCard(config.directorsCut)}
                {renderCard(config.instantClips)}
            </div>
        </div>
    );
}
