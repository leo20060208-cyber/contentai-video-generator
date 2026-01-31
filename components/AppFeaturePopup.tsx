'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { StepCard, Step } from '@/components/what-we-do/StepCard';
import { getSectionContent } from '@/lib/db/content';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Default content fallback (mirrors what-we-do page)
const defaultContent = {
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

export function AppFeaturePopup() {
    const pathname = usePathname();
    const [isVisible, setIsVisible] = useState(false);
    const [steps, setSteps] = useState<Step[] | null>(null);
    const [title, setTitle] = useState<string>("");
    const [storageKey, setStorageKey] = useState<string>("");

    const [content, setContent] = useState<any>(null);

    // Fetch dynamic content on mount
    useEffect(() => {
        getSectionContent('what_we_do_v2').then((data) => {
            if (data) setContent(data);
        });
    }, []);

    const data = content || defaultContent;

    useEffect(() => {
        // Determine which popup to show based on route
        let targetSteps: Step[] | null = null;
        let targetTitle = "";
        let key = "";

        if (pathname === '/create-yours') {
            targetSteps = data.createVideoSteps;
            targetTitle = "VIDEO EDITING";
            key = "popup_dismissed_create_video_v3";
        } else if (pathname === '/videos') {
            targetSteps = data.recreateVideoSteps;
            targetTitle = "VIDEOS LIBRARY";
            key = "popup_dismissed_videos_library_v3";
        } else if (pathname === '/create-image') {
            targetSteps = data.createImageSteps;
            targetTitle = "IMAGE EDITING";
            key = "popup_dismissed_create_image_v3";
        } else if (pathname === '/images') {
            targetSteps = data.recreateImageSteps;
            targetTitle = "IMAGES LIBRARY";
            key = "popup_dismissed_images_library_v3";
        }

        if (targetSteps && key) {
            // Check if already dismissed
            const isDismissed = localStorage.getItem(key);
            if (!isDismissed) {
                setSteps(targetSteps);
                setTitle(targetTitle);
                setStorageKey(key);
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        } else {
            setIsVisible(false);
        }
    }, [pathname, data]);

    const handleDismiss = () => {
        if (storageKey) {
            localStorage.setItem(storageKey, 'true');
        }
        setIsVisible(false);
    };

    if (!isVisible || !steps) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    className="fixed top-24 left-1/2 -translate-x-1/2 md:left-48 md:translate-x-0 z-[9999] drop-shadow-2xl flex flex-col items-center gap-2"
                >
                    {/* Scaled down version of StepCard */}
                    <div className="w-[280px] h-[400px]">
                        <StepCard
                            steps={steps}
                            onComplete={handleDismiss}
                            onSkip={handleDismiss}
                            className="h-full border-zinc-800 shadow-2xl shadow-black/80"
                            plusInfoUrl={
                                pathname === '/create-yours' ? '/guide/video-editing' :
                                    pathname === '/videos' ? '/guide/videos-library' :
                                        pathname === '/create-image' ? '/guide/image-editing' :
                                            pathname === '/images' ? '/guide/images-library' :
                                                undefined
                            }
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
