'use client';

import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Template, getSavedTemplates, toggleSavedTemplate } from '@/lib/db/videos';
import { useAuth } from '@/lib/auth/AuthContext';
import { Heart, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

export default function ExplorePage() {
    const { user } = useAuth();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [savedIds, setSavedIds] = useState<number[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

    useEffect(() => {
        async function fetchData() {
            if (!isSupabaseConfigured) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('templates')
                    .select('*')
                    .eq('is_explore', true)
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('Supabase error fetching templates:', error);
                    throw error;
                }

                console.log(`Fetched ${data?.length || 0} explore templates`);
                setTemplates(data || []);

                if (user) {
                    const ids = await getSavedTemplates(user.id);
                    setSavedIds(ids);
                }
            } catch (err: any) {
                console.error('Error fetching explore data:', err);
                setTemplates([]);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [user]);

    const handleLike = async (templateId: number) => {
        if (!user) {
            alert('Please log in to save templates!');
            return;
        }

        const isSaved = await toggleSavedTemplate(user.id, templateId);
        if (isSaved) {
            setSavedIds([...savedIds, templateId]);
        } else {
            setSavedIds(savedIds.filter(id => id !== templateId));
        }
    };

    return (
        <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-[1800px] mx-auto">

                {loading ? (
                    <div className="h-96 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-[280px] grid-flow-dense">
                        {templates.map((template) => {
                            const gridCols = template.explore_grid_cols || 1;
                            const gridRows = template.explore_grid_rows || 1;
                            const isSaved = savedIds.includes(template.id);

                            return (
                                <motion.div
                                    key={template.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    onClick={() => setSelectedTemplate(template)}
                                    className={`relative group rounded-[2.5rem] overflow-hidden bg-zinc-900/50 border border-white/10 hover:border-cyan-500/30 transition-all duration-500 cursor-pointer ${gridCols === 2 ? 'sm:col-span-2' : ''
                                        } ${gridRows === 2 ? 'row-span-2' : ''
                                        }`}
                                >
                                    {/* Split Screen Media */}
                                    <div className="absolute inset-0 flex">
                                        {/* Before (Left Half) */}
                                        <div className="w-1/2 h-full relative border-r border-white/20">
                                            {template.before_video_url ? (
                                                <video
                                                    src={template.before_video_url}
                                                    className="w-full h-full object-cover"
                                                    autoPlay
                                                    loop
                                                    muted
                                                    playsInline
                                                />
                                            ) : template.before_image_url ? (
                                                <Image
                                                    src={template.before_image_url}
                                                    alt="Before"
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : null}
                                            <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 rounded text-[9px] font-bold text-white uppercase backdrop-blur-md">
                                                Original
                                            </div>
                                        </div>

                                        {/* After (Right Half) */}
                                        <div className="w-1/2 h-full relative">
                                            {template.after_video_url ? (
                                                <video
                                                    src={template.after_video_url}
                                                    className="w-full h-full object-cover"
                                                    autoPlay
                                                    loop
                                                    muted
                                                    playsInline
                                                />
                                            ) : template.after_image_url ? (
                                                <Image
                                                    src={template.after_image_url}
                                                    alt="After"
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : null}
                                            <div className="absolute bottom-3 right-3 px-2 py-1 bg-orange-500 rounded text-[9px] font-bold text-white uppercase shadow-lg">
                                                Generated
                                            </div>
                                        </div>
                                    </div>

                                    {/* Gradient Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent pointer-events-none" />

                                    {/* Content Footer */}
                                    <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
                                        <h3 className="text-lg font-black text-white uppercase tracking-tighter line-clamp-1 mb-1 group-hover:text-cyan-500 transition-colors">
                                            {template.title}
                                        </h3>
                                        <p className="text-zinc-400 text-xs font-medium line-clamp-2 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                                            {template.description}
                                        </p>
                                    </div>

                                    {/* Highlight Border Effect */}
                                    <div className="absolute inset-0 border-2 border-cyan-500 opacity-0 group-hover:opacity-10 transition-opacity duration-700 pointer-events-none" />
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal */}
            <AnimatePresence>
                {selectedTemplate && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
                        onClick={() => setSelectedTemplate(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="relative w-full max-w-6xl bg-transparent rounded-3xl overflow-hidden border-none shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                                {/* Left: Media */}
                                <div className="relative aspect-video lg:aspect-auto lg:min-h-[600px] bg-black">
                                    <div className="absolute inset-0 flex">
                                        {/* Before (Left Half) */}
                                        <div className="w-1/2 h-full relative border-r border-white/20">
                                            {selectedTemplate.before_video_url ? (
                                                <video
                                                    src={selectedTemplate.before_video_url}
                                                    className="w-full h-full object-contain"
                                                    autoPlay
                                                    loop
                                                    muted
                                                    playsInline
                                                />
                                            ) : selectedTemplate.before_image_url ? (
                                                <Image
                                                    src={selectedTemplate.before_image_url}
                                                    alt="Before"
                                                    fill
                                                    className="object-contain"
                                                />
                                            ) : null}
                                            <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/70 rounded-lg text-xs font-bold text-white uppercase backdrop-blur-md">
                                                Original
                                            </div>
                                        </div>

                                        {/* After (Right Half) */}
                                        <div className="w-1/2 h-full relative">
                                            {selectedTemplate.after_video_url ? (
                                                <video
                                                    src={selectedTemplate.after_video_url}
                                                    className="w-full h-full object-contain"
                                                    autoPlay
                                                    loop
                                                    muted
                                                    playsInline
                                                />
                                            ) : selectedTemplate.after_image_url ? (
                                                <Image
                                                    src={selectedTemplate.after_image_url}
                                                    alt="After"
                                                    fill
                                                    className="object-contain"
                                                />
                                            ) : null}
                                            <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-orange-500 rounded-lg text-xs font-bold text-white uppercase shadow-lg">
                                                Generated
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Details */}
                                <div className="p-8 lg:p-12 flex flex-col gap-6 overflow-y-auto max-h-[600px] bg-zinc-900/95 backdrop-blur-xl">
                                    {/* Title */}
                                    <h2 className="text-4xl lg:text-5xl font-black text-white uppercase tracking-tighter leading-none">
                                        {selectedTemplate.title}
                                    </h2>

                                    {/* Description */}
                                    {selectedTemplate.description && (
                                        <div className="space-y-2">
                                            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Description</h3>
                                            <p className="text-zinc-300 text-base leading-relaxed">
                                                {selectedTemplate.description}
                                            </p>
                                        </div>
                                    )}

                                    {/* Additional Info */}
                                    <div className="space-y-4 pt-4 border-t border-white/10">
                                        {selectedTemplate.duration && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Duration</span>
                                                <span className="text-white font-medium">{selectedTemplate.duration}s</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
