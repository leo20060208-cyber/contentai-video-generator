'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { getSectionContent } from '@/lib/db/content';
import {
    X,
    Upload,
    Sparkles,
    Brush,
    Eraser,
    RotateCcw,
    Play,
    Clock,
    Layers,
    Image as ImageIcon,
    Loader2,
    Check,
    Type,
    Zap,
    Plus,
    PlayCircle,
    BookOpen,
    Download
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase';

interface LivingBackgroundEditorProps {
    image: string;
    onBack: () => void;
    initialDefaultPrompt?: string;
    initialPresets?: PromptPreset[];
}

interface MaskStroke {
    points: number[][];
    type: 'brush' | 'eraser';
    width: number;
}

// Presets Interface
interface PromptPreset {
    id: string;
    name: string;
    prompt_template: string;
    description?: string;
    preview_video_url?: string | null;
}

export function LivingBackgroundEditor({ image, onBack, initialDefaultPrompt, initialPresets = [] }: LivingBackgroundEditorProps) {
    const router = useRouter();
    // Media State
    const [maskStrokes, setMaskStrokes] = useState<MaskStroke[]>([]);
    const [currentStroke, setCurrentStroke] = useState<number[][]>([]);
    const [brushSize, setBrushSize] = useState(40);
    const [activeTool, setActiveTool] = useState<'brush' | 'eraser'>('brush');

    // Generation Params
    const [userPrompt, setUserPrompt] = useState('');
    const [basePrompt, setBasePrompt] = useState('');
    const [showFullPrompt, setShowFullPrompt] = useState(false);
    const [fullPromptPreview, setFullPromptPreview] = useState('');

    useEffect(() => {
        setFullPromptPreview(`${userPrompt ? userPrompt + '. ' : ''}${basePrompt}`);
    }, [userPrompt, basePrompt]);
    const [duration, setDuration] = useState<5 | 10>(5);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
    const [contextImages, setContextImages] = useState<string[]>([]);

    const { user, profile, deductCreditsOptimistic, session } = useAuth();

    // Canvas Refs
    const canvasContainerRef = useRef<HTMLDivElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawingRef = useRef(false);

    // Cursor Position
    const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
    const [isHoveringCanvas, setIsHoveringCanvas] = useState(false);

    // Prompt Logic
    // Prompt Logic
    const [dbBasePrompt, setDbBasePrompt] = useState(initialDefaultPrompt || 'Keep the main subject/product perfectly still and sharp. Animate only the background areas I have painted with a smooth, natural motion.\n\nSTRICT RECREATION REQUIREMENTS:\n- EXACT DURATION: {{DURATION}} seconds. Do not change the speed.\n- Maintain original style and lighting.\n- Photorealistic, high fidelity.\n- OUTPUT VIDEO MUST HAVE THE SAME RESOLUTION AND ASPECT RATIO AS THE REFERENCE IMAGE.');

    // Presets State
    const [presets, setPresets] = useState<PromptPreset[]>(initialPresets);
    const [showPresets, setShowPresets] = useState(false);
    const [selectedPresetId, setSelectedPresetId] = useState<string | 'default'>('default');
    const [previewPreset, setPreviewPreset] = useState<PromptPreset | null>(null);
    const [currentTemplate, setCurrentTemplate] = useState('');

    useEffect(() => {
        if (initialDefaultPrompt && initialPresets && initialPresets.length > 0) return; // Skip if all props provided

        async function loadData() {
            // Load Default Prompt
            if (!initialDefaultPrompt) {
                try {
                    const data = await getSectionContent('living_background_default_prompt');
                    if (data?.prompt) {
                        setDbBasePrompt(data.prompt);
                        // Only set current template if we remain on default
                        if (selectedPresetId === 'default') {
                            setCurrentTemplate(data.prompt);
                        }
                    }
                } catch (e) { console.error(e); }
            }

            // Load Presets
            if (!initialPresets || initialPresets.length === 0) {
                try {
                    const { data } = await supabase.from('prompt_presets')
                        .select('*')
                        .eq('category', 'living_background')
                        .order('created_at', { ascending: false });
                    if (data) setPresets(data);
                } catch (e) { console.error(e); }
            }
        }
        loadData();
    }, [initialDefaultPrompt, initialPresets]); // Dependencies updated

    // Update current template when dbBasePrompt loads (initial sync)
    useEffect(() => {
        if (dbBasePrompt && selectedPresetId === 'default') {
            setCurrentTemplate(dbBasePrompt);
        }
    }, [dbBasePrompt, selectedPresetId]);


    useEffect(() => {
        // Inject dynamic values into the base prompt template
        let p = currentTemplate || dbBasePrompt;

        if (p.includes('{{DURATION}}')) {
            p = p.replace('{{DURATION}}', duration.toString());
        } else if (!p.includes('EXACT DURATION')) {
            // Backward compatibility if template doesn't have duration tag
            p += `\n\nSTRICT RECREATION REQUIREMENTS:\n- EXACT DURATION: ${duration} seconds. Do not change the speed.\n- Maintain original style and lighting.\n- Photorealistic, high fidelity.\n- OUTPUT VIDEO MUST HAVE THE SAME RESOLUTION AND ASPECT RATIO AS THE REFERENCE IMAGE.`;
        }
        setBasePrompt(p);
    }, [duration, currentTemplate, dbBasePrompt]);

    const openPreview = (preset: PromptPreset) => {
        setPreviewPreset(preset);
        setShowPresets(false);
    };

    const confirmPresetSelection = (preset: PromptPreset) => {
        handlePresetSelect(preset.id);
        setPreviewPreset(null);
    };

    const handlePresetSelect = (presetId: string) => {
        if (presetId === 'default') {
            setSelectedPresetId('default');
            setCurrentTemplate(dbBasePrompt);
        } else {
            const preset = presets.find(p => p.id === presetId);
            if (preset) {
                setSelectedPresetId(presetId);
                // Directly set current template which triggers the effect
                setCurrentTemplate(preset.prompt_template);

                // Also force immediate basePrompt format to ensure responsiveness even before effect
                // (though Effect is fast, this double-check doesn't hurt logic coherence)
                let p = preset.prompt_template;
                if (p.includes('{{DURATION}}')) {
                    p = p.replace('{{DURATION}}', duration.toString());
                } else if (!p.includes('EXACT DURATION')) {
                    p += `\n\nSTRICT RECREATION REQUIREMENTS:\n- EXACT DURATION: ${duration} seconds. Do not change the speed.\n- Maintain original style and lighting.\n- Photorealistic, high fidelity.\n- OUTPUT VIDEO MUST HAVE THE SAME RESOLUTION AND ASPECT RATIO AS THE REFERENCE IMAGE.`;
                }
                setBasePrompt(p);
            }
        }
        setShowPresets(false);
    };

    // Drawing Logic
    const getPoint = (e: React.MouseEvent | React.TouchEvent) => {
        if (!canvasContainerRef.current) return null;
        const rect = canvasContainerRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

        // Update cursor position
        setCursorPos({ x: clientX, y: clientY });

        return [x, y];
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        setCursorPos({ x: e.clientX, y: e.clientY });
        if (isDrawingRef.current) {
            draw(e);
        }
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        isDrawingRef.current = true;
        const p = getPoint(e);
        if (p) {
            setCurrentStroke([p]);
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawingRef.current) return;
        const p = getPoint(e);
        if (p) {
            setCurrentStroke(prev => [...prev, p]);
        }
    };

    const stopDrawing = () => {
        if (!isDrawingRef.current) return;
        isDrawingRef.current = false;
        if (currentStroke.length > 0) {
            setMaskStrokes(prev => [...prev, {
                points: currentStroke,
                type: activeTool,
                width: brushSize
            }]);
        }
        setCurrentStroke([]);
    };

    // Render Overlay Canvas
    useEffect(() => {
        const canvas = overlayCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Sync canvas size with display size
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const drawStroke = (stroke: MaskStroke | { points: number[][], type: string, width: number }) => {
            if (stroke.points.length < 2) return;
            ctx.beginPath();
            ctx.strokeStyle = stroke.type === 'brush' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.8)';
            ctx.lineWidth = stroke.width;

            // Composite operation for eraser
            if (stroke.type === 'eraser') {
                ctx.globalCompositeOperation = 'destination-out';
            } else {
                ctx.globalCompositeOperation = 'source-over';
            }

            ctx.moveTo(stroke.points[0][0] * canvas.width, stroke.points[0][1] * canvas.height);
            for (let i = 1; i < stroke.points.length; i++) {
                ctx.lineTo(stroke.points[i][0] * canvas.width, stroke.points[i][1] * canvas.height);
            }
            ctx.stroke();
        };

        // Draw saved strokes
        maskStrokes.forEach(drawStroke);

        // Draw current stroke
        if (currentStroke.length > 0) {
            drawStroke({ points: currentStroke, type: activeTool, width: brushSize });
        }
    }, [maskStrokes, currentStroke, activeTool, brushSize]);

    const handleAddContextImage = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            setContextImages(prev => [...prev, ev.target?.result as string]);
        };
        reader.readAsDataURL(file);
    };

    const generateMaskImage = (): Promise<string | null> => {
        return new Promise((resolve) => {
            if (maskStrokes.length === 0) { resolve(null); return; }
            const canvas = document.createElement('canvas');
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) { resolve(null); return; }

                ctx.fillStyle = 'black';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                maskStrokes.forEach(stroke => {
                    ctx.beginPath();
                    ctx.strokeStyle = stroke.type === 'brush' ? 'white' : 'black';
                    ctx.lineWidth = stroke.width * (canvas.width / (overlayCanvasRef.current?.width || 1));
                    ctx.moveTo(stroke.points[0][0] * canvas.width, stroke.points[0][1] * canvas.height);
                    for (let i = 1; i < stroke.points.length; i++) {
                        ctx.lineTo(stroke.points[i][0] * canvas.width, stroke.points[i][1] * canvas.height);
                    }
                    ctx.stroke();
                });
                resolve(canvas.toDataURL('image/png'));
            };
            img.src = image;
        });
    };

    const handleGenerate = async () => {
        if (isGenerating) return;
        setIsGenerating(true);
        setGenerationProgress(0);

        try {
            // 1. Generate Mask
            const maskBase64 = await generateMaskImage();
            if (!maskBase64) {
                throw new Error('Failed to generate mask');
            }

            // 2. Upload mask to Supabase Storage
            const maskBlob = await fetch(maskBase64).then(r => r.blob());
            const maskFileName = `masks/${Date.now()}.png`;

            const { data: maskUpload, error: maskError } = await supabase.storage
                .from('videos')
                .upload(maskFileName, maskBlob, {
                    contentType: 'image/png'
                });

            if (maskError) {
                throw new Error('Failed to upload mask: ' + maskError.message);
            }

            const { data: { publicUrl: maskUrl } } = supabase.storage
                .from('videos')
                .getPublicUrl(maskFileName);

            // 3. Get session for Auth
            const { data: { session } } = await supabase.auth.getSession();

            // 4. Call Living Backgrounds API
            setGenerationProgress(10);
            const response = await fetch('/api/magic-video/living-backgrounds', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
                },
                body: JSON.stringify({
                    imageUrl: image,
                    maskUrl: maskUrl,
                    prompt: fullPromptPreview, // Use computed prompt
                    duration: duration,
                    contextImages: contextImages
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || errorData.message || `Generation failed (${response.status})`);
            }

            const data = await response.json();
            setGenerationProgress(20);

            // 4. Poll for status
            if (data.taskId) {
                let completed = false;

                while (!completed) {
                    await new Promise(r => setTimeout(r, 2000));

                    const statusRes = await fetch(`/api/magic-video/status/${data.taskId}`);
                    const statusData = await statusRes.json();

                    if (statusData.status === 'completed' && statusData.videoUrl) {
                        setGeneratedVideoUrl(statusData.videoUrl);
                        completed = true;
                        setGenerationProgress(100);
                    } else if (statusData.status === 'failed') {
                        throw new Error('Generation failed on server');
                    } else {
                        // Progress simulation while processing
                        setGenerationProgress(prev => Math.min(95, prev + 1.5));
                    }
                }
            }
        } catch (error: any) {
            console.error('Generation error:', error);
            alert(error.message || 'Generation failed. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 top-16 bg-transparent flex flex-col overflow-hidden">

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col md:flex-row relative items-center justify-center px-4 md:px-20 pt-4 md:pt-16 pb-12 min-h-0 overflow-hidden">

                {/* Floating Left Toolbar */}
                <div className="relative md:absolute z-50 flex gap-4 transition-all duration-300 flex-col md:flex-row md:left-6 md:top-1/2 md:-translate-y-1/2 md:translate-x-0 items-center mb-4 md:mb-0">
                    {/* Tool Buttons */}
                    <div className="flex flex-row md:flex-col gap-2">
                        <button
                            onClick={() => setActiveTool('brush')}
                            className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all backdrop-blur-md border ${activeTool === 'brush' ? 'bg-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)] border-orange-500' : 'bg-zinc-900/60 text-zinc-500 hover:text-white hover:bg-white/5 border-white/10'}`}
                            title="Brush"
                        >
                            <Brush className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setActiveTool('eraser')}
                            className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all backdrop-blur-md border ${activeTool === 'eraser' ? 'bg-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)] border-orange-500' : 'bg-zinc-900/60 text-zinc-500 hover:text-white hover:bg-white/5 border-white/10'}`}
                            title="Eraser"
                        >
                            <Eraser className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setMaskStrokes([])}
                            className="w-12 h-12 flex items-center justify-center rounded-xl bg-zinc-900/60 backdrop-blur-md border border-white/10 text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
                            title="Clear Mask"
                        >
                            <RotateCcw className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Vertical Slider Container */}
                    <div className="h-10 w-[160px] md:h-[160px] md:w-10 flex flex-row md:flex-col items-center justify-between px-3 md:px-0 md:py-3 bg-zinc-900/60 backdrop-blur-md border border-white/10 rounded-full">
                        {/* Icono pequeño arriba para indicar tamaño */}
                        <div className="w-1.5 h-1.5 rounded-full bg-white/20 mr-1 md:mr-0 md:mb-1"></div>

                        <div className="relative flex-1 w-full flex items-center justify-center">
                            <input
                                type="range"
                                min="5"
                                max="100"
                                value={brushSize}
                                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                                className="slider-vertical absolute md:rotate-[-90deg] origin-center"
                                style={{
                                    width: '120px',
                                    background: `linear-gradient(to right, #f97316 ${((brushSize - 5) / (100 - 5)) * 100}%, rgba(255,255,255,0.1) ${((brushSize - 5) / (100 - 5)) * 100}%)`
                                }}
                            />
                        </div>

                        <span className="text-[10px] font-bold text-white/70 ml-1 md:ml-0 md:mt-1">{brushSize}</span>
                    </div>
                </div>

                <style jsx global>{`
                    .slider-vertical {
                        -webkit-appearance: none;
                        appearance: none;
                        /* Background is set inline for dynamic progress */
                        height: 2px; /* Very thin track */
                        border-radius: 2px;
                        outline: none;
                        cursor: pointer;
                    }
                    
                    /* Track Styles */
                    .slider-vertical::-webkit-slider-runnable-track { width: 100%; height: 2px; background: transparent; border-radius: 2px; border: none; }
                    .slider-vertical::-moz-range-track { width: 100%; height: 2px; background: transparent; border-radius: 2px; border: none; }
                    
                    /* Thumb Styles */
                    .slider-vertical::-webkit-slider-thumb {
                        -webkit-appearance: none; appearance: none;
                        width: 16px; height: 16px; border-radius: 50%;
                        background: white; border: 2px solid #f97316;
                        box-shadow: 0 0 5px rgba(0,0,0,0.5);
                        margin-top: -7px;
                        transition: transform 0.1s;
                        z-index: 10;
                    }
                    .slider-vertical::-moz-range-thumb {
                        width: 16px; height: 16px; border-radius: 50%;
                        background: white; border: 2px solid #f97316;
                        transition: transform 0.1s;
                    }
                    .slider-vertical::-webkit-slider-thumb:hover { transform: scale(1.1); box-shadow: 0 0 8px rgba(249, 115, 22, 0.6); }
                `}</style>

                {/* Center Canvas */}
                <div
                    ref={canvasContainerRef}
                    className="relative max-w-full h-full flex items-center justify-center aspect-auto rounded-xl overflow-hidden bg-transparent group cursor-none touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={handleMouseMove}
                    onMouseUp={stopDrawing}
                    onMouseEnter={() => setIsHoveringCanvas(true)}
                    onMouseLeave={() => {
                        setIsHoveringCanvas(false);
                        stopDrawing();
                    }}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                >
                    <img
                        src={image}
                        alt="Main Image"
                        className="w-full h-full object-contain pointer-events-none select-none max-h-full"
                        draggable={false}
                    />

                    <canvas
                        ref={overlayCanvasRef}
                        className="absolute inset-0 w-full h-full pointer-events-none"
                    />

                    {/* Custom Brush Cursor */}
                    {!isGenerating && isHoveringCanvas && (
                        <div
                            className="pointer-events-none fixed z-[100] border border-white/50 rounded-full bg-white/10 ring-1 ring-black/50"
                            style={{
                                width: `${brushSize}px`,
                                height: `${brushSize}px`,
                                left: cursorPos.x,
                                top: cursorPos.y,
                                transform: 'translate(-50%, -50%)',
                                backgroundColor: activeTool === 'brush' ? 'rgba(255,255,255,0.2)' : 'rgba(255,0,0,0.2)',
                            }}
                        />
                    )}
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

                        <div className="relative w-full max-w-5xl max-h-[85vh] aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex items-center justify-center">
                            <video
                                src={generatedVideoUrl}
                                controls
                                autoPlay
                                loop
                                className="w-full h-full object-contain"
                            />
                        </div>

                        <div className="mt-6 flex items-center gap-4">
                            <button
                                onClick={() => {
                                    const a = document.createElement('a');
                                    a.href = generatedVideoUrl;
                                    a.download = `magic-video-${Date.now()}.mp4`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                }}
                                className="px-6 py-3 bg-white text-black rounded-xl font-bold hover:bg-zinc-200 transition-colors flex items-center gap-2 shadow-lg shadow-white/10"
                            >
                                <Download className="w-5 h-5" />
                                Download Video
                            </button>
                            <button
                                onClick={() => onBack()}
                                className="px-6 py-3 bg-white/10 text-white rounded-xl font-bold hover:bg-white/20 transition-colors border border-white/10"
                            >
                                Back to Gallery
                            </button>
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
                    <div className="bg-zinc-900/60 backdrop-blur-md rounded-xl p-1 flex flex-col gap-1 border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                        <div className="flex gap-2">
                            <div className="flex-1 bg-transparent rounded-lg p-2">
                                <textarea
                                    value={userPrompt}
                                    onChange={(e) => setUserPrompt(e.target.value)}
                                    className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs text-white placeholder-zinc-500 resize-none h-6 custom-scrollbar leading-tight focus:bg-transparent"
                                    placeholder="Add prompt..."
                                />
                            </div>

                            <div className="flex flex-col items-start gap-1">
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                    className="w-40 bg-white/5 hover:bg-white/10 backdrop-blur-md disabled:bg-transparent disabled:text-zinc-700 text-orange-500 border border-orange-500/30 hover:border-orange-500/60 font-bold text-[10px] rounded-lg transition-all flex flex-col items-center justify-center gap-0.5 shadow-lg shadow-orange-500/10 h-9"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>{generationProgress}%</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="flex items-center gap-1">
                                                GENERATE
                                            </span>
                                            <span className="text-[7px] opacity-40">COST: {duration === 10 ? 55 : 30} CR</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Control Badges */}
                        <div className="flex items-center justify-between px-2 pb-1 relative">
                            <div className="flex items-center gap-2">
                                <div className="flex bg-transparent p-1">
                                    <button
                                        onClick={() => setDuration(5)}
                                        className={`px-4 py-1.5 rounded-lg text-[9px] font-black transition-all ${duration === 5 ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-white'}`}
                                    >
                                        5s
                                    </button>
                                    <button
                                        onClick={() => setDuration(10)}
                                        className={`px-4 py-1.5 rounded-lg text-[9px] font-black transition-all ${duration === 10 ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-white'}`}
                                    >
                                        10s
                                    </button>
                                </div>

                                {/* PRESETS BUTTON */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowPresets(!showPresets)}
                                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all border border-white/5 flex items-center gap-1 ${showPresets ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-white'}`}
                                    >
                                        <Sparkles className="w-3 h-3" />
                                        {selectedPresetId !== 'default' ? (presets.find(p => p.id === selectedPresetId)?.name.toUpperCase() || 'BACKGROUNDS') : 'BACKGROUNDS'}
                                    </button>

                                    {/* PRESETS POPUP */}
                                    <AnimatePresence>
                                        {showPresets && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 10 }}
                                                className="absolute bottom-full left-0 mb-2 w-72 bg-zinc-900 border border-white/10 rounded-xl p-2 shadow-xl z-50 max-h-[400px] overflow-y-auto custom-scrollbar"
                                            >
                                                <div className="space-y-1">
                                                    <button
                                                        onClick={() => handlePresetSelect('default')}
                                                        className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex flex-col gap-0.5 ${selectedPresetId === 'default' ? 'bg-white text-black' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                                                    >
                                                        <span className="font-bold">Yours (Default)</span>
                                                        <span className={`text-[9px] ${selectedPresetId === 'default' ? 'text-zinc-600' : 'text-zinc-500'}`}>Use your configured instructions</span>
                                                    </button>

                                                    {presets.map(preset => (
                                                        <button
                                                            key={preset.id}
                                                            onClick={() => openPreview(preset)}
                                                            className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex gap-3 ${selectedPresetId === preset.id ? 'bg-white text-black' : 'text-zinc-400 hover:bg-white/5 hover:text-white bg-black/20'}`}
                                                        >
                                                            {/* Video Thumbnail */}
                                                            <div className="w-16 h-16 shrink-0 bg-black rounded overflow-hidden relative border border-white/10">
                                                                {preset.preview_video_url ? (
                                                                    <video
                                                                        src={preset.preview_video_url}
                                                                        className="w-full h-full object-cover"
                                                                        muted
                                                                        loop
                                                                        autoPlay
                                                                        playsInline
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-600">
                                                                        <Sparkles className="w-4 h-4" />
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="flex flex-col gap-1 py-1 min-w-0">
                                                                <span className="font-bold truncate">{preset.name}</span>
                                                                {preset.description && (
                                                                    <span className={`text-[9px] line-clamp-2 leading-tight ${selectedPresetId === preset.id ? 'text-zinc-600' : 'text-zinc-500'}`}>{preset.description}</span>
                                                                )}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowFullPrompt(true)}
                                    className="text-[9px] font-black text-zinc-500 hover:text-white transition-colors whitespace-nowrap uppercase tracking-widest mr-2"
                                >
                                    VIEW FULL PROMPT
                                </button>

                                <button
                                    onClick={() => router.push('/guide/living-backgrounds')}
                                    className="text-[9px] font-black text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-widest flex items-center gap-1"
                                    title="View Guide"
                                >
                                    <BookOpen className="w-3 h-3" />
                                    GUIDE
                                </button>

                                {contextImages.map((img, i) => (
                                    <div key={i} className="relative w-8 h-8 rounded-lg overflow-hidden border border-white/20 group">
                                        <img src={img} className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => setContextImages(prev => prev.filter((_, idx) => idx !== i))}
                                            className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-2 h-2 text-white" />
                                        </button>
                                    </div>
                                ))}
                                <input
                                    type="file"
                                    id="context-image-upload"
                                    className="hidden"
                                    onChange={handleAddContextImage}
                                    accept="image/*"
                                />
                                <button
                                    onClick={() => document.getElementById('context-image-upload')?.click()}
                                    className="text-[9px] font-black text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-widest flex items-center gap-2"
                                >
                                    <Plus className="w-3 h-3" />
                                    ADD IMAGE
                                </button>
                            </div>
                        </div>
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
            </div>
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
                            {/* Close Button */}
                            <div className="flex justify-end mb-2">
                                <button
                                    onClick={() => setPreviewPreset(null)}
                                    className="bg-black/50 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-md transition-all"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Video Container */}
                            <div className="w-full aspect-video rounded-xl overflow-hidden shadow-2xl relative">
                                {previewPreset.preview_video_url ? (
                                    <video
                                        src={previewPreset.preview_video_url}
                                        className="w-full h-full object-cover"
                                        autoPlay
                                        loop
                                        muted
                                        playsInline
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
        </div >
    );
}
