'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Film, X, Zap } from 'lucide-react';

interface FeaturesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function FeaturesModal({ isOpen, onClose }: FeaturesModalProps) {
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
                        className="absolute inset-0 bg-black/90 backdrop-blur-md"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="relative w-full max-w-4xl bg-zinc-950 rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="p-6 md:p-8">
                            <div className="text-center mb-6">
                                <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight mb-2">
                                    Next-Gen Content Engine
                                </h2>
                                <p className="text-zinc-400 max-w-xl mx-auto text-sm leading-relaxed">
                                    Experience the synergy of creative freedom and neural intelligence.
                                </p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4 mb-8">
                                {/* Create Yours Card */}
                                <div className="p-5 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-orange-500/20 transition-all group">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-500/5 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform border border-orange-500/10">
                                        <Sparkles className="w-5 h-5 text-orange-500" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2">Create Yours</h3>
                                    <p className="text-sm text-zinc-400 mb-3 leading-relaxed">
                                        Institutional-grade product integration. Neural rendering matches lighting, perspective, and physics instantly.
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-[10px] font-semibold text-orange-400 border border-orange-500/10">Neural Rendering</span>
                                        <span className="px-2 py-0.5 rounded-full bg-orange-500/10 text-[10px] font-semibold text-orange-400 border border-orange-500/10">Context Aware</span>
                                    </div>
                                </div>

                                {/* Library Card */}
                                <div className="p-5 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-blue-500/20 transition-all group">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform border border-blue-500/10">
                                        <Film className="w-5 h-5 text-blue-500" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2">Viral Library</h3>
                                    <p className="text-sm text-zinc-400 mb-3 leading-relaxed">
                                        Algorithmic curation. Templates engineered to convert across TikTok and Reels.
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-[10px] font-semibold text-blue-400 border border-blue-500/10">High Retention</span>
                                        <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-[10px] font-semibold text-blue-400 border border-blue-500/10">Trend Analysis</span>
                                    </div>
                                </div>
                            </div>

                            {/* Tech Stack */}
                            <div className="border-t border-white/5 pt-6">
                                <p className="text-center text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-4">
                                    Powered by
                                </p>
                                <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-80 hover:opacity-100 transition-opacity">
                                    {/* NanoBanana Logo */}
                                    <div className="flex items-center gap-2">
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
                                    <div className="flex items-center gap-2">
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
