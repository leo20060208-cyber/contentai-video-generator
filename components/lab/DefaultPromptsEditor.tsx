'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getSectionContent, updateSectionContent } from '@/lib/db/content';

export function DefaultPromptsEditor() {
    const [isOpen, setIsOpen] = useState(false);
    const [livingPrompt, setLivingPrompt] = useState('');
    const [directorsPrompt, setDirectorsPrompt] = useState('');
    const [videoEditPrompt, setVideoEditPrompt] = useState('');
    const [imageEditPrompt, setImageEditPrompt] = useState('');

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
            const [livingData, directorsData, videoEditData, imageEditData] = await Promise.all([
                getSectionContent('living_background_default_prompt'),
                getSectionContent('directors_cut_default_prompt'),
                getSectionContent('video_editing_default_prompt'),
                getSectionContent('image_editing_default_prompt')
            ]);

            // Set prompts with fallbacks
            setLivingPrompt(livingData?.prompt || 'Keep the main subject/product perfectly still and sharp. Animate only the background areas I have painted with a smooth, natural motion.');
            setDirectorsPrompt(directorsData?.prompt || 'Create a smooth, cinematic transition between these frames. Maintain consistency in lighting, style, and subject matter throughout the sequence.');
            setVideoEditPrompt(videoEditData?.prompt || 'Edit this video to enhance visual quality, stability, and color grading while maintaining the original content and duration.');
            setImageEditPrompt(imageEditData?.prompt || 'Edit the image according to the mask and instructions. Maintain the style, lighting, and composition of the original image in the unmasked areas.');

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
                updateSectionContent('living_background_default_prompt', { prompt: livingPrompt }),
                updateSectionContent('directors_cut_default_prompt', { prompt: directorsPrompt }),
                updateSectionContent('video_editing_default_prompt', { prompt: videoEditPrompt }),
                updateSectionContent('image_editing_default_prompt', { prompt: imageEditPrompt })
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
                                    {/* Living Backgrounds */}
                                    <div className="space-y-3 pt-6 border-t border-zinc-800">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-semibold text-white">
                                                Living Backgrounds - Default Prompt
                                            </label>
                                            <span className="text-xs text-zinc-500">
                                                {livingPrompt.length} characters
                                            </span>
                                        </div>
                                        <textarea
                                            value={livingPrompt}
                                            onChange={(e) => setLivingPrompt(e.target.value)}
                                            rows={8}
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-sm text-white font-mono leading-relaxed focus:outline-none focus:border-purple-500 resize-none"
                                            placeholder="Enter default prompt for Living Backgrounds..."
                                        />
                                    </div>

                                    {/* Director's Cut */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-semibold text-white">
                                                Director's Cut (Image to Video) - Default Prompt
                                            </label>
                                            <span className="text-xs text-zinc-500">
                                                {directorsPrompt.length} characters
                                            </span>
                                        </div>
                                        <textarea
                                            value={directorsPrompt}
                                            onChange={(e) => setDirectorsPrompt(e.target.value)}
                                            rows={4}
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-sm text-white font-mono leading-relaxed focus:outline-none focus:border-purple-500 resize-none"
                                            placeholder="Enter default prompt for Director's Cut..."
                                        />
                                    </div>

                                    {/* Video Editing */}
                                    <div className="space-y-3 pt-6 border-t border-zinc-800">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-semibold text-white">
                                                Video Editing - Default Prompt
                                            </label>
                                            <span className="text-xs text-zinc-500">
                                                {videoEditPrompt.length} characters
                                            </span>
                                        </div>
                                        <textarea
                                            value={videoEditPrompt}
                                            onChange={(e) => setVideoEditPrompt(e.target.value)}
                                            rows={12}
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-sm text-white font-mono leading-relaxed focus:outline-none focus:border-purple-500 resize-none"
                                            placeholder="Enter default prompt for Video Editing..."
                                        />
                                    </div>

                                    {/* Image Editing */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-semibold text-white">
                                                Image Editing - Default Prompt
                                            </label>
                                            <span className="text-xs text-zinc-500">
                                                {imageEditPrompt.length} characters
                                            </span>
                                        </div>
                                        <textarea
                                            value={imageEditPrompt}
                                            onChange={(e) => setImageEditPrompt(e.target.value)}
                                            rows={12}
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-sm text-white font-mono leading-relaxed focus:outline-none focus:border-purple-500 resize-none"
                                            placeholder="Enter default prompt for Image Editing..."
                                        />
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
