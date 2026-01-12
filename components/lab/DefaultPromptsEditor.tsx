'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getSectionContent, updateSectionContent } from '@/lib/db/content';

export function DefaultPromptsEditor() {
    const [isOpen, setIsOpen] = useState(false);
    const [imagePrompt, setImagePrompt] = useState('');
    const [videoPrompt, setVideoPrompt] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

    // Load prompts from database when modal opens
    useEffect(() => {
        if (isOpen) {
            loadPrompts();
        }
    }, [isOpen]);

    const loadPrompts = async () => {
        setIsLoading(true);
        try {
            const [imageData, videoData] = await Promise.all([
                getSectionContent('create_yours_image_default_prompt'),
                getSectionContent('create_yours_video_default_prompt')
            ]);

            // Set prompts with fallbacks
            setImagePrompt(imageData?.prompt || 'RECREATE this reference image EXACTLY. Maintain the SAME composition, lighting, shadows, colors, perspective, and dimensions. The output must be IDENTICAL to the reference except for the modifications below.');
            setVideoPrompt(videoData?.prompt || 'Transform this video while maintaining the core action, movement, and camera work. Replace the specified product seamlessly into the scene, matching lighting, perspective, and physics perfectly.');
        } catch (error) {
            console.error('Error loading prompts:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setSaveStatus('idle');

        try {
            await Promise.all([
                updateSectionContent('create_yours_image_default_prompt', { prompt: imagePrompt }),
                updateSectionContent('create_yours_video_default_prompt', { prompt: videoPrompt })
            ]);

            setSaveStatus('success');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            console.error('Error saving prompts:', error);
            setSaveStatus('error');
            alert('Failed to save prompts. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            <Button
                onClick={() => setIsOpen(true)}
                variant="outline"
                className="gap-2 border-zinc-700 text-zinc-400 hover:bg-purple-500/10 hover:text-purple-400 hover:border-purple-500/50"
            >
                <Sparkles className="w-4 h-4" />
                Default Prompts
            </Button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                        onClick={() => setIsOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-zinc-900 rounded-xl border border-white/10 p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                        <Sparkles className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">Default Prompts</h2>
                                        <p className="text-sm text-zinc-400">Edit the base prompts for Create Yours flows</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-zinc-400 hover:text-white transition-colors"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {isLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Image Prompt */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-semibold text-white">
                                                Create Yours Images - Default Prompt
                                            </label>
                                            <span className="text-xs text-zinc-500">
                                                {imagePrompt.length} characters
                                            </span>
                                        </div>
                                        <textarea
                                            value={imagePrompt}
                                            onChange={(e) => setImagePrompt(e.target.value)}
                                            rows={8}
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-sm text-white font-mono leading-relaxed focus:outline-none focus:border-purple-500 resize-none"
                                            placeholder="Enter default prompt for image creation..."
                                        />
                                        <p className="text-xs text-zinc-500">
                                            This prompt is used as the base for all Create Yours image generations when no template is selected.
                                        </p>
                                    </div>

                                    {/* Video Prompt */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-semibold text-white">
                                                Create Yours Videos - Default Prompt
                                            </label>
                                            <span className="text-xs text-zinc-500">
                                                {videoPrompt.length} characters
                                            </span>
                                        </div>
                                        <textarea
                                            value={videoPrompt}
                                            onChange={(e) => setVideoPrompt(e.target.value)}
                                            rows={8}
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-sm text-white font-mono leading-relaxed focus:outline-none focus:border-purple-500 resize-none"
                                            placeholder="Enter default prompt for video creation..."
                                        />
                                        <p className="text-xs text-zinc-500">
                                            This prompt will be used for Create Yours video generations (when video flow is implemented).
                                        </p>
                                    </div>

                                    {/* Save Button */}
                                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                                        <Button
                                            variant="ghost"
                                            onClick={() => setIsOpen(false)}
                                            className="text-zinc-400"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleSave}
                                            disabled={isSaving}
                                            className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
                                        >
                                            {isSaving ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Saving...
                                                </>
                                            ) : saveStatus === 'success' ? (
                                                <>
                                                    <Save className="w-4 h-4" />
                                                    Saved!
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="w-4 h-4" />
                                                    Save Changes
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
