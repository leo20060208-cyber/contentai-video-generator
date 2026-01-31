'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { MotionControlEditor } from '@/components/magic/MotionControlEditor';
import { OnboardingPopup } from '@/components/onboarding/OnboardingPopup';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

interface HeroMedia {
    type: 'video' | 'image';
    url: string;
}

interface MotionControlPageClientProps {
    initialHeroMedia: HeroMedia | null;
    initialDefaultPrompt: string;
    initialPresets: any[];
}

export function MotionControlPageClient({
    initialHeroMedia,
    initialDefaultPrompt,
    initialPresets
}: MotionControlPageClientProps) {
    const [showEditor, setShowEditor] = useState(false);

    if (showEditor) {
        return (
            <ProtectedRoute>
                <MotionControlEditor
                    onBack={() => setShowEditor(false)}
                    initialDefaultPrompt={initialDefaultPrompt}
                    initialPresets={initialPresets}
                />
            </ProtectedRoute>
        );
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
                            {initialHeroMedia ? (
                                initialHeroMedia.type === 'video' ? (
                                    <video
                                        src={initialHeroMedia.url}
                                        className="w-full h-full object-cover"
                                        autoPlay muted loop playsInline
                                    />
                                ) : (
                                    <img
                                        src={initialHeroMedia.url}
                                        alt="Motion Control Preview"
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
                            MOTION CONTROL
                        </h1>
                        <p className="text-zinc-400 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
                            Control the motion in your videos with precision. Powered by Kling AI.
                        </p>

                        {/* Upload Button */}
                        <Button
                            className="w-full h-12 bg-white text-black hover:bg-zinc-200 font-bold text-base rounded-xl transition-all flex items-center justify-center gap-2"
                            onClick={() => setShowEditor(true)}
                        >
                            Enter Motion Control
                        </Button>
                    </div>

                </motion.div>

                {/* Onboarding Popup */}
                <OnboardingPopup
                    pageKey="motion-control"
                    stepsKey="motionControlSteps"
                    titleKey="motionControlTitle"
                    defaultTitle="MOTION CONTROL"
                    plusInfoUrl="/guide/motion-control"
                />
            </div>
        </ProtectedRoute>
    );
}
