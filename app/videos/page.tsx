'use client';

import { motion } from 'framer-motion';
import { Play, Search, TrendingUp, Eye, Sparkles, Heart, Trash2, Settings2, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { TemplateUploader } from '@/components/admin/TemplateUploader';
import { useCategories } from '@/hooks/useCategories';
import { LazyVideo } from '@/components/LazyVideo';

// VideoCard Component
function VideoCard({ video, size = 'normal', isManageMode = false, onDelete }: { video: any; size?: 'normal' | 'large'; isManageMode?: boolean; onDelete?: (id: number) => void }) { // eslint-disable-line @typescript-eslint/no-explicit-any
    const isLarge = size === 'large';
    const [isLiked, setIsLiked] = useState(false);
    const { user } = useAuth();

    // Check if liked on mount
    useEffect(() => {
        if (user) {
            import('@/lib/db/videos').then(({ getSavedTemplates }) => {
                getSavedTemplates(user.id).then(saved => {
                    if (saved.includes(video.id)) setIsLiked(true);
                });
            });
        }
    }, [user, video.id]);

    const toggleLike = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!user) return; // Or redirect to login

        const { saveTemplate, unsaveTemplate } = await import('@/lib/db/videos');

        if (isLiked) {
            await unsaveTemplate(user.id, video.id);
            setIsLiked(false);
        } else {
            await saveTemplate(user.id, video.id);
            setIsLiked(true);
        }
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
            >
                {/* Before/After Split */}
                <div className="absolute inset-0 flex">
                    {/* Before */}
                    <div className="relative w-1/2 overflow-hidden">
                        {video.beforeVideo ? (
                            <LazyVideo
                                src={video.beforeVideo}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                autoPlay
                                loop
                                playsInline
                                preload="auto"
                                muted
                            />
                        ) : (
                            <Image
                                src={video.beforeImage}
                                alt="Before"
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-110"
                                loading="lazy"
                                sizes="(max-width: 768px) 50vw, 33vw"
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/30" />
                        <span className="absolute top-3 left-3 px-3 py-1.5 rounded-lg bg-black/70 text-xs font-semibold text-white backdrop-blur-sm z-10">
                            Before
                        </span>
                    </div>

                    {/* After */}
                    <div className="relative w-1/2 overflow-hidden">
                        {video.afterVideo ? (
                            <LazyVideo
                                src={video.afterVideo}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                autoPlay
                                loop
                                playsInline
                                preload="auto"
                                muted
                            />
                        ) : (
                            <Image
                                src={video.afterImage}
                                alt="After"
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-110"
                                loading="lazy"
                                sizes="(max-width: 768px) 50vw, 33vw"
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-l from-transparent to-black/30" />
                        <span className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-orange-500 text-xs font-semibold text-white z-10">
                            After
                        </span>
                    </div>
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
                            {/* Views */}
                            <div className="flex items-center gap-1.5 text-zinc-400 mr-2">
                                <Eye className="w-4 h-4" />
                                <span className="text-sm font-medium">{video.views}</span>
                            </div>

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
    const { categories: dbCategories, loading: categoriesLoading } = useCategories();
    const [categories, setCategories] = useState<string[]>(['All']);

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
                const { getTemplates } = await import('@/lib/db/videos');
                // const { getCategories } = await import('@/lib/db/videos'); // Unused
                const temps = await getTemplates();

                // Map DB keys to frontend keys if needed (camelCase vs snake_case)
                const mappedTemplates = temps.map((t: any) => ({
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
                    maskUrl: t.replaced_object_mask_url || t.mask_video_url
                }));

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
        <div className="min-h-screen bg-zinc-950 pt-20 pb-16 px-4">
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
                    {/* Search */}
                    <div className="relative max-w-lg mx-auto mb-6">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Search templates..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 rounded-full bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:border-orange-500/50 transition-all text-base"
                        />
                    </div>

                    {/* Category Pills */}
                    <div className="flex flex-wrap justify-center gap-2">
                        {categories.map((category) => (
                            <button
                                key={category}
                                onClick={() => setActiveCategory(category)}
                                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${activeCategory === category
                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                    : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800 hover:text-white'
                                    }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </motion.div>



                {/* Video Grid - Alternating Layout */}
                <div className="space-y-6">
                    {groupedVideos.map((group, groupIndex) => (
                        <motion.div
                            key={groupIndex}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * groupIndex }}
                        >
                            {group.type === 'row3' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {group.videos.map((video) => (
                                        <VideoCard key={video.id} video={video} size="normal" isManageMode={isManageMode} onDelete={handleDeleteTemplate} />
                                    ))}
                                </div>
                            ) : (
                                <div className="w-full">
                                    {group.videos.map((video) => (
                                        <VideoCard key={video.id} video={video} size="large" isManageMode={isManageMode} onDelete={handleDeleteTemplate} />
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>

                {/* Empty State */}
                {filteredVideos.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-20"
                    >
                        <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-6">
                            <Search className="w-10 h-10 text-zinc-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">No videos found</h3>
                        <p className="text-zinc-400">Try a different search or category</p>
                    </motion.div>
                )}
            </div>
        </div>
    );
}

