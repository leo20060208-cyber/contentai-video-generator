'use client';

import { useState, useEffect, useRef } from 'react';
import { getSectionContent, updateSectionContent } from '@/lib/db/content';
import { Button } from '@/components/ui/Button';
import { Loader2, Save, Plus, Trash2, ChevronDown, ChevronUp, Image as ImageIcon, Upload } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Step {
    title: string;
    description: string;
    image: string;
    ctaText?: string;
    redirectUrl?: string; // New field for redirection
}

interface WhatWeDoContent {
    createVideoTitle?: string;
    createVideoSteps: Step[];
    recreateVideoTitle?: string;
    recreateVideoSteps: Step[];
    createImageTitle?: string;
    createImageSteps: Step[];
    recreateImageTitle?: string;
    recreateImageSteps: Step[];
    livingBackgroundsTitle?: string;
    livingBackgroundsSteps: Step[];
    directorsCutTitle?: string;
    directorsCutSteps: Step[];
    motionControlTitle?: string;
    motionControlSteps: Step[];
    libraryVideoTitle?: string;
    libraryVideoSteps: Step[];
    libraryImageTitle?: string;
    libraryImageSteps: Step[];
}

const defaultStep: Step = {
    title: 'New Step',
    description: 'Description here',
    image: '/images/placeholder.png',
    ctaText: 'Next',
    redirectUrl: ''
};

const defaultContent: WhatWeDoContent = {
    createVideoTitle: 'VIDEO EDITING',
    createVideoSteps: [defaultStep],
    recreateVideoTitle: 'Recreate Template Video',
    recreateVideoSteps: [defaultStep],
    createImageTitle: 'IMAGE EDITING',
    createImageSteps: [defaultStep],
    recreateImageTitle: 'Recreate Template Image',
    recreateImageSteps: [defaultStep],
    livingBackgroundsTitle: 'LIVING BACKGROUNDS',
    livingBackgroundsSteps: [defaultStep],
    directorsCutTitle: "DIRECTOR'S CUT",
    directorsCutSteps: [defaultStep],
    motionControlTitle: 'MOTION CONTROL',
    motionControlSteps: [defaultStep],
    libraryVideoTitle: 'Visit Video Library',
    libraryVideoSteps: [defaultStep],
    libraryImageTitle: 'Visit Image Library',
    libraryImageSteps: [defaultStep]
};

export function SiteContentEditor() {
    const [content, setContent] = useState<WhatWeDoContent>(defaultContent);
    const [loading, setLoading] = useState(false); // Default false for smoother init
    const [saving, setSaving] = useState(false);
    const [activeSection, setActiveSection] = useState<keyof WhatWeDoContent>('createVideoSteps');
    const [uploading, setUploading] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadTarget, setUploadTarget] = useState<{ section: keyof WhatWeDoContent, index: number } | null>(null);

    useEffect(() => {
        loadContent();
    }, []);

    const loadContent = async () => {
        setLoading(true);
        try {
            const data = await getSectionContent('what_we_do_v2');
            if (data && Object.keys(data).length > 0) {
                // Ensure all keys exist and merge with default structure to avoid missing arrays
                setContent({
                    createVideoTitle: data.createVideoTitle || defaultContent.createVideoTitle,
                    createVideoSteps: data.createVideoSteps || [defaultStep],
                    recreateVideoTitle: data.recreateVideoTitle || defaultContent.recreateVideoTitle,
                    recreateVideoSteps: data.recreateVideoSteps || [defaultStep],
                    createImageTitle: data.createImageTitle || defaultContent.createImageTitle,
                    createImageSteps: data.createImageSteps || [defaultStep],
                    recreateImageTitle: data.recreateImageTitle || defaultContent.recreateImageTitle,
                    recreateImageSteps: data.recreateImageSteps || [defaultStep],
                    // Magic Video
                    livingBackgroundsTitle: data.livingBackgroundsTitle || defaultContent.livingBackgroundsTitle,
                    livingBackgroundsSteps: data.livingBackgroundsSteps || [defaultStep],
                    directorsCutTitle: data.directorsCutTitle || defaultContent.directorsCutTitle,
                    directorsCutSteps: data.directorsCutSteps || [defaultStep],
                    motionControlTitle: data.motionControlTitle || defaultContent.motionControlTitle,
                    motionControlSteps: data.motionControlSteps || [defaultStep],
                    // Library
                    libraryVideoTitle: data.libraryVideoTitle || defaultContent.libraryVideoTitle,
                    libraryVideoSteps: data.libraryVideoSteps || [defaultStep],
                    libraryImageTitle: data.libraryImageTitle || defaultContent.libraryImageTitle,
                    libraryImageSteps: data.libraryImageSteps || [defaultStep],
                });
            } else {
                console.log("No existing content found, using defaults.");
            }
        } catch (error) {
            console.error('Failed to load content:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateSectionContent('what_we_do_v2', content);
            alert('Content saved successfully!');
        } catch (error) {
            console.error('Failed to save content:', error);
            alert('Failed to save content');
        } finally {
            setSaving(false);
        }
    };

    const updateStep = (sectionKey: keyof WhatWeDoContent, index: number, field: keyof Step, value: string) => {
        setContent(prev => {
            const section = prev[sectionKey];
            if (!Array.isArray(section)) return prev;

            const newSection = [...section];
            newSection[index] = { ...newSection[index], [field]: value };
            return { ...prev, [sectionKey]: newSection };
        });
    };

    const addStep = (sectionKey: keyof WhatWeDoContent) => {
        setContent(prev => {
            const section = prev[sectionKey];
            if (!Array.isArray(section)) return prev;
            return {
                ...prev,
                [sectionKey]: [...section, { ...defaultStep }]
            };
        });
    };

    const removeStep = (sectionKey: keyof WhatWeDoContent, index: number) => {
        if (!confirm('Are you sure you want to remove this step?')) return;
        setContent(prev => {
            const section = prev[sectionKey];
            if (!Array.isArray(section)) return prev;
            const newSection = [...section];
            newSection.splice(index, 1);
            return { ...prev, [sectionKey]: newSection };
        });
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || !event.target.files[0] || !uploadTarget) return;

        const file = event.target.files[0];
        const { section, index } = uploadTarget;
        setUploading(index);

        try {
            // Use 'videos' bucket as it is confirmed to exist (used by TemplateUploader)
            const bucketName = 'videos';
            const fileExt = file.name.split('.').pop();
            // Use 'site-assets' folder within to distinguish
            const fileName = `site-assets/${section}-${index}-${Date.now()}.${fileExt}`;
            const filePath = fileName;

            const { data, error } = await supabase.storage
                .from(bucketName)
                .upload(filePath, file);

            if (error) {
                console.error('Upload error details:', error);
                throw error;
            }

            const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(filePath);
            updateStep(section, index, 'image', publicUrl);

        } catch (error: any) {
            console.error('Upload failed:', error);
            alert('Upload failed: ' + (error.message || 'Unknown error'));
        } finally {
            setUploading(null);
            setUploadTarget(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const triggerUpload = (section: keyof WhatWeDoContent, index: number) => {
        setUploadTarget({ section, index });
        fileInputRef.current?.click();
    };


    if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

    const sections: { key: keyof WhatWeDoContent; label: string }[] = [
        { key: 'createVideoSteps', label: 'Create Video Workflow' },
        { key: 'recreateVideoSteps', label: 'Recreate Video Workflow' },
        { key: 'createImageSteps', label: 'Create Image Workflow' },
        { key: 'recreateImageSteps', label: 'Recreate Image Workflow' },
        { key: 'livingBackgroundsSteps', label: 'Living Backgrounds' },
        { key: 'directorsCutSteps', label: "Director's Cut" },
        { key: 'motionControlSteps', label: 'Motion Control' },
        { key: 'libraryVideoSteps', label: 'Library Video Card' },
        { key: 'libraryImageSteps', label: 'Library Image Card' },
    ];

    const getTitleKey = (sectionKey: keyof WhatWeDoContent): keyof WhatWeDoContent | null => {
        if (sectionKey === 'createVideoSteps') return 'createVideoTitle';
        if (sectionKey === 'recreateVideoSteps') return 'recreateVideoTitle';
        if (sectionKey === 'createImageSteps') return 'createImageTitle';
        if (sectionKey === 'recreateImageSteps') return 'recreateImageTitle';
        if (sectionKey === 'livingBackgroundsSteps') return 'livingBackgroundsTitle';
        if (sectionKey === 'directorsCutSteps') return 'directorsCutTitle';
        if (sectionKey === 'motionControlSteps') return 'motionControlTitle';
        if (sectionKey === 'libraryVideoSteps') return 'libraryVideoTitle';
        if (sectionKey === 'libraryImageSteps') return 'libraryImageTitle';
        return null;
    };

    const currentTitleKey = getTitleKey(activeSection as keyof WhatWeDoContent);

    return (
        <div className="space-y-6 bg-zinc-900/50 p-6 rounded-xl border border-white/5">
            <div className="flex justify-between items-center pb-6 border-b border-white/5">
                <h2 className="text-xl font-bold text-white">Edit "What We Do" Page</h2>
                <Button onClick={handleSave} disabled={saving} className="bg-orange-500 text-white hover:bg-orange-600">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Changes
                </Button>
            </div>

            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*,video/*"
                onChange={handleFileUpload}
            />

            {/* Section Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {sections.map(section => (
                    <button
                        key={section.key}
                        onClick={() => setActiveSection(section.key)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeSection === section.key
                            ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                            : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-transparent'
                            }`}
                    >
                        {section.label}
                    </button>
                ))}
            </div>

            {/* Steps Editor */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <div className="flex-1 mr-4">
                        <label className="block text-[10px] font-bold text-zinc-600 mb-1 uppercase">Workflow Title (Appears at top)</label>
                        {currentTitleKey && (
                            <input
                                type="text"
                                value={content[currentTitleKey] as string}
                                onChange={(e) => setContent({ ...content, [currentTitleKey]: e.target.value })}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-sm text-white focus:border-orange-500 outline-none font-bold"
                            />
                        )}
                    </div>
                    <Button onClick={() => addStep(activeSection)} size="sm" variant="outline" className="h-8 text-xs border-zinc-700 text-zinc-300 mt-4">
                        <Plus className="w-3 h-3 mr-1" /> Add Step
                    </Button>
                </div>

                <div className="grid gap-4">
                    {/* TS assertion or check */}
                    {Array.isArray(content[activeSection]) && content[activeSection].map((step, idx) => (
                        <div key={idx} className="bg-zinc-950 rounded-lg border border-zinc-800 p-4 relative group">
                            <div className="absolute top-4 right-4 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-2">
                                <button
                                    onClick={() => removeStep(activeSection, idx)}
                                    className="p-1 hover:text-red-500 text-zinc-600 transition-colors bg-black/50 rounded"
                                    title="Remove Step"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="grid md:grid-cols-[120px_1fr] gap-6">
                                {/* Image Preview & Upload */}
                                <div className="space-y-2">
                                    <div
                                        className="aspect-[9/16] bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 relative group/img cursor-pointer hover:border-orange-500/50 transition-colors"
                                        onClick={() => triggerUpload(activeSection, idx)}
                                    >
                                        {step.image ? (
                                            step.image.match(/\.(mp4|webm|mov)$/i) ? (
                                                <video
                                                    src={step.image}
                                                    className="w-full h-full object-cover"
                                                    autoPlay
                                                    muted
                                                    loop
                                                    playsInline
                                                />
                                            ) : (
                                                <img src={step.image} alt="Preview" className="w-full h-full object-cover" />
                                            )
                                        ) : (
                                            <div className="flex items-center justify-center h-full">
                                                <ImageIcon className="w-8 h-8 text-zinc-700" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                                            {uploading === idx ? (
                                                <Loader2 className="w-6 h-6 animate-spin text-white" />
                                            ) : (
                                                <div className="text-center">
                                                    <Upload className="w-6 h-6 text-white mx-auto mb-1" />
                                                    <span className="text-[10px] text-white font-medium">Click to Upload</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-zinc-500 text-center">
                                        Click image to upload
                                    </div>
                                </div>

                                {/* Fields */}
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-zinc-600 mb-1 uppercase">Step Title</label>
                                            <input
                                                type="text"
                                                value={step.title}
                                                onChange={(e) => updateStep(activeSection, idx, 'title', e.target.value)}
                                                className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm text-white focus:border-orange-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-zinc-600 mb-1 uppercase">CTA Text</label>
                                            <input
                                                type="text"
                                                value={step.ctaText || ''}
                                                onChange={(e) => updateStep(activeSection, idx, 'ctaText', e.target.value)}
                                                className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm text-white focus:border-orange-500 outline-none"
                                                placeholder="Next"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-zinc-600 mb-1 uppercase">Description</label>
                                        <textarea
                                            value={step.description}
                                            onChange={(e) => updateStep(activeSection, idx, 'description', e.target.value)}
                                            rows={2}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-sm text-white focus:border-orange-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-zinc-600 mb-1 uppercase">Redirect URL (Final Step Only)</label>
                                        <input
                                            type="text"
                                            value={step.redirectUrl || ''}
                                            onChange={(e) => updateStep(activeSection, idx, 'redirectUrl', e.target.value)}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-300 focus:border-orange-500 outline-none font-mono"
                                            placeholder="/create-yours-video e.g."
                                        />
                                        <p className="text-[10px] text-zinc-500 mt-1">Leave empty to just go to next step. Use absolute path /... for navigation.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
