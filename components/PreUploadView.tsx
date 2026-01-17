'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, Sparkles, Loader2 } from 'lucide-react';
import { getSectionContent } from '@/lib/db/content';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface PreUploadViewProps {
    type: 'image' | 'video';
    onUpload: (file: File) => void;
}

export function PreUploadView({ type, onUpload }: PreUploadViewProps) {
    const [content, setContent] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Configuration based on type
    const config = {
        image: {
            stepsKey: 'createImageSteps',
            defaultTitle: 'IMAGE EDITING',
            defaultDesc: 'Edit Images with consistent style and Character using up to 4 references',
            accept: 'image/*'
        },
        video: {
            stepsKey: 'createVideoSteps', // Assuming this key exists for video editing
            defaultTitle: 'VIDEO EDITING',
            defaultDesc: 'Transform your footage into viral content with AI-powered editing',
            accept: 'video/*'
        }
    }[type];

    useEffect(() => {
        async function loadContent() {
            try {
                const data = await getSectionContent('what_we_do_v2');
                if (data && data[config.stepsKey]) {
                    // Get the first step's content
                    const firstStep = data[config.stepsKey][0];
                    setContent({
                        image: firstStep.image,
                        title: data[`${type}EditingTitle`] || config.defaultTitle,
                        description: data[`${type}EditingDesc`] || firstStep.description || config.defaultDesc
                    });
                }
            } catch (error) {
                console.error('Failed to load content:', error);
            } finally {
                setIsLoading(false);
            }
        }
        loadContent();
    }, [type, config.stepsKey, config.defaultTitle, config.defaultDesc]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onUpload(e.target.files[0]);
        }
    };

    const displayTitle = config.defaultTitle;
    const displayDesc = config.defaultDesc;
    const displayMedia = content?.image;

    // Matches app/magic-video/living-backgrounds/page.tsx structure
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
                        {isLoading ? (
                            <div className="w-full h-full flex items-center justify-center">
                                <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
                            </div>
                        ) : displayMedia ? (
                            displayMedia.match(/\.(mp4|webm|mov)$/i) ? (
                                <video
                                    src={displayMedia}
                                    className="w-full h-full object-cover"
                                    autoPlay muted loop playsInline
                                />
                            ) : (
                                <img
                                    src={displayMedia}
                                    alt="Preview"
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
                        {displayTitle}
                    </h1>
                    <p className="text-zinc-400 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
                        {displayDesc}
                    </p>

                    {/* Powered by Badge - Optional but adds to premium feel (not present in Living Backgrounds code but user might want it if they asked for 'premium') 
                        Actually, user said "same design as this photo". The photo has "Powered by Nano Banana Pro".
                        The code I read for Living Backgrounds DOES NOT have the badge in the snippet I saw?
                        Wait, lines 88-93 in LivingBackgroundsPage... no badge.
                        BUT the screenshot `uploaded_image_1768647613771.png` CLEARLY shows the badge?
                        Maybe the code I read is slightly different from what is rendered or I missed it.
                        Or maybe the user is showing me a screenshot of a *different* state or page?
                        The screenshot URL is `localhost:3002/magic-video/living-backgrounds`.
                        Ah, I might have missed it or it's dynamically added?
                        Let's re-read the screenshot visual. It has "Powered by Nano Banana Pro" in a pill.
                        So I MUST include it to match the screenshot.
                    */}
                    <div className="flex justify-center mb-8">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 backdrop-blur-sm">
                            <Sparkles className="w-3 h-3 text-zinc-500" />
                            <span className="text-[10px] text-zinc-500 font-semibold">Powered by Nano Banana Pro</span>
                        </div>
                    </div>

                    {/* Upload Button */}
                    <div className="relative">
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept={config.accept}
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        <Button
                            className="w-full h-12 bg-white text-black hover:bg-zinc-200 font-bold text-base rounded-xl transition-all flex items-center justify-center gap-2"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            Upload {type === 'image' ? 'image' : 'video'}
                        </Button>
                    </div>

                </div>
            </motion.div>
        </div>
    );
}
