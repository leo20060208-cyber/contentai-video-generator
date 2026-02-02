'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, LayoutGrid, Loader2, Sparkles, Filter, Play } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Template } from '@/lib/db/videos';
import { BeforeAfterVideoSlider } from '@/components/BeforeAfterVideoSlider';

export default function ExplorePage() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');

    useEffect(() => {
        async function fetchTemplates() {
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('templates')
                    .select('*')
                    .eq('is_explore', true)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setTemplates(data || []);
            } catch (err) {
                console.error('Error fetching explore templates:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchTemplates();
    }, []);

    const filteredTemplates = templates.filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const categories = ['all', ...Array.from(new Set(templates.map(t => t.category).filter(Boolean)))];

    return (
        <div className="min-h-screen bg-black pt-32 pb-20 px-6 sm:px-12">
            {/* Header section */}
            <div className="max-w-7xl mx-auto mb-16 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <span className="text-cyan-500 font-black text-xs tracking-[0.3em] uppercase mb-4 block">Discovery Library</span>
                    <h1 className="text-5xl md:text-7xl font-black text-white mb-6 italic tracking-tighter">
                        SHOWCASE <span className="text-zinc-800">RESULTS</span>
                    </h1>
                    <p className="text-zinc-500 text-lg max-w-2xl mx-auto font-medium">
                        Explore the highest quality AI transformations and recreation templates.
                    </p>
                </motion.div>
            </div>

            {/* Filters */}
            <div className="max-w-7xl mx-auto mb-12 flex flex-col md:flex-row gap-6 items-center justify-between">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 w-full md:w-auto scrollbar-hide">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap border ${selectedCategory === cat
                                    ? 'bg-cyan-500 border-cyan-500 text-black'
                                    : 'bg-white/5 border-white/10 text-zinc-500 hover:text-white'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-80 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-cyan-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search gallery..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#111] border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-zinc-700 font-medium"
                    />
                </div>
            </div>

            {/* Masonry Grid */}
            <div className="max-w-7xl mx-auto">
                {loading ? (
                    <div className="h-64 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
                    </div>
                ) : filteredTemplates.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-[250px]">
                        {filteredTemplates.map((template, idx) => {
                            const cols = template.explore_grid_cols || 1;
                            const rows = template.explore_grid_rows || 1;

                            return (
                                <motion.div
                                    key={template.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className={`relative group rounded-3xl overflow-hidden border border-white/5 hover:border-cyan-500/30 transition-all duration-500 bg-[#0a0a0a]`}
                                    style={{
                                        gridColumn: `span ${cols}`,
                                        gridRow: `span ${rows}`,
                                    }}
                                >
                                    <div className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10" />
                                    </div>

                                    <div className="w-full h-full relative z-0">
                                        <BeforeAfterVideoSlider
                                            beforeImage={template.before_image_url}
                                            afterImage={template.after_image_url}
                                            beforeVideo={template.before_video_url || undefined}
                                            afterVideo={template.after_video_url || undefined}
                                            className="w-full h-full"
                                            hideLabels={true}
                                        />
                                    </div>

                                    {/* Overlay info */}
                                    <div className="absolute bottom-6 left-6 right-6 z-20 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-400 text-[10px] font-black uppercase tracking-widest border border-cyan-500/20">
                                                {template.category}
                                            </span>
                                        </div>
                                        <h3 className="text-white font-black text-xl italic leading-none">{template.title}</h3>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="h-64 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-3xl bg-zinc-900/20">
                        <Sparkles className="w-8 h-8 text-zinc-700 mb-4" />
                        <p className="text-zinc-500 font-medium">No results found.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
