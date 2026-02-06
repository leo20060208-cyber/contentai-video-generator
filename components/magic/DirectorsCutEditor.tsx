'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Upload, X, Sparkles, Loader2, Play, Plus, Trash2, BookOpen, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getSectionContent } from '@/lib/db/content';

interface DirectorsCutEditorProps {
    onBack: () => void;
}

interface PromptPreset {
    id: string;
    name: string;
    category: string;
    prompt_template: string;
    description?: string;
    preview_video_url?: string | null;
}

interface DirectorsCutEditorProps {
    onBack: () => void;
    initialDefaultPrompt?: string;
    initialPresets?: PromptPreset[];
}

export function DirectorsCutEditor({ onBack, initialDefaultPrompt, initialPresets = [] }: DirectorsCutEditorProps) {
    const router = useRouter();
    const [startImage, setStartImage] = useState<string | null>(null);
    const [midImages, setMidImages] = useState<string[]>([]);
    const [endImage, setEndImage] = useState<string | null>(null);
    const [selectedFrame, setSelectedFrame] = useState<{ type: 'start' | 'mid' | 'end', index?: number }>({ type: 'start' });

    const [userPrompt, setUserPrompt] = useState('');
    const [basePrompt, setBasePrompt] = useState('Create a smooth, cinematic transition between these frames. Maintain consistency in lighting, style, and subject matter throughout the sequence.');

    // Base Default Prompt (from DB) - Use prop or fallback
    const [dbDefaultPrompt, setDbDefaultPrompt] = useState(initialDefaultPrompt || 'Create a smooth, cinematic transition between these frames. Maintain consistency in lighting, style, and subject matter throughout the sequence.');

    // We can skip client-side fetch if we have initial prop, but for robustness:
    useEffect(() => {
        if (initialDefaultPrompt) return; // Skip if provided

        async function loadPrompt() {
            try {
                const data = await getSectionContent('directors_cut_default_prompt');
                if (data?.prompt) {
                    setDbDefaultPrompt(data.prompt);
                }
            } catch (e) { console.error(e); }
        }
        loadPrompt();
    }, [initialDefaultPrompt]);

    const [selectedPreset, setSelectedPreset] = useState<PromptPreset | null>(null);
    const [duration, setDuration] = useState<4 | 8>(4);

    // Build Base Prompt (Concatenation)
    useEffect(() => {
        let p = dbDefaultPrompt;

        if (p.includes('{{DURATION}}')) {
            p = p.replace('{{DURATION}}', duration.toString());
        } else {
            // Backward compatibility
            p += `\n\nSTRICT RECREATION REQUIREMENTS:\n- EXACT DURATION: ${duration} seconds. Do not change the speed.\n- Maintain original style and lighting.\n- Photorealistic, high fidelity.`;
        }

        if (selectedPreset) {
            p += ` ${selectedPreset.prompt_template}`;
        }

        setBasePrompt(p);
    }, [dbDefaultPrompt, selectedPreset, duration]);

    // Presets State
    const [presets, setPresets] = useState<PromptPreset[]>(initialPresets);
    const [showPresets, setShowPresets] = useState(false);
    const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
    const [hoveredPreset, setHoveredPreset] = useState<string | null>(null);
    const [previewPreset, setPreviewPreset] = useState<PromptPreset | null>(null);
    const [presetsEnabled, setPresetsEnabled] = useState(true); // Toggle state

    useEffect(() => {
        if (initialPresets && initialPresets.length > 0) return; // Skip if provided

        const fetchPresets = async () => {
            const { data } = await supabase
                .from('prompt_presets')
                .select('*')
                .eq('category', 'transition')
                .order('created_at', { ascending: false });

            if (data) setPresets(data);
        };
        fetchPresets();

        // Load Preset Enabled Toggle
        const loadPresetsEnabled = async () => {
            try {
                const enabledData = await getSectionContent('transition_presets_enabled');
                console.log('[DirectorsCut] Loaded transition_presets_enabled data:', enabledData);
                const isEnabled = enabledData?.enabled !== false;
                console.log('[DirectorsCut] Setting presetsEnabled to:', isEnabled);
                setPresetsEnabled(isEnabled);
            } catch (e) {
                console.error('[DirectorsCut] Error loading presets enabled:', e);
            }
        };
        loadPresetsEnabled();
    }, [initialPresets]);


    const openPreview = (preset: PromptPreset) => {
        setPreviewPreset(preset);
        setShowPresets(false);
    };

    const confirmPresetSelection = (preset: PromptPreset) => {
        if (selectedPresetId === preset.id) {
            // Deselect
            setSelectedPresetId(null);
            setSelectedPreset(null);
        } else {
            setSelectedPresetId(preset.id);
            setSelectedPreset(preset);
        }
        setPreviewPreset(null);
    };

    const [showFullPrompt, setShowFullPrompt] = useState(false);
    const [fullPromptPreview, setFullPromptPreview] = useState('');

    useEffect(() => {
        setFullPromptPreview(`${userPrompt ? userPrompt + '. ' : ''}${basePrompt}`);
    }, [userPrompt, basePrompt]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [quality, setQuality] = useState('HD');
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

    const { deductCreditsOptimistic } = useAuth();

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'mid' | 'end', index?: number) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const result = ev.target?.result as string;
            if (type === 'start') {
                setStartImage(result);
                setSelectedFrame({ type: 'start' });
            } else if (type === 'mid') {
                if (index !== undefined) {
                    setMidImages(prev => {
                        const next = [...prev];
                        next[index] = result;
                        return next;
                    });
                    setSelectedFrame({ type: 'mid', index });
                } else {
                    setMidImages(prev => [...prev, result]);
                    setSelectedFrame({ type: 'mid', index: midImages.length });
                }
            } else {
                setEndImage(result);
                setSelectedFrame({ type: 'end' });
            }
        };
        reader.readAsDataURL(file);
    };

    const removeMidImage = (index: number) => {
        setMidImages(prev => prev.filter((_, i) => i !== index));
        if (selectedFrame.type === 'mid' && selectedFrame.index === index) {
            setSelectedFrame({ type: 'start' });
        } else if (selectedFrame.type === 'mid' && selectedFrame.index !== undefined && selectedFrame.index > index) {
            setSelectedFrame({ type: 'mid', index: selectedFrame.index - 1 });
        }
    };

    const handleGenerate = async () => {
        if (!startImage || !endImage || isGenerating) return;
        setIsGenerating(true);
        setGenerationProgress(0);

        try {
            // Helper to upload base64 images
            const uploadImage = async (dataUrl: string, prefix: string) => {
                // If it's already a URL, return it
                if (dataUrl.startsWith('http')) return dataUrl;

                const blob = await fetch(dataUrl).then(r => r.blob());
                const fileName = `magic-video/inputs/${Date.now()}-${prefix}.png`;
                const { data, error } = await supabase.storage
                    .from('videos')
                    .upload(fileName, blob, { contentType: 'image/png' });

                if (error) throw error;
                const { data: { publicUrl } } = supabase.storage
                    .from('videos')
                    .getPublicUrl(fileName);
                return publicUrl;
            };

            setGenerationProgress(5);

            // Upload images
            const startUrl = await uploadImage(startImage, 'start');
            const endUrl = await uploadImage(endImage, 'end');
            const midUrls = await Promise.all(
                midImages.map((img, i) => uploadImage(img, `mid-${i}`))
            );

            setGenerationProgress(15);

            // Credits check (Optimistic)
            const cost = duration === 8 ? 55 : 30;
            if (deductCreditsOptimistic) {
                deductCreditsOptimistic(cost, "Director's Cut Generation");
            }

            // Get session for Auth
            const { data: { session } } = await supabase.auth.getSession();

            // Call API
            const response = await fetch('/api/magic-video/directors-cut', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    startImage: startUrl,
                    endImage: endUrl,
                    midImages: midUrls,
                    prompt: fullPromptPreview, // Use computed full prompt
                    duration,
                    aspectRatio
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Generation failing');
            }

            const data = await response.json();
            setGenerationProgress(20);

            if (data.taskId) {
                let completed = false;
                let attempts = 0;
                const maxAttempts = 1800; // ~60 minutes max

                while (!completed && attempts < maxAttempts) {
                    await new Promise(r => setTimeout(r, 2000));
                    const statusRes = await fetch(`/api/magic-video/status/${data.taskId}`);
                    const statusData = await statusRes.json();

                    if (statusData.status === 'completed' && statusData.videoUrl) {
                        completed = true;
                        setGenerationProgress(100);
                        setGeneratedVideoUrl(statusData.videoUrl);
                    } else if (statusData.status === 'failed') {
                        throw new Error('Generation failed on server');
                    } else {
                        setGenerationProgress(prev => Math.min(95, prev + 1.5));
                    }
                    attempts++;
                }

                if (!completed) throw new Error('Generation timed out');
            }
        } catch (e: any) {
            console.error(e);
            alert('Generation failed: ' + e.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const currentImage = selectedFrame.type === 'start'
        ? startImage
        : selectedFrame.type === 'end'
            ? endImage
            : selectedFrame.index !== undefined ? midImages[selectedFrame.index] : null;

    return (
        <div className="fixed inset-0 top-16 bg-transparent flex flex-col overflow-hidden">



            {/* Main Content Area */}
            <div className="flex-1 flex relative items-center justify-center px-20 pt-16 min-h-0 overflow-hidden">
                {/* Left Sidebar - Frame Slots */}
                <div className="absolute z-50 flex gap-4 transition-all duration-300 left-1/2 -translate-x-1/2 top-4 flex-row md:left-8 md:top-1/2 md:-translate-y-1/2 md:translate-x-0 md:flex-col">
                    <div className="flex gap-4 p-2 bg-zinc-900/60 backdrop-blur-md border border-white/10 rounded-2xl md:max-h-[70vh] max-w-[90vw] md:max-w-none overflow-x-auto md:overflow-x-visible overflow-y-hidden md:overflow-y-auto custom-scrollbar pr-2 shadow-2xl flex-row md:flex-col">
                        {/* Start Frame Slot */}
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest px-1">Start</span>
                            <div
                                onClick={() => {
                                    setSelectedFrame({ type: 'start' });
                                    if (!startImage) document.getElementById('start-upload')?.click();
                                }}
                                className={`relative w-16 h-16 rounded-xl border transition-all cursor-pointer overflow-hidden ${selectedFrame.type === 'start' ? 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.2)]' : 'border-white/5 hover:border-white/10'}`}
                            >
                                {startImage ? (
                                    <img src={startImage} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-transparent flex items-center justify-center">
                                        <Plus className="w-4 h-4 text-zinc-700" />
                                    </div>
                                )}
                                <input type="file" className="hidden" id="start-upload" onChange={(e) => handleUpload(e, 'start')} />
                            </div>
                        </div>

                        {/* Mid Frame Slots */}
                        {midImages.map((img, i) => (
                            <div key={i} className="flex flex-col gap-1.5 group/slot relative">
                                <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest px-1">Mid {i + 1}</span>
                                <div
                                    onClick={() => setSelectedFrame({ type: 'mid', index: i })}
                                    className={`relative w-16 h-16 rounded-xl border transition-all cursor-pointer overflow-hidden ${selectedFrame.type === 'mid' && selectedFrame.index === i ? 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.2)]' : 'border-white/5 hover:border-white/10'}`}
                                >
                                    <img src={img} className="w-full h-full object-cover" />
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeMidImage(i); }}
                                        className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover/slot:opacity-100 transition-opacity hover:bg-red-500"
                                    >
                                        <X className="w-3 h-3 text-white" />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Add Mid Button */}
                        <div className="flex flex-col gap-1.5 min-w-[64px] shrink-0">
                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest px-1 text-center">Add mid</span>
                            <label className="relative w-16 h-16 rounded-xl border border-dashed border-white/10 hover:border-white/20 transition-all cursor-pointer flex items-center justify-center group/add bg-white/5 md:bg-transparent">
                                <Plus className="w-5 h-5 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                                <input type="file" className="hidden" onChange={(e) => handleUpload(e, 'mid')} />
                            </label>
                        </div>                        {/* End Frame Slot */}
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest px-1">End</span>
                            <div
                                onClick={() => {
                                    setSelectedFrame({ type: 'end' });
                                    if (!endImage) document.getElementById('end-upload')?.click();
                                }}
                                className={`relative w-16 h-16 rounded-xl border transition-all cursor-pointer overflow-hidden ${selectedFrame.type === 'end' ? 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.2)]' : 'border-white/5 hover:border-white/10'}`}
                            >
                                {endImage ? (
                                    <img src={endImage} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-transparent flex items-center justify-center">
                                        <Plus className="w-4 h-4 text-zinc-700" />
                                    </div>
                                )}
                                <input type="file" className="hidden" id="end-upload" onChange={(e) => handleUpload(e, 'end')} />
                            </div>
                        </div>

                        {/* Recreate Image Button (Tools) */}
                        <div className="flex flex-col gap-1.5 min-w-[64px] shrink-0 md:pt-4 md:border-t md:border-white/5">
                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest px-1 text-center md:text-left">Tools</span>
                            <button
                                onClick={() => router.push('/create-image')}
                                className="relative w-16 h-16 rounded-xl border border-dashed border-white/10 hover:border-orange-500/50 hover:bg-orange-500/10 transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 group/tool"
                            >
                                <Sparkles className="w-4 h-4 text-zinc-600 group-hover/tool:text-orange-500 transition-colors" />
                                <span className="text-[6px] font-bold text-zinc-600 group-hover/tool:text-orange-500 text-center leading-tight px-0.5 uppercase">Recreate</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="relative w-full h-full flex items-center justify-center py-12">
                    <div className="relative aspect-video w-full max-w-4xl rounded-3xl overflow-hidden bg-transparent">
                        {currentImage ? (
                            <div className="relative w-full h-full group">
                                <img src={currentImage} className="w-full h-full object-contain" />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <label className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 cursor-pointer hover:bg-white/20 transition-all flex items-center gap-3">
                                        <Upload className="w-5 h-5 text-white" />
                                        <span className="text-sm font-bold text-white">Replace {selectedFrame.type === 'mid' ? `Middle ${selectedFrame.index! + 1}` : selectedFrame.type.charAt(0).toUpperCase() + selectedFrame.type.slice(1)} Frame</span>
                                        <input type="file" className="hidden" onChange={(e) => handleUpload(e, selectedFrame.type, selectedFrame.index)} />
                                    </label>
                                </div>
                            </div>
                        ) : (
                            <label className="w-full h-full flex flex-col items-center justify-center gap-6 cursor-pointer hover:bg-white/[0.02] transition-colors group">
                                <input type="file" className="hidden" onChange={(e) => handleUpload(e, selectedFrame.type, selectedFrame.index)} />
                                <div className="w-20 h-20 rounded-full bg-white/[0.03] flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform">
                                    <Upload className="w-8 h-8 text-zinc-500" />
                                </div>
                                <div className="text-center">
                                    <p className="text-lg font-bold text-white mb-1">Select {selectedFrame.type.toUpperCase()}{selectedFrame.type === 'mid' ? ` ${selectedFrame.index! + 1}` : ''} Frame</p>
                                    <p className="text-sm text-zinc-500">{selectedFrame.type === 'start' ? 'Pick an image to start the transition' : selectedFrame.type === 'end' ? 'Pick an image to end the transition' : 'Pick a middle frame for the transition'}</p>
                                </div>
                            </label>
                        )}
                    </div>
                </div>
            </div>

            {/* Generated Video Overlay */}
            <AnimatePresence>
                {generatedVideoUrl && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6"
                    >
                        <button
                            onClick={() => setGeneratedVideoUrl(null)}
                            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors group"
                        >
                            <X className="w-6 h-6 text-white/50 group-hover:text-white" />
                        </button>

                        <div className="relative w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                            <video
                                src={generatedVideoUrl}
                                controls
                                autoPlay
                                loop
                                className="w-full h-full object-contain"
                            />
                        </div>

                        <div className="mt-8 flex items-center gap-4">
                            <button
                                onClick={() => {
                                    const a = document.createElement('a');
                                    a.href = generatedVideoUrl;
                                    a.download = `directors-cut-${Date.now()}.mp4`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                }}
                                className="px-6 py-3 bg-white text-black rounded-xl font-bold hover:bg-zinc-200 transition-colors flex items-center gap-2"
                            >
                                <Download className="w-5 h-5" />
                                Download Video
                            </button>
                            <button
                                onClick={() => onBack()}
                                className="px-6 py-3 bg-white/10 text-white rounded-xl font-bold hover:bg-white/20 transition-colors"
                            >
                                Back to Gallery
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* PRESET PREVIEW MODAL */}
            <AnimatePresence>
                {previewPreset && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                        onClick={(e) => { if (e.target === e.currentTarget) setPreviewPreset(null); }}
                    >
                        <div className="bg-transparent w-full max-w-3xl p-0 relative flex flex-col gap-4">
                            {/* Close Button - Outside the video container for easier access or nicely integrated */}
                            <div className="flex justify-end mb-2">
                                <button
                                    onClick={() => setPreviewPreset(null)}
                                    className="bg-black/50 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-md transition-all"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>


                            {/* Video Container - No background, just the video */}
                            <div className="w-full aspect-video rounded-xl overflow-hidden shadow-2xl relative">
                                {previewPreset.preview_video_url ? (
                                    <video
                                        src={previewPreset.preview_video_url}
                                        className="w-full h-full object-cover"
                                        autoPlay
                                        loop
                                        muted
                                        playsInline // Important for consistency
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-black/50 backdrop-blur-sm text-zinc-400 border border-white/10">
                                        <span className="text-xs">No preview video</span>
                                    </div>
                                )}
                            </div>

                            {/* Minimal control bar below */}
                            <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl p-4 flex items-center justify-between gap-4">
                                <div className="flex flex-col">
                                    <h3 className="text-lg font-bold text-white">{previewPreset.name}</h3>
                                    {previewPreset.description && (
                                        <p className="text-xs text-zinc-400">{previewPreset.description}</p>
                                    )}
                                </div>
                                <Button
                                    onClick={() => confirmPresetSelection(previewPreset)}
                                    className="bg-white hover:bg-zinc-200 text-black rounded-lg px-6 py-2 font-bold whitespace-nowrap"
                                >
                                    Use This
                                </Button>
                            </div>

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Scale Full Prompt Popup */}
            <AnimatePresence>
                {showFullPrompt && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    >
                        <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-5xl p-6 shadow-2xl relative">
                            <button
                                onClick={() => setShowFullPrompt(false)}
                                className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <h3 className="text-lg font-bold text-white mb-4">Edit Full Prompt</h3>
                            <textarea
                                value={fullPromptPreview}
                                onChange={(e) => setFullPromptPreview(e.target.value)}
                                className="w-full h-64 bg-black/50 border border-white/10 rounded-xl p-4 text-sm text-white focus:ring-1 focus:ring-orange-500 resize-none mb-4 custom-scrollbar"
                            />
                            <div className="flex justify-end gap-2">
                                <Button
                                    onClick={() => setShowFullPrompt(false)}
                                    className="bg-white text-black hover:bg-zinc-200 w-full rounded-lg h-12 font-bold"
                                >
                                    Done
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bottom Panel (Floating Prompt Bar) */}
            <div className="p-3 md:pb-4 relative z-50 shrink-0">
                <div className="max-w-3xl mx-auto">
                    <div className="bg-zinc-900/60 backdrop-blur-md rounded-xl p-1.5 flex flex-col gap-1.5 border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                        <div className="flex gap-2">
                            <div className="flex-1 bg-transparent rounded-lg p-2">
                                <textarea
                                    value={userPrompt}
                                    onChange={(e) => setUserPrompt(e.target.value)}
                                    className="w-full bg-transparent border-none focus:ring-0 text-xs text-white placeholder-zinc-500 resize-none h-6 custom-scrollbar leading-tight focus:bg-transparent"
                                    placeholder="Add prompt..."
                                />
                            </div>

                            <div className="flex flex-col items-start gap-1">
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating || !startImage || !endImage}
                                    className="w-40 bg-white/5 hover:bg-white/10 backdrop-blur-md disabled:bg-transparent disabled:text-zinc-700 text-orange-500 border border-orange-500/30 hover:border-orange-500/60 font-bold text-[10px] rounded-lg transition-all flex flex-col items-center justify-center gap-0.5 shadow-lg shadow-orange-500/10 h-9"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>{generationProgress}%</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="flex items-center gap-1 text-[10px]">
                                                GENERATE CUT
                                            </span>
                                            <span className="text-[7px] opacity-40">COST: {duration === 8 ? 55 : 30} CR</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Control Badges */}
                        <div className="flex items-center justify-between px-2 pb-1">
                            <div className="flex items-center gap-2">
                                <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
                                    {[4, 8].map((d) => (
                                        <button
                                            key={d}
                                            onClick={() => setDuration(d as 4 | 8)}
                                            className={`px-4 py-1.5 rounded-lg text-[9px] font-black transition-all ${duration === d ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-white'}`}
                                        >
                                            {d}s
                                        </button>
                                    ))}
                                </div>


                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowFullPrompt(true)}
                                    className="text-[9px] font-black text-zinc-500 hover:text-white transition-colors whitespace-nowrap uppercase tracking-widest mr-2"
                                >
                                    VIEW FULL PROMPT
                                </button>

                                {/* GUIDE button */}
                                <button
                                    onClick={() => router.push('/guide/directors-cut')}
                                    className="text-[9px] font-black text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-widest flex items-center gap-1"
                                    title="View Guide"
                                >
                                    <BookOpen className="w-3 h-3" />


                                    GUIDE
                                </button>

                            </div>
                        </div>

                        {/* Add Mid Button (Desktop Only / Bottom Bar for easy access if needed, but requested to remove from here earlier? User asked for lack of mid frame in top bar. Keeping bottom bar clean or re-adding?) */}
                        {/* User said 'falta add mid frame' referring to 'lo de arriba'. So above in the list is sufficient. I will not add it back to the bottom bar unless explicitly asked again, to avoid crowding the Guide/Prompt area. */}
                    </div>

                    {/* Generation Progress Bar */}
                    <AnimatePresence>
                        {isGenerating && (
                            <motion.div
                                initial={{ opacity: 0, scaleX: 0 }}
                                animate={{ opacity: 1, scaleX: 1 }}
                                exit={{ opacity: 0 }}
                                className="w-full h-1 bg-orange-500 mt-4 rounded-full origin-left shadow-[0_0_15px_rgba(249,115,22,0.5)]"
                                style={{ scaleX: generationProgress / 100 }}
                            />
                        )}
                    </AnimatePresence>
                </div>
            </div >
        </div >
    );
}
