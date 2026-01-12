'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Film, X, Zap, Plus, ArrowDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getSectionContent, SectionContent } from '@/lib/db/content';

interface FeaturesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function FeaturesModal({ isOpen, onClose }: FeaturesModalProps) {
    const [content, setContent] = useState<SectionContent | null>(null);

    useEffect(() => {
        if (isOpen) {
            getSectionContent('what_we_do').then(data => {
                if (data) setContent(data);
            });
        }
    }, [isOpen]);

    // Fallbacks
    const title = content?.title || "WHY TOP BRANDS CHOOSE CONTENTAI";
    const description = content?.description || "Stop guessing. Start dominating. We replace products in viral videos and images with YOURS using military-grade AI technology.";

    const f1 = content?.features?.[0] || {
        title: "Viral Video Recreation",
        description: "Upload a viral video template and your product image. Our AI seamlessly inserts your product into the video, matching lighting, physics, and movement.",
        tags: ["Physics Engine", "Real-time Rendering"],
        reference_image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=100&auto=format&fit=crop",
        product_image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=100&auto=format&fit=crop",
        result_image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=400&auto=format&fit=crop",
        result_label: "AI GENERATED RESULT"
    };

    const f2 = content?.features?.[1] || {
        title: "Viral Image Recreation",
        description: "Turn boring product photos into lifestyle masterpieces. Insert your product into any viral setting, luxury environment, or dynamic background instantly.",
        tags: ["4K Quality", "Generative Fill"],
        reference_image: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=100&auto=format&fit=crop",
        product_image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=100&auto=format&fit=crop",
        result_image: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=400&auto=format&fit=crop",
        result_label: "AI STUDIOSHOT"
    };

    const f3 = content?.features?.[2] || {
        title: "Pre-Vetted Analytics Library",
        description: "Don't know what works? We analyze millions of videos to curate templates guaranteed to stop the scroll. High-retention formats ready for your brand.",
        tags: ["ROI Optimized", "Trend Analysis"]
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/95 backdrop-blur-xl"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="relative w-full max-w-6xl bg-zinc-950 rounded-2xl border border-white/10 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="p-6 md:p-10">
                            <div className="text-center mb-10">
                                <h2 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tight mb-3">
                                    {title}
                                </h2>
                                <p className="text-zinc-400 max-w-2xl mx-auto text-base leading-relaxed" dangerouslySetInnerHTML={{ __html: description.replace('viral videos and images', '<strong>viral videos and images</strong>') }}>
                                </p>
                            </div>

                            {/* Main Features Grid - Side by Side */}
                            <div className="grid md:grid-cols-2 gap-6 mb-6">
                                {/* LEFT: Viral Video Recreation */}
                                <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/5 hover:border-orange-500/20 transition-all group flex flex-col">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-500/5 flex items-center justify-center group-hover:scale-105 transition-transform border border-orange-500/10 shrink-0">
                                            <Sparkles className="w-6 h-6 text-orange-500" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white">{f1.title}</h3>
                                            <div className="flex gap-2 mt-1">
                                                {f1.tags.map((tag, i) => (
                                                    <span key={i} className="px-2 py-0.5 rounded-full bg-orange-500/10 text-[10px] font-semibold text-orange-400 border border-orange-500/10">{tag}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                                        {f1.description}
                                    </p>

                                    {/* Visual Montage - Video */}
                                    <div className="mt-auto bg-black/40 rounded-xl p-4 border border-white/5">
                                        <div className="flex items-center justify-center gap-4 mb-4">
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="w-20 h-24 rounded-lg bg-zinc-800 border border-zinc-700 bg-cover bg-center" style={{ backgroundImage: `url('${f1.reference_image}')` }} />
                                                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Reference</span>
                                            </div>
                                            <Plus className="w-4 h-4 text-zinc-600" />
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="w-20 h-24 rounded-lg bg-zinc-800 border border-zinc-700 bg-cover bg-center" style={{ backgroundImage: `url('${f1.product_image}')` }} />
                                                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Product</span>
                                            </div>
                                        </div>
                                        <div className="flex justify-center mb-2">
                                            <ArrowDown className="w-4 h-4 text-orange-500 animate-bounce" />
                                        </div>
                                        <div className="w-full h-32 rounded-lg bg-zinc-800 border border-orange-500/20 overflow-hidden relative group-hover:border-orange-500/40 transition-colors">
                                            <div className="absolute inset-0 bg-cover bg-center opacity-50 grayscale group-hover:grayscale-0 transition-all duration-700" style={{ backgroundImage: `url('${f1.result_image}')` }} />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="px-3 py-1 bg-black/60 backdrop-blur-sm rounded-full text-xs font-bold text-white border border-white/10">
                                                    {f1.result_label}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT: Viral Image Recreation */}
                                <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/5 hover:border-purple-500/20 transition-all group flex flex-col">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 flex items-center justify-center group-hover:scale-105 transition-transform border border-purple-500/10 shrink-0">
                                            <Sparkles className="w-6 h-6 text-purple-500" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white">{f2.title}</h3>
                                            <div className="flex gap-2 mt-1">
                                                {f2.tags.map((tag, i) => (
                                                    <span key={i} className="px-2 py-0.5 rounded-full bg-purple-500/10 text-[10px] font-semibold text-purple-400 border border-purple-500/10">{tag}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                                        {f2.description}
                                    </p>

                                    {/* Visual Montage - Image */}
                                    <div className="mt-auto bg-black/40 rounded-xl p-4 border border-white/5">
                                        <div className="flex items-center justify-center gap-4 mb-4">
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="w-20 h-24 rounded-lg bg-zinc-800 border border-zinc-700 bg-cover bg-center" style={{ backgroundImage: `url('${f2.reference_image}')` }} />
                                                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Reference</span>
                                            </div>
                                            <Plus className="w-4 h-4 text-zinc-600" />
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="w-20 h-24 rounded-lg bg-zinc-800 border border-zinc-700 bg-cover bg-center" style={{ backgroundImage: `url('${f2.product_image}')` }} />
                                                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Product</span>
                                            </div>
                                        </div>
                                        <div className="flex justify-center mb-2">
                                            <ArrowDown className="w-4 h-4 text-purple-500 animate-bounce" />
                                        </div>
                                        <div className="w-full h-32 rounded-lg bg-zinc-800 border border-purple-500/20 overflow-hidden relative group-hover:border-purple-500/40 transition-colors">
                                            <div className="absolute inset-0 bg-cover bg-center opacity-50 grayscale group-hover:grayscale-0 transition-all duration-700" style={{ backgroundImage: `url('${f2.result_image}')` }} />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="px-3 py-1 bg-black/60 backdrop-blur-sm rounded-full text-xs font-bold text-white border border-white/10">
                                                    {f2.result_label}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* BOTTOM: Analytics (Moved Down) */}
                            <div className="mb-8 p-6 rounded-2xl bg-zinc-900/30 border border-white/5 hover:border-blue-500/20 transition-all group">
                                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center group-hover:scale-105 transition-transform border border-blue-500/10 shrink-0">
                                        <Film className="w-6 h-6 text-blue-500" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-4 mb-2">
                                            <h3 className="text-xl font-bold text-white">{f3.title}</h3>
                                            <div className="flex gap-2">
                                                {f3.tags.map((tag, i) => (
                                                    <span key={i} className="px-2 py-0.5 rounded-full bg-blue-500/10 text-[10px] font-semibold text-blue-400 border border-blue-500/10">{tag}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <p className="text-sm text-zinc-400 leading-relaxed max-w-3xl">
                                            {f3.description}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Tech Stack Footer */}
                            <div className="border-t border-white/5 pt-8">
                                <p className="text-center text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-6">
                                    Powered by
                                </p>
                                <div className="flex flex-wrap justify-center items-center gap-12 opacity-60 hover:opacity-100 transition-opacity">
                                    {/* NanoBanana Logo */}
                                    <div className="flex items-center gap-2 grayscale group-hover:grayscale-0 transition-all">
                                        <div className="w-8 h-8 rounded-lg bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400">
                                                <path d="M4 20c0-10 8-16 16-16" />
                                                <path d="M4 20h16" />
                                            </svg>
                                        </div>
                                        <span className="text-lg font-bold text-white tracking-tight">
                                            Nano<span className="text-yellow-400">Banana</span>
                                        </span>
                                    </div>

                                    {/* Kling AI Logo */}
                                    <div className="flex items-center gap-2 grayscale group-hover:grayscale-0 transition-all">
                                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                                            <Zap className="w-4 h-4 text-purple-500 fill-purple-500/50" />
                                        </div>
                                        <span className="text-lg font-bold text-white tracking-tight">
                                            KLING<span className="text-purple-500">.AI</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
