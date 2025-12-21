'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Search,
    LayoutGrid,
    Loader2,
    Settings,
    Star,
    Sparkles
} from 'lucide-react';
import { TemplateCard } from '@/components/templates/TemplateCard';
import { supabase } from '@/lib/supabase';
import { Template } from '@/lib/db/videos';
import { useCategories } from '@/hooks/useCategories';
import { CategoryManager } from '@/components/CategoryManager';
import { Button } from '@/components/ui/Button';

export default function TemplatesPage() {
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const { categories: dbCategories, loading: categoriesLoading } = useCategories();
    const [showCategoryManager, setShowCategoryManager] = useState(false);

    // Build categories array with "All" + dynamic categories
    const categories = [
        { id: 'all', label: 'All Templates', icon: LayoutGrid },
        ...dbCategories.map(cat => ({
            id: cat.slug,
            label: cat.name,
            icon: LayoutGrid,
            value: cat.name
        }))
    ];

    // Toggle trending status
    const toggleTrending = async (templateId: number, currentStatus: boolean) => {
        try {
            const response = await fetch('/api/templates/trending', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    templateId,
                    isTrending: !currentStatus
                })
            });

            if (!response.ok) throw new Error('Failed to update');

            // Refresh templates
            fetchTemplates();
            alert(`Template ${!currentStatus ? 'marked as' : 'removed from'} trending!`);
        } catch (error) {
            console.error('Error toggling trending:', error);
            alert('Failed to update trending status');
        }
    };

    // Fetch real templates from Supabase
    useEffect(() => {
        const fetchTemplates = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('templates')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setTemplates(data || []);
            } catch (error) {
                console.error('Error fetching templates:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTemplates();
    }, []);

    // Filter Logic
    const filteredTemplates = templates.filter(template => {
        const matchesSearch = template.title.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesCategory = true;
        if (selectedCategory !== 'all') {
            const categoryConfig = categories.find(c => c.id === selectedCategory);
            // Match against the database category value (e.g., 'VISUAL', 'CLOTHING BRANDS')
            // Or fallback to checking if the ID is roughly in the string for broader matching
            if (categoryConfig?.value) {
                matchesCategory = template.category === categoryConfig.value;
            } else {
                matchesCategory = template.category.toLowerCase().includes(selectedCategory);
            }
        }

        return matchesSearch && matchesCategory;
    });

    return (
        <div className="min-h-screen bg-black pt-24 px-6 pb-6 flex flex-col md:flex-row gap-8">

            {/* LEFT SIDEBAR - CATEGORIES */}
            <aside className="w-full md:w-64 flex-shrink-0">
                <div className="sticky top-28 space-y-8">

                    {/* Search */}
                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative bg-[#111] border border-white/10 rounded-xl flex items-center px-4 py-3">
                            <Search className="w-4 h-4 text-zinc-500 mr-3" />
                            <input
                                type="text"
                                placeholder="Search styles..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-zinc-600"
                            />
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="space-y-1">
                        <h3 className="px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Collections</h3>

                        {categories.map((cat) => {
                            const Icon = cat.icon;
                            const isSelected = selectedCategory === cat.id;

                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${isSelected
                                        ? 'bg-white/10 text-white border border-white/10'
                                        : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                                        }`}
                                >
                                    <Icon className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                                    {cat.label}
                                    {isSelected && (
                                        <motion.div
                                            layoutId="active-dot"
                                            className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Manage Categories Button */}
                    <div className="px-4 mt-2">
                        <button
                            onClick={() => setShowCategoryManager(true)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-zinc-800/50 border border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors text-sm"
                        >
                            <Settings className="w-4 h-4" />
                            Manage Categories
                        </button>
                    </div>

                    {/* Pro Banner */}
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-[#151515] to-black border border-white/10 relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center mb-3">
                                <Sparkles className="w-4 h-4 text-primary" />
                            </div>
                            <h4 className="font-bold text-white text-sm mb-1">Pro Access</h4>
                            <p className="text-xs text-zinc-500 mb-3">Get exclusive templates and 4K exports.</p>
                            <button className="text-xs font-bold text-primary hover:text-white transition-colors">Upgrade Plan →</button>
                        </div>
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 blur-2xl rounded-full -translate-y-1/2 translate-x-1/2" />
                    </div>

                </div>
            </aside >

            {/* RIGHT GRID - CONTENT */}
            <main className="flex-1">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">{categories.find(c => c.id === selectedCategory)?.label}</h1>
                    <p className="text-zinc-500">
                        {loading ? 'Loading templates...' : `${filteredTemplates.length} professionally designed templates ready for your brand.`}
                    </p>
                </div>

                {loading ? (
                    <div className="flex h-64 items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredTemplates.map((template) => (
                            <div key={template.id} className="relative">
                                {/* Trending Toggle Button - Overlay */}
                                <button
                                    onClick={() => toggleTrending(template.id, template.is_trending || false)}
                                    className={`absolute top-4 right-4 z-50 p-3 rounded-full backdrop-blur-sm transition-all shadow-xl ${template.is_trending
                                        ? 'bg-orange-500 text-white shadow-orange-500/50'
                                        : 'bg-black/80 text-zinc-300 hover:bg-orange-500 hover:text-white'
                                        }`}
                                    title={template.is_trending ? 'Remove from trending' : 'Mark as trending'}
                                >
                                    <Star className={`w-5 h-5 ${template.is_trending ? 'fill-current' : ''}`} />
                                </button>

                                <TemplateCard
                                    template={template}
                                    className="bg-[#0a0a0a] hover:bg-[#111] border-white/5 hover:border-white/10"
                                />
                            </div>
                        ))}
                    </div>
                )}

                {!loading && filteredTemplates.length === 0 && (
                    <div className="h-64 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl bg-[#0a0a0a]">
                        <p className="text-zinc-500">No templates found for this category.</p>
                        <button
                            onClick={() => setSelectedCategory('all')}
                            className="mt-4 text-sm text-primary hover:underline"
                        >
                            View all templates
                        </button>
                    </div>
                )}
            </main >

            {/* Category Manager Modal */}
            <CategoryManager
                isOpen={showCategoryManager}
                onClose={() => setShowCategoryManager(false)}
            />

        </div >
    );
}
