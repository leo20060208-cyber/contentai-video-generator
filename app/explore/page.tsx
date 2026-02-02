'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Template } from '@/lib/db/videos';
import { Navbar } from '@/components/layout/Navbar';
import { BeforeAfterVideoSlider } from '@/components/BeforeAfterVideoSlider';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, LayoutGrid, Info } from 'lucide-react';

export default function ExplorePage() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    useEffect(() => {
        const fetchExploreTemplates = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('templates')
                .select('*')
                .eq('is_explore', true)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching explore templates:', error);
            } else {
                setTemplates(data || []);
            }
            setLoading(false);
        };

        fetchExploreTemplates();
    }, []);

    const categories = ['All', ...Array.from(new Set(templates.map(t => t.category)))];

    const filteredTemplates = templates.filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="min-h-screen bg-[#070707] text-white">
            <Navbar />

            {/* Hero Section */}
            <div className="pt-32 pb-16 px-6 relative overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-cyan-500/10 to-transparent blur-3xl opacity-30 pointer-events-none" />

                <div className="max-w-[1400px] mx-auto relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-12"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-6">
                            <Sparkles className="w-3 h-3" />
                            Discovery Library
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">
                            EXPLORE <span className="text-cyan-500">POSSIBILITIES</span>
                        </h1>
                        <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto font-medium">
                            Discover how AI transforms content. Interactive before & after examples from our creative library.
                        </p>
                    </motion.div>

                    {/* Search & Filters */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                            <input
                                type="text"
                                placeholder="Search by name or style..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-cyan-500/50 transition-all backdrop-blur-md"
                            />
                        </div>

                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 w-full md:w-auto">
                            {categories.map(category => (
                                <button
                                    key={category}
                                    onClick={() => setSelectedCategory(category)}
                                    className={`px-6 py-2 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${selectedCategory === category
                                            ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                                            : 'bg-white/5 text-zinc-500 hover:text-white border border-white/5'
                                        }`}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Grid */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-32">
                            <div className="w-12 h-12 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4" />
                            <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Curating Library...</p>
                        </div>
                    ) : filteredTemplates.length === 0 ? (
                        <div className="text-center py-32 border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
                            <LayoutGrid className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-zinc-500 mb-2">No results found</h3>
                            <p className="text-zinc-600">Try adjusting your search or filters.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-[300px] gap-6">
                            {filteredTemplates.map((template) => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    key={template.id}
                                    className={`relative group rounded-3xl overflow-hidden border border-white/5 bg-zinc-900/50 backdrop-blur-sm transition-all hover:border-cyan-500/30 ${template.explore_grid_cols === 2 ? 'md:col-span-2' : ''
                                        } ${template.explore_grid_rows === 2 ? 'row-span-2' : ''
                                        }`}
                                >
                                    <div className="absolute inset-0 z-0">
                                        <BeforeAfterVideoSlider
                                            beforeVideoUrl={template.before_video_url}
                                            afterVideoUrl={template.after_video_url}
                                            beforeImageUrl={template.before_image_url}
                                            afterImageUrl={template.after_image_url}
                                            className="h-full w-full"
                                        />
                                    </div>

                                    {/* Info Overlay (Visible on Hover) */}
                                    <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black via-black/80 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-500 z-30">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="px-2 py-0.5 rounded bg-cyan-500 text-black text-[9px] font-black uppercase tracking-wider">
                                                {template.category}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold text-white mb-1">{template.title}</h3>
                                        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                                            {template.description}
                                        </p>
                                    </div>

                                    {/* Static Icon for Hint */}
                                    <div className="absolute top-4 right-4 z-40 p-2 rounded-full bg-black/50 backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Info className="w-4 h-4 text-cyan-500" />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Decorative Section */}
            <div className="py-32 px-6">
                <div className="max-w-[1400px] mx-auto text-center border-t border-white/5 pt-32">
                    <h2 className="text-3xl font-bold text-white mb-4">Start Creating Yours</h2>
                    <p className="text-zinc-500 mb-8 max-w-lg mx-auto">
                        Inspired by these examples? Use our AI Studio to create your own transformations in seconds.
                    </p>
                    <div className="flex items-center justify-center gap-4">
                        <a href="/create-yours" className="px-8 py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-xs hover:bg-zinc-200 transition-all">
                            Video Studio
                        </a>
                        <a href="/create-image" className="px-8 py-4 rounded-2xl bg-zinc-900 text-white font-black uppercase tracking-widest text-xs border border-white/10 hover:bg-zinc-800 transition-all">
                            Image Studio
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Minimal CSS fix for the BeforeAfterSlider in the grid
const styles = `
.row-span-2 .flex-col {
    height: 100%;
}
.row-span-2 video, .row-span-2 img {
    height: 100% !important;
    object-fit: cover !important;
}
`;
