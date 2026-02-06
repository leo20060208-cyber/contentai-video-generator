'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2, Sparkles, Video, Image as ImageIcon, MessageSquare, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getSectionContent, updateSectionContent } from '@/lib/db/content';

export function DefaultPromptsEditor() {
    const [isOpen, setIsOpen] = useState(false);

    // 1. Video Creation
    const [livingPrompt, setLivingPrompt] = useState('');
    const [directorsPrompt, setDirectorsPrompt] = useState('');

    // 2. Recreate Flows
    const [recreateVideoPrompt, setRecreateVideoPrompt] = useState('');
    const [recreateImagePrompt, setRecreateImagePrompt] = useState('');

    // 3. Video Editing
    const [videoEditPrompt, setVideoEditPrompt] = useState('');
    const [videoEditChatPrompt, setVideoEditChatPrompt] = useState('');

    // 4. Image Editing
    const [imageEditPrompt, setImageEditPrompt] = useState('');
    const [imageEditChatPrompt, setImageEditChatPrompt] = useState('');

    // 5. Preset Toggles
    const [livingBackgroundPresetsEnabled, setLivingBackgroundPresetsEnabled] = useState(true);
    const [transitionPresetsEnabled, setTransitionPresetsEnabled] = useState(true);

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
            const [
                livingData,
                directorsData,
                recreateVideoData,
                recreateImageData,
                videoEditData,
                videoEditChatData,
                imageEditData,
                imageEditChatData,
                livingPresetsData,
                transitionPresetsData
            ] = await Promise.all([
                getSectionContent('living_background_default_prompt'),
                getSectionContent('directors_cut_default_prompt'),
                getSectionContent('recreate_video_default_prompt'),
                getSectionContent('recreate_image_default_prompt'),
                getSectionContent('video_editing_default_prompt'),
                getSectionContent('video_editing_chat_default_prompt'),
                getSectionContent('image_editing_default_prompt'),
                getSectionContent('image_editing_chat_default_prompt'),
                getSectionContent('living_background_presets_enabled'),
                getSectionContent('transition_presets_enabled')
            ]);

            // Set prompts with fallbacks
            setLivingPrompt(livingData?.prompt || 'Keep the main subject/product perfectly still and sharp. Animate only the background areas I have painted with a smooth, natural motion.');
            setDirectorsPrompt(directorsData?.prompt || 'Create a smooth, cinematic transition between these frames. Maintain consistency in lighting, style, and subject matter throughout the sequence.');
            setRecreateVideoPrompt(recreateVideoData?.prompt || 'RECREATE this video EXACTLY. Maintain the SAME motion, composition, lighting, style, and duration. Output must be IDENTICAL to the reference.');
            setRecreateImagePrompt(recreateImageData?.prompt || 'RECREATE this image EXACTLY. Maintain the SAME composition, lighting, style, and perspective. Output must be IDENTICAL to the reference.');
            setVideoEditPrompt(videoEditData?.prompt || 'Recreate reference video EXACTLY ({{DURATION}}s). Maintain original camera movement and framing. Only apply specified changes.\n\n{{INSERTIONS}}');
            setVideoEditChatPrompt(videoEditChatData?.prompt || 'USER REQUEST: {{USER_MESSAGE}}\n\nRespond precisely to the user\'s command for video modification. Maintain temporal consistency and original style.');
            setImageEditPrompt(imageEditData?.prompt || 'RECREATE reference image EXACTLY. Maintain original framing, lighting, and style. Only apply requested modifications.\n\n{{INSERTIONS}}');
            setImageEditChatPrompt(imageEditChatData?.prompt || 'USER REQUEST: {{USER_MESSAGE}}\n\nModify the image based on the user\'s requests. Keep the output resolution identical to the input.');



            console.log('[Lab] Loaded livingPresetsData:', livingPresetsData);
            console.log('[Lab] Loaded transitionPresetsData:', transitionPresetsData);

            // Set preset toggles
            setLivingBackgroundPresetsEnabled(livingPresetsData?.enabled !== false); // Default to true
            setTransitionPresetsEnabled(transitionPresetsData?.enabled !== false); // Default to true

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
                updateSectionContent('recreate_video_default_prompt', { prompt: recreateVideoPrompt }),
                updateSectionContent('recreate_image_default_prompt', { prompt: recreateImagePrompt }),
                updateSectionContent('video_editing_default_prompt', { prompt: videoEditPrompt }),
                updateSectionContent('video_editing_chat_default_prompt', { prompt: videoEditChatPrompt }),
                updateSectionContent('image_editing_default_prompt', { prompt: imageEditPrompt }),
                updateSectionContent('image_editing_chat_default_prompt', { prompt: imageEditChatPrompt }),
            ]);

            // Save preset toggles separately with logging
            console.log('[Lab] Saving living_background_presets_enabled:', livingBackgroundPresetsEnabled);
            await updateSectionContent('living_background_presets_enabled', { enabled: livingBackgroundPresetsEnabled });

            console.log('[Lab] Saving transition_presets_enabled:', transitionPresetsEnabled);
            await updateSectionContent('transition_presets_enabled', { enabled: transitionPresetsEnabled });

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

    const SectionHeader = ({ icon: Icon, title, description }: { icon: any, title: string, description: string }) => (
        <div className="flex items-center gap-3 mb-4 pt-6 first:pt-0">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                <Icon className="w-4 h-4 text-purple-400" />
            </div>
            <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h3>
                <p className="text-[10px] text-zinc-500">{description}</p>
            </div>
        </div>
    );

    const PromptField = ({ label, value, onChange, placeholder, rows = 4 }: { label: string, value: string, onChange: (v: string) => void, placeholder: string, rows?: number }) => (
        <div className="space-y-2 mb-6 last:mb-0">
            <div className="flex justify-between items-center">
                <label className="text-[11px] font-medium text-zinc-400">{label}</label>
                <span className="text-[10px] text-zinc-600 font-mono">{value.length} chars</span>
            </div>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                rows={rows}
                className="w-full bg-black/40 border border-zinc-800 rounded-lg p-3 text-[12px] text-zinc-300 font-mono leading-relaxed focus:outline-none focus:border-purple-500/50 resize-none transition-colors"
                placeholder={placeholder}
            />
        </div>
    );

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
                            className="bg-zinc-900 rounded-xl border border-white/10 flex flex-col w-full max-w-4xl h-[90vh] overflow-hidden shadow-2xl"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-zinc-900/50 backdrop-blur-md">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                        <Sparkles className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">Default Prompts Library</h2>
                                        <p className="text-xs text-zinc-400">Configure global base prompts for all AI tools</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-zinc-900/30">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                                        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                                        <span className="text-sm text-zinc-500 font-medium">Synchronizing with Database...</span>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-white/5">
                                        {/* 1. Video Creation */}
                                        <section className="pb-8">
                                            <SectionHeader
                                                icon={Video}
                                                title="Video Creation"
                                                description="Base templates for Living Backgrounds and Image to Video flows."
                                            />
                                            <PromptField
                                                label="Living Backgrounds"
                                                value={livingPrompt}
                                                onChange={setLivingPrompt}
                                                placeholder="Enter template for Living Backgrounds..."
                                            />
                                            <PromptField
                                                label="Director's Cut (Image to Video)"
                                                value={directorsPrompt}
                                                onChange={setDirectorsPrompt}
                                                placeholder="Enter template for Director's Cut..."
                                            />
                                        </section>

                                        {/* 2. Recreate Flows */}
                                        <section className="py-8">
                                            <SectionHeader
                                                icon={Repeat}
                                                title="Recreate Flows"
                                                description="Templates for Recreate Video and Recreate Image tools."
                                            />
                                            <PromptField
                                                label="Recreate Video"
                                                value={recreateVideoPrompt}
                                                onChange={setRecreateVideoPrompt}
                                                placeholder="Enter template for Recreate Video..."
                                            />
                                            <PromptField
                                                label="Recreate Image"
                                                value={recreateImagePrompt}
                                                onChange={setRecreateImagePrompt}
                                                placeholder="Enter template for Recreate Image..."
                                            />
                                        </section>

                                        {/* 3. Video Editing */}
                                        <section className="py-8">
                                            <SectionHeader
                                                icon={MessageSquare}
                                                title="Video Editing"
                                                description="Base prompts for specialized Video Studio modifications."
                                            />
                                            <PromptField
                                                label="Change Objects (Standard Editor)"
                                                value={videoEditPrompt}
                                                onChange={setVideoEditPrompt}
                                                placeholder="Enter template for Video Editing Change Mode..."
                                                rows={6}
                                            />
                                            <PromptField
                                                label="Chat Mode"
                                                value={videoEditChatPrompt}
                                                onChange={setVideoEditChatPrompt}
                                                placeholder="Enter template for Video Editing Chat Mode..."
                                                rows={4}
                                            />
                                        </section>

                                        {/* 4. Image Editing */}
                                        <section className="pt-8">
                                            <SectionHeader
                                                icon={ImageIcon}
                                                title="Image Editing"
                                                description="Base prompts for Image Studio editing and generation."
                                            />
                                            <PromptField
                                                label="Change Objects (Standard Editor)"
                                                value={imageEditPrompt}
                                                onChange={setImageEditPrompt}
                                                placeholder="Enter template for Image Editing Change Mode..."
                                                rows={6}
                                            />
                                            <PromptField
                                                label="Chat Mode"
                                                value={imageEditChatPrompt}
                                                onChange={setImageEditChatPrompt}
                                                placeholder="Enter template for Image Editing Chat Mode..."
                                                rows={4}
                                            />
                                        </section>

                                        {/* 5. Preset Controls */}
                                        <section className="pt-8 border-t border-white/5">
                                            <SectionHeader
                                                icon={Sparkles}
                                                title="Preset Controls"
                                                description="Enable or disable preset buttons in editors."
                                            />
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-zinc-800 hover:border-purple-500/30 transition-colors">
                                                    <div className="flex-1">
                                                        <label className="text-sm font-medium text-white cursor-pointer">Living Background Presets</label>
                                                        <p className="text-xs text-zinc-500 mt-0.5">Show preset button in Living Background editor</p>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            const newValue = !livingBackgroundPresetsEnabled;
                                                            console.log('[Lab] Living Background toggle clicked. Old:', livingBackgroundPresetsEnabled, 'New:', newValue);
                                                            setLivingBackgroundPresetsEnabled(newValue);
                                                        }}
                                                        className={`relative w-12 h-6 rounded-full transition-colors ${livingBackgroundPresetsEnabled ? 'bg-purple-500' : 'bg-zinc-700'
                                                            }`}
                                                    >
                                                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${livingBackgroundPresetsEnabled ? 'translate-x-6' : 'translate-x-0'
                                                            }`} />
                                                    </button>
                                                </div>
                                                <div className="flex items-center justify-between p-3 rounded-lg bg-black/40 border border-zinc-800 hover:border-purple-500/30 transition-colors">
                                                    <div className="flex-1">
                                                        <label className="text-sm font-medium text-white cursor-pointer">Transition Presets</label>
                                                        <p className="text-xs text-zinc-500 mt-0.5">Show preset button in Directors Cut editor</p>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            const newValue = !transitionPresetsEnabled;
                                                            console.log('[Lab] Transition toggle clicked. Old:', transitionPresetsEnabled, 'New:', newValue);
                                                            setTransitionPresetsEnabled(newValue);
                                                        }}
                                                        className={`relative w-12 h-6 rounded-full transition-colors ${transitionPresetsEnabled ? 'bg-purple-500' : 'bg-zinc-700'
                                                            }`}
                                                    >
                                                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${transitionPresetsEnabled ? 'translate-x-6' : 'translate-x-0'
                                                            }`} />
                                                    </button>
                                                </div>
                                            </div>
                                        </section>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-white/5 bg-zinc-900 flex items-center justify-between px-6">
                                <div className="text-[10px] text-zinc-500 font-medium italic">
                                    Note: Placeholders like {"{{INSERTIONS}}"} or {"{{DURATION}}"} will be replaced at runtime.
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setIsOpen(false)}
                                        className="text-zinc-400 text-xs h-9 hover:bg-white/5"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleSave}
                                        disabled={isSaving || isLoading}
                                        className="bg-purple-600 hover:bg-purple-700 text-white gap-2 h-9 px-6 text-xs shadow-lg shadow-purple-900/20"
                                    >
                                        {isSaving ? (
                                            <>
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                Synchronizing...
                                            </>
                                        ) : saveStatus === 'success' ? (
                                            <>
                                                <Save className="w-3.5 h-3.5" />
                                                Saved Successfully!
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-3.5 h-3.5" />
                                                Save All Prompts
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
