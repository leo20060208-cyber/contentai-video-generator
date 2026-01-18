'use client';

import { motion } from 'framer-motion';
import { Search, TrendingUp, Sparkles, Wand2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { VideoCard } from '@/components/landing/VideoCard';
import { supabase } from '@/lib/supabase';
import { CollectionCard } from '@/components/CollectionCard';



/**
 * Image Library Page
 * Mirrors the Video Library but for static images.
 * Uses Nano Banana API logic for 'recreation'.
 */
import { OnboardingPopup } from '@/components/onboarding/OnboardingPopup';

export default function ImagesPage() {
    const { user } = useAuth();
    const [activeCategory, setActiveCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [previewMode, setPreviewMode] = useState<'reference' | 'product'>('reference');
    const [images, setImages] = useState<any[]>([]);
    const [collections, setCollections] = useState<any[]>([]);

    const [configError, setConfigError] = useState<boolean>(false);

    // Initialize with the REQUIRED categories list requested by user
    // Note: 'My Images' removed since user images are now only in Profile
    const [categories] = useState<string[]>([
        'All',
        'VISUAL',
        'CLOTHING BRANDS',
        'ASMR',
        'VISUAL TEMPLATES',
        'DROP SHIPPING',
        'ECOMMERCE',
        'BRAND'
    ]);

    // Fetch images and templates
    useEffect(() => {
        async function fetchData() {
            setConfigError(false);

            try {
                // Check cache first
                const { getCache, setCache } = await import('@/lib/cache');
                const cachedImages = getCache<any[]>('images_page_data');
                if (cachedImages) {
                    setImages(cachedImages);
                }

                // Parallel Fetching
                const [collsResponse, templatesResponse] = await Promise.all([
                    supabase
                        .from('collections')
                        .select('*, collection_items(count)')
                        .eq('type', 'image')
                        .order('created_at', { ascending: false }),
                    supabase
                        .from('templates')
                        .select('*')
                        .order('id', { ascending: true })
                ]);

                const { data: colls } = collsResponse;

                if (colls) {
                    setCollections(colls.map(c => ({
                        ...c,
                        item_count: c.collection_items?.[0]?.count || 0
                    })));
                }

                const { data: templates, error: templatesError } = templatesResponse;

                if (templatesError) console.error('Error fetching templates:', templatesError);

                // Client-side filtering: STRICTLY IMAGE ONLY
                const BLACKLIST = [
                    'Product Showcase', 'Unboxing Experience', 'Skincare Routine', 'Food Commercial',
                    'Fashion Reel', 'Tech Product Demo', 'Lifestyle Shot', 'Makeup Tutorial',
                    'Dropship Winner', 'Street Style', 'Before & After', 'Hero Video', 'Hero Image',
                    'VISUAL', 'MESSI', 'BOTTLE TRICK'
                ];

                const ALLOWED_CATEGORIES = [
                    'VISUAL', 'CLOTHING BRANDS', 'ASMR', 'VISUAL TEMPLATES',
                    'DROP SHIPPING', 'ECOMMERCE', 'BRAND', 'VISUAL'
                ];

                const imageTemplates = (templates || []).filter((t: any) => {
                    // Must have valid title
                    if (!t.title || t.title.trim() === '' || t.title === 'VISUAL') return false;
                    // Must NOT be in blacklist
                    if (BLACKLIST.includes(t.title)) return false;
                    // Must have valid before_image_url
                    if (!t.before_image_url || t.before_image_url.length < 10) return false;
                    // CRITICAL: Must NOT have video URLs
                    if (t.before_video_url || t.after_video_url) return false;
                    // Must NOT be specific problematic titles
                    if (t.title.toLowerCase().includes('messi')) return false;

                    // Must be image type OR one of the Allowed Categories
                    const catUpper = (t.category || '').toUpperCase();
                    const isValidType = t.type === 'image' || ALLOWED_CATEGORIES.includes(catUpper);
                    return isValidType;
                });

                // 3. Map templates
                const mappedTemplates = (imageTemplates).map(t => ({
                    id: t.id,
                    title: t.title,
                    category: t.category,
                    beforeImage: t.before_image_url,
                    afterImage: t.after_image_url,
                    beforeVideo: t.before_video_url,
                    afterVideo: t.after_video_url,
                    views: t.views_count,
                    trending: t.is_trending,
                    type: t.type,
                    productImage: t.product_image_url,
                    isTemplate: true
                }));

                // Update Cache and State
                setCache('images_page_data', mappedTemplates);
                setImages(mappedTemplates);

            } catch (err) {
                console.error("Critical error fetching image data:", err);
            }
        }
        fetchData();
    }, [user]);

    const filteredImages = images.filter(img => {
        const matchesCategory = activeCategory === 'All' || (img.category && img.category.toUpperCase() === activeCategory.toUpperCase());
        const matchesSearch = (img.title || '').toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    // Group images into alternating pattern: 3 normal + 1 large
    const groupedImages: { type: 'row3' | 'row1'; images: any[] }[] = [];
    let i = 0;
    while (i < filteredImages.length) {
        if (i + 3 <= filteredImages.length) {
            groupedImages.push({ type: 'row3', images: filteredImages.slice(i, i + 3) });
            i += 3;
        } else if (i < filteredImages.length) {
            groupedImages.push({ type: 'row3', images: filteredImages.slice(i) });
            i = filteredImages.length;
        }
        if (i < filteredImages.length) {
            groupedImages.push({ type: 'row1', images: [filteredImages[i]] });
            i += 1;
        }
    }

    return (
        <div className="min-h-screen pt-20 pb-16 px-4">
            <div className="max-w-[1600px] mx-auto">
                {/* Search and Filters - Moved Up since Header is gone */}

                {/* Search and Filters */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-10"
                >
                    {/* Search */}
                    <div className="relative max-w-lg mx-auto mb-6">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Search templates..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-14 pr-6 py-2 rounded-full bg-transparent border border-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:border-purple-500/50 transition-all text-base"
                        />
                    </div>

                    {/* Category Pills & Toggle */}
                    <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                        <div className="flex flex-wrap justify-center gap-2">
                            {categories.map((category) => (
                                <button
                                    key={category}
                                    onClick={() => setActiveCategory(category)}
                                    className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${activeCategory === category
                                        ? 'bg-purple-500 text-white'
                                        : 'bg-transparent text-zinc-400 border border-white/10 hover:bg-white/10 hover:text-white backdrop-blur-sm'
                                        }`}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>

                        {/* View Toggle */}
                        <div className="flex items-center bg-zinc-900 p-1 rounded-full border border-white/10">
                            <button
                                onClick={() => setPreviewMode('reference')}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${previewMode === 'reference'
                                    ? 'bg-zinc-800 text-white'
                                    : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                            >
                                Reference
                            </button>
                            <button
                                onClick={() => setPreviewMode('product')}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${previewMode === 'product'
                                    ? 'bg-purple-500 text-white'
                                    : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                            >
                                Product
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Image Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Collections First */}
                    {collections.map(collection => (
                        <CollectionCard key={collection.id} collection={collection} basePath="/images" />
                    ))}

                    {filteredImages.map((img, index) => (
                        <motion.div
                            key={img.id}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 * index }}
                        >
                            <VideoCard video={img} size="normal" index={index} baseRoute="/recreate-image" previewMode={previewMode} />
                        </motion.div>
                    ))}
                </div>

                {/* Configuration Error State */}
                {configError && (
                    <div className="w-full max-w-2xl mx-auto mt-10 p-6 bg-red-500/10 border border-red-500/50 rounded-lg text-center">
                        <h3 className="text-lg font-bold text-red-400 mb-2">Database Setup Required</h3>
                        <p className="text-zinc-300 mb-4 text-sm">
                            The <code>images</code> table is missing in your Supabase database.
                        </p>
                        <div className="bg-black/50 p-4 rounded text-left overflow-x-auto mb-4 border border-white/10">
                            <code className="text-xs text-green-400 font-mono whitespace-pre">
                                {`create table public.images (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  url text not null,
  prompt text,
  reference_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  category text default 'Visual'
);
alter table public.images enable row level security;
create policy "Users can see their own images" on public.images for select using (auth.uid() = user_id);
create policy "Users can insert their own images" on public.images for insert with check (auth.uid() = user_id);`}
                            </code>
                        </div>
                        <p className="text-zinc-400 text-xs">Run this SQL in your Supabase Dashboard SQL Editor.</p>
                    </div>
                )}

                {/* Empty State */}
                {!configError && filteredImages.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-20"
                    >
                        <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-6">
                            <Search className="w-10 h-10 text-zinc-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">No templates found</h3>
                        <p className="text-zinc-400">Try a different search or category</p>
                    </motion.div>
                )}

                <OnboardingPopup
                    pageKey="images-library"
                    stepsKey="recreateImageSteps"
                    defaultTitle="IMAGES LIBRARY"
                    plusInfoUrl="/guide/images-library"
                />
            </div>
        </div>
    );
}
