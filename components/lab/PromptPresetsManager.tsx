'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import {
    Loader2,
    Plus,
    Trash2,
    Edit2,
    Save,
    X,
    Check,
    Sparkles,
    Upload,
    Video
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PromptPreset {
    id: string;
    category: string;
    name: string;
    description: string | null;
    prompt_template: string;
    is_default: boolean;
    created_at: string;
    preview_video_url?: string | null;
}

export function PromptPresetsManager() {
    const [presets, setPresets] = useState<PromptPreset[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<PromptPreset>>({
        category: 'living_background',
        name: '',
        description: '',
        prompt_template: '',
        is_default: false,
        preview_video_url: null
    });
    const [uploadingVideo, setUploadingVideo] = useState(false);

    const categories = ['living_background', 'transition'];

    useEffect(() => {
        fetchPresets();
    }, []);

    const fetchPresets = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('prompt_presets')
            .select('*')
            .order('created_at', { ascending: true });

        if (!error && data) {
            setPresets(data);
        }
        setLoading(false);
    };

    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!formData.name || !formData.prompt_template) {
            alert('Please fill in both Name and Prompt Template');
            return;
        }

        setSaving(true);
        try {
            if (editingId) {
                const { error } = await supabase
                    .from('prompt_presets')
                    .update({
                        category: formData.category,
                        name: formData.name,
                        description: formData.description,
                        prompt_template: formData.prompt_template,
                        is_default: formData.is_default,
                        preview_video_url: formData.preview_video_url
                    })
                    .eq('id', editingId);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('prompt_presets')
                    .insert([{
                        category: formData.category,
                        name: formData.name,
                        description: formData.description,
                        prompt_template: formData.prompt_template,
                        is_default: formData.is_default,
                        preview_video_url: formData.preview_video_url
                    }]);

                if (error) throw error;
            }

            setEditingId(null);
            setIsCreating(false);
            setFormData({
                category: 'living_background',
                name: '',
                description: '',
                prompt_template: '',
                is_default: false,
                preview_video_url: null
            });
            fetchPresets();
        } catch (error: any) {
            console.error('Error saving preset:', error);
            alert(`Failed to save preset: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this preset?')) return;

        try {
            const { error } = await supabase
                .from('prompt_presets')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchPresets();
        } catch (error) {
            console.error('Error deleting preset:', error);
            alert('Failed to delete preset.');
        }
    };

    const startEdit = (preset: PromptPreset) => {
        setEditingId(preset.id);
        setFormData({
            category: preset.category,
            name: preset.name,
            description: preset.description,
            prompt_template: preset.prompt_template,
            is_default: preset.is_default
        });
        setIsCreating(false);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setIsCreating(false);
        setFormData({
            category: 'living_background',
            name: '',
            description: '',
            prompt_template: '',
            is_default: false,
            preview_video_url: null
        });
    };

    const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingVideo(true);
        try {
            const fileName = `presets/${Date.now()}_${file.name.replace(/\s/g, '_')}`;
            const { error: uploadError } = await supabase.storage
                .from('videos')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('videos')
                .getPublicUrl(fileName);

            setFormData(prev => ({ ...prev, preview_video_url: publicUrl }));
        } catch (error) {
            console.error('Error uploading video:', error);
            alert('Failed to upload video');
        } finally {
            setUploadingVideo(false);
        }
    };

    return (
        <div className="w-full bg-zinc-900 border border-white/10 rounded-xl overflow-hidden flex flex-col h-[800px]">
            <div className="bg-zinc-950 p-6 border-b border-white/10 flex justify-between items-center shrink-0">
                <div>
                    <h2 className="text-xl font-bold text-white mb-1">Prompt Presets</h2>
                    <p className="text-zinc-500 text-sm">Manage predefined prompts for Living Backgrounds & Transitions</p>
                </div>
                <Button
                    onClick={() => { setIsCreating(true); setEditingId(null); setFormData({ category: 'living_background', name: '', description: '', prompt_template: '', is_default: false, preview_video_url: null }); }}
                    className="bg-white text-black hover:bg-zinc-200"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    New Preset
                </Button>
            </div>

            <div className="flex-1 overflow-hidden flex">
                {/* List */}
                <div className="w-1/3 border-r border-white/10 overflow-y-auto custom-scrollbar bg-black/20">
                    {loading ? (
                        <div className="flex items-center justify-center p-8 text-zinc-500">
                            <Loader2 className="w-6 h-6 animate-spin" />
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {presets.map(preset => (
                                <button
                                    key={preset.id}
                                    onClick={() => startEdit(preset)}
                                    className={`p-4 text-left border-b border-white/5 hover:bg-white/5 transition-colors ${editingId === preset.id ? 'bg-white/10 border-l-4 border-l-orange-500' : ''}`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-bold text-sm text-white">{preset.name}</span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase tracking-wider">{preset.category === 'living_background' ? 'Living' : 'Trans'}</span>
                                    </div>
                                    <div className="text-xs text-zinc-500 line-clamp-2">{preset.description || 'No description'}</div>
                                    {preset.preview_video_url && (
                                        <div className="mt-2 rounded-md overflow-hidden bg-black aspect-video relative group/video">
                                            <video src={preset.preview_video_url} className="w-full h-full object-cover" muted loop onMouseOver={e => e.currentTarget.play()} onMouseOut={e => e.currentTarget.pause()} />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Editor */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-900/50 p-8">
                    {(isCreating || editingId) ? (
                        <div className="max-w-2xl mx-auto space-y-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-white">{isCreating ? 'Create New Preset' : 'Edit Preset'}</h3>
                                {editingId && (
                                    <button onClick={() => handleDelete(editingId)} className="text-red-500 hover:text-red-400 text-sm flex items-center gap-1">
                                        <Trash2 className="w-4 h-4" /> Delete
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-500 uppercase">Label</label>
                                    <input
                                        value={formData.name || ''}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-zinc-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-orange-500"
                                        placeholder="e.g. Nature (Wind)"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-500 uppercase">Category</label>
                                    <select
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full bg-zinc-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-orange-500 appearance-none"
                                    >
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase">Short Description (UI)</label>
                                <input
                                    value={formData.description || ''}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full bg-zinc-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-orange-500"
                                    placeholder="e.g. Soft wind rustling through leaves..."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase">Preview Video</label>
                                <div className="border border-white/10 rounded-lg p-4 bg-zinc-950">
                                    {formData.preview_video_url ? (
                                        <div className="relative aspect-video bg-black rounded-lg overflow-hidden group">
                                            <video src={formData.preview_video_url} className="w-full h-full object-cover" controls />
                                            <button
                                                onClick={() => setFormData({ ...formData, preview_video_url: null })}
                                                className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-8 text-zinc-500 border-2 border-dashed border-white/10 rounded-lg hover:border-white/20 transition-colors relative cursor-pointer">
                                            {uploadingVideo ? (
                                                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                            ) : (
                                                <>
                                                    <Upload className="w-8 h-8 mb-2" />
                                                    <span className="text-sm">Click to upload video</span>
                                                </>
                                            )}
                                            <input
                                                type="file"
                                                accept="video/*"
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                onChange={handleVideoUpload}
                                                disabled={uploadingVideo}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase">Full Prompt Template</label>
                                <textarea
                                    value={formData.prompt_template}
                                    onChange={e => setFormData({ ...formData, prompt_template: e.target.value })}
                                    className="w-full h-64 bg-zinc-950 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-orange-500 font-mono resize-none leading-relaxed"
                                    placeholder="The full prompt text to be injected..."
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button variant="ghost" onClick={cancelEdit}>Cancel</Button>
                                <Button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="bg-white text-black hover:bg-zinc-200 w-32 disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                    {saving ? 'Saving...' : 'Save'}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                            <Sparkles className="w-12 h-12 mb-4 opacity-20" />
                            <p>Select a preset to edit or create a new one</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
