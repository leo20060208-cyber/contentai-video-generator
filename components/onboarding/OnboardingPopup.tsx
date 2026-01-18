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

// Default Content Fallback
const defaultContent: Record<string, any[]> = {
    createVideoSteps: [
        {
            title: "VIDEO EDITING",
            description: "Upload your raw footage and let AI transform it into viral content.",
            image: "/images/what-we-do/create-yours-video-1.png",
            ctaText: "Next"
        },
        {
            title: "AI Analysis",
            description: "Our engine analyzes pacing, lighting, and composition to optimize for retention.",
            image: "/images/what-we-do/create-yours-video-2.png",
            ctaText: "Next"
        },
        {
            title: "Viral Result",
            description: "Get a finished, polished video ready to dominate social media feeds.",
            image: "/images/what-we-do/create-yours-video-3.png",
            ctaText: "Start Creating"
        }
    ],
    recreateVideoSteps: [
        {
            title: "Recreate Template Video",
            description: "Browse our curated library of high-performing viral video templates.",
            image: "/images/what-we-do/recreate-template-video-1.png",
            ctaText: "Next"
        },
        {
            title: "Insert Product",
            description: "Seamlessly integrate your product into the narrative with one click.",
            image: "/images/what-we-do/recreate-template-video-2.png",
            ctaText: "Next"
        },
        {
            title: "Generate Magic",
            description: "Watch as your product becomes the star of a proven viral format.",
            image: "/images/what-we-do/recreate-template-video-3.png",
            ctaText: "Browse Templates"
        }
    ],
    createImageSteps: [
        {
            title: "IMAGE EDITING",
            description: "Define your style and vision. From minimalist to extravagant.",
            image: "/images/what-we-do/create-yours-image-1.png",
            ctaText: "Next"
        },
        {
            title: "AI Generation",
            description: "Advanced algorithms generate stunning visuals tailored to your brand.",
            image: "/images/what-we-do/create-yours-image-2.png",
            ctaText: "Next"
        },
        {
            title: "Masterpiece",
            description: "Download high-resolution images that stop the scroll instantly.",
            image: "/images/what-we-do/create-yours-image-3.png",
            ctaText: "Create Image"
        }
    ],
    recreateImageSteps: [
        {
            title: "Image Editing",
            description: "Edit materials and details in any interior.",
            image: "/images/what-we-do/recreate-template-image-1.png",
            ctaText: "Next"
        },
        {
            title: "Nano Banana Pro",
            description: "Powered by Nano Banana Pro",
            image: "/images/what-we-do/recreate-template-image-2.png",
            ctaText: "Next"
        },
        {
            title: "Try Edits Now",
            description: "Push your creativity to the limit",
            image: "/images/what-we-do/recreate-template-image-3.png",
            ctaText: "Try Now"
        }
    ]
};

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
            // Load content from database or fallback
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
            } else if (defaultContent[stepsKey]) {
                // Fallback to default content
                console.log(`Using default content for ${stepsKey}`);
                setSteps(defaultContent[stepsKey]);
            }
        } catch (error) {
            console.error('Failed to load onboarding content:', error);
            // Fallback on error too
            if (defaultContent[stepsKey]) {
                setSteps(defaultContent[stepsKey]);
            }
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
