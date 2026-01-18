'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth/AuthContext';
import { useState, useEffect } from 'react';
import { getUserVideos, getSavedTemplatesWithData, Video, Template, deleteVideo } from '@/lib/db/videos';
import { getUserMasks, UserMask } from '@/lib/db/masks';
import { VideoCard } from '@/components/landing/VideoCard';
import { Loader2, Film, Image as ImageIcon, Sparkles, CreditCard, Heart, Calendar, ShieldCheck, Zap, Download, X, Play, Maximize2, Settings, Trash2, LogOut, Lock, CheckCircle2, Wand2, Plus } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { TransactionHistory } from '@/components/TransactionHistory';

// Tabs Component
function Tabs({ activeTab, onTabChange }: { activeTab: string, onTabChange: (tab: string) => void }) {
    const tabs = [
        { id: 'videos', label: 'My Videos', icon: Film },
        { id: 'images', label: 'My Images', icon: ImageIcon },
        { id: 'masks', label: 'My Masks', icon: Sparkles },
        { id: 'saved', label: 'Saved', icon: Heart },
        { id: 'subscription', label: 'Subscription', icon: CreditCard },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === tab.id
                        ? 'bg-white text-black shadow-lg shadow-white/10'
                        : 'bg-zinc-900/50 text-zinc-400 border border-white/5 hover:bg-zinc-800 hover:text-white'
                        }`}
                >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

// Media Lightbox Component
function MediaLightbox({ item, type, onClose, onDelete }: { item: any; type: 'video' | 'image' | 'mask'; onClose: () => void; onDelete: () => void }) {
    if (!item) return null;

    const handleDownload = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const url = type === 'video' ? item.video_url : item.url;
            const filename = type === 'video' ? `${item.title || 'video'}.mp4` : `${item.name || 'image'}.png`;

            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download failed:', error);
            alert('Failed to download media');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center justify-center"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Content */}
                <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-xl bg-black border border-white/10 shadow-2xl shadow-black/50">
                    {type === 'video' ? (
                        <video
                            src={item.video_url}
                            className="max-h-[80vh] w-auto max-w-full object-contain"
                            controls
                            autoPlay
                        />
                    ) : (
                        <div className="relative w-full h-[80vh]">
                            {type === 'mask' && <div className="absolute inset-0 bg-[url('/transparent-bg.png')] opacity-20" />}
                            <img
                                src={item.url}
                                alt={item.name || 'Media'}
                                className="w-full h-full object-contain"
                            />
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                    <button
                        onClick={onDelete}
                        className="p-3 rounded-full bg-white/10 hover:bg-red-500/20 text-white hover:text-red-500 transition-all backdrop-blur-sm group border border-white/5 hover:border-red-500/50"
                        title="Delete"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>

                    <div className="w-px h-6 bg-white/10 mx-1" />

                    <button
                        onClick={handleDownload}
                        className="p-3 rounded-full bg-white/10 hover:bg-white text-white hover:text-black transition-all backdrop-blur-sm group border border-white/5"
                        title="Download"
                    >
                        <Download className="w-5 h-5" />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-3 rounded-full bg-white/10 hover:bg-zinc-800 text-white transition-all backdrop-blur-sm border border-white/5"
                        title="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Info Bar */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-4">
                    <span className="text-sm font-medium text-white">{item.title || item.name || 'Untitled Media'}</span>
                    <div className="h-4 w-px bg-white/20" />
                    <span className="text-xs text-zinc-400 capitalize">{type}</span>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default function ProfilePage() {
    const { user, profile, isLoading: authLoading, updatePassword } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('videos');
    const [isLoadingData, setIsLoadingData] = useState(true);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    // Lightbox State
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [selectedType, setSelectedType] = useState<'video' | 'image' | 'mask' | null>(null);

    // Data states
    const [videos, setVideos] = useState<Video[]>([]);
    const [userImages, setUserImages] = useState<any[]>([]);
    const [masks, setMasks] = useState<UserMask[]>([]);
    const [savedTemplates, setSavedTemplates] = useState<Template[]>([]);

    // Subscription Details State
    const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null);

    // Change Password State
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    // Create Mask State
    const [showCreateMaskModal, setShowCreateMaskModal] = useState(false);
    const [tempMaskFile, setTempMaskFile] = useState<{ file: File, preview: string } | null>(null);
    const [isProcessingMask, setIsProcessingMask] = useState(false);

    // Mask Handlers
    const handleMaskUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const preview = URL.createObjectURL(file);
            setTempMaskFile({ file, preview });
            setShowCreateMaskModal(true);
        }
    };

    const handleProcessMask = async (mode: 'skip' | 'process') => {
        if (!tempMaskFile || !user) return;
        setIsProcessingMask(true);

        try {
            let finalImageUrl = '';

            if (mode === 'process') {
                // Upload to temp storage or send as base64 to API?
                // For simplicity, let's use the remove-bg API which accepts a URL.
                // But we have a file. So first we must upload the raw file to Supabase Storage temporarily.

                // 1. Upload Raw
                const fileExt = tempMaskFile.file.name.split('.').pop();
                const fileName = `raw_${Math.random()}.${fileExt}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('masks') // Using masks bucket for temp storage too? Or maybe a 'temp' folder.
                    .upload(`${user.id}/temp/${fileName}`, tempMaskFile.file);

                if (uploadError) throw uploadError;

                const publicUrl = supabase.storage.from('masks').getPublicUrl(`${user.id}/temp/${fileName}`).data.publicUrl;

                // 2. Call Remove BG API
                const res = await fetch('/api/remove-background', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageUrl: publicUrl })
                });

                if (!res.ok) throw new Error('Failed to remove background');
                const data = await res.json();
                finalImageUrl = data.resultUrl; // This is a Replicate URL (temporary)

                // 3. We need to save this RESULT to our storage permanently (since Replicate URLs expire)
                const savedRes = await fetch(finalImageUrl);
                const savedBlob = await savedRes.blob();
                const savedFile = new File([savedBlob], `mask_${Date.now()}.png`, { type: 'image/png' });

                // Upload processed mask to permanent storage
                const finalFileName = `mask_${Date.now()}.png`;
                const { error: finalUploadError } = await supabase.storage
                    .from('masks')
                    .upload(`${user.id}/${finalFileName}`, savedFile);

                if (finalUploadError) throw finalUploadError;

                finalImageUrl = supabase.storage.from('masks').getPublicUrl(`${user.id}/${finalFileName}`).data.publicUrl;

            } else {
                // Skip processing - just upload original
                const fileExt = tempMaskFile.file.name.split('.').pop();
                const fileName = `mask_${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('masks')
                    .upload(`${user.id}/${fileName}`, tempMaskFile.file);

                if (uploadError) throw uploadError;
                finalImageUrl = supabase.storage.from('masks').getPublicUrl(`${user.id}/${fileName}`).data.publicUrl;
            }

            // Save to DB
            const { data: newMask, error: dbError } = await supabase
                .from('user_masks')
                .insert({
                    user_id: user.id,
                    url: finalImageUrl,
                    name: tempMaskFile.file.name,
                    type: 'image'
                })
                .select()
                .single();

            if (dbError) throw dbError;

            // Update UI
            setMasks(prev => [newMask, ...prev]);
            setShowCreateMaskModal(false);
            setTempMaskFile(null);

        } catch (error) {
            console.error('Error creating mask:', error);
            alert('Failed to create mask');
        } finally {
            setIsProcessingMask(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (newPassword !== confirmPassword) {
            setPasswordError("Passwords don't match");
            return;
        }

        if (newPassword.length < 6) {
            setPasswordError("Password must be at least 6 characters");
            return;
        }

        setIsUpdatingPassword(true);
        const result = await updatePassword(newPassword);
        setIsUpdatingPassword(false);

        if (result.error) {
            setPasswordError(result.error);
        } else {
            setPasswordSuccess("Password updated successfully");
            setNewPassword('');
            setConfirmPassword('');
        }
    };

    useEffect(() => {
        if (!user) return;

        async function loadData() {
            setIsLoadingData(true);
            try {
                // Fetch user images from images table
                const { data: imagesData, error: imagesError } = await supabase
                    .from('images')
                    .select('*')
                    .eq('user_id', user!.id)
                    .order('created_at', { ascending: false });

                if (imagesError) console.error('Error fetching user images:', imagesError);
                else setUserImages(imagesData || []);

                const [videosData, masksData, savedData] = await Promise.all([
                    getUserVideos(user!.id),
                    getUserMasks(user!.id),
                    getSavedTemplatesWithData(user!.id)
                ]);

                setVideos(videosData);
                setMasks(masksData);
                setSavedTemplates(savedData);

                // Fetch Stripe Subscription Details
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session) {
                        const subRes = await fetch('/api/stripe/subscription-details', {
                            headers: { 'Authorization': `Bearer ${session.access_token}` }
                        });
                        if (subRes.ok) {
                            const subData = await subRes.json();
                            if (subData.hasSubscription) {
                                setSubscriptionDetails(subData);
                            }
                        }
                    }
                } catch (e) { console.error('Sub details error', e); }
            } catch (error) {
                console.error("Failed to load profile data", error);
            } finally {
                setIsLoadingData(false);
            }
        }

        loadData();
    }, [user]);

    const openLightbox = (item: any, type: 'video' | 'image' | 'mask') => {
        setSelectedItem(item);
        setSelectedType(type);
    };

    const closeLightbox = () => {
        setSelectedItem(null);
        setSelectedType(null);
    };

    const handleDeleteItem = async () => {
        if (!selectedItem || !selectedType) return;
        if (!confirm('Are you sure you want to delete this? This action cannot be undone.')) return;

        try {
            if (selectedType === 'video') {
                const success = await deleteVideo(selectedItem.id);
                if (success) {
                    setVideos(prev => prev.filter(v => v.id !== selectedItem.id));
                    closeLightbox();
                } else {
                    alert('Failed to delete video');
                }
            } else if (selectedType === 'image') {
                const { error } = await supabase.from('images').delete().eq('id', selectedItem.id);

                if (error) {
                    console.error('Delete error:', error);
                    alert(`Failed to delete image: ${error.message}`);
                    return;
                }

                setUserImages(prev => prev.filter(i => i.id !== selectedItem.id));
                closeLightbox();

            } else if (selectedType === 'mask') {
                const { error } = await supabase.from('user_masks').delete().eq('id', selectedItem.id);
                if (!error) {
                    setMasks(prev => prev.filter(m => m.id !== selectedItem.id));
                    closeLightbox();
                } else {
                    console.error(error);
                    alert('Failed to delete mask');
                }
            }
        } catch (error) {
            console.error('Error deleting item:', error);
            alert('An error occurred during deletion');
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen pt-24 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen pt-24 flex flex-col items-center justify-center px-4 text-center">
                <h1 className="text-2xl font-bold text-white mb-4">Please log in to view your profile</h1>
                <Link href="/login" className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                    Login
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 pb-16 px-4">
            <div className="container mx-auto max-w-7xl">

                {/* Modern Header */}
                <div className="mb-12">
                    <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-6 border-b border-white/10">
                        {/* Profile Info & Mobile Logout */}
                        <div className="w-full md:w-auto flex items-center justify-between md:block">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h1 className="text-3xl md:text-4xl font-black text-white">{profile?.name || 'Creator'}</h1>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-black uppercase tracking-wider">
                                        {profile?.plan || 'FREE'}
                                    </span>
                                </div>
                                <p className="text-zinc-500 font-medium text-sm md:text-base">{user.email}</p>
                            </div>

                            {/* Mobile Logout Button */}
                            <button
                                onClick={handleLogout}
                                className="md:hidden p-3 rounded-2xl bg-zinc-900 border border-white/5 hover:bg-white/10 hover:border-white/20 text-zinc-400 hover:text-white transition-all group"
                                title="Sign Out"
                            >
                                <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            </button>
                        </div>

                        {/* Stats & Desktop Logout */}
                        <div className="w-full md:w-auto flex items-center gap-4">
                            <div className="flex-1 md:flex-none flex justify-between md:justify-start gap-4 md:gap-6 px-4 py-2 rounded-xl bg-white/5 border border-white/5 overflow-x-auto no-scrollbar">
                                <div className="text-center min-w-[50px]">
                                    <div className="text-base md:text-lg font-semibold text-white/80">{profile?.credits?.toLocaleString() ?? 0}</div>
                                    <div className="text-[9px] font-medium text-zinc-500 uppercase tracking-wider">Credits</div>
                                </div>
                                <div className="w-px bg-white/5" />
                                <div className="text-center min-w-[50px]">
                                    <div className="text-base md:text-lg font-semibold text-white/80">{videos.length}</div>
                                    <div className="text-[9px] font-medium text-zinc-500 uppercase tracking-wider">Videos</div>
                                </div>
                                <div className="w-px bg-white/5" />
                                <div className="text-center min-w-[50px]">
                                    <div className="text-base md:text-lg font-semibold text-white/80">{userImages.length}</div>
                                    <div className="text-[9px] font-medium text-zinc-500 uppercase tracking-wider">Images</div>
                                </div>
                                <div className="w-px bg-white/5" />
                                <div className="text-center min-w-[50px]">
                                    <div className="text-base md:text-lg font-semibold text-white/80">{masks.length}</div>
                                    <div className="text-[9px] font-medium text-zinc-500 uppercase tracking-wider">Masks</div>
                                </div>
                            </div>

                            {/* Desktop Logout Button */}
                            <button
                                onClick={handleLogout}
                                className="hidden md:block p-3 rounded-2xl bg-zinc-900 border border-white/5 hover:bg-white/10 hover:border-white/20 text-zinc-400 hover:text-white transition-all group"
                                title="Sign Out"
                            >
                                <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>

                <Tabs activeTab={activeTab} onTabChange={setActiveTab} />

                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="min-h-[400px]"
                >
                    {/* VIDEOS TAB */}
                    {activeTab === 'videos' && (
                        <div>
                            {isLoadingData ? (
                                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-zinc-500 animate-spin" /></div>
                            ) : videos.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {videos.map((video) => (
                                        <motion.div
                                            key={video.id}
                                            layoutId={`video-${video.id}`}
                                            className="group relative rounded-xl overflow-hidden bg-zinc-900 aspect-[9/16] cursor-pointer border border-transparent hover:border-orange-500/50 transition-colors"
                                            onClick={() => openLightbox(video, 'video')}
                                        >
                                            {video.video_url ? (
                                                <video
                                                    src={video.video_url}
                                                    className="w-full h-full object-contain bg-black pointer-events-none group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                                                    <Film className="w-8 h-8 text-zinc-600" />
                                                </div>
                                            )}
                                            {/* Overlay */}
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                                    <Maximize2 className="w-5 h-5 text-white" />
                                                </div>
                                            </div>
                                            {/* Metas */}
                                            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                                                <h3 className="text-white text-sm font-bold truncate">{video.title}</h3>
                                                <p className="text-zinc-400 text-[10px]">{new Date(video.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-zinc-900/20 rounded-2xl border border-white/5">
                                    <Film className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                                    <h3 className="text-white font-bold mb-2">No videos yet</h3>
                                    <p className="text-zinc-400 mb-6">Create your first viral video today</p>
                                    <Link href="/create-yours" className="text-orange-500 hover:text-orange-400 font-medium text-sm">Create Video →</Link>
                                </div>
                            )}
                        </div>
                    )}

                    {/* IMAGES TAB */}
                    {activeTab === 'images' && (
                        <div>
                            {isLoadingData ? (
                                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-zinc-500 animate-spin" /></div>
                            ) : userImages.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {userImages.map((img) => (
                                        <motion.div
                                            key={img.id}
                                            layoutId={`image-${img.id}`}
                                            className="group relative rounded-xl overflow-hidden bg-zinc-900 aspect-square cursor-pointer border border-transparent hover:border-purple-500/50 transition-colors"
                                            onClick={() => openLightbox(img, 'image')}
                                        >
                                            <img
                                                src={img.url}
                                                alt={img.prompt || 'Generated Image'}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                            {/* Overlay */}
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                                    <Maximize2 className="w-5 h-5 text-white" />
                                                </div>
                                            </div>
                                            {/* Meta */}
                                            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                                                <h3 className="text-white text-xs font-medium truncate">{img.prompt?.slice(0, 30) || 'Generated Image'}</h3>
                                                <p className="text-zinc-400 text-[10px]">{new Date(img.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-zinc-900/20 rounded-2xl border border-white/5">
                                    <ImageIcon className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                                    <h3 className="text-white font-bold mb-2">No images yet</h3>
                                    <p className="text-zinc-400 mb-6">Start generating amazing photos</p>
                                    <Link href="/create-image" className="text-purple-500 hover:text-purple-400 font-medium text-sm">Create Image →</Link>
                                </div>
                            )}
                        </div>
                    )}

                    {/* CREATE MASK MODAL */}
                    <AnimatePresence>
                        {showCreateMaskModal && tempMaskFile && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                                <motion.div
                                    initial={{ scale: 0.95, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.95, opacity: 0 }}
                                    className="bg-zinc-900 border border-white/10 rounded-xl w-full max-w-sm overflow-hidden shadow-2xl"
                                >
                                    <div className="p-4 border-b border-white/5 flex justify-between items-center">
                                        <h3 className="font-bold text-white">Create Mask</h3>
                                        <button onClick={() => { setShowCreateMaskModal(false); setTempMaskFile(null); }}><X className="w-4 h-4 text-zinc-500" /></button>
                                    </div>

                                    <div className="p-6 flex flex-col items-center gap-6">
                                        <div className="w-32 h-32 rounded-lg bg-zinc-800 border border-white/10 overflow-hidden relative">
                                            <img src={tempMaskFile.preview} className="w-full h-full object-contain" />
                                        </div>

                                        <p className="text-sm text-zinc-400 text-center">
                                            Is this image already transparent, or do you need to remove the background?
                                        </p>

                                        <div className="grid grid-cols-2 gap-3 w-full">
                                            <button
                                                onClick={() => handleProcessMask('skip')}
                                                disabled={isProcessingMask}
                                                className="py-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-sm transition-colors"
                                            >
                                                Skip Masking
                                            </button>
                                            <button
                                                onClick={() => handleProcessMask('process')}
                                                disabled={isProcessingMask}
                                                className="py-3 rounded-lg bg-white text-black hover:bg-zinc-200 font-bold text-sm transition-colors flex items-center justify-center gap-2"
                                            >
                                                {isProcessingMask ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Wand2 className="w-4 h-4" /> Remove BG</>}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>

                    {/* MASKS TAB */}
                    {activeTab === 'masks' && (
                        <div>
                            {isLoadingData ? (
                                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-zinc-500 animate-spin" /></div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                    {/* CREATE NEW MASK CARD */}
                                    <label className="group relative rounded-xl overflow-hidden bg-zinc-900 border border-dashed border-white/20 hover:border-white/50 cursor-pointer aspect-square flex flex-col items-center justify-center gap-2 transition-all hover:bg-zinc-800">
                                        <div className="w-10 h-10 rounded-full bg-white/5 group-hover:bg-white/10 flex items-center justify-center transition-colors">
                                            <Plus className="w-5 h-5 text-zinc-400 group-hover:text-white" />
                                        </div>
                                        <span className="text-xs font-medium text-zinc-500 group-hover:text-zinc-300">Create Mask</span>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleMaskUpload}
                                        />
                                    </label>

                                    {masks.map((mask) => (
                                        <div
                                            key={mask.id}
                                            className="group relative rounded-xl overflow-hidden bg-zinc-800 aspect-square border border-white/5 cursor-pointer"
                                            onClick={() => openLightbox(mask, 'mask')}
                                        >
                                            <div className="absolute inset-0 bg-[url('/transparent-bg.png')] opacity-20" />
                                            <img src={mask.url} alt={mask.name} className="relative w-full h-full object-contain p-2 group-hover:scale-110 transition-transform" />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* SAVED TAB */}
                    {activeTab === 'saved' && (
                        <div>
                            {isLoadingData ? (
                                <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-zinc-500 animate-spin" /></div>
                            ) : savedTemplates.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                    {savedTemplates.map((template, idx) => (
                                        <div key={template.id} className="transform scale-90 origin-top-left w-[110%]">
                                            <VideoCard video={template} index={idx} size="normal" />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-zinc-900/20 rounded-2xl border border-white/5">
                                    <Heart className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                                    <h3 className="text-white font-bold mb-2">No saved templates</h3>
                                    <p className="text-zinc-400 mb-6">Save templates you like to access them quickly.</p>
                                    <Link href="/videos" className="text-orange-500 hover:text-orange-400 font-medium text-sm">Browse Library →</Link>
                                </div>
                            )}
                        </div>
                    )}

                    {/* SUBSCRIPTION TAB */}
                    {activeTab === 'subscription' && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Current Plan Card */}
                                <div className="p-8 rounded-3xl bg-zinc-900/50 border border-white/5 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-32 bg-orange-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                                    <h3 className="text-lg font-bold text-white mb-6">Current Subscription</h3>

                                    <div className="space-y-6">
                                        <div>
                                            <p className="text-zinc-400 text-sm mb-1">Plan</p>
                                            <h2 className="text-3xl font-black text-white capitalize">{profile?.plan || 'Free'}</h2>
                                        </div>

                                        <div>
                                            <p className="text-zinc-400 text-sm mb-1">Status</p>
                                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${profile?.subscription_status === 'active' ? 'bg-green-500/10 text-green-500' :
                                                profile?.subscription_status === 'past_due' ? 'bg-red-500/10 text-red-500' :
                                                    'bg-zinc-800 text-zinc-400'
                                                }`}>
                                                <ShieldCheck className="w-3 h-3" />
                                                {profile?.subscription_status || 'Inactive'}
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-zinc-400 text-sm mb-1">Renewal Date</p>
                                            <div className="flex items-center gap-2 text-white">
                                                <Calendar className="w-4 h-4 text-zinc-500" />
                                                <span>
                                                    {profile?.subscription_period_end
                                                        ? new Date(profile.subscription_period_end).toLocaleDateString()
                                                        : 'N/A'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Detailed Status (Upcoming info from Stripe) */}
                                        {subscriptionDetails?.nextInvoice && (
                                            <div className="mt-4 pt-4 border-t border-white/5">
                                                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20">
                                                    <h4 className="flex items-center gap-2 text-blue-400 font-bold text-sm mb-2">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        Next Invoice
                                                    </h4>
                                                    <p className="text-zinc-300 text-xs leading-relaxed">
                                                        Amount: <span className="text-white font-bold text-base">{subscriptionDetails.nextInvoice.amount.toFixed(2)} {subscriptionDetails.nextInvoice.currency?.toUpperCase()}</span>
                                                        <br />
                                                        Date: <span className="text-white">{new Date(subscriptionDetails.nextInvoice.date).toLocaleDateString()}</span>
                                                    </p>
                                                    {subscriptionDetails.amount > subscriptionDetails.nextInvoice.amount && (
                                                        <p className="text-[10px] text-green-400 mt-2 font-medium">
                                                            * Includes credit/discount from recent plan change.
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Payment Method & Actions */}
                                <div className="p-8 rounded-3xl bg-zinc-900/50 border border-white/5">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-bold text-white">Manage Subscription</h3>
                                        <CreditCard className="w-5 h-5 text-zinc-400" />
                                    </div>

                                    <div className="flex items-center gap-4 mb-8 p-4 rounded-xl bg-black/40 border border-white/5">
                                        <div className="w-12 h-8 rounded bg-zinc-700 flex items-center justify-center">
                                            <div className="w-6 h-4 bg-white/20 rounded-sm" />
                                        </div>
                                        <div>
                                            <p className="text-white font-medium text-sm">Stripe Secure Payment</p>
                                            <p className="text-zinc-500 text-xs">Managed via Stripe</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <Link href="/pricing" className="block w-full py-3 rounded-lg bg-white text-black font-bold text-sm hover:bg-zinc-200 transition-colors text-center">
                                            {profile?.plan === 'free' ? 'Upgrade Plan' : 'Change Plan'}
                                        </Link>

                                        {profile?.subscription_status === 'active' && (
                                            <button
                                                onClick={async () => {
                                                    if (!confirm('Are you sure you want to request a cancellation? This will send a request to our support team.')) return;

                                                    try {
                                                        const res = await fetch('/api/subscription/cancel', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ reason: 'User requested via profile' })
                                                        });

                                                        if (res.ok) {
                                                            alert('Cancellation request sent. You will receive an email confirmation shortly.');
                                                        } else {
                                                            alert('Failed to send request. Please contact support.');
                                                        }
                                                    } catch (e) {
                                                        console.error(e);
                                                        alert('Error sending request.');
                                                    }
                                                }}
                                                className="w-full py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 font-bold text-sm hover:bg-red-500/20 transition-colors"
                                            >
                                                Cancel Subscription
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Transaction History */}
                            <div className="mt-8">
                                <TransactionHistory userId={user.id} />
                            </div>
                        </div>
                    )}

                    {/* SETTINGS TAB */}
                    {activeTab === 'settings' && (
                        <div className="max-w-2xl mx-auto">
                            <div className="p-8 rounded-3xl bg-zinc-900/50 border border-white/5">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                                        <Lock className="w-5 h-5 text-orange-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">Security</h3>
                                        <p className="text-zinc-500 text-sm">Manage your password and security settings</p>
                                    </div>
                                </div>

                                <form onSubmit={handleUpdatePassword} className="space-y-6">
                                    {passwordError && (
                                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                            {passwordError}
                                        </div>
                                    )}
                                    {passwordSuccess && (
                                        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4" />
                                            {passwordSuccess}
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs text-zinc-400 mb-2">New Password</label>
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 focus:border-orange-500/50 text-white placeholder:text-zinc-600 focus:outline-none transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs text-zinc-400 mb-2">Confirm New Password</label>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 focus:border-orange-500/50 text-white placeholder:text-zinc-600 focus:outline-none transition-all"
                                        />
                                    </div>

                                    <div className="pt-4 border-t border-white/5 flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={isUpdatingPassword || !newPassword || !confirmPassword}
                                            className="px-6 py-3 rounded-xl bg-white text-black font-bold text-sm hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            {isUpdatingPassword ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Updating...
                                                </>
                                            ) : (
                                                'Update Password'
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div >

            {/* Lightbox Portal */}
            <AnimatePresence>
                {
                    selectedItem && (
                        <MediaLightbox item={selectedItem} type={selectedType!} onClose={closeLightbox} onDelete={handleDeleteItem} />
                    )
                }
            </AnimatePresence >
        </div >
    );
}
