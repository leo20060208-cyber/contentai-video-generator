'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Upload, Sparkles, Loader2 } from 'lucide-react';
import { getSectionContent } from '@/lib/db/content';
import { motion, AnimatePresence } from 'framer-motion';
import { LivingBackgroundEditor } from '@/components/magic/LivingBackgroundEditor';
import { OnboardingPopup } from '@/components/onboarding/OnboardingPopup';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function LivingBackgroundsPage() {
    const [heroMedia, setHeroMedia] = useState<{ type: 'video' | 'image', url: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);

    useEffect(() => {
        async function loadContent() {
            try {
                const data = await getSectionContent('magic_video_hub');
                if (data && data.livingBackgrounds && data.livingBackgrounds.mediaUrl) {
                    setHeroMedia({
                        type: data.livingBackgrounds.mediaType,
                        url: data.livingBackgrounds.mediaUrl
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

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            setUploadedImage(ev.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    if (uploadedImage) {
        return <ProtectedRoute><LivingBackgroundEditor image={uploadedImage} onBack={() => setUploadedImage(null)} /></ProtectedRoute>;
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
                                        alt="Living Backgrounds Preview"
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
                            LIVING BACKGROUNDS
                        </h1>
                        <p className="text-zinc-400 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
                            Animate specific areas of your image with our magic brush while keeping your product perfectly still.
                        </p>



                        {/* Upload Button */}
                        <div className="relative">
                            <input
                                type="file"
                                id="background-upload"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileUpload}
                            />
                            <Button
                                className="w-full h-12 bg-white text-black hover:bg-zinc-200 font-bold text-base rounded-xl transition-all flex items-center justify-center gap-2"
                                onClick={() => document.getElementById('background-upload')?.click()}
                            >
                                Upload image
                            </Button>
                        </div>
                    </div>

                </motion.div >

                {/* Onboarding Popup */}
                <OnboardingPopup
                    pageKey="living-backgrounds"
                    stepsKey="livingBackgroundsSteps"
                    titleKey="livingBackgroundsTitle"
                    defaultTitle="LIVING BACKGROUNDS"
                    plusInfoUrl="/guide/living-backgrounds"
                />
            </div >
        </ProtectedRoute>
    );
}
