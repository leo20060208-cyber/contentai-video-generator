'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import {
    User,
    Mail,
    CreditCard,
    Settings,
    Video as VideoIcon,
    Crown,
    Check,
    Clock,
    Eye,
    Zap,
    Calendar,
    BarChart3,
    LogOut,
    Sparkles,
    Trash2,
    Download,
    ImageIcon,
    Play
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/lib/auth/AuthContext';
import { getUserVideos, getSavedTemplatesWithData, Video, Template } from '@/lib/db/videos';
import { UserMask, getUserMasks, deleteUserMask } from '@/lib/db/masks';
import { supabase } from '@/lib/supabase';
import { VideoModal } from '@/components/profile/VideoModal';

const plans = [
    {
        name: 'Free',
        price: 0,
        videos: 5,
        features: ['5 videos/month', 'Basic templates', 'SD quality', 'Watermark'],
        current: false
    },
    {
        name: 'Pro',
        price: 29,
        videos: 50,
        features: ['50 videos/month', 'All templates', 'HD quality', 'No watermark', 'Priority support'],
        current: true,
        popular: true
    },
    {
        name: 'Enterprise',
        price: 99,
        videos: -1,
        features: ['Unlimited videos', 'All templates', '4K quality', 'No watermark', 'API access', 'Dedicated support'],
        current: false
    },
];

interface VideoCardProps {
    video: Video;
    onDelete: (id: string) => void;
    onPlay: (video: Video) => void;
}

const VideoCard = ({ video, onDelete, onPlay }: VideoCardProps) => {
    // ... (VideoCard implementation is fine, skipping lines for brevity if possible but I must replace entire block if I want to delete imports? No, imports are at top. I am replacing lines 35-480)
    // Actually I can just replace the top imports and the component logic.
    // Let's stick to the necessary changes.
    // I need to update the default export component.

    // ... VideoCard code ...
    const [isHovering, setIsHovering] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isVideoReady, setIsVideoReady] = useState(false);

    // Reset ready state when video changes
    useEffect(() => {
        setIsVideoReady(false);
    }, [video.video_url]);

    useEffect(() => {
        if (!isHovering) {
            if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current.currentTime = 0;
            }
            // Optional: reset ready state if we want to show thumbnail again immediately on mouse leave
            setIsVideoReady(false);
        } else {
            // When hovering, we want to play.
            if (videoRef.current) {
                videoRef.current.play().catch(() => { });
            }
        }
    }, [isHovering]);

    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className="bg-zinc-900 rounded-2xl border border-white/5 overflow-hidden group shadow-sm hover:shadow-md transition-all h-full flex flex-col"
        >
            <div
                className="relative aspect-[9/16] bg-zinc-800 flex items-center justify-center overflow-hidden cursor-pointer"
                onClick={() => onPlay(video)}
            >
                {/* Thumbnail Layer - Only fade out when VIDEO IS READY */}
                <div className={`absolute inset-0 transition-opacity duration-300 z-10 ${isVideoReady && isHovering ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    {video.thumbnail_url ? (
                        <Image src={video.thumbnail_url} alt={video.title} fill className="object-cover" />
                    ) : (
                        <div className="flex h-full items-center justify-center flex-col gap-2 text-zinc-500">
                            <VideoIcon className="w-12 h-12" />
                            {video.status === 'processing' && <span className="text-xs">Processing...</span>}
                        </div>
                    )}
                </div>

                {/* Video Layer - Render only when hovering, but behind thumbnail initally */}
                {isHovering && video.video_url && (
                    <video
                        ref={videoRef}
                        src={video.video_url}
                        muted
                        loop
                        playsInline
                        // Removes autoPlay to manually control it and ensure ready state
                        className="absolute inset-0 w-full h-full object-cover"
                        onLoadedData={() => {
                            if (videoRef.current) {
                                videoRef.current.play().then(() => {
                                    setIsVideoReady(true);
                                }).catch(() => { }); // Autoplay might fail
                            }
                        }}
                    />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none z-20" />

                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 z-30"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={() => onPlay(video)}
                        className="w-12 h-12 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                        title="Ver Video"
                    >
                        <Play className="w-5 h-5 text-white ml-0.5" />
                    </button>
                    <button
                        onClick={() => onDelete(video.id)}
                        className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-red-50 transition-colors shadow-lg"
                        title="Borrar"
                    >
                        <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                </div>

                <div className="absolute bottom-3 left-3 flex items-center gap-1 text-white/90 pointer-events-none z-20">
                    {/* Views Removed */}
                </div>
                <div className="absolute bottom-3 right-3 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-xs text-white font-medium pointer-events-none z-20">
                    {video.duration || '0:00'}
                </div>
            </div>

            <div className="p-4 flex-1">
                <h3 className="text-white font-semibold text-sm mb-1 truncate">{video.title || 'Untitled'}</h3>
                <p className="text-xs text-zinc-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(video.created_at).toLocaleDateString()}
                </p>
            </div>
        </motion.div>
    );
};

export default function ProfilePage() {
    const { user, profile } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'videos' | 'saved' | 'masks' | 'settings' | 'billing'>('videos');
    const [myVideos, setMyVideos] = useState<Video[]>([]);
    const [savedTemplates, setSavedTemplates] = useState<Template[]>([]);
    const [masks, setMasks] = useState<UserMask[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

    const refreshProfile = async () => {
        window.location.reload();
    };

    useEffect(() => {
        let isMounted = true;

        async function loadData() {
            if (!user?.id) return; // Wait for user ID to be available

            try {
                // Fetch videos, saved templates, and masks in parallel
                const [videos, saved, userMasks] = await Promise.all([
                    getUserVideos(user.id),
                    getSavedTemplatesWithData(user.id),
                    getUserMasks(user.id)
                ]);

                if (isMounted) {
                    setMyVideos(videos);
                    setSavedTemplates(saved || []);
                    setMasks(userMasks || []);
                    setLoading(false);
                }
            } catch (error) {
                console.error('Error loading profile data:', error);
                if (isMounted) setLoading(false);
            }
        }

        if (user) {
            loadData();
        }
    }, [user]); // Depend on user object

    const videosThisMonth = myVideos.filter(v => {
        const date = new Date(v.created_at);
        const now = new Date();
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;

    // totalViews removed
    const planLimit = 50; // Hardcoded for now, should come from subscription
    const usagePercentage = (videosThisMonth / planLimit) * 100;

    // Fallback for missing profile
    const displayProfile = profile || (user ? {
        id: user.id,
        name: user.email?.split('@')[0] || 'User',
        avatar_url: null,
        plan: 'Free',
        created_at: new Date().toISOString(),
    } : null);

    // If user is not yet loaded, let ProtectedRoute handle the loading/redirect state
    // We render the content only when user exists to avoid crashes
    return (
        <ProtectedRoute>
            {user && displayProfile && (
                <div className="min-h-screen bg-zinc-950 pt-20 pb-16">
                    <div className="max-w-6xl mx-auto px-4">

                        {/* Profile Header */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="relative rounded-3xl overflow-hidden mb-8 shadow-lg shadow-primary/5"
                        >
                            {/* Background gradient */}
                            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent" />
                            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23000000%22 fill-opacity=%220.03%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50" />

                            <div className="relative p-8">
                                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                                    {/* Avatar Removed */}

                                    {/* User Info */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h1 className="text-2xl md:text-3xl font-bold text-white">{displayProfile.name || 'User'}</h1>
                                            <span className="px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 text-sm font-semibold flex items-center gap-1">
                                                <Crown className="w-4 h-4" />
                                                {displayProfile.plan || 'Free'}
                                            </span>
                                        </div>
                                        <p className="text-zinc-500 flex items-center gap-2 mb-4">
                                            <Mail className="w-4 h-4" />
                                            {user.email}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-4 text-sm">
                                            <div className="flex items-center gap-2 text-zinc-500">
                                                <Calendar className="w-4 h-4" />
                                                <span>Joined {new Date(displayProfile.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-zinc-500">
                                                <VideoIcon className="w-4 h-4" />
                                                <span>{myVideos.length} videos created</span>
                                            </div>
                                            {/* Views Stats Removed */}
                                        </div>
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="flex gap-2">
                                        {/* Create Button Removed */}
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Stats Cards */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
                        >
                            <div className="bg-zinc-900 rounded-2xl border border-white/5 p-5 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                                        <VideoIcon className="w-5 h-5 text-orange-500" />
                                    </div>
                                </div>
                                <p className="text-2xl font-bold text-white mb-1">{myVideos.length}</p>
                                <p className="text-xs text-zinc-500">Total Videos</p>
                            </div>

                            {/* Total Views Card Removed */}

                            <div className="bg-zinc-900 rounded-2xl border border-white/5 p-5 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                                        <Zap className="w-5 h-5 text-purple-500" />
                                    </div>
                                </div>
                                <p className="text-2xl font-bold text-white mb-1">{videosThisMonth}</p>
                                <p className="text-xs text-zinc-500">This Month</p>
                            </div>

                            <div className="bg-zinc-900 rounded-2xl border border-white/5 p-5 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                                        <BarChart3 className="w-5 h-5 text-orange-500" />
                                    </div>
                                </div>
                                <div className="mb-2">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-white font-medium">{videosThisMonth}/{planLimit}</span>
                                        <span className="text-zinc-500">{Math.round(usagePercentage)}%</span>
                                    </div>
                                    <div className="h-2 bg-black/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-primary to-orange-500 rounded-full transition-all"
                                            style={{ width: `${usagePercentage}%` }}
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-zinc-500">Monthly Usage</p>
                            </div>
                        </motion.div>

                        {/* Tabs */}
                        <div className="flex gap-2 mb-6 border-b border-black/5 pb-4 overflow-x-auto">
                            {[
                                { id: 'videos', label: 'My Videos', icon: VideoIcon },
                                { id: 'saved', label: 'Saved', icon: Sparkles },
                                { id: 'masks', label: 'Masks', icon: ImageIcon },
                                { id: 'billing', label: 'Billing', icon: CreditCard },
                                { id: 'settings', label: 'Settings', icon: Settings },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                    className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id
                                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                        : 'text-zinc-500 hover:text-white hover:bg-zinc-900'
                                        }`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            {/* Videos Tab */}
                            {activeTab === 'videos' && (
                                <div>
                                    <div className="flex justify-end mb-4">
                                        <Button
                                            onClick={async () => {
                                                setLoading(true);
                                                try {
                                                    const res = await fetch('/api/video/sync');
                                                    const data = await res.json();
                                                    console.log('Sync result:', data);
                                                    window.location.reload();
                                                } catch (e) {
                                                    console.error('Sync failed', e);
                                                    setLoading(false);
                                                }
                                            }}
                                            variant="secondary"
                                            size="sm"
                                            className="gap-2 bg-zinc-900 border border-white/10 hover:bg-zinc-800"
                                        >
                                            <Sparkles className="w-4 h-4" /> {/* Or RefreshCw if available */}
                                            Sync Status
                                        </Button>
                                    </div>
                                    {loading ? (
                                        <div className="text-center py-20">
                                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                                        </div>
                                    ) : myVideos.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                            {myVideos.map((video) => (
                                                <VideoCard
                                                    key={video.id}
                                                    video={video}
                                                    onPlay={(v) => setSelectedVideo(v)}
                                                    onDelete={async (id) => {
                                                        try {
                                                            const { data: { session } } = await supabase.auth.getSession();
                                                            if (!session) return;

                                                            const response = await fetch(`/api/video/delete?id=${id}`, {
                                                                method: 'DELETE',
                                                                headers: { 'Authorization': `Bearer ${session.access_token}` },
                                                            });

                                                            if (response.ok) {
                                                                setMyVideos(prev => prev.filter(v => v.id !== id));
                                                            } else {
                                                                const err = await response.json();
                                                                console.error('Delete failed:', err);
                                                                alert(`No se pudo borrar: ${err.error || 'Error desconocido'}`);
                                                            }
                                                        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
                                                            console.error('Error:', error);
                                                            alert(`Error de red: ${(error as Error).message}`);
                                                        }
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-20 bg-zinc-900 rounded-3xl border border-white/5 shadow-sm">
                                            <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-6">
                                                <VideoIcon className="w-10 h-10 text-zinc-600" />
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-2">No videos yet</h3>
                                            <Link href="/videos">
                                                <Button variant="primary">Browse Templates</Button>
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Saved Tab */}
                            {activeTab === 'saved' && (
                                <div className="text-center py-20 bg-zinc-900 rounded-3xl border border-white/5 shadow-sm">
                                    {savedTemplates.length > 0 ? (
                                        <div className="text-white px-6">
                                            <h3 className="text-xl font-bold mb-6">Saved Templates</h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                {savedTemplates.map((template) => {
                                                    return (
                                                        <Link key={template.id} href={`/recreate/${template.id}`} className="block group">
                                                            <motion.div
                                                                whileHover={{ scale: 1.02 }}
                                                                className="bg-zinc-900 rounded-2xl border border-white/5 overflow-hidden shadow-sm hover:shadow-md transition-all"
                                                            >
                                                                <div className="relative aspect-[9/16]">
                                                                    <Image
                                                                        src={template.after_image_url}
                                                                        alt={template.title}
                                                                        fill
                                                                        className="object-cover"
                                                                    />
                                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                                                                    <div className="absolute bottom-3 left-3 flex items-center gap-1 text-white/90">
                                                                        <Eye className="w-3 h-3" />
                                                                        <span className="text-xs">{template.views_count}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="p-4 text-left">
                                                                    <h3 className="text-white font-semibold text-sm mb-1 truncate">{template.title}</h3>
                                                                    <p className="text-xs text-zinc-500">{template.category}</p>
                                                                </div>
                                                            </motion.div>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-6">
                                                <Sparkles className="w-10 h-10 text-zinc-600" />
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-2">No saved templates</h3>
                                            <p className="text-zinc-500 mb-6">Save templates you like to access them quickly</p>
                                            <Link href="/videos">
                                                <Button variant="primary">Browse Templates</Button>
                                            </Link>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Masks Tab */}
                            {activeTab === 'masks' && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-white font-semibold">My Saved Masks</h3>
                                        {/* Create Button Removed */}
                                    </div>

                                    {masks.length > 0 ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                            {masks.map((mask) => (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    key={mask.id}
                                                    className="group relative bg-zinc-900/50 rounded-xl border border-white/5 overflow-hidden aspect-square hover:border-orange-500/50 transition-colors"
                                                >
                                                    <div className="absolute inset-0 p-4 flex items-center justify-center bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiMzMzMiLz48cGF0aCBkPSJNMCAwSDRWNEg4VjhINFY0SDB6IiBmaWxsPSIjNDQ0Ii8+PC9zdmc+')] bg-repeat opacity-30"></div>
                                                    <img
                                                        src={mask.url}
                                                        alt={mask.name}
                                                        className="relative z-10 max-w-full max-h-full object-contain drop-shadow-lg"
                                                    />

                                                    {/* Hover Overlay */}
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3 z-20">
                                                        <p className="text-white text-xs font-medium truncate mb-2">{mask.name}</p>
                                                        <div className="flex gap-2 justify-end">
                                                            <a
                                                                href={mask.url}
                                                                download={`mask-${mask.id}.png`}
                                                                target="_blank"
                                                                className="p-1.5 bg-white/10 rounded-md text-white hover:bg-white/20 hover:text-orange-400 transition-colors"
                                                                title="Download"
                                                            >
                                                                <Download className="w-3.5 h-3.5" />
                                                            </a>
                                                            <button
                                                                onClick={async () => {
                                                                    if (confirm('Are you sure you want to delete this mask?')) {
                                                                        await deleteUserMask(mask.id);
                                                                        setMasks(prev => prev.filter(m => m.id !== mask.id));
                                                                    }
                                                                }}
                                                                className="p-1.5 bg-red-500/10 rounded-md text-red-400 hover:bg-red-500 hover:text-white transition-colors"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-20 bg-zinc-900 rounded-3xl border border-white/5 shadow-sm">
                                            <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-6">
                                                <ImageIcon className="w-10 h-10 text-zinc-600" />
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-2">No saved masks</h3>
                                            <p className="text-zinc-500 mb-6">Generated masks will be automatically saved here.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Billing Tab */}
                            {activeTab === 'billing' && (
                                <div className="space-y-6">
                                    {/* Current Plan */}
                                    <div className="bg-zinc-900 rounded-2xl border border-orange-500/30 p-6 shadow-sm">
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <p className="text-sm text-zinc-500 mb-1">Current Plan</p>
                                                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                                                    {displayProfile.plan || 'Free'}
                                                    <Crown className="w-5 h-5 text-orange-500" />
                                                </h3>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-3xl font-bold text-white">$0<span className="text-sm text-zinc-500">/mo</span></p>
                                                <p className="text-xs text-zinc-500">Next billing: N/A</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <Button variant="primary" size="sm">
                                                Upgrade Plan
                                            </Button>
                                        </div>
                                    </div>

                                    {/* All Plans */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-white mb-4">All Plans</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {plans.map((plan) => (
                                                <div
                                                    key={plan.name}
                                                    className={`relative bg-zinc-900 rounded-2xl border-2 p-6 transition-all shadow-sm ${plan.name === (displayProfile.plan || 'Free')
                                                        ? 'border-orange-500'
                                                        : 'border-white/5 hover:border-white/10'
                                                        }`}
                                                >
                                                    {plan.popular && (
                                                        <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded-full bg-orange-500 text-white text-xs font-bold shadow-md">
                                                            POPULAR
                                                        </span>
                                                    )}
                                                    {plan.name === (displayProfile.plan || 'Free') && (
                                                        <span className="absolute top-4 right-4 px-2 py-1 rounded-full bg-orange-500/10 text-orange-500 text-xs font-bold">
                                                            CURRENT
                                                        </span>
                                                    )}
                                                    <h4 className="text-xl font-bold text-white mb-2">{plan.name}</h4>
                                                    <p className="text-3xl font-bold text-white mb-1">
                                                        ${plan.price}<span className="text-sm text-zinc-500">/mo</span>
                                                    </p>
                                                    <p className="text-sm text-zinc-500 mb-4">
                                                        {plan.videos === -1 ? 'Unlimited' : plan.videos} videos/month
                                                    </p>
                                                    <ul className="space-y-2 mb-6">
                                                        {plan.features.map((feature, i) => (
                                                            <li key={i} className="flex items-center gap-2 text-sm text-zinc-500">
                                                                <Check className="w-4 h-4 text-orange-500" />
                                                                {feature}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                    {plan.name !== (displayProfile.plan || 'Free') && (
                                                        <Button variant={plan.popular ? 'primary' : 'outline'} size="sm" className="w-full">
                                                            {plan.price === 0 ? 'Downgrade' : 'Upgrade'}
                                                        </Button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Settings Tab */}
                            {activeTab === 'settings' && (
                                <SettingsTab user={user} displayProfile={displayProfile} refreshProfile={refreshProfile} />
                            )}
                        </motion.div>
                    </div>
                </div>
            )}

            {/* Video Modal */}
            <VideoModal
                video={selectedVideo}
                onClose={() => setSelectedVideo(null)}
                onDelete={async (id) => {
                    try {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session) return;

                        const response = await fetch(`/api/video/delete?id=${id}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${session.access_token}` },
                        });

                        if (response.ok) {
                            setMyVideos(prev => prev.filter(v => v.id !== id));
                            setSelectedVideo(null); // Close modal
                        } else {
                            alert('Failed to delete video');
                        }
                    } catch (e) {
                        console.error(e);
                        alert('Error deleting video');
                    }
                }}
            />
        </ProtectedRoute>
    );
}

interface SettingsTabProps {
    user: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    displayProfile: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    refreshProfile: () => Promise<void>;
}

function SettingsTab({ user, displayProfile, refreshProfile }: SettingsTabProps) {
    const [name, setName] = useState(displayProfile.name || '');
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleSave = async () => {
        setIsSaving(true);
        setMessage(null);
        try {
            const { updateProfile } = await import('@/lib/db/profiles');
            const updated = await updateProfile(user.id, { name });

            if (updated) {
                await refreshProfile();
                setMessage({ type: 'success', text: 'Profile updated successfully!' });
            } else {
                setMessage({ type: 'error', text: 'Failed to update profile.' });
            }
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            console.error('Error saving profile:', error);
            setMessage({ type: 'error', text: error.message || 'An error occurred.' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Account Info */}
            <div className="bg-zinc-900 rounded-2xl border border-white/5 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                    <User className="w-5 h-5 text-orange-500" />
                    Account Information
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs text-zinc-500 mb-2">Full Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-transparent text-white focus:outline-none focus:bg-zinc-800 focus:border-orange-500/50 transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-zinc-500 mb-2">Email</label>
                        <input
                            type="email"
                            defaultValue={user.email || ''}
                            disabled
                            className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-transparent text-zinc-500 cursor-not-allowed transition-all"
                        />
                    </div>

                    {message && (
                        <p className={`text-sm ${message.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                            {message.text}
                        </p>
                    )}

                    <Button variant="primary" size="sm" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-zinc-900 rounded-2xl border border-red-500/20 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                    <LogOut className="w-5 h-5 text-red-500" />
                    Danger Zone
                </h3>
                <div className="space-y-4">
                    <button
                        onClick={async () => {
                            const { supabase } = await import('@/lib/supabase');
                            await supabase.auth.signOut();
                            window.location.reload();
                        }}
                        className="w-full flex items-center justify-between p-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition-colors text-left border border-red-500/20"
                    >
                        <div>
                            <p className="text-red-600 text-sm font-medium">Log Out</p>
                            <p className="text-xs text-red-400">Sign out of your account</p>
                        </div>
                        <LogOut className="w-5 h-5 text-red-500" />
                    </button>
                </div>
            </div>
        </div>
    );
}
