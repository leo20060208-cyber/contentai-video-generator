'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Template } from '@/lib/db/videos';
import { Upload, X, Loader2, Video, Image as ImageIcon, Plus } from 'lucide-react';

interface LibraryItemManagerProps {
    onSuccess?: () => void;
}

export default function LibraryItemManager({ onSuccess }: LibraryItemManagerProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('VIDEO');
    const [libraryType, setLibraryType] = useState<Template['library_type']>('video');
    const [gridCols, setGridCols] = useState(1);
    const [gridRows, setGridRows] = useState(1);

    const [beforeFile, setBeforeFile] = useState<File | null>(null);
    const [afterFile, setAfterFile] = useState<File | null>(null);
    const [beforeUrl, setBeforeUrl] = useState('');
    const [afterUrl, setAfterUrl] = useState('');

    const [loading, setLoading] = useState(false);

    const uploadFile = async (file: File) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `library/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('images')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('images')
            .getPublicUrl(filePath);

        return publicUrl;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Check if user is authenticated BEFORE attempting insert
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            console.log('🔐 Auth check before insert:', {
                user: user?.email || 'Not authenticated',
                userId: user?.id || 'No user ID',
                authError: authError?.message || 'No auth error'
            });

            if (!user) {
                throw new Error('You must be logged in to create library items');
            }

            let finalBeforeUrl = beforeUrl;
            let finalAfterUrl = afterUrl;

            if (beforeFile) finalBeforeUrl = await uploadFile(beforeFile);
            if (afterFile) finalAfterUrl = await uploadFile(afterFile);

            console.log('📝 Attempting to insert template with data:', {
                title,
                library_type: libraryType,
                is_explore: true,
                userId: user.id,
                userEmail: user.email
            });

            const { error } = await supabase.from('templates').insert([{
                title,
                description,
                category,
                library_type: libraryType,
                is_explore: true,
                explore_grid_cols: gridCols,
                explore_grid_rows: gridRows,
                before_video_url: libraryType !== 'image' ? finalBeforeUrl : null,
                after_video_url: libraryType !== 'image' ? finalAfterUrl : null,
                before_image_url: finalBeforeUrl,
                after_image_url: finalAfterUrl,
                views_count: '0',
                is_trending: false
            }]);

            if (error) {
                console.error('❌ Supabase insert error:', {
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code
                });
                throw error;
            }

            console.log('✅ Template created successfully!');
            setTitle('');
            setDescription('');
            setBeforeFile(null);
            setAfterFile(null);
            setBeforeUrl('');
            setAfterUrl('');
            alert('Library item created successfully!');
            onSuccess?.();

        } catch (err: any) {
            console.error('Error creating library item:', {
                error: err,
                message: err.message,
                details: err.details,
                hint: err.hint
            });
            alert('Failed to create library item: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white/5 p-6 rounded-2xl border border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50"
                            placeholder="Epic Transformation"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50 h-24 resize-none"
                            placeholder="Watch this amazing AI transition..."
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Type</label>
                            <select
                                value={libraryType}
                                onChange={(e) => setLibraryType(e.target.value as any)}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50"
                            >
                                <option value="video">Video</option>
                                <option value="image">Image</option>
                                <option value="live_background">Live BG</option>
                                <option value="image_to_video">Image to Video</option>
                                <option value="motion_control">Motion Control</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Category</label>
                            <input
                                type="text"
                                value={category}
                                onChange={(e) => setCategory(e.target.value.toUpperCase())}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500/50"
                                placeholder="VIDEO"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Grid Size</label>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { label: 'Small (1x1)', c: 1, r: 1 },
                                { label: 'Wide (2x1)', c: 2, r: 1 },
                                { label: 'Tall (1x2)', c: 1, r: 2 },
                                { label: 'Large (2x2)', c: 2, r: 2 },
                            ].map((size) => (
                                <button
                                    key={size.label}
                                    type="button"
                                    onClick={() => { setGridCols(size.c); setGridRows(size.r); }}
                                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${gridCols === size.c && gridRows === size.r
                                        ? 'bg-cyan-500 border-cyan-500 text-black'
                                        : 'bg-black/50 border-white/10 text-zinc-500 hover:text-white'
                                        }`}
                                >
                                    {size.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Before Media</label>
                            <div className="relative aspect-video bg-black/50 rounded-lg border-2 border-dashed border-white/10 flex flex-col items-center justify-center p-4 hover:border-cyan-500/50 transition-colors group cursor-pointer">
                                <input
                                    type="file"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={(e) => setBeforeFile(e.target.files?.[0] || null)}
                                />
                                {beforeFile ? (
                                    <div className="text-center">
                                        <div className="text-[10px] text-cyan-500 font-bold mb-1 truncate max-w-[120px]">{beforeFile.name}</div>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); setBeforeFile(null); }}
                                            className="text-[10px] text-red-500 hover:underline"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <Plus className="w-5 h-5 text-zinc-600 mb-2 group-hover:text-cyan-500" />
                                        <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Upload Before</span>
                                    </>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">After Media</label>
                            <div className="relative aspect-video bg-black/50 rounded-lg border-2 border-dashed border-white/10 flex flex-col items-center justify-center p-4 hover:border-cyan-500/50 transition-colors group cursor-pointer">
                                <input
                                    type="file"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={(e) => setAfterFile(e.target.files?.[0] || null)}
                                />
                                {afterFile ? (
                                    <div className="text-center">
                                        <div className="text-[10px] text-cyan-500 font-bold mb-1 truncate max-w-[120px]">{afterFile.name}</div>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); setAfterFile(null); }}
                                            className="text-[10px] text-red-500 hover:underline"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <Plus className="w-5 h-5 text-zinc-600 mb-2 group-hover:text-cyan-500" />
                                        <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Upload After</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex justify-end">
                <button
                    type="submit"
                    disabled={loading || (!beforeFile && !beforeUrl) || (!afterFile && !afterUrl)}
                    className="flex items-center gap-2 px-8 py-3 bg-cyan-500 text-black font-black uppercase tracking-widest text-xs rounded-xl hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Create Library Item
                </button>
            </div>
        </form>
    );
}
