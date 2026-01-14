'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export interface Step {
    title: string;
    description: string;
    image: string;
    ctaText?: string;
    redirectUrl?: string; // New: optional redirect path
}

interface StepCardProps {
    steps: Step[];
    title?: string;
    className?: string;
    onComplete?: () => void;
    onSkip?: () => void;
    showFooter?: boolean;
    plusInfoUrl?: string;
}

export function StepCard({ steps, title, className, onComplete, onSkip, showFooter, plusInfoUrl }: StepCardProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const router = useRouter();

    // Early return if steps is undefined or empty
    if (!steps || steps.length === 0) {
        return null;
    }

    const currentData = steps[currentStep];

    const handleNext = () => {
        // If last step, prioritize completion/dismissal
        if (currentStep === steps.length - 1) {
            onComplete?.();
            onSkip?.(); // Ensure dismissal logic is triggered if onComplete doesn't cover it
            return;
        }

        // If there is a dedicated redirectUrl for this step, use it
        if (currentData.redirectUrl) {
            router.push(currentData.redirectUrl);
            return;
        }

        setCurrentStep(currentStep + 1);
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    return (
        <div className={cn("w-full max-w-[280px] mx-auto bg-[#1a1a1a] rounded-3xl overflow-hidden shadow-2xl border border-white/5 flex flex-col h-[420px] relative", className)}>
            {/* Optional Workflow Title header inside the card */}
            {title && (
                <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                    <h4 className="text-white font-bold text-center text-sm shadow-black drop-shadow-md">{title}</h4>
                </div>
            )}

            {/* Image/Video Area */}
            <div className="relative h-[58%] w-full overflow-hidden bg-black/50">
                <AnimatePresence mode="wait">
                    {currentData.image?.match(/\.(mp4|webm|mov)$/i) ? (
                        <motion.video
                            key={currentStep}
                            src={currentData.image}
                            autoPlay
                            loop
                            muted
                            playsInline
                            initial={{ opacity: 0, scale: 1.1 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.4 }}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <motion.img
                            key={currentStep}
                            src={currentData.image}
                            alt={currentData.title}
                            initial={{ opacity: 0, scale: 1.1 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.4 }}
                            className="w-full h-full object-cover"
                        />
                    )}
                </AnimatePresence>
            </div>

            {/* Content Area */}
            <div className="flex-1 px-4 pt-4 pb-2 flex flex-col relative z-10 bg-[#1a1a1a]">
                {/* Text Content with Slide Animation */}
                <div className="flex-1 relative overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="absolute inset-0 flex flex-col items-center text-center"
                        >
                            <h3 className="text-xl font-bold text-white mb-1.5 leading-tight">
                                {currentData.title}
                            </h3>
                            <p className="text-zinc-400 text-xs leading-relaxed">
                                {currentData.description}
                            </p>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Navigation Controls */}
                <div className="mt-auto flex flex-col gap-1">
                    {/* Dots */}
                    <div className="flex justify-center gap-1.5 mb-1">
                        {steps.map((_, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    "w-1.5 h-1.5 rounded-full transition-colors duration-300",
                                    idx === currentStep ? "bg-white" : "bg-white/20"
                                )}
                            />
                        ))}
                    </div>

                    {/* Buttons */}
                    <div className="flex items-center gap-2">
                        {currentStep > 0 && (
                            <button
                                onClick={prevStep}
                                className="px-3 py-1.5 rounded-lg bg-zinc-800 text-white font-semibold text-[10px] hover:bg-zinc-700 transition-colors"
                            >
                                Back
                            </button>
                        )}
                        <button
                            onClick={handleNext}
                            className={cn(
                                "flex-1 py-1.5 rounded-lg bg-white text-black font-bold text-[10px] hover:bg-zinc-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.1)]",
                                currentStep === 0 && "w-full"
                            )}
                        >
                            {currentStep === steps.length - 1 ? "FINISH" : (currentData.ctaText || "Next")}
                        </button>
                    </div>

                    {/* Footer Links (+Info & Skip) */}
                    {(onSkip || showFooter) && (
                        <div className={cn("flex items-center px-1 mt-0", onSkip ? "justify-between" : "justify-start")}>
                            <button
                                className="text-[8px] text-zinc-600 hover:text-white transition-colors py-1"
                                onClick={() => {
                                    if (plusInfoUrl) {
                                        window.open(plusInfoUrl, '_blank');
                                    }
                                }}
                            >
                                + Info
                            </button>
                            {onSkip && (
                                <button
                                    onClick={onSkip}
                                    className="text-[8px] text-zinc-600 hover:text-white transition-colors py-1"
                                >
                                    skip
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Legacy Skip (removed in favor of footer links if onSkip provided) */}
            {!onSkip && currentStep < steps.length - 1 && (
                <button
                    onClick={() => setCurrentStep(steps.length - 1)}
                    className="absolute bottom-3 right-4 text-[10px] font-medium text-zinc-500 hover:text-white transition-colors"
                >
                    Skip
                </button>
            )}
        </div>
    );
}
