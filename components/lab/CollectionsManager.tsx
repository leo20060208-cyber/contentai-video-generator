'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Plus, Trash2, LayoutGrid, Image as ImageIcon, Video, X, Check, Upload, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Template } from '@/lib/db/videos';

interface Collection {
    id: string;
    title: string;
    description: string;
    type: 'video' | 'image';
    cover_url: string;
    created_at: string;
    item_count?: number; // Joined count
}

export function CollectionsManager() {
    const [collections, setCollections] = useState<Collection[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Create Modal State
    const [newTitle, setNewTitle] = useState('');
    const [newType, setNewType] = useState<'video' | 'image'>('video');
    const [availableTemplates, setAvailableTemplates] = useState<Template[]>([]);
    const [selectedTemplates, setSelectedTemplates] = useState<number[]>([]);
    const [selectedCoverId, setSelectedCoverId] = useState<number | null>(null);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchCollections();
    }, []);

    useEffect(() => {
        if (isCreateModalOpen) {
            fetchTemplatesForSelection();
        }
    }, [isCreateModalOpen, newType]);

    // Reset cover when type changes or templates change
    useEffect(() => {
        if (selectedTemplates.length > 0 && !selectedCoverId) {
            // Default to first selected
            setSelectedCoverId(selectedTemplates[0]);
        }
    }, [selectedTemplates, selectedCoverId]);

    async function fetchCollections() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('collections')
                .select('*, collection_items(count)')
                .order('created_at', { ascending: false });

            if (!error && data) {
                setCollections(data.map(c => ({
                    ...c,
                    item_count: c.collection_items?.[0]?.count || 0
                })));
            }
        } catch (e) {
            console.error('Failed to fetch collections:', e);
        } finally {
            setLoading(false);
        }
    }

    async function fetchTemplatesForSelection() {
        // Fetch templates of the selected type
        const { data } = await supabase
            .from('templates')
            .select('*')
            // Simple filter: if type is 'video', show all except strictly images. If 'image', show strictly images.
            // Adjust based on your actual data structure. Assuming 'type' column or inferred from URLs.
            // For now, let's fetch all and filter in JS if needed, or rely on a type column if it exists and is reliable.
            .order('id', { ascending: false });

        if (data) {
            const filtered = data.filter(t => {
                const isImage = t.type === 'image' || (!t.type && !t.after_video_url && t.after_image_url);
                return newType === 'image' ? isImage : !isImage;
            });
            setAvailableTemplates(filtered);
        }
    }

    const [editingCollection, setEditingCollection] = useState<Collection | null>(null);

    async function handleEdit(collection: Collection) {
        setEditingCollection(collection);
        setNewTitle(collection.title);
        setNewType(collection.type);

        // Fetch current items for this collection
        const { data } = await supabase
            .from('collection_items')
            .select('template_id')
            .eq('collection_id', collection.id);

        if (data) {
            setSelectedTemplates(data.map(item => item.template_id));
        }

        setIsCreateModalOpen(true);
    }

    async function handleSave() {
        if (!newTitle) return;
        setCreating(true);

        // Find cover URL from selected ID or default to first selected
        const coverTemplateId = selectedCoverId || selectedTemplates[0];
        const coverTemplate = availableTemplates.find(t => t.id === coverTemplateId);
        const coverUrl = coverTemplate?.after_image_url || coverTemplate?.before_image_url || '';

        let collectionId = editingCollection?.id;

        if (editingCollection) {
            // Update Existing
            await supabase
                .from('collections')
                .update({
                    title: newTitle,
                    type: newType,
                    cover_url: coverUrl || editingCollection.cover_url
                })
                .eq('id', editingCollection.id);

            // Clear existing items to re-insert in new order
            await supabase.from('collection_items').delete().eq('collection_id', editingCollection.id);
        } else {
            // Create New
            const { data: collection, error } = await supabase
                .from('collections')
                .insert([{
                    title: newTitle,
                    type: newType,
                    cover_url: coverUrl,
                    user_id: (await supabase.auth.getUser()).data.user?.id
                }])
                .select()
                .single();

            if (error || !collection) {
                console.error('Error creating collection:', error);
                setCreating(false);
                return;
            }
            collectionId = collection.id;
        }

        // 2. Add Items
        if (selectedTemplates.length > 0 && collectionId) {
            const items = selectedTemplates.map((tid, index) => ({
                collection_id: collectionId,
                template_id: tid,
                order_index: index
            }));

            const { error: itemsError } = await supabase
                .from('collection_items')
                .insert(items);

            if (itemsError) console.error('Error adding items:', itemsError);
        }

        setIsCreateModalOpen(false);
        setEditingCollection(null);
        setNewTitle('');
        setSelectedTemplates([]);
        setSelectedCoverId(null);
        setCreating(false);
        fetchCollections();
    }

    async function handleDelete(id: string) {
        if (!confirm('Delete this collection?')) return;
        await supabase.from('collections').delete().eq('id', id);
        setCollections(prev => prev.filter(c => c.id !== id));
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <LayoutGrid className="w-5 h-5 text-purple-400" />
                    Collections
                </h2>
                <button
                    onClick={() => {
                        setEditingCollection(null);
                        setNewTitle('');
                        setSelectedTemplates([]);
                        setIsCreateModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium text-sm"
                >
                    <Plus className="w-4 h-4" /> New Collection
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin text-zinc-500" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {collections.map(c => (
                        <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 group hover:border-zinc-700 transition-colors">
                            <div className="flex justify-between items-start mb-3">
                                <div className={`p-2 rounded-md ${c.type === 'video' ? 'bg-blue-500/10 text-blue-400' : 'bg-pink-500/10 text-pink-400'}`}>
                                    {c.type === 'video' ? <Video className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(c)} className="text-zinc-600 hover:text-white transition-colors pb-2 pl-2">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(c.id)} className="text-zinc-600 hover:text-red-400 Transition-colors pb-2 pl-2">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <h3 className="text-white font-medium truncate">{c.title}</h3>
                            <p className="text-zinc-500 text-xs mt-1">{c.item_count} items</p>

                            {/* Preview of Cover */}
                            {c.cover_url && (
                                <div className="mt-3 aspect-video rounded-md overflow-hidden relative bg-black/50">
                                    <img src={c.cover_url} alt="Cover" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                </div>
                            )}
                        </div>
                    ))}
                    {collections.length === 0 && (
                        <div className="col-span-full text-center py-12 text-zinc-600">
                            No collections found. Create one to organize templates.
                        </div>
                    )}
                </div>
            )}

            {/* Create Modal */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                        onClick={() => {
                            setIsCreateModalOpen(false);
                            setEditingCollection(null);
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
                        >
                            <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-white">
                                    {editingCollection ? 'Edit Collection' : 'New Collection'}
                                </h3>
                                <button onClick={() => {
                                    setIsCreateModalOpen(false);
                                    setEditingCollection(null);
                                }}><X className="text-zinc-500 hover:text-white" /></button>
                            </div>

                            <div className="p-6 overflow-y-auto flex-1 space-y-6">
                                {/* Title & Type */}
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-2 space-y-1">
                                        <label className="text-xs font-semibold text-zinc-400 uppercase">Title</label>
                                        <input
                                            type="text"
                                            value={newTitle}
                                            onChange={e => setNewTitle(e.target.value)}
                                            placeholder="e.g. Summer Vibes 2024"
                                            className="w-full bg-black/20 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-semibold text-zinc-400 uppercase">Type</label>
                                        <div className="flex bg-black/20 rounded-lg p-1 border border-zinc-700">
                                            <button
                                                onClick={() => setNewType('video')}
                                                className={`flex-1 flex items-center justify-center py-1.5 rounded-md text-xs font-medium transition-colors ${newType === 'video' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                            >
                                                Video
                                            </button>
                                            <button
                                                onClick={() => setNewType('image')}
                                                className={`flex-1 flex items-center justify-center py-1.5 rounded-md text-xs font-medium transition-colors ${newType === 'image' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                            >
                                                Image
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Template Selection */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-semibold text-zinc-400 uppercase">Select Templates ({selectedTemplates.length})</label>
                                        <span className="text-xs text-zinc-600">Click to select order</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        {availableTemplates.map(t => {
                                            const isSelected = selectedTemplates.includes(t.id);
                                            const selectedIndex = selectedTemplates.indexOf(t.id);
                                            const isCover = selectedCoverId === t.id;

                                            // Determine correct image to show
                                            const img = t.after_image_url || t.before_image_url || t.product_image_url || '';

                                            return (
                                                <div
                                                    key={t.id}
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            setSelectedTemplates(prev => prev.filter(id => id !== t.id));
                                                            if (isCover) setSelectedCoverId(null);
                                                        } else {
                                                            setSelectedTemplates(prev => [...prev, t.id]);
                                                            if (!selectedCoverId) setSelectedCoverId(t.id);
                                                        }
                                                    }}
                                                    className={`
                                                        relative aspect-video rounded-lg overflow-hidden cursor-pointer group border-2 transition-all
                                                        ${isSelected ? 'border-purple-500 opacity-100 ring-2 ring-purple-500/20' : 'border-transparent opacity-60 hover:opacity-100 hover:border-zinc-600'}
                                                    `}
                                                >
                                                    {img ? (
                                                        <img src={img} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-600 text-xs">No img</div>
                                                    )}

                                                    {/* Selection Indicator */}
                                                    <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-lg ${isSelected ? 'bg-purple-500 text-white' : 'bg-black/50 text-white/50'}`}>
                                                        {isSelected ? selectedIndex + 1 : <Plus className="w-3 h-3" />}
                                                    </div>

                                                    {/* Cover Toggle Button (Only if selected) */}
                                                    {isSelected && (
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedCoverId(t.id);
                                                            }}
                                                            className={`absolute top-2 left-2 px-2 py-1 rounded bg-black/60 backdrop-blur-md text-[9px] font-bold uppercase tracking-wider border transition-colors hover:bg-white hover:text-black
                                                                ${isCover ? 'text-green-400 border-green-500/50' : 'text-zinc-400 border-white/10'}
                                                            `}
                                                            title="Set as Collection Cover"
                                                        >
                                                            {isCover ? 'Cover' : 'Set Cover'}
                                                        </div>
                                                    )}

                                                    {/* Title Overlay */}
                                                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                                                        <p className="text-[10px] text-white truncate">{t.title}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setIsCreateModalOpen(false);
                                        setEditingCollection(null);
                                    }}
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={!newTitle || selectedTemplates.length === 0 || creating}
                                    className="px-6 py-2 rounded-lg text-sm font-bold bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {editingCollection ? 'Save Changes' : 'Create Collection'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
