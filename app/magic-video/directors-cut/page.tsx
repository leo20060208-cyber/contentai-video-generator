'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Upload, Sparkles, Loader2 } from 'lucide-react';
import { getSectionContent } from '@/lib/db/content';
import { motion } from 'framer-motion';
import { DirectorsCutEditor } from '@/components/magic/DirectorsCutEditor';
import { OnboardingPopup } from '@/components/onboarding/OnboardingPopup';

export default function DirectorsCutPage() {
    const [heroMedia, setHeroMedia] = useState<{ type: 'video' | 'image', url: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [showEditor, setShowEditor] = useState(false);

    useEffect(() => {
        async function loadContent() {
            try {
                const data = await getSectionContent('magic_video_hub');
                if (data && data.directorsCut && data.directorsCut.mediaUrl) {
                    setHeroMedia({
                        type: data.directorsCut.mediaType,
                        url: data.directorsCut.mediaUrl
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
        return <DirectorsCutEditor onBack={() => setShowEditor(false)} />;
    }

    return (
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
                                    alt="Director's Cut Preview"
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
                        DIRECTOR'S CUT
                    </h1>
                    <p className="text-zinc-400 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
                        Full control over your scene. Change the background, lighting, and camera movement with AI precision.
                    </p>



                    {/* Upload Button */}
                    <Button
                        className="w-full h-12 bg-white text-black hover:bg-zinc-200 font-bold text-base rounded-xl transition-all flex items-center justify-center gap-2"
                        onClick={() => setShowEditor(true)}
                    >
                        Enter Director's Cut
                    </Button>
                </div>

            </motion.div>

            {/* Onboarding Popup */}
            <OnboardingPopup
                pageKey="directors-cut"
                stepsKey="directorsCutSteps"
                titleKey="directorsCutTitle"
                defaultTitle="DIRECTOR'S CUT"
                plusInfoUrl="/guide/directors-cut"
            />
        </div>
    );
}
