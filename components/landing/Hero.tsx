'use client';

import { useCategories } from '@/hooks/useCategories';
import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { FeaturesModal } from './FeaturesModal';

interface HeroProps {
    selectedCategory: string;
    onCategoryChange: (category: string) => void;
}

export function Hero({ selectedCategory, onCategoryChange }: HeroProps) {
    const { categories, loading } = useCategories();
    const [businessRows, setBusinessRows] = useState<string[][]>([]);
    const [showFeatures, setShowFeatures] = useState(false);

    useEffect(() => {
        if (categories.length > 0) {
            // Split categories into rows of 4
            const rows: string[][] = [];
            for (let i = 0; i < categories.length; i += 4) {
                rows.push(categories.slice(i, i + 4).map(c => c.name));
            }
            setBusinessRows(rows);
        }
    }, [categories]);

    const handleBusinessClick = (business: string) => {
        onCategoryChange(business === selectedCategory ? 'All' : business);
    };

    return (
        <section className="pt-24 pb-12 px-4">
            <div className="max-w-[1200px] mx-auto text-center">

                {/* Main Title - LARGE ORANGE TEXT */}
                <h1
                    className="text-orange-500 font-black uppercase leading-[0.95] tracking-tight mb-8"
                    style={{
                        fontSize: 'clamp(2rem, 7vw, 4.5rem)',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        letterSpacing: '-0.02em'
                    }}
                >
                    RECREATE VIRAL PRODUCT
                    <br />
                    VIDEOS IN SECONDS
                </h1>

                {/* Discover Button (Triggers Popup) */}
                <div className="flex justify-center mb-12">
                    <button
                        onClick={() => setShowFeatures(true)}
                        className="inline-flex items-center gap-3 px-1 py-1 pr-5 rounded-full bg-zinc-800/50 border border-zinc-700 hover:bg-zinc-800 hover:border-orange-500/30 transition-all group cursor-pointer"
                    >
                        <div className="w-10 h-10 rounded-full bg-zinc-900 shadow-sm flex items-center justify-center border border-zinc-700 group-hover:border-orange-500/50 transition-colors">
                            <Sparkles className="w-4 h-4 text-orange-500 fill-orange-500/20" />
                        </div>
                        <span className="text-white font-medium">Discover Platform</span>
                        <span className="text-zinc-500 text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/5">Prime AI</span>
                    </button>
                </div>

                <FeaturesModal isOpen={showFeatures} onClose={() => setShowFeatures(false)} />

                {/* Business Tags - Clickable Filters */}
                <div className="space-y-3">
                    {loading ? (
                        <div className="text-zinc-500 text-sm">Loading categories...</div>
                    ) : (
                        businessRows.map((row, rowIndex) => (
                            <div key={rowIndex} className="flex flex-wrap justify-center gap-2">
                                {row.map((business) => {
                                    const isActive = selectedCategory === business && selectedCategory !== 'All';

                                    return (
                                        <button
                                            key={business}
                                            onClick={() => handleBusinessClick(business)}
                                            className={`px-4 py-2 rounded-full text-xs font-medium uppercase tracking-wide transition-all cursor-pointer ${isActive
                                                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                                : 'bg-zinc-900 border border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-white'
                                                }`}
                                        >
                                            {business}
                                        </button>
                                    );
                                })}
                            </div>
                        ))
                    )}
                </div>

            </div>
        </section>
    );
}
