'use client';

import { useState, useEffect, useRef } from 'react';
import { getSectionContent, updateSectionContent } from '@/lib/db/content';
import { Button } from '@/components/ui/Button';
import { Loader2, Save, Upload, Video, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface MagicCard {
    mediaType: 'video' | 'image';
    mediaUrl: string;
    link: string;
    title: string;
    description: string;
}

interface MagicVideoConfig {
    livingBackgrounds: MagicCard;
    directorsCut: MagicCard;
    instantClips: MagicCard;
}

const defaultConfig: MagicVideoConfig = {
    livingBackgrounds: {
        mediaType: 'image',
        mediaUrl: '',
        link: '/magic-video/living-backgrounds',
        title: 'Living Backgrounds',
        description: 'Animate products with high-end motion'
    },
    directorsCut: {
        mediaType: 'image',
        mediaUrl: '',
        link: '/magic-video/directors-cut',
        title: "Director's Cut",
        description: 'Professional scene-to-scene transitions'
    },
    instantClips: {
        mediaType: 'image',
        mediaUrl: '',
        link: '/magic-video/instant-clips',
        title: 'Instant Product Clips',
        description: 'Magic is cooking...'
    }
};

export function MagicVideoManager() {
    const [config, setConfig] = useState<MagicVideoConfig>(defaultConfig);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState<string | null>(null); // key of the card being uploaded
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadTargetKey, setUploadTargetKey] = useState<keyof MagicVideoConfig | null>(null);

    useEffect(() => {
        loadContent();
    }, []);

    const loadContent = async () => {
        setLoading(true);
        try {
            const data = await getSectionContent('magic_video_hub');
            if (data) {
                setConfig(prev => ({ ...prev, ...data }));
            }
        } catch (error) {
            console.error('Failed to load magic video config:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateSectionContent('magic_video_hub', config);
            alert('Magic Video config saved!');
        } catch (error) {
            console.error('Failed to save:', error);
            alert('Failed to save config');
        } finally {
            setSaving(false);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || !event.target.files[0] || !uploadTargetKey) return;

        const file = event.target.files[0];
        const key = uploadTargetKey;
        setUploading(key);

        try {
            const bucketName = 'videos';
            const fileExt = file.name.split('.').pop();
            const fileName = `magic-video/${key}-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(fileName);

            const isVideo = file.type.startsWith('video/');

            setConfig(prev => ({
                ...prev,
                [key]: {
                    ...prev[key],
                    mediaUrl: publicUrl,
                    mediaType: isVideo ? 'video' : 'image'
                }
            }));

        } catch (error: any) {
            console.error('Upload failed:', error);
            alert('Upload failed: ' + error.message);
        } finally {
            setUploading(null);
            setUploadTargetKey(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const triggerUpload = (key: keyof MagicVideoConfig) => {
        setUploadTargetKey(key);
        fileInputRef.current?.click();
    };

    const renderCard = (key: keyof MagicVideoConfig, title: string) => {
        const card = config[key];
        return (
            <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-800 space-y-4">
                <div className="flex justify-between items-start">
                    <h3 className="font-bold text-white uppercase text-sm tracking-wider">{title}</h3>
                    <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-1 rounded">{card.mediaType}</span>
                </div>

                <div className="space-y-2">
                    <div
                        className="aspect-video bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 relative group cursor-pointer hover:border-orange-500/50 transition-colors"
                        onClick={() => triggerUpload(key)}
                    >
                        {card.mediaUrl ? (
                            card.mediaType === 'video' ? (
                                <video
                                    src={card.mediaUrl}
                                    className="w-full h-full object-cover"
                                    autoPlay muted loop playsInline
                                />
                            ) : (
                                <img src={card.mediaUrl} alt={title} className="w-full h-full object-cover" />
                            )
                        ) : (
                            <div className="flex items-center justify-center h-full text-zinc-700">
                                {uploading === key ? <Loader2 className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
                            </div>
                        )}

                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            {uploading === key ? (
                                <Loader2 className="w-6 h-6 animate-spin text-white" />
                            ) : (
                                <div className="text-center">
                                    <Upload className="w-6 h-6 text-white mx-auto mb-1" />
                                    <span className="text-[10px] text-white font-medium">Upload Media</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <p className="text-[10px] text-zinc-500 text-center">
                        Click to upload Image or Video (auto-detect)
                    </p>
                </div>

                <div className="space-y-3 pt-2">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Card Title</label>
                        <input
                            type="text"
                            value={card.title || ''}
                            onChange={(e) => setConfig(prev => ({
                                ...prev,
                                [key]: { ...prev[key], title: e.target.value }
                            }))}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-colors"
                            placeholder="Enter card title..."
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Description / Text</label>
                        <textarea
                            value={card.description || ''}
                            onChange={(e) => setConfig(prev => ({
                                ...prev,
                                [key]: { ...prev[key], description: e.target.value }
                            }))}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-colors h-20 resize-none"
                            placeholder="Enter card description..."
                        />
                    </div>
                </div>
            </div>
        );
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="bg-zinc-900/50 p-6 rounded-xl border border-white/5 space-y-6">
            <div className="flex justify-between items-center pb-6 border-b border-white/5">
                <h2 className="text-xl font-bold text-white">✨ Magic Video Hub Manager</h2>
                <Button onClick={handleSave} disabled={saving} className="bg-orange-500 text-white hover:bg-orange-600">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Config
                </Button>
            </div>

            <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top Wide */}
                <div className="md:col-span-2">
                    {renderCard('livingBackgrounds', 'Living Backgrounds (Top Card)')}
                </div>

                {/* Left */}
                <div className="col-span-1">
                    {renderCard('directorsCut', "Director's Cut (Bottom Left)")}
                </div>

                {/* Right */}
                <div className="col-span-1">
                    {renderCard('instantClips', 'Instant Product Clips (Bottom Right)')}
                </div>
            </div>
        </div>
    );
}
