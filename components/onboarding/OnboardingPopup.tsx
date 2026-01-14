'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { StepCard } from '@/components/what-we-do/StepCard';
import { getSectionContent } from '@/lib/db/content';

interface OnboardingPopupProps {
    pageKey: string; // Unique key for each page (e.g., 'video-editing', 'image-editing')
    stepsKey: string; // Key to fetch steps from site_content (e.g., 'createVideoSteps')
    titleKey?: string; // Optional title key
    defaultTitle?: string; // Fallback title
    plusInfoUrl?: string; // URL to guide page
}

export function OnboardingPopup({
    pageKey,
    stepsKey,
    titleKey,
    defaultTitle = 'Welcome',
    plusInfoUrl
}: OnboardingPopupProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [steps, setSteps] = useState<any[]>([]);
    const [title, setTitle] = useState(defaultTitle);

    useEffect(() => {
        // Check if user has already seen this onboarding
        const hasSeenKey = `onboarding_seen_${pageKey}`;
        const hasSeen = localStorage.getItem(hasSeenKey);

        if (!hasSeen) {
            // Load content from database
            loadOnboardingContent();
            setIsVisible(true);
        }
    }, [pageKey]);

    const loadOnboardingContent = async () => {
        try {
            const data = await getSectionContent('what_we_do_v2');
            if (data && data[stepsKey]) {
                setSteps(data[stepsKey]);
                if (titleKey && data[titleKey]) {
                    setTitle(data[titleKey]);
                }
            }
        } catch (error) {
            console.error('Failed to load onboarding content:', error);
        }
    };

    const handleSkip = () => {
        const hasSeenKey = `onboarding_seen_${pageKey}`;
        localStorage.setItem(hasSeenKey, 'true');
        setIsVisible(false);
    };

    const handleComplete = () => {
        handleSkip(); // Same behavior as skip
    };

    if (!steps || steps.length === 0) {
        return null;
    }

    return (
        <AnimatePresence>
            {isVisible && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
                        onClick={handleSkip}
                    />

                    {/* Popup */}
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed top-24 left-1/2 -translate-x-1/2 z-[101] max-w-[340px] w-full px-4"
                    >
                        <StepCard
                            steps={steps}
                            title={title}
                            onSkip={handleSkip}
                            onComplete={handleComplete}
                            plusInfoUrl={plusInfoUrl}
                        />
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
