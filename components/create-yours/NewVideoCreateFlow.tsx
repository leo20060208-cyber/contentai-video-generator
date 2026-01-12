'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, Sparkles, Plus, Layers, Image as ImageIcon, Video, Play, Pause, Wand2, Search, Check, Info, Brush, Eraser, Move, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client for Realtime (if needed) or direct DB access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

interface ProductLayer {
    id: string;
    url: string; // The image source
    type: 'product' | 'mask'; // Is this a product or a text/shape mask?
    name: string;
    detailText?: string;
    maskPoints: { points: number[][]; type: 'brush' | 'eraser'; width: number }[];
    maskColor: string;
}

const LAYER_COLORS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

interface NewVideoCreateFlowProps {
    onCancel?: () => void;
}

export const NewVideoCreateFlow = ({ onCancel }: NewVideoCreateFlowProps) => {
    const router = useRouter();
    const pathname = usePathname();
    const { user, session, profile, deductCreditsOptimistic } = useAuth();

    // --- STATE ---

    // Video State
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [videoDuration, setVideoDuration] = useState<number>(0);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Frame Extraction & Masking
    const [extractedFrameUrl, setExtractedFrameUrl] = useState<string | null>(null); // The frame to draw on
    const [isExtractingFrame, setIsExtractingFrame] = useState(false);

    // Masking State
    const [activeTool, setActiveTool] = useState<'move' | 'brush' | 'eraser'>('brush');
    const [brushSize, setBrushSize] = useState(40);
    // const [cleanupMask, setCleanupMask] = useState<{ points: number[][] }[]>([]); // Deprecated in favor of per-layer masks
    const [currentStroke, setCurrentStroke] = useState<number[][]>([]);
    const [isHoveringCanvas, setIsHoveringCanvas] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const imageContainerRef = useRef<HTMLDivElement>(null);

    // Layers (Products)
    const [layers, setLayers] = useState<ProductLayer[]>([]);
    const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
    const [isUploadingProduct, setIsUploadingProduct] = useState(false); // UI toggle if needed

    // Prompt
    const [prompt, setPrompt] = useState('');
    const [productSubstitutions, setProductSubstitutions] = useState<string[]>([]);

    // Generation Status
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
    const [taskId, setTaskId] = useState<string | null>(null);
    const [genStatus, setGenStatus] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'workspace' | 'result'>('workspace');
    const [timer, setTimer] = useState(0);

    // Canvas Dimensions (from extracted frame)
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });


    // --- EFFECTS ---

    // Sync substitutions array with layers
    useEffect(() => {
        setProductSubstitutions(prev => {
            const newSubs = [...prev];
            while (newSubs.length < layers.length) newSubs.push('');
            return newSubs.slice(0, layers.length);
        });
    }, [layers]);

    // Construct Prompt (Auto)
    useEffect(() => {
        if (layers.length > 0 || prompt === '') {
            let p = "Recreate the reference video EXACTLY, shot by shot, frame by frame. ";
            p += "The ONLY change allowed is the integration of the provided product(s) in place of the original subject/object.\n\n";

            if (layers.length > 0) {
                p += "PRODUCT INTEGRATION:\n";
                layers.forEach((layer, i) => {
                    const sub = productSubstitutions[i] || layer.name;
                    p += `• Product ${i + 1} (${sub}): Integrate realistically.\n`;
                    if (layer.detailText) p += `  Detail: ${layer.detailText}\n`;
                });
            }

            const hasMask = layers.some(l => l.maskPoints.length > 0);
            if (hasMask) {
                p += "\nMASK: content in the masked area should be replaced/modified.\n";
            }

            p += "\nSTRICT RECREATION REQUIREMENTS:\n";
            p += "- Camera movement: identical to original.\n";
            p += "- Lighting: identical direction, intensity, shadows.\n";
            p += "- Physics: realistic material behavior.\n";
            p += "- 8K resolution, high fidelity, photorealistic.\n";

            if (prompt !== p) setPrompt(p);
        }
    }, [layers, productSubstitutions, layers.map(l => l.maskPoints.length).join(',')]);

    // Timer Logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isGenerating) {
            setTimer(0);
            interval = setInterval(() => {
                setTimer(prev => prev + 1);
            }, 1000);
        } else {
            setTimer(0);
        }
        return () => clearInterval(interval);
    }, [isGenerating]);


    // --- HANDLERS ---

    const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('video/')) { alert('Please upload a video file'); return; }

        setVideoFile(file);
        setVideoUrl(URL.createObjectURL(file));
        // Duration will be set by the video element's onLoadedMetadata
    };

    // Process image: resize to max 1024px and convert to JPEG
    const processImage = (dataUrl: string, maxSize = 1024): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;
                if (width > maxSize || height > maxSize) {
                    if (width > height) {
                        height = Math.round((height / width) * maxSize);
                        width = maxSize;
                    } else {
                        width = Math.round((width / height) * maxSize);
                        height = maxSize;
                    }
                }
                // Force multiples of 32
                width = Math.floor(width / 32) * 32;
                height = Math.floor(height / 32) * 32;

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);
                }
                resolve(canvas.toDataURL('image/jpeg', 0.9));
            };
            img.onerror = () => resolve(dataUrl);
            img.src = dataUrl;
        });
    };

    const handleExtractFrame = async () => {
        if (!videoRef.current) return;
        setIsExtractingFrame(true);
        try {
            const video = videoRef.current;
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const rawBase64 = canvas.toDataURL('image/jpeg', 0.95);
                const processedUrl = await processImage(rawBase64); // Resize for optimal masking/api
                setExtractedFrameUrl(processedUrl);
                setDimensions({ width: canvas.width, height: canvas.height }); // Store original video dims approx
                setActiveTool('brush'); // Auto switch to brush
            }
        } catch (e) {
            console.error("Frame extraction failed", e);
        } finally {
            setIsExtractingFrame(false);
        }
    };

    // State for frame selector
    const [showFrameSelector, setShowFrameSelector] = useState(false);

    // Effect to trigger frame selector when layers change (add product)
    useEffect(() => {
        if (layers.length > 0 && !extractedFrameUrl) {
            setShowFrameSelector(true);
        } else if (layers.length > 1) {
            // Logic for "adding a second one... make you choose the second"
            // If we just added a layer (layers changed), re-open prompt
            setShowFrameSelector(true);
        }
    }, [layers.length]);

    const handleProductUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const processed = await processImage(ev.target?.result as string);
            const newLayer: ProductLayer = {
                id: crypto.randomUUID(),
                url: processed,
                type: 'product',
                name: file.name.replace(/\.[^/.]+$/, ''),
                maskPoints: [],
                maskColor: LAYER_COLORS[layers.length % LAYER_COLORS.length],
            };
            setLayers([...layers, newLayer]);
            setSelectedLayerId(newLayer.id);

            // Trigger frame selection immediately after adding a product
            setIsExtractingFrame(false); // Reset just in case
            // Focus video text?
        };
        reader.readAsDataURL(file);
    };

    const removeLayer = (id: string) => {
        setLayers(layers.filter(l => l.id !== id));
    };

    // --- MASKING LOGIC (Brush) ---
    // Copied/Adapted from ImageCreateFlow

    const getPoint = (e: React.MouseEvent | React.TouchEvent) => {
        if (!imageContainerRef.current) return null;
        const rect = imageContainerRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        const x = (clientX - rect.left) / rect.width;
        const y = (clientY - rect.top) / rect.height;
        return [x, y];
    };

    const handleBrushStart = (e: React.MouseEvent | React.TouchEvent) => {
        if (activeTool !== 'brush' && activeTool !== 'eraser') return;
        const p = getPoint(e);
        if (p) setCurrentStroke([p]);
    };

    const handleBrushMove = (e: React.MouseEvent | React.TouchEvent) => {
        if ((activeTool !== 'brush' && activeTool !== 'eraser') || currentStroke.length === 0) return;
        const p = getPoint(e);
        if (p) setCurrentStroke([...currentStroke, p]);
    };

    const handleBrushEnd = () => {
        if (activeTool !== 'brush' && activeTool !== 'eraser') return;
        if (currentStroke.length === 0) return;

        // Calculate stroke width in SVG units (0-100) based on current container width
        // so it scales with the image
        const rect = imageContainerRef.current?.getBoundingClientRect();
        const relativeWidth = rect ? (brushSize / rect.width) * 100 : 4;

        if (selectedLayerId) {
            setLayers(layers.map(l => {
                if (l.id === selectedLayerId) {
                    return {
                        ...l,
                        maskPoints: [...l.maskPoints, {
                            points: currentStroke,
                            type: activeTool,
                            width: relativeWidth
                        }]
                    };
                }
                return l;
            }));
        }
        setCurrentStroke([]);
    };

    const clearMask = () => {
        if (selectedLayerId) {
            setLayers(layers.map(l => l.id === selectedLayerId ? { ...l, maskPoints: [] } : l));
        }
    };

    const generateMaskImage = async (w: number, h: number): Promise<string | null> => {
        const hasMask = layers.some(l => l.maskPoints.length > 0);
        if (!hasMask) return null;

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.fillStyle = 'black'; // Non-masked area
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = 'white'; // Masked area
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        layers.forEach(layer => {
            layer.maskPoints.forEach(stroke => {
                if (stroke.points.length < 1) return;
                // stroke.width is 0-100 relative to container width.
                // We need to convert it to canvas pixels.
                // If width=4 (4% of container), then in canvas w=1024, stroke width should be 0.04 * 1024.
                ctx.lineWidth = (stroke.width / 100) * w;

                ctx.beginPath();
                if (stroke.points.length === 1) {
                    // Dot
                    ctx.lineTo(stroke.points[0][0] * w, stroke.points[0][1] * h);
                    ctx.stroke();
                } else {
                    ctx.moveTo(stroke.points[0][0] * w, stroke.points[0][1] * h);
                    for (let i = 1; i < stroke.points.length; i++) {
                        ctx.lineTo(stroke.points[i][0] * w, stroke.points[i][1] * h);
                    }
                    ctx.stroke();
                }
            });
        });

        return canvas.toDataURL('image/png');
    };


    // --- GENERATION ---

    const getCreditsCost = () => {
        if (videoDuration <= 15) return 75;
        if (videoDuration <= 20) return 130;

        // +30 credits per each additional 5 seconds after 20s
        const extraSeconds = videoDuration - 20;
        const extraBlocks = Math.ceil(extraSeconds / 5);
        return 130 + (extraBlocks * 30);
    };

    const handleGenerate = async () => {
        if (!videoFile || layers.length === 0) {
            alert("Please upload a video and at least one product layer.");
            return;
        }

        setIsGenerating(true);
        setGenStatus('preparing');

        try {
            // 1. Prepare Video Base64
            const videoBase64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(videoFile);
            });

            // 2. Video Dimensions & Resize Helper
            let videoW = 1280;
            let videoH = 720;
            if (videoRef.current) {
                videoW = videoRef.current.videoWidth;
                videoH = videoRef.current.videoHeight;
            }

            const resizeToExact = (dataUrl: string, w: number, h: number): Promise<string> => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = w;
                        canvas.height = h;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.fillStyle = '#FFFFFF';
                            ctx.fillRect(0, 0, w, h);
                            ctx.drawImage(img, 0, 0, w, h);
                        }
                        resolve(canvas.toDataURL('image/jpeg', 0.95));
                    };
                    img.src = dataUrl;
                });
            };

            // 3. Prepare Mask
            let finalMaskUrl = null;
            const hasMask = layers.some(l => l.maskPoints.length > 0);
            if (hasMask) {
                const rawMask = await generateMaskImage(videoW, videoH);
                if (rawMask) {
                    finalMaskUrl = rawMask; // Already correct dims from generateMaskImage args if we passed them right
                }
            }
            // Also extracted frame if available
            let finalFrameUrl = null;
            if (extractedFrameUrl) {
                finalFrameUrl = await resizeToExact(extractedFrameUrl, videoW, videoH);
            }

            // 4. Products Payload
            const imagesPayload: string[] = [];
            for (const layer of layers) {
                imagesPayload.push(layer.url);
                // We send raw product images, model handles integration
            }

            // 5. Submit
            const cost = getCreditsCost();
            if (deductCreditsOptimistic) deductCreditsOptimistic(cost);

            // Aspect Ratio
            let aspectRatio = '16:9';
            if (videoH > videoW) aspectRatio = '9:16';
            else if (videoH === videoW) aspectRatio = '1:1';

            // === DETAILED PAYLOAD LOG ===
            console.log('');
            console.log('╔═══════════════════════════════════════╗');
            console.log('║     CREATE VIDEO PAYLOAD              ║');
            console.log('╠═══════════════════════════════════════╣');
            console.log('║ 1. Vídeo Ref:       ', videoBase64 ? `✅ ${(videoBase64.length / 1024).toFixed(0)}KB` : '❌ NO');
            console.log('║ 2. Frame Extret:    ', finalFrameUrl ? '✅ YES' : '❌ NO');
            console.log('║ 3. Màscara Pintada: ', finalMaskUrl ? '✅ YES' : '❌ NO');
            console.log('║ 4. Productes:                         ║');
            imagesPayload.forEach((img, i) => {
                console.log(`║    Product ${i + 1}:       ✅ ${img.substring(0, 30)}...`);
            });
            console.log('║                                       ║');
            console.log('║ Duració:', `${Math.ceil(videoDuration)}s`.padEnd(31), '║');
            console.log('║ Cost:', `${getCreditsCost()} crèdits`.padEnd(34), '║');
            console.log('╚═══════════════════════════════════════╝');
            console.log('');

            const response = await fetch('/api/video/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
                },
                body: JSON.stringify({
                    video: videoBase64,
                    images: imagesPayload,
                    prompt: prompt,
                    model: 'kwaivgi/kling-video-o1/video-edit',
                    duration: Math.ceil(videoDuration),
                    aspect_ratio: aspectRatio,
                    image: finalFrameUrl || undefined,
                    target_mask: finalMaskUrl || undefined,
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Generation failed');
            }

            const data = await response.json();
            if (data.taskId) {
                setTaskId(data.taskId);
                setGenStatus('processing');
                pollForResult(data.taskId);
            }

        } catch (e: any) {
            console.error(e);
            alert("Error: " + e.message);
            setIsGenerating(false);
        }
    };

    const pollForResult = async (id: string) => {
        const POLL_INTERVAL = 4000;
        const MAX_ATTEMPTS = 450; // 30 minutes

        for (let i = 0; i < MAX_ATTEMPTS; i++) {
            await new Promise(r => setTimeout(r, POLL_INTERVAL));
            try {
                const res = await fetch(`/api/video/status?taskId=${id}&provider=wavespeed`);
                const data = await res.json();

                if (data.data?.status === 'completed' || data.data?.status === 'succeeded') {
                    const url = data.data.video?.url;
                    if (url) {
                        setGeneratedVideo(url);
                        setViewMode('result');
                        setIsGenerating(false);
                        return;
                    }
                } else if (data.data?.status === 'failed') {
                    throw new Error(data.data?.error || 'Failed');
                }
            } catch (e) {
                console.log("Polling...", e);
            }
        }
        alert("Polling timed out");
        setIsGenerating(false);
    };


    // --- RENDER ---

    return (
        <div className="w-full max-w-[1600px] mx-auto h-[90vh] flex flex-col gap-4">

            {/* Header */}
            <div className="flex items-center justify-between shrink-0 px-4">
                <h1 className="text-xl font-medium text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-zinc-400" /> AI Video Studio
                </h1>
                <div className="flex gap-2">
                    {generatedVideo && (
                        <div className="flex bg-white/5 rounded-sm p-1 gap-1 border border-white/10">
                            <button onClick={() => setViewMode('workspace')} className={`px-3 py-1 text-[10px] rounded-sm transition-colors ${viewMode === 'workspace' ? 'bg-white text-black font-bold' : 'text-zinc-400 hover:text-white'}`}>Workspace</button>
                            <button onClick={() => setViewMode('result')} className={`px-3 py-1 text-[10px] rounded-sm transition-colors ${viewMode === 'result' ? 'bg-green-500 text-black font-bold' : 'text-zinc-400 hover:text-white'}`}>Result</button>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0 px-4 overflow-hidden">

                {/* LEFT SIDEBAR (Inputs) */}
                <div className="w-full md:w-[340px] flex flex-col gap-0 shrink-0 h-[55%] md:h-full border border-white/10 rounded-sm overflow-hidden bg-zinc-900/50 backdrop-blur-sm">
                    <div className="flex-1 overflow-y-auto custom-scrollbar">

                        {/* 1. Base Video */}
                        <div className="p-4 border-b border-white/5">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Base Video</h3>
                                {videoUrl && <button onClick={() => { setVideoUrl(null); setVideoFile(null); setExtractedFrameUrl(null); }}><X className="w-3 h-3 text-zinc-500" /></button>}
                            </div>

                            {!videoUrl ? (
                                <label className="block w-full aspect-video rounded-sm border border-dashed border-white/10 hover:border-white/20 bg-white/5 cursor-pointer flex flex-col items-center justify-center gap-2 transition-colors">
                                    <input type="file" onChange={handleVideoUpload} className="hidden" accept="video/*" />
                                    <Upload className="w-4 h-4 text-zinc-600" />
                                    <span className="text-[10px] text-zinc-600">Upload Video</span>
                                </label>
                            ) : (
                                <div className="space-y-2">
                                    <div className="space-y-2">
                                        <div className="relative aspect-video bg-black rounded-sm overflow-hidden border border-white/10 group">
                                            <video
                                                ref={videoRef}
                                                src={videoUrl}
                                                className="w-full h-full object-contain"
                                                controls
                                                onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration)}
                                            />
                                        </div>
                                        <div className="text-[10px] text-zinc-500 text-center font-mono">{videoDuration.toFixed(1)}s</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 2. Layers */}
                        <div className="p-4 border-b border-white/5">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Product Layers</h3>
                                <button onClick={() => setIsUploadingProduct(true)} className="relative overflow-hidden">
                                    <label className="text-[10px] bg-white/10 hover:bg-white/20 text-white px-2 py-0.5 rounded-sm flex items-center gap-1 cursor-pointer">
                                        <Plus className="w-3 h-3" /> Add
                                        <input type="file" onChange={handleProductUpload} className="hidden" accept="image/*" />
                                    </label>
                                </button>
                            </div>
                            <div className="space-y-1">
                                {layers.map((layer, i) => (
                                    <div
                                        key={layer.id}
                                        className={`flex flex-col gap-1 p-2 rounded-sm border transition-colors cursor-pointer ${selectedLayerId === layer.id ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                                        onClick={() => setSelectedLayerId(layer.id)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-8 rounded-full" style={{ backgroundColor: layer.maskColor }}></div>
                                            <img src={layer.url} className="w-8 h-8 object-contain bg-black/40 rounded-sm" />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[10px] text-white truncate font-medium">{layer.name}</div>
                                                <div className="text-[9px] text-zinc-500 truncate">Product {i + 1}</div>
                                            </div>
                                            <button onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); }}><X className="w-3 h-3 text-zinc-600 hover:text-red-400" /></button>
                                        </div>
                                        {/* Detail Text for this layer */}
                                        <textarea
                                            placeholder="Detail/Texture (e.g. 'Matte finish')..."
                                            className="w-full bg-black/20 text-[9px] text-zinc-300 p-1 rounded-sm border border-white/5 focus:outline-none resize-none"
                                            rows={1}
                                            value={layer.detailText || ''}
                                            onChange={(e) => {
                                                const newLayers = [...layers];
                                                newLayers[i].detailText = e.target.value;
                                                setLayers(newLayers);
                                            }}
                                        />
                                    </div>
                                ))}
                                {layers.length === 0 && <div className="text-[10px] text-zinc-600 italic px-1">No products added</div>}
                            </div>
                        </div>

                        {/* 3. Prompt */}
                        <div className="p-4 space-y-3">
                            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex justify-between">
                                Prompt <span className="text-purple-500 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Auto-Generated</span>
                            </h3>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                className="w-full h-32 bg-zinc-950/50 border border-white/10 rounded-sm p-2 text-[10px] text-zinc-400 focus:text-zinc-200 resize-none outline-none font-mono"
                            />
                        </div>
                    </div>

                    <div className="p-4 border-t border-white/10 bg-zinc-950">
                        <div className="flex gap-2">
                            {(!profile || (profile.credits || 0) < getCreditsCost()) ? (
                                <Button
                                    onClick={() => window.location.href = '/pricing'}
                                    className="flex-1 bg-black border border-orange-600 text-orange-500 font-bold uppercase h-10 rounded-sm flex flex-col items-center justify-center gap-0.5 hover:bg-orange-950/30 transition-colors shadow-[0_0_15px_rgba(234,88,12,0.1)] leading-none"
                                >
                                    <span className="text-[11px] tracking-widest">GET CREDITS</span>
                                    <span className="text-[8px] opacity-80 decoration-none">NEED {getCreditsCost()} CREDITS</span>
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleGenerate}
                                    disabled={isGenerating || !videoUrl}
                                    className="flex-1 bg-white text-black hover:bg-zinc-200 font-bold tracking-wider uppercase h-10 text-[11px] rounded-sm shadow-[0_0_15px_rgba(255,255,255,0.1)] flex items-center justify-center"
                                >
                                    {isGenerating ? (
                                        <span className="flex items-center gap-2">
                                            <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                            {genStatus === 'preparing' ? 'Uploading...' : `Processing... (${Math.floor(timer / 60)}:${(timer % 60).toString().padStart(2, '0')})`}
                                        </span>
                                    ) : `Generate Video (${getCreditsCost()} Credits)`}
                                </Button>
                            )}
                            <button
                                onClick={() => window.open('/guide/video-editing', '_blank')}
                                className="w-10 h-10 flex items-center justify-center rounded-sm bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                                title="Read Guide"
                            >
                                <BookOpen className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>


                {/* RIGHT: WORKSPACE / RESULT */}
                <div className="flex-1 rounded-sm overflow-hidden relative flex flex-col">

                    {/* Toolbar (Only relevant if masking) */}



                    {viewMode === 'result' && generatedVideo ? (
                        <div className="flex-1 flex items-center justify-center bg-black">
                            <video src={generatedVideo} controls autoPlay loop className="max-w-full max-h-full" />
                        </div>
                    ) : (
                        <div className="flex-1 relative bg-zinc-950/50 flex items-center justify-center overflow-hidden">
                            {!videoUrl ? (
                                <div className="text-center text-zinc-600 space-y-2">
                                    <Video className="w-12 h-12 mx-auto opacity-20" />
                                    <p className="text-xs">Upload a video to start editing</p>
                                </div>
                            ) : !extractedFrameUrl ? (
                                <div className="relative w-full h-full flex flex-col items-center justify-center bg-black/40">
                                    <video
                                        ref={videoRef}
                                        src={videoUrl}
                                        className="w-full h-full object-contain"
                                        controls
                                        crossOrigin="anonymous"
                                        onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration)}
                                    />

                                    {/* Frame Selector Overlay */}
                                    {showFrameSelector && (
                                        <div className="absolute inset-x-0 bottom-0 bg-black/80 backdrop-blur-md p-4 flex flex-col items-center gap-3 z-30 animate-in slide-in-from-bottom-10 fade-in duration-300 border-t border-white/10">
                                            <div className="text-white text-xs font-medium uppercase tracking-wider flex items-center gap-2">
                                                <Move className="w-3 h-3 text-purple-400" /> Select Frame to Mask
                                            </div>
                                            <div className="w-full max-w-sm flex items-center gap-4">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max={videoDuration || 10}
                                                    step="0.1"
                                                    className="flex-1 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                                    onChange={(e) => {
                                                        if (videoRef.current) {
                                                            videoRef.current.currentTime = parseFloat(e.target.value);
                                                        }
                                                    }}
                                                />
                                                <span className="text-[10px] font-mono text-zinc-400 w-12 text-right">
                                                    {videoRef.current?.currentTime.toFixed(1)}s
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() => setShowFrameSelector(false)}
                                                    variant="ghost"
                                                    className="h-7 text-[10px] text-zinc-400 hover:text-white"
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    onClick={() => {
                                                        handleExtractFrame();
                                                        setShowFrameSelector(false);
                                                    }}
                                                    className="h-7 bg-white text-black hover:bg-zinc-200 text-[10px] font-bold uppercase rounded-sm px-6"
                                                >
                                                    Use This Frame
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 z-20 flex flex-col items-center gap-2">
                                        {layers.length === 0 && (
                                            <div className="bg-black/80 text-white text-xs px-3 py-1 rounded-full mb-2 border border-white/20 animate-pulse">
                                                Add a product to start editing
                                            </div>
                                        )}
                                        {!showFrameSelector && (
                                            <Button
                                                onClick={() => setShowFrameSelector(true)}
                                                disabled={isExtractingFrame || layers.length === 0}
                                                className="bg-zinc-900/80 backdrop-blur text-white border border-white/10 hover:bg-white hover:text-black font-medium uppercase tracking-widest text-[10px] px-6 py-2 rounded-sm shadow-xl transition-all"
                                            >
                                                {isExtractingFrame ? <div className="w-2 h-2 rounded-full border border-current border-t-transparent animate-spin mr-2" /> : <Move className="w-3 h-3 mr-2" />}
                                                {isExtractingFrame ? 'Processing...' : 'Select Frame'}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                /* EDITOR CANVAS */
                                <div className="w-full h-full flex flex-row items-center justify-center gap-6 pl-10 pr-10">
                                    <div
                                        ref={imageContainerRef}
                                        className={`relative shadow-2xl ${activeTool === 'brush' ? 'cursor-none' : ''}`}
                                        style={{ aspectRatio: `${dimensions.width}/${dimensions.height}`, maxHeight: '90%', maxWidth: 'calc(100% - 120px)', touchAction: 'none' }}
                                        onMouseDown={handleBrushStart}
                                        onMouseMove={(e) => {
                                            setMousePos({ x: e.clientX, y: e.clientY });
                                            handleBrushMove(e);
                                        }}
                                        onMouseUp={handleBrushEnd}
                                        onMouseEnter={() => setIsHoveringCanvas(true)}
                                        onMouseLeave={() => { setIsHoveringCanvas(false); handleBrushEnd(); }}
                                        onTouchStart={handleBrushStart}
                                        onTouchMove={(e) => {
                                            if (e.touches[0]) {
                                                setMousePos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
                                            }
                                            handleBrushMove(e);
                                        }}
                                        onTouchEnd={handleBrushEnd}
                                    >
                                        <img src={extractedFrameUrl} alt="Frame" className="w-full h-full object-contain pointer-events-none select-none" />

                                        {/* Simple SVG Overlay for Drawing Strokes Visualization */}
                                        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                                            {layers.map((layer) => (
                                                <g key={layer.id}>
                                                    {layer.maskPoints.map((stroke, i) => (
                                                        <polyline
                                                            key={i}
                                                            points={stroke.points.map(p => `${p[0] * 100},${p[1] * 100}`).join(' ')}
                                                            fill="none"
                                                            stroke={stroke.type === 'eraser' ? 'rgba(255,255,255,0.8)' : layer.maskColor}
                                                            strokeOpacity={stroke.type === 'eraser' ? 1 : 0.6}
                                                            strokeWidth={stroke.width} // Pre-calculated relative width
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        />
                                                    ))}
                                                </g>
                                            ))}
                                            {currentStroke.length > 0 && (
                                                <polyline
                                                    points={currentStroke.map(p => `${p[0] * 100},${p[1] * 100}`).join(' ')}
                                                    fill="none"
                                                    stroke={activeTool === 'eraser' ? 'rgba(255,255,255,0.8)' : (selectedLayerId ? layers.find(l => l.id === selectedLayerId)?.maskColor : 'red')}
                                                    strokeOpacity={0.6}
                                                    strokeWidth={(brushSize / (imageContainerRef.current?.offsetWidth || 1000)) * 100}
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            )}
                                        </svg>

                                        {/* Custom Brush Cursor */}
                                        {(activeTool === 'brush' || activeTool === 'eraser') && isHoveringCanvas && layers.length > 0 && (
                                            <div
                                                className="fixed rounded-full border-2 border-white/50 pointer-events-none z-[100] transform -translate-x-1/2 -translate-y-1/2 shadow-xl"
                                                style={{
                                                    left: mousePos.x,
                                                    top: mousePos.y,
                                                    width: brushSize,
                                                    height: brushSize,
                                                    backgroundColor: activeTool === 'eraser' ? 'rgba(255,255,255,0.2)' : (selectedLayerId ? layers.find(l => l.id === selectedLayerId)?.maskColor : 'rgba(255,0,0,0.5)'),
                                                    opacity: 0.8
                                                }}
                                            />
                                        )}
                                    </div>

                                    {/* Vertical Right Toolbar */}
                                    {layers.length > 0 && (
                                        <div className="flex flex-col items-center gap-4 bg-transparent px-3 py-6 rounded-full z-50 flex-none">
                                            {/* Tools */}
                                            <div className="flex flex-col items-center gap-2">
                                                <button
                                                    onClick={() => setActiveTool('brush')}
                                                    className={`p-2 rounded-full transition-all ${activeTool === 'brush' ? 'bg-white text-black' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                                                    title="Brush Tool"
                                                >
                                                    <Brush size={20} />
                                                </button>
                                                <button
                                                    onClick={() => setActiveTool('eraser')}
                                                    className={`p-2 rounded-full transition-all ${activeTool === 'eraser' ? 'bg-white text-black' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                                                    title="Eraser Tool"
                                                >
                                                    <Eraser size={20} />
                                                </button>
                                            </div>

                                            {/* Brush Size Slider */}
                                            {(activeTool === 'brush' || activeTool === 'eraser') && (
                                                <div className="relative flex items-center justify-center border-t border-white/10 pt-4 mt-2 h-24 w-8">
                                                    <input
                                                        type="range"
                                                        min="10"
                                                        max="100"
                                                        value={brushSize}
                                                        onChange={(e) => setBrushSize(Number(e.target.value))}
                                                        className="absolute w-20 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white -rotate-90"
                                                        style={{ transformOrigin: 'center' }}
                                                    />
                                                </div>
                                            )}

                                            {/* Clear Button */}
                                            <button
                                                onClick={clearMask}
                                                className="mt-2 p-2 rounded-full text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all border border-transparent hover:border-red-500/30"
                                                title="Clear Mask"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
