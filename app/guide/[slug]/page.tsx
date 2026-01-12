'use client';

import { use, useState, useEffect } from 'react';
import { getSectionContent } from '@/lib/db/content';
import { Loader2, ArrowLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import React from 'react';
import { motion } from 'framer-motion';

// Professional Default Content
const defaultContent: Record<string, any> = {
    "video-editing": {
        "title": "Video editing mastery",
        "description": "How to achieve viral-quality results with our AI video editor.",
        "content": `
            <div class="space-y-12">
                <section>
                    <h2 class="text-2xl font-semibold text-white mb-2 flex items-center"><span class="w-8 h-8 rounded-full bg-transparent border border-orange-500 text-white flex items-center justify-center text-sm mr-3">1</span> High-Quality Source Footage</h2>
                    <p class="text-zinc-400 leading-relaxed pl-11">The quality of the final output is directly linked to your input. Always upload <strong>1080p or 4K</strong> footage. Ensure your subject is well-lit, preferably with natural soft light or professional studio lighting. Avoid grainy or extremely shaky footage unless it is a specific stylistic choice.</p>
                </section>
                <section>
                    <h2 class="text-2xl font-semibold text-white mb-2 flex items-center"><span class="w-8 h-8 rounded-full bg-transparent border border-orange-500 text-white flex items-center justify-center text-sm mr-3">2</span> Product-Centric Framing</h2>
                    <p class="text-zinc-400 leading-relaxed pl-11">Your product should be the undeniable hero. Keep it <strong>centered and in focus</strong>. If demonstrating a feature (e.g., water resistance, texture), ensure the camera is close enough to capture the detail clearly. The AI uses these visual cues to generate the most relevant effects.</p>
                </section>
                <section>
                    <h2 class="text-2xl font-semibold text-white mb-2 flex items-center"><span class="w-8 h-8 rounded-full bg-transparent border border-orange-500 text-white flex items-center justify-center text-sm mr-3">3</span> Pacing and Rhythm</h2>
                    <p class="text-zinc-400 leading-relaxed pl-11"> Viral videos often rely on fast, engaging pacing. When trimming your clips, focus on <strong>movement</strong>. Start the clip right when the action begins and cut it before it settles. This keeps the Viewer's retention high throughout the video.</p>
                </section>
            </div>
        `
    },
    "videos-library": {
        "title": "Navigating the video library",
        "description": "How to select the perfect template for your brand.",
        "content": `
            <div class="space-y-12">
                <section>
                    <h2 class="text-2xl font-semibold text-white mb-2 flex items-center"><span class="w-8 h-8 rounded-full bg-transparent border border-orange-500 text-white flex items-center justify-center text-sm mr-3">1</span> Understand the "Hook"</h2>
                    <p class="text-zinc-400 leading-relaxed pl-11">Every viral template starts with a hook—the first 3 seconds designed to stop the scroll. Browse templates by looking at their opening moments. Choose a hook that visually disrupts the feed, whether through sudden movement, bold text, or striking color contrasts.</p>
                </section>
                <section>
                    <h2 class="text-2xl font-semibold text-white mb-2 flex items-center"><span class="w-8 h-8 rounded-full bg-transparent border border-orange-500 text-white flex items-center justify-center text-sm mr-3">2</span> Match the Vibe</h2>
                    <p class="text-zinc-400 leading-relaxed pl-11">A luxury watch requires a different pacing than a sports drink. Use the category tags to find templates that match your brand's energy. <strong>Elegant/Slow</strong> for luxury, <strong>Fast/Dynamic</strong> for lifestyle and sports.</p>
                </section>
                 <section>
                    <h2 class="text-2xl font-semibold text-white mb-2 flex items-center"><span class="w-8 h-8 rounded-full bg-transparent border border-orange-500 text-white flex items-center justify-center text-sm mr-3">3</span> Analyze Retention</h2>
                    <p class="text-zinc-400 leading-relaxed pl-11">Our library sorts content by potential retention. Templates at the top are currently trending. Don't be afraid to experiment with a format you haven't used before; trending formats often yield the highest organic reach.</p>
                </section>
            </div>
        `
    },
    "image-editing": {
        "title": "Image generative guide",
        "description": "Creating photorealistic product photography with AI.",
        "content": `
             <div class="space-y-12">
                <section>
                    <h2 class="text-2xl font-semibold text-white mb-2 flex items-center"><span class="w-8 h-8 rounded-full bg-transparent border border-orange-500 text-white flex items-center justify-center text-sm mr-3">1</span> The Power of the Prompt</h2>
                    <p class="text-zinc-400 leading-relaxed pl-11">Be descriptive but concise. Instead of "a bottle on a table," try <strong>"a premium glass bottle on a marble countertop, morning sunlight, soft shadows, 4k photorealistic."</strong> The more specific you are about lighting and texture, the better.</p>
                </section>
                <section>
                    <h2 class="text-2xl font-semibold text-white mb-2 flex items-center"><span class="w-8 h-8 rounded-full bg-transparent border border-orange-500 text-white flex items-center justify-center text-sm mr-3">2</span> Input Image Clarity</h2>
                    <p class="text-zinc-400 leading-relaxed pl-11">For tools that use an input image (img2img), ensure your reference has clean edges. If you're removing a background, use a high-contrast image. The AI needs a clear silhouette to understand where your product ends and the environment begins.</p>
                </section>
                 <section>
                    <h2 class="text-2xl font-semibold text-white mb-2 flex items-center"><span class="w-8 h-8 rounded-full bg-transparent border border-orange-500 text-white flex items-center justify-center text-sm mr-3">3</span> Style Consistency</h2>
                    <p class="text-zinc-400 leading-relaxed pl-11">Stick to a unified aesthetic for your brand. If you use "Cinematic Lighting" for one product, use it for the others to create a cohesive catalog. Use our Style Presets to save your favorite parameters.</p>
                </section>
            </div>
        `
    },
    "images-library": {
        "title": "Using the image library",
        "description": "Finding the perfect reference guide.",
        "content": `
             <div class="space-y-12">
                <section>
                    <h2 class="text-2xl font-semibold text-white mb-2 flex items-center"><span class="w-8 h-8 rounded-full bg-transparent border border-orange-500 text-white flex items-center justify-center text-sm mr-3">1</span> Composition Search</h2>
                    <p class="text-zinc-400 leading-relaxed pl-11">Don't just look for similar products; look for <strong>similar compositions</strong>. If your product is tall and narrow, search for vertical layouts. The AI excels at adapting style, but geometry is harder to change significantly without distortion.</p>
                </section>
                <section>
                    <h2 class="text-2xl font-semibold text-white mb-2 flex items-center"><span class="w-8 h-8 rounded-full bg-transparent border border-orange-500 text-white flex items-center justify-center text-sm mr-3">2</span> Lighting References</h2>
                    <p class="text-zinc-400 leading-relaxed pl-11">Lighting is the key to realism. Browse the library specifically to find lighting setups you admire—whether it's "Golden Hour," "Studio Softbox," or "Neon Cyberpunk." Use these images as style references to instruct the generator.</p>
                </section>
                <section>
                    <h2 class="text-2xl font-semibold text-white mb-2 flex items-center"><span class="w-8 h-8 rounded-full bg-transparent border border-orange-500 text-white flex items-center justify-center text-sm mr-3">3</span> Aspect Ratios</h2>
                    <p class="text-zinc-400 leading-relaxed pl-11">Ensure the reference image matches your desired output format. If you need an Instagram Story (9:16), filter the library for vertical images. Using a landscape reference for a portrait output can lead to awkward cropping.</p>
                </section>
            </div>
        `
    }
};

export default function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const router = useRouter();
    const [content, setContent] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getSectionContent('plus_info_pages').then((data) => {
            if (data && data.pages && data.pages[slug]) {
                setContent(data.pages[slug]);
            } else {
                if (defaultContent[slug]) {
                    setContent(defaultContent[slug]);
                }
            }
            setLoading(false);
        });
    }, [slug]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
        );
    }

    if (!content) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-zinc-500">
                <h1 className="text-2xl font-bold mb-4">Guide Not Found</h1>
                <Button onClick={() => router.back()}>Go Back</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-32 pb-20 px-4 md:px-8 relative overflow-hidden">
            {/* Background container to match standard app feel but allow global stars to show through */}
            <div className="absolute inset-0 bg-transparent z-0 pointer-events-none" />

            <div className="max-w-4xl mx-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="mb-8"
                >

                    <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-400 tracking-tighter">
                        {content.title}
                    </h1>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-8 md:p-12 rounded-3xl bg-transparent"
                >
                    <div
                        className="prose prose-invert max-w-none text-zinc-300 [&>div>section]:mb-12 last:[&>div>section]:mb-0"
                        dangerouslySetInnerHTML={{ __html: content.content }}
                    />
                </motion.div>
            </div>
        </div>
    );
}
