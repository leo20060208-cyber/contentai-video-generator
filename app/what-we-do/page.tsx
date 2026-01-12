'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StepCard, Step } from '@/components/what-we-do/StepCard';
import { getSectionContent } from '@/lib/db/content';

// Default content (Fallback)
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

export default function WhatWeDoPage() {
    const [content, setContent] = useState<any>(null);

    useEffect(() => {
        getSectionContent('what_we_do_v2').then((data) => {
            if (data) setContent(data);
        });
    }, []);

    const data = content || defaultContent;

    return (
        <div className="min-h-screen flex items-center justify-center p-4 md:p-8 pt-24 relative overflow-hidden">

            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-[1400px] mx-auto z-10 w-full">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex justify-center">
                    <StepCard steps={data.createVideoSteps} title={data.createVideoTitle} showFooter plusInfoUrl="/guide/video-editing" />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex justify-center">
                    <StepCard steps={data.recreateVideoSteps} title={data.recreateVideoTitle} showFooter plusInfoUrl="/guide/videos-library" />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex justify-center">
                    <StepCard steps={data.createImageSteps} title={data.createImageTitle} showFooter plusInfoUrl="/guide/image-editing" />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex justify-center">
                    <StepCard steps={data.recreateImageSteps} title={data.recreateImageTitle} showFooter plusInfoUrl="/guide/images-library" />
                </motion.div>
            </div>
        </div>
    );
}
