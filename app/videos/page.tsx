'use client';

import { motion } from 'framer-motion';
import { Play, Search, TrendingUp, Sparkles, Heart, Trash2, Settings2, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { TemplateUploader } from '@/components/admin/TemplateUploader';
import { useCategories } from '@/hooks/useCategories';
import { LazyVideo } from '@/components/LazyVideo';

import { useLikedTemplates } from '@/lib/contexts/LikedTemplatesContext';
import { CollectionCard } from '@/components/CollectionCard';
import { OnboardingPopup } from '@/components/onboarding/OnboardingPopup';

// VideoCard Component
function VideoCard({ video, size = 'normal', isManageMode = false, onDelete, previewMode = 'reference' }: { video: any; size?: 'normal' | 'large'; isManageMode?: boolean; onDelete?: (id: number) => void; previewMode?: 'reference' | 'product' }) { // eslint-disable-line @typescript-eslint/no-explicit-any
    const isLarge = size === 'large';
    const { isLiked: checkIsLiked, toggleLike: globalToggleLike } = useLikedTemplates();
    const isLiked = checkIsLiked(video.id);
    const [isHovering, setIsHovering] = useState(false);
    const { user } = useAuth();

    const toggleLike = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!user) {
            alert('Please login first');
            return;
        }

        await globalToggleLike(video);
    };

    const handleShare = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const url = `${window.location.origin}/recreate/${video.id}`;
        navigator.clipboard.writeText(url).then(() => {
            alert('¡Enlace copiado al portapapeles!');
        }).catch(err => {
            console.error('Error copying link:', err);
        });
    };

    return (
        <Link href={`/recreate/${video.id}`} className="block group">
            <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
                className={`relative rounded-2xl overflow-hidden bg-zinc-900 ${isLarge ? 'aspect-[16/9]' : 'aspect-[4/3]'}`}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
            >
                {/* Before/After Split */}
                {/* Equation Layout */}
                {/* Main Media Content */}
                {/* Main Media Content - Split View */}
                <div className="absolute inset-0 w-full h-full bg-zinc-900 flex">
                    {(() => {
                        const renderMedia = (vidUrl?: string, imgUrl?: string, alt?: string, isPlaceholder: boolean = false) => {
                            if (isPlaceholder) {
                                return (
                                    <div className="w-full h-full bg-zinc-900 flex flex-col items-center justify-center border border-white/5 relative group/prod">
                                        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover/prod:opacity-100 transition-opacity" />
                                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center mb-2 group-hover/prod:scale-110 transition-transform">
                                            <Sparkles className="w-4 h-4 text-zinc-400" />
                                        </div>
                                        <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Product</span>
                                    </div>
                                );
                            }
                            if (vidUrl) {
                                return (
                                    <LazyVideo
                                        src={vidUrl}
                                        className="w-full h-full object-cover"
                                        muted={!isHovering}
                                    />
                                );
                            }
                            if (imgUrl) {
                                return (
                                    <Image
                                        src={imgUrl}
                                        alt={video.title}
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 768px) 50vw, 33vw"
                                    />
                                );
                            }
                            return <div className="w-full h-full bg-zinc-800" />;
                        };

                        const hasBefore = video.beforeVideo || video.beforeImage;
                        const hasResult = video.afterVideo || video.afterImage;

                        const beforeContent = previewMode === 'product'
                            ? renderMedia(
                                undefined,
                                video.productImage || video.product_image_url,
                                "Product",
                                !video.productImage && !video.product_image_url
                            )
                            : renderMedia(
                                video.beforeVideo || video.before_video_url,
                                video.beforeImage || video.before_image_url,
                                "Reference"
                            );

                        const resultContent = renderMedia(
                            video.afterVideo || video.after_video_url,
                            video.afterImage || video.after_image_url,
                            "Result"
                        );

                        if (hasBefore && hasResult) {
                            return (
                                <>
                                    <div className="w-1/2 h-full relative border-r border-white/10 group-hover:w-[45%] transition-all duration-500">
                                        {beforeContent}
                                        <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 rounded text-[8px] font-bold text-white uppercase backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
                                            {previewMode === 'product' ? 'Product' : 'Reference'}
                                        </div>
                                    </div>
                                    <div className="w-1/2 h-full relative group-hover:w-[55%] transition-all duration-500">
                                        {resultContent}
                                        <div className="absolute top-2 right-2 px-2 py-1 bg-orange-500 rounded text-[8px] font-bold text-white uppercase shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">Result</div>
                                    </div>
                                </>
                            );
                        }

                        // Fallback to single view
                        return (
                            <div className="w-full h-full relative">
                                {renderMedia(
                                    video.afterVideo || video.beforeVideo,
                                    video.afterImage || video.beforeImage
                                )}
                            </div>
                        );
                    })()}
                </div>

                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />

                {/* Trending badge */}
                {video.trending && (
                    <div className="absolute top-3 left-1/2 transform -translate-x-1/2 flex items-center gap-1 px-3 py-1 rounded-full bg-orange-500/90 z-20">
                        <TrendingUp className="w-3 h-3 text-white" />
                        <span className="text-[10px] font-bold text-white uppercase">Trending</span>
                    </div>
                )}

                {/* Mask Ready badge */}
                {video.hasMask && (
                    <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/90 z-20">
                        <Sparkles className="w-3 h-3 text-white" />
                        <span className="text-[10px] font-bold text-white uppercase">Antigravity</span>
                    </div>
                )}

                {/* Action Buttons - Moved to bottom */}

                {/* Delete Button (Manage Mode) */}
                {isManageMode && onDelete && (
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (confirm('Are you sure you want to delete this template?')) onDelete(video.id);
                        }}
                        className="absolute top-3 right-3 z-50 p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-lg hover:scale-110 transition-all"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                    <div className="flex items-end justify-between">
                        <div>
                            <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">{video.category}</p>
                            <h3 className={`font-bold text-white ${isLarge ? 'text-xl' : 'text-base'}`}>{video.title}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Share Button */}
                            <button
                                onClick={handleShare}
                                className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
                                title="Share"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white w-3.5 h-3.5"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" x2="15.42" y1="13.51" y2="17.49" /><line x1="15.41" x2="8.59" y1="6.51" y2="10.49" /></svg>
                            </button>

                            {/* Like Button */}
                            <button
                                onClick={toggleLike}
                                className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors"
                            >
                                <Heart className={`w-3.5 h-3.5 ${isLiked ? 'text-red-500 fill-red-500' : 'text-white'}`} />
                            </button>

                            <button className="px-4 py-2 rounded-full bg-orange-500 text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                Recreate
                            </button>
                        </div>
                    </div>
                </div>

                {/* Play button overlay - Removed */}
            </motion.div>
        </Link>
    );
}

export default function VideosPage() {
    const { user } = useAuth();
    const [activeCategory, setActiveCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [templates, setTemplates] = useState<any[]>([]);
    const [isManageMode, setIsManageMode] = useState(false);
    const [previewMode, setPreviewMode] = useState<'reference' | 'product'>('reference');
    const { categories: dbCategories, loading: categoriesLoading } = useCategories();
    const [categories, setCategories] = useState<string[]>(['All']);
    const [collections, setCollections] = useState<any[]>([]);

    // Update categories when loaded from DB
    useEffect(() => {
        if (dbCategories.length > 0) {
            setCategories(['All', ...dbCategories.map(c => c.name)]);
        }
    }, [dbCategories]);

    // Delete Handler
    const handleDeleteTemplate = async (id: number) => {
        const { deleteTemplate } = await import('@/lib/db/videos');
        const success = await deleteTemplate(id);
        if (success) {
            setTemplates(prev => prev.filter(t => t.id !== id));
        } else {
            alert("Failed to delete template.");
        }
    };

    useEffect(() => {
        async function loadData() {
            try {
                // Check cache first
                const { getCache, setCache } = await import('@/lib/cache');
                const cachedVideos = getCache<any[]>('videos_page_data');

                if (cachedVideos) {
                    setTemplates(cachedVideos);
                    // Fetch categories separately if needed, or rely on useCategories hook
                }

                const { getTemplates } = await import('@/lib/db/videos');
                const { supabase } = await import('@/lib/supabase');

                // Parallel Fetching
                const [temps, collsResponse] = await Promise.all([
                    getTemplates(),
                    supabase
                        .from('collections')
                        .select('*, collection_items(count)')
                        .eq('type', 'video')
                        .order('created_at', { ascending: false })
                ]);

                const { data: colls } = collsResponse;

                if (colls) {
                    setCollections(colls.map(c => ({
                        ...c,
                        item_count: c.collection_items?.[0]?.count || 0
                    })));
                }

                const BLACKLIST = [
                    'Product Showcase', 'Unboxing Experience', 'Skincare Routine', 'Food Commercial',
                    'Fashion Reel', 'Tech Product Demo', 'Lifestyle Shot', 'Makeup Tutorial',
                    'Dropship Winner', 'Street Style', 'Before & After', 'Hero Video', 'Hero Image'
                ];

                // Map DB keys to frontend structure
                const mappedTemplates = temps
                    .filter((t: any) =>
                        !BLACKLIST.includes(t.title) &&
                        (t.type === 'video' || t.before_video_url || t.after_video_url) &&
                        t.type !== 'image' &&
                        t.before_image_url && t.before_image_url.length > 10 && // Ensure valid cover
                        !t.is_explore // Exclude explore library templates
                    )
                    .map((t: any) => ({
                        id: t.id,
                        title: t.title,
                        category: t.category,
                        beforeImage: t.before_image_url,
                        afterImage: t.after_image_url,
                        beforeVideo: t.before_video_url,
                        afterVideo: t.after_video_url,
                        views: t.views_count,
                        trending: t.is_trending,
                        hasMask: !!(t.replaced_object_mask_url || t.mask_video_url),
                        maskUrl: t.replaced_object_mask_url || t.mask_video_url,
                        productImage: t.product_image_url
                    }));

                // Update Cache and State
                setCache('videos_page_data', mappedTemplates);
                setTemplates(mappedTemplates);
            } catch (error) {
                console.error('Failed to load library data', error);
            }
        }
        loadData();
    }, []);

    const filteredVideos = templates.filter(video => {
        const matchesCategory = activeCategory === 'All' || video.category === activeCategory;
        const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    // Group videos into alternating pattern: 3 normal + 1 large
    const groupedVideos: { type: 'row3' | 'row1'; videos: any[] }[] = [];
    let i = 0;
    while (i < filteredVideos.length) {
        // Add row of 3
        if (i + 3 <= filteredVideos.length) {
            groupedVideos.push({ type: 'row3', videos: filteredVideos.slice(i, i + 3) });
            i += 3;
        } else if (i < filteredVideos.length) {
            groupedVideos.push({ type: 'row3', videos: filteredVideos.slice(i) });
            i = filteredVideos.length;
        }

        // Add row of 1 large
        if (i < filteredVideos.length) {
            groupedVideos.push({ type: 'row1', videos: [filteredVideos[i]] });
            i += 1;
        }
    }

    return (
        <div className="min-h-screen pt-20 pb-16 px-4">
            <div className="max-w-[1400px] mx-auto">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">

                </div>

                {/* Search and Filters */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-10"
                >


                    {/* Category Pills & Toggle */}
                    <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                        <div className="flex flex-wrap justify-center gap-2">
                            {categories.map((category) => (
                                <button
                                    key={category}
                                    onClick={() => setActiveCategory(category)}
                                    className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${activeCategory === category
                                        ? 'bg-orange-500 text-white'
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
                                    ? 'bg-orange-500 text-white'
                                    : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                            >
                                Product
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Video Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Collections First */}
                    {collections.map(collection => (
                        <CollectionCard key={collection.id} collection={collection} basePath="/videos" />
                    ))}

                    {filteredVideos.map((video, index) => (
                        <motion.div
                            key={video.id}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 * index }}
                        >
                            <VideoCard
                                video={video}
                                size="normal"
                                isManageMode={isManageMode}
                                onDelete={handleDeleteTemplate}
                                previewMode={previewMode}
                            />
                        </motion.div>
                    ))}
                </div>

                {/* Empty State */}
                {
                    filteredVideos.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-20"
                        >
                            <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-6">
                                <Search className="w-10 h-10 text-zinc-500" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">No videos found</h3>
                            <p className="text-zinc-400">Try selecting a different category</p>
                        </motion.div>
                    )
                }

                <OnboardingPopup
                    pageKey="videos-library"
                    stepsKey="recreateVideoSteps"
                    defaultTitle="VIDEOS LIBRARY"
                    plusInfoUrl="/guide/videos-library"
                />
            </div >
        </div >
    );
}

