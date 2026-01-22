'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Split, Eye, Video as VideoIcon, Image as ImageIconLucide } from 'lucide-react';

interface BeforeAfterComparisonProps {
    beforeUrl: string | null;
    afterUrl: string | null;
    type: 'video' | 'image';
    beforeLabel?: string;
    afterLabel?: string;
}

type ViewMode = 'split' | 'before' | 'after';

export function BeforeAfterComparison({
    beforeUrl,
    afterUrl,
    type,
    beforeLabel = 'Before',
    afterLabel = 'After'
}: BeforeAfterComparisonProps) {
    const [viewMode, setViewMode] = useState<ViewMode>('split');

    if (!beforeUrl && !afterUrl) {
        return (
            <div className="w-full h-full flex items-center justify-center text-zinc-500">
                <div className="text-center">
                    {type === 'video' ? <VideoIcon className="w-12 h-12 opacity-20 mx-auto mb-2" /> : <ImageIconLucide className="w-12 h-12 opacity-20 mx-auto mb-2" />}
                    <p>No content available</p>
                </div>
            </div>
        );
    }

    const renderContent = (url: string | null, label: string) => {
        if (!url) return null;

        return (
            <div className="relative w-full h-full group">
                {type === 'video' ? (
                    <video
                        src={url}
                        className="w-full h-full object-contain"
                        controls
                        autoPlay
                        loop
                        muted
                        playsInline
                    />
                ) : (
                    <img
                        src={url}
                        alt={label}
                        className="w-full h-full object-contain"
                    />
                )}
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-md">
                    <span className="text-white text-xs font-bold uppercase tracking-wider">{label}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="w-full h-full flex flex-col">
            {/* Toggle Controls */}
            <div className="flex justify-center gap-2 mb-4">
                <button
                    onClick={() => setViewMode('before')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${viewMode === 'before'
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                        }`}
                >
                    <Eye className="w-3 h-3 inline-block mr-1" />
                    {beforeLabel}
                </button>

                <button
                    onClick={() => setViewMode('split')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${viewMode === 'split'
                            ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/50'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                        }`}
                >
                    <Split className="w-3 h-3 inline-block mr-1" />
                    Compare
                </button>

                <button
                    onClick={() => setViewMode('after')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${viewMode === 'after'
                            ? 'bg-green-500 text-white shadow-lg shadow-green-500/50'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                        }`}
                >
                    <Eye className="w-3 h-3 inline-block mr-1" />
                    {afterLabel}
                </button>
            </div>

            {/* Content Display */}
            <div className="flex-1 relative bg-black rounded-lg overflow-hidden border border-white/10">
                <AnimatePresence mode="wait">
                    {viewMode === 'split' ? (
                        <motion.div
                            key="split"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="w-full h-full flex flex-col md:flex-row gap-2 p-2"
                        >
                            <div className="flex-1 relative bg-zinc-900 rounded-md overflow-hidden border border-white/5">
                                {renderContent(beforeUrl, beforeLabel)}
                            </div>
                            <div className="flex-1 relative bg-zinc-900 rounded-md overflow-hidden border border-white/5">
                                {renderContent(afterUrl, afterLabel)}
                            </div>
                        </motion.div>
                    ) : viewMode === 'before' ? (
                        <motion.div
                            key="before"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2 }}
                            className="w-full h-full p-2"
                        >
                            <div className="w-full h-full bg-zinc-900 rounded-md overflow-hidden border border-white/5">
                                {renderContent(beforeUrl, beforeLabel)}
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="after"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            className="w-full h-full p-2"
                        >
                            <div className="w-full h-full bg-zinc-900 rounded-md overflow-hidden border border-white/5">
                                {renderContent(afterUrl, afterLabel)}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
