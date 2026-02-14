'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Upload, X, Film, Play, Plus, Info, Layout, Box, Monitor, Smartphone, Video, BookOpen, AlignHorizontalJustifyCenter, Check, Sparkles, Download, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getSectionContent } from '@/lib/db/content';

interface MotionControlEditorProps {
    onBack: () => void;
    initialDefaultPrompt?: string;
    initialPresets?: any[];
}

interface PromptPreset {
    id: string;
    name: string;
    category: string;
    prompt_template: string;
    description?: string;
    preview_video_url?: string | null;
}

// Mock data removed in favor of real presets from DB


export function MotionControlEditor({ onBack, initialDefaultPrompt, initialPresets = [] }: MotionControlEditorProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [startVideo, setStartVideo] = useState<string | null>(null);
    const [endImage, setEndImage] = useState<string | null>(null);
    const [videoDuration, setVideoDuration] = useState<number>(0);
    const [videoDimensions, setVideoDimensions] = useState<{ width: number, height: number } | null>(null);
    const [imageDimensions, setImageDimensions] = useState<{ width: number, height: number } | null>(null);
    const [qualityMode, setQualityMode] = useState<'normal' | 'pro'>('normal');
    const [aspectRatio, setAspectRatio] = useState<'free' | '16:9' | '9:16' | '1:1'>('free');
    const [characterOrientation, setCharacterOrientation] = useState<'video' | 'image'>('video');

    const [userPrompt, setUserPrompt] = useState('');
    const [basePrompt, setBasePrompt] = useState('Create a smooth, cinematic motion control video. Maintain consistency in lighting, style, and subject matter.');
    const [dbDefaultPrompt, setDbDefaultPrompt] = useState(initialDefaultPrompt || 'Create a smooth, cinematic motion control video.');

    useEffect(() => {
        if (initialDefaultPrompt) return;
        async function loadPrompt() {
            try {
                const data = await getSectionContent('motion_control_default_prompt');
                if (data?.prompt) {
                    setDbDefaultPrompt(data.prompt);
                }
            } catch (e) { console.error(e); }
        }
        loadPrompt();
    }, [initialDefaultPrompt]);

    const [selectedPreset, setSelectedPreset] = useState<PromptPreset | null>(null);

    useEffect(() => {
        let parts = [dbDefaultPrompt];
        if (selectedPreset) {
            parts.push(selectedPreset.prompt_template);
        }
        parts.push(`\n\n- DURATION: ${Math.ceil(videoDuration || 5)} seconds.\n- High fidelity motion control.`);
        setBasePrompt(parts.join(' '));
    }, [dbDefaultPrompt, selectedPreset, videoDuration]);

    const [presets, setPresets] = useState<PromptPreset[]>(initialPresets);
    const [refPresets, setRefPresets] = useState<PromptPreset[]>([]);
    const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
    const [previewPreset, setPreviewPreset] = useState<PromptPreset | null>(null);

    useEffect(() => {
        async function fetchAllPresets() {
            // Fetch Motion Control (Right Side)
            const { data: mcData } = await supabase
                .from('prompt_presets')
                .select('*')
                .eq('category', 'motion_control')
                .order('created_at', { ascending: false });
            if (mcData) setPresets(mcData);

            // Fetch Motion Reference (Left Side)
            const { data: refData } = await supabase
                .from('prompt_presets')
                .select('*')
                .eq('category', 'motion_reference')
                .order('created_at', { ascending: false });
            if (refData) setRefPresets(refData);
        }
        fetchAllPresets();
    }, [initialPresets]);

    const [showFullPrompt, setShowFullPrompt] = useState(false);
    const [fullPromptPreview, setFullPromptPreview] = useState('');

    useEffect(() => {
        setFullPromptPreview(`${userPrompt ? userPrompt + '. ' : ''}${basePrompt}`);
    }, [userPrompt, basePrompt]);

    useEffect(() => {
        return () => {
            if (startVideo && startVideo.startsWith('blob:')) {
                URL.revokeObjectURL(startVideo);
            }
        };
    }, [startVideo]);

    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

    const { deductCreditsOptimistic, profile } = useAuth();

    // Derived values for render
    const durationToCharge = Math.ceil(videoDuration) || 5;
    const multiplier = qualityMode === 'pro' ? 8 : 4;
    const cost = durationToCharge * multiplier;

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'end') => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (type === 'start') {
            const url = URL.createObjectURL(file);
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = () => {
                const duration = video.duration;

                // Validate video duration (3-30 seconds)
                if (duration < 3) {
                    alert('El vídeo es demasiado corto. La duración mínima es de 3 segundos.');
                    URL.revokeObjectURL(url);
                    e.target.value = ''; // Reset input
                    return;
                }
                if (duration > 30) {
                    alert('El vídeo es demasiado largo. La duración máxima es de 30 segundos.');
                    URL.revokeObjectURL(url);
                    e.target.value = ''; // Reset input
                    return;
                }

                setVideoDuration(duration);
                setVideoDimensions({ width: video.videoWidth, height: video.videoHeight });
                setStartVideo(url);
                setSelectedPresetId(null);
            };
            video.src = url;
        } else {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const result = ev.target?.result as string;
                setEndImage(result);
                const img = new Image();
                img.onload = () => {
                    setImageDimensions({ width: img.width, height: img.height });
                };
                img.src = result;
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSetReference = (url: string) => {
        if (!url) return;
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
            setVideoDuration(video.duration);
            setVideoDimensions({ width: video.videoWidth, height: video.videoHeight });
            setStartVideo(url);
        };
        video.src = url;
    };

    const handleGenerate = async () => {
        if (!startVideo || isGenerating) return;

        const durationToCharge = Math.ceil(videoDuration) || 5;
        const multiplier = qualityMode === 'pro' ? 8 : 4;
        const cost = durationToCharge * multiplier;

        // Check credits before starting
        const { data: profile } = await supabase
            .from('profiles')
            .select('credits')
            .eq('id', (await supabase.auth.getUser()).data.user?.id)
            .single();

        if (profile && profile.credits < cost) {
            router.push('/pricing');
            return;
        }

        setIsGenerating(true);
        setGenerationProgress(0);

        try {
            const uploadFile = async (dataUrl: string, prefix: string, isVideo: boolean = false) => {
                const blob = await fetch(dataUrl).then(r => r.blob());
                const ext = isVideo ? 'mp4' : 'png';
                const type = isVideo ? 'video/mp4' : 'image/png';
                const fileName = `motion-control/inputs/${Date.now()}-${prefix}.${ext}`;
                const { data, error } = await supabase.storage
                    .from('videos')
                    .upload(fileName, blob, { contentType: type });
                if (error) throw error;
                const { data: publicUrlData } = supabase.storage
                    .from('videos')
                    .getPublicUrl(fileName);
                return publicUrlData.publicUrl;
            };

            setGenerationProgress(5);
            const startUrl = await uploadFile(startVideo, 'start', true);
            const endUrl = endImage ? await uploadFile(endImage, 'end', false) : null;

            setGenerationProgress(15);

            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/magic-video/motion-control', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    startVideo: startUrl,
                    endImage: endUrl,
                    prompt: fullPromptPreview,
                    duration: Math.ceil(videoDuration),
                    quality: qualityMode,
                    characterOrientation
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Generation failing');
            }

            // ONLY DEDUCT IF API CALL SUCCESSFUL
            if (deductCreditsOptimistic) {
                deductCreditsOptimistic(cost, "Motion Control Generation");
            }

            const data = await response.json();
            setGenerationProgress(20);

            if (data.taskId) {
                let completed = false;
                let attempts = 0;
                // Timeout increased to ~60 minutes (1800 * 2s) to effectively remove timeout
                while (!completed && attempts < 1800) {
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
                if (!completed) throw new Error('Generation timed out. The video might still appear in your gallery later.');
            }
        } catch (e: any) {
            console.error(e);
            alert('Generation failed: ' + e.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const getContainerClasses = () => {
        const base = "relative rounded-2xl border border-white/10 hover:border-orange-500/50 bg-zinc-900/50 cursor-pointer overflow-hidden group transition-all flex items-center justify-center";

        // ADAPTIVE SIZING: Use Viewport Height (vh) to ensure fit
        // Logic: h-[45vh] ensures cards take up ~45% of screen height. 
        // With Header (~10vh) + Controls (~15vh), this leaves room for Generate button.
        // We use aspect-ratio to determine width automatically.

        if (aspectRatio === '16:9') return `${base} h-[25vh] md:h-[35vh] lg:h-[45vh] aspect-video`; // Width auto-calculated
        if (aspectRatio === '9:16') return `${base} h-[35vh] md:h-[45vh] lg:h-[55vh] aspect-[9/16]`; // Width auto-calculated
        if (aspectRatio === '1:1') return `${base} h-[25vh] md:h-[35vh] lg:h-[45vh] aspect-square`;

        return `${base} h-[25vh] md:h-[35vh] lg:h-[45vh] aspect-square`;
    };

    return (
        <div className="w-full flex flex-col items-center">
            {/* TOP SECTION: Editor & Controls (Fits in Viewport) */}
            <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center py-4 gap-6 shrink-0 relative z-10 mt-24">

                {/* 1. Format Selector (Original Text Style) */}
                <div className="flex gap-4 md:gap-8 shrink-0 relative z-10 self-center">
                    <button
                        onClick={() => setAspectRatio('16:9')}
                        className={`text-[10px] md:text-xs font-black uppercase tracking-[0.2em] transition-all ${aspectRatio === '16:9' ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                        YouTube (16:9)
                    </button>
                    <button
                        onClick={() => setAspectRatio('9:16')}
                        className={`text-[10px] md:text-xs font-black uppercase tracking-[0.2em] transition-all ${aspectRatio === '9:16' ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                        Shorts (9:16)
                    </button>
                    <button
                        onClick={() => setAspectRatio('1:1')}
                        className={`text-[10px] md:text-xs font-black uppercase tracking-[0.2em] transition-all ${aspectRatio === '1:1' ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'}`}
                    >
                        Square (1:1)
                    </button>
                </div>

                {/* 2. Upload Cards (Adaptive) */}
                <div className="flex flex-row gap-4 md:gap-8 items-center justify-center w-full max-w-7xl px-4">
                    {/* Reference Video */}
                    <div className="flex flex-col gap-2 items-center">
                        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em]">Reference</span>
                        <div
                            onClick={() => document.getElementById('mc-start-upload')?.click()}
                            className={getContainerClasses()}
                            style={aspectRatio === 'free' && videoDimensions ? { aspectRatio: `${videoDimensions.width} / ${videoDimensions.height}`, height: '45vh', width: 'auto' } : undefined}
                        >
                            {startVideo ? (
                                <video src={startVideo} className="w-full h-full object-contain bg-black/20" autoPlay muted loop />
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-3 p-4 text-center">
                                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors border border-white/10 group-hover:border-white/20 group-hover:scale-110 duration-300">
                                        <Play className="w-5 h-5 text-zinc-500 group-hover:text-white ml-0.5" />
                                    </div>
                                    <span className="text-[10px] text-zinc-500 font-bold group-hover:text-zinc-300 uppercase tracking-wide">Upload Video</span>
                                </div>
                            )}
                            <input type="file" id="mc-start-upload" accept="video/*" className="hidden" onChange={(e) => handleUpload(e, 'start')} />
                            {startVideo && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setStartVideo(null); setVideoDuration(0); }}
                                    className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full hover:bg-red-500/80 text-white z-10 backdrop-blur-md transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Target Image (Optional) */}
                    {/* Temporarily hidden or smaller if needed, but keeping symmetric for now */}
                    <div className="flex flex-col gap-2 items-center">
                        <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em]">Target (Optional)</span>
                        <div
                            onClick={() => document.getElementById('mc-end-upload')?.click()}
                            className={getContainerClasses()}
                        >
                            {endImage ? (
                                <img src={endImage} className="w-full h-full object-contain bg-black/20" />
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-3 p-4 text-center">
                                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors border border-white/10 group-hover:border-white/20 group-hover:scale-110 duration-300">
                                        <Plus className="w-5 h-5 text-zinc-500 group-hover:text-white" />
                                    </div>
                                    <span className="text-[10px] text-zinc-500 font-bold group-hover:text-zinc-300 uppercase tracking-wide">Add Image</span>
                                </div>
                            )}
                            <input type="file" id="mc-end-upload" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, 'end')} />
                            {endImage && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setEndImage(null); }}
                                    className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full hover:bg-red-500/80 text-white z-10 backdrop-blur-md transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. Generate Controls & Info */}
                <div className="flex flex-col items-center gap-6 w-full max-w-2xl px-4">

                    {/* Quality Selector */}
                    <div className="w-full space-y-3">
                        <div className="flex justify-between items-center px-1">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Quality Mode</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
                            <button
                                onClick={() => setQualityMode('normal')}
                                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all ${qualityMode === 'normal' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                <span className="text-[10px] font-black uppercase tracking-wider">Normal (720p)</span>
                                <span className="text-[8px] font-medium opacity-60">4 Credits / Sec</span>
                            </button>
                            <button
                                onClick={() => setQualityMode('pro')}
                                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all ${qualityMode === 'pro' ? 'bg-gradient-to-br from-orange-600/40 to-orange-900/40 text-white shadow-md border border-orange-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                <span className="text-[10px] font-black uppercase tracking-wider text-orange-400">Pro (1080p)</span>
                                <span className="text-[8px] font-medium opacity-60">8 Credits / Sec</span>
                            </button>
                        </div>
                    </div>


                    {/* Credit Calculation */}
                    <div className="flex flex-col items-center gap-2">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                            {Math.ceil(videoDuration || 5)}s / {cost} Credits
                        </span>
                    </div>

                    {/* Main Action Button */}
                    <div className="flex gap-4 w-full">
                        <div className="flex-1">
                            {(!profile || (profile.credits || 0) < cost) ? (
                                <Button
                                    onClick={() => router.push('/pricing')}
                                    className="w-full h-12 bg-orange-600/20 hover:bg-orange-600/30 text-orange-500 border border-orange-600/50 font-black tracking-widest uppercase rounded-lg transition-all"
                                >
                                    Get Credits ({cost})
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleGenerate}
                                    disabled={isGenerating || !startVideo}
                                    className={`w-full h-12 font-black tracking-widest uppercase rounded-lg transition-all flex items-center justify-center gap-2 ${isGenerating ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-white text-black hover:bg-zinc-200'}`}
                                >
                                    {isGenerating ? (
                                        <>
                                            <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-4 h-4" />
                                            GENERATE VIDEO
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                        <div className="w-12 h-12 shrink-0 rounded-lg bg-zinc-900 border border-white/10 flex items-center justify-center cursor-pointer hover:bg-zinc-800 transition-colors">
                            <BookOpen className="w-5 h-5 text-white" />
                        </div>
                    </div>

                    {/* Swap to Look Templates Button */}
                    <button
                        onClick={() => document.getElementById('motion-library')?.scrollIntoView({ behavior: 'smooth' })}
                        className="flex flex-col items-center gap-1 group cursor-pointer opacity-50 hover:opacity-100 transition-all duration-300"
                    >
                        <span className="text-[9px] font-black text-white uppercase tracking-[0.2em] group-hover:tracking-[0.3em] transition-all">
                            Swap to Look Templates
                        </span>
                        <ChevronDown className="w-4 h-4 text-white/50 group-hover:text-white transition-colors animate-bounce" />
                    </button>
                </div>
            </div>

            {/* Unified Library Section */}
            <div className="w-full 2xl:w-[850px] lg:w-full md:w-full bg-transparent flex flex-col 2xl:overflow-hidden shrink-0 h-auto 2xl:h-full">
                <div className="flex-1 overflow-y-auto custom-scrollbar pt-8 md:pt-12 pb-8 md:pb-12 px-4 md:px-8 2xl:px-12">
                    {/* Library Header: Aligned with Format Bar */}
                    <div className="flex justify-center mb-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">MOTION LIBRARY</span>
                    </div>

                    <div className="flex flex-col 2xl:flex-row gap-4 md:gap-6 items-start mt-8 md:mt-12">
                        {/* Reference Column */}
                        <div className="w-full 2xl:w-1/3 grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 2xl:flex 2xl:flex-col gap-3 md:gap-4 2xl:gap-6">
                            {/* Add Yours Card */}
                            <div
                                onClick={() => document.getElementById('mc-start-upload')?.click()}
                                className="group relative aspect-[9/16] rounded-2xl overflow-hidden border border-dashed border-white/10 bg-zinc-900/40 hover:border-orange-500/50 transition-all cursor-pointer flex flex-col items-center justify-center gap-2"
                            >
                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                                    <Plus className="w-5 h-5 text-zinc-500 group-hover:text-orange-500" />
                                </div>
                                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest group-hover:text-orange-500 transition-colors text-center">Add yours</span>
                            </div>

                            {/* Reference Presets */}
                            {refPresets.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => {
                                        handleSetReference(item.preview_video_url || '');
                                        setSelectedPresetId(item.id);
                                    }}
                                    className={`group relative aspect-[9/16] rounded-2xl overflow-hidden border transition-all cursor-pointer ${selectedPresetId === item.id ? 'border-orange-500 shadow-lg shadow-orange-500/20' : 'border-white/5 bg-zinc-900/80 hover:border-white/20'}`}
                                >
                                    {item.preview_video_url ? (
                                        <video
                                            src={item.preview_video_url}
                                            className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                                            autoPlay muted loop playsInline
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center opacity-10">
                                            <Play className="w-8 h-8 text-white" />
                                        </div>
                                    )}

                                    {startVideo === item.preview_video_url && (
                                        <div className="absolute top-2 right-2 z-10">
                                            <div className="bg-orange-500 rounded-full p-1 shadow-lg">
                                                <Check className="w-3 h-3 text-white" />
                                            </div>
                                        </div>
                                    )}

                                    <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[9px] font-black text-white/90 uppercase tracking-widest block truncate">{item.name}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Presets Columns */}
                        <div className="w-full 2xl:w-2/3 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-2 gap-3 md:gap-4 2xl:gap-6">
                            {presets.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => {
                                        setSelectedPresetId(item.id);
                                        setSelectedPreset(item);
                                        if (item.preview_video_url) handleSetReference(item.preview_video_url);
                                    }}
                                    className={`group relative aspect-[9/16] rounded-2xl overflow-hidden border transition-all cursor-pointer ${selectedPresetId === item.id ? 'border-orange-500 shadow-lg shadow-orange-500/20' : 'border-white/5 bg-zinc-900/80 hover:border-white/20'}`}
                                >
                                    {item.preview_video_url ? (
                                        <video
                                            src={item.preview_video_url}
                                            className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                                            autoPlay muted loop playsInline
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center opacity-10 group-hover:opacity-30 transition-opacity">
                                            <Play className="w-8 h-8 text-white" />
                                        </div>
                                    )}

                                    {selectedPresetId === item.id && (
                                        <div className="absolute top-2 right-2 z-10">
                                            <div className="bg-orange-500 rounded-full p-1 shadow-lg">
                                                <Check className="w-3 h-3 text-white" />
                                            </div>
                                        </div>
                                    )}

                                    <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[9px] font-black text-white/90 uppercase tracking-widest block truncate">{item.name}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div >

            {/* Overlays */}
            <AnimatePresence>
                {
                    generatedVideoUrl && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6"
                        >
                            <button onClick={() => setGeneratedVideoUrl(null)} className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors group text-white">
                                <X className="w-6 h-6 text-white/50 group-hover:text-white" />
                            </button>
                            <div className="relative w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                                <video src={generatedVideoUrl} controls autoPlay loop className="w-full h-full object-contain" />
                            </div>
                            <div className="mt-8 flex items-center gap-4">
                                <button onClick={() => {
                                    const a = document.createElement('a'); a.href = generatedVideoUrl!; a.download = `motion-control-${Date.now()}.mp4`;
                                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
                                }} className="px-6 py-3 bg-white text-black rounded-xl font-bold hover:bg-zinc-200 transition-colors flex items-center gap-2">
                                    <Download className="w-5 h-5" /> Download Video
                                </button>
                                <button onClick={() => onBack()} className="px-6 py-3 bg-white/10 text-white rounded-xl font-bold hover:bg-white/20 transition-colors">
                                    Back to Gallery
                                </button>
                            </div>
                        </motion.div>
                    )
                }
            </AnimatePresence >

            <AnimatePresence>
                {previewPreset && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                        onClick={(e) => { if (e.target === e.currentTarget) setPreviewPreset(null); }}
                    >
                        <div className="bg-transparent w-full max-w-3xl p-0 relative flex flex-col gap-4">
                            <div className="flex justify-end mb-2">
                                <button onClick={() => setPreviewPreset(null)} className="bg-black/50 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-md transition-all">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="w-full aspect-video rounded-xl overflow-hidden shadow-2xl relative">
                                {previewPreset.preview_video_url ? (
                                    <video src={previewPreset.preview_video_url} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-black/50 backdrop-blur-sm text-zinc-400 border border-white/10">
                                        <span className="text-xs">No preview video</span>
                                    </div>
                                )}
                            </div>
                            <div className="bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl p-4 flex items-center justify-between gap-4 text-white">
                                <div className="flex flex-col">
                                    <h3 className="text-lg font-bold">{previewPreset.name}</h3>
                                    {previewPreset.description && <p className="text-xs text-zinc-400">{previewPreset.description}</p>}
                                </div>
                                <Button
                                    onClick={() => {
                                        setSelectedPresetId(previewPreset.id);
                                        setSelectedPreset(previewPreset);
                                        setPreviewPreset(null);
                                    }}
                                    className="bg-white hover:bg-zinc-200 text-black rounded-lg px-6 py-2 font-bold"
                                >
                                    Use This Motion
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showFullPrompt && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    >
                        <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-5xl p-6 shadow-2xl relative text-white">
                            <button onClick={() => setShowFullPrompt(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
                            <h3 className="text-lg font-bold mb-4">Edit Full Prompt</h3>
                            <textarea
                                value={fullPromptPreview}
                                onChange={(e) => setFullPromptPreview(e.target.value)}
                                className="w-full h-64 bg-black/50 border border-white/10 rounded-xl p-4 text-sm text-white focus:ring-1 focus:ring-orange-500 resize-none mb-4 custom-scrollbar"
                            />
                            <Button onClick={() => setShowFullPrompt(false)} className="bg-white text-black hover:bg-zinc-200 w-full rounded-lg h-12 font-bold">Done</Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}
