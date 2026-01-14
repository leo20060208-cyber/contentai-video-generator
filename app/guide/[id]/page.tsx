'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSectionContent } from '@/lib/db/content';
import { Button } from '@/components/ui/Button';
import { ChevronLeft, Loader2, BookOpen, Clock, ShieldCheck, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface GuideData {
    title: string;
    description: string;
    content: string;
}

export default function GuidePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [guide, setGuide] = useState<GuideData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchGuide() {
            setLoading(true);
            try {
                const data = await getSectionContent('plus_info_pages');
                if (data && data.pages && data.pages[id]) {
                    setGuide(data.pages[id]);
                } else {
                    // Check fallback/defaults if needed
                }
            } catch (err) {
                console.error('Error fetching guide:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchGuide();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-orange-500 mb-4" />
                <p className="text-zinc-500 font-medium">Loading Guide...</p>
            </div>
        );
    }

    if (!guide) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8">
                <BookOpen className="w-16 h-16 text-zinc-800 mb-6" />
                <h1 className="text-2xl font-bold text-white mb-2">Guide not found</h1>
                <p className="text-zinc-500 mb-8 text-center max-w-md">The guide you are looking for might have been moved or hasn't been created yet.</p>
                <Button variant="outline" onClick={() => router.back()} className="border-zinc-800 text-zinc-400 hover:text-white">
                    <ChevronLeft className="w-4 h-4 mr-2" /> Go Back
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white pt-32 pb-20 px-4 md:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Header Area */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-12"
                >
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-zinc-500 hover:text-orange-500 transition-colors mb-8 group"
                    >
                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-bold uppercase tracking-widest">Back to Creator</span>
                    </button>

                    <div className="flex items-start justify-between gap-8 flex-col md:flex-row">
                        <div className="flex-1">
                            <h1 className="text-5xl md:text-6xl font-black mb-4 tracking-tighter uppercase italic">
                                {guide.title}
                            </h1>
                            <p className="text-xl text-zinc-400 font-medium max-w-2xl leading-relaxed">
                                {guide.description}
                            </p>
                        </div>
                        <div className="shrink-0 pt-4">
                            <div className="w-24 h-24 bg-orange-500/10 rounded-3xl flex items-center justify-center border border-orange-500/20">
                                <BookOpen className="w-10 h-10 text-orange-500" />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4 mt-8 pt-8 border-t border-white/5">
                        <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/50 rounded-full border border-white/5">
                            <Clock className="w-4 h-4 text-orange-500" />
                            <span className="text-xs font-bold text-zinc-400">5 MIN READ</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/50 rounded-full border border-white/5">
                            <Zap className="w-4 h-4 text-orange-500" />
                            <span className="text-xs font-bold text-zinc-400">PRO TIPS INCLUDED</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/50 rounded-full border border-white/5">
                            <ShieldCheck className="w-4 h-4 text-orange-500" />
                            <span className="text-xs font-bold text-zinc-400">AUTHORIZED GUIDE</span>
                        </div>
                    </div>
                </motion.div>

                {/* Content Area */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="prose prose-invert prose-orange max-w-none 
                        prose-h2:text-3xl prose-h2:font-black prose-h2:tracking-tight prose-h2:uppercase prose-h2:italic
                        prose-h3:text-xl prose-h3:font-bold prose-h3:text-white
                        prose-p:text-zinc-400 prose-p:leading-relaxed prose-p:text-lg
                        prose-strong:text-white prose-strong:font-bold
                        prose-ul:list-none prose-ul:pl-0
                        prose-li:relative prose-li:pl-8 prose-li:mb-4
                        prose-li:before:content-[''] prose-li:before:absolute prose-li:before:left-0 prose-li:before:top-[0.7em] 
                        prose-li:before:w-2 prose-li:before:h-2 prose-li:before:bg-orange-500 prose-li:before:rounded-full"
                    dangerouslySetInnerHTML={{ __html: guide.content }}
                />

                {/* Footer CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mt-20 p-8 rounded-3xl bg-gradient-to-br from-zinc-900 to-black border border-white/10 text-center"
                >
                    <h3 className="text-2xl font-black mb-4 uppercase tracking-tight">Ready to start creating?</h3>
                    <p className="text-zinc-500 mb-8 max-w-md mx-auto">Now that you know the basics, put your knowledge into practice and create your first viral video.</p>
                    <Button
                        onClick={() => router.back()}
                        className="bg-orange-500 hover:bg-orange-600 text-white font-black px-10 py-6 rounded-2xl text-lg transition-transform hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(249,115,22,0.3)]"
                    >
                        LET'S GO!
                    </Button>
                </motion.div>
            </div>
        </div>
    );
}
