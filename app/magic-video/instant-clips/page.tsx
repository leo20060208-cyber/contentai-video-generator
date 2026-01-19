'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Upload, Sparkles, Loader2 } from 'lucide-react';
import { getSectionContent } from '@/lib/db/content';
import { motion } from 'framer-motion';
import { InstantClipsEditor } from '@/components/magic/InstantClipsEditor';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function InstantClipsPage() {
    const [heroMedia, setHeroMedia] = useState<{ type: 'video' | 'image', url: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [showEditor, setShowEditor] = useState(false);

    useEffect(() => {
        async function loadContent() {
            try {
                const data = await getSectionContent('magic_video_hub');
                if (data && data.instantClips && data.instantClips.mediaUrl) {
                    setHeroMedia({
                        type: data.instantClips.mediaType,
                        url: data.instantClips.mediaUrl
                    });
                }
            } catch (e) {
                console.error("Failed to load content", e);
            } finally {
                setLoading(false);
            }
        }
        loadContent();
    }, []);

    if (showEditor) {
        return <ProtectedRoute><InstantClipsEditor onBack={() => setShowEditor(false)} /></ProtectedRoute>;
    }

    return (
        <ProtectedRoute>
            <div className="min-h-screen pt-24 pb-10 px-4 flex flex-col items-center justify-center relative">

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-lg mx-auto relative z-10"
                >
                    <div className="p-8 text-center relative">
                        {/* Top Preview Image/Video */}
                        <div className="relative w-full aspect-video rounded-3xl overflow-hidden mb-8 bg-transparent group text-center">
                            {loading ? (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
                                </div>
                            ) : heroMedia ? (
                                heroMedia.type === 'video' ? (
                                    <video
                                        src={heroMedia.url}
                                        className="w-full h-full object-cover"
                                        autoPlay muted loop playsInline
                                    />
                                ) : (
                                    <img
                                        src={heroMedia.url}
                                        alt="Instant Product Clips Preview"
                                        className="w-full h-full object-cover"
                                    />
                                )
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-700">
                                    <Sparkles className="w-12 h-12 opacity-20" />
                                </div>
                            )}
                        </div>

                        {/* Title & Desc */}
                        <h1 className="text-3xl font-black text-white mb-2 tracking-tight uppercase">
                            INSTANT PRODUCT CLIPS
                        </h1>
                        <p className="text-zinc-400 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
                            Transform a single photo into a high-converting video clip for Shopify or Instagram in seconds.
                        </p>



                        {/* Coming Soon Button */}
                        <div className="relative group/btn">
                            <Button
                                className="w-full h-12 bg-zinc-800 text-zinc-500 font-bold text-base rounded-xl cursor-not-allowed border border-white/5 opacity-50"
                                disabled
                            >
                                <Sparkles className="w-4 h-4" />
                                COMING SOON
                            </Button>
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-black px-3 py-1.5 rounded-lg opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
                                STAY TUNED! MAGIC IS COOKING...
                            </div>
                        </div>
                    </div>

                </motion.div>
            </div>
        </ProtectedRoute>
    );
}
