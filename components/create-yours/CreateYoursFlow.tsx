'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, ChevronRight, ChevronLeft, Sparkles, Film, ImageIcon, Wand2, Play, Pause, Check, Plus, UserCircle2, Scissors, Eraser } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SegmentationModal } from '@/components/SegmentationModal';
import { SavedMasksModal } from '@/components/SavedMasksModal';
import { createClient } from '@supabase/supabase-js';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface CreateYoursFlowProps {
    onCancel?: () => void;
    initialData?: any;
}

interface ProductItem {
    id: string;
    url: string;
    name: string;
    type: 'product' | 'mask';
    isMasked: boolean;
}

export const CreateYoursFlow = ({ onCancel }: CreateYoursFlowProps) => {
    const router = useRouter();
    const pathname = usePathname();
    const { user, profile, deductCreditsOptimistic } = useAuth();
    const [currentStep, setCurrentStep] = useState(1);

    // Step 1: Video Upload & Masking
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [videoDuration, setVideoDuration] = useState<number>(0);
    const [selectedTimestamp, setSelectedTimestamp] = useState<number>(0);
    const [extractedFrameUrl, setExtractedFrameUrl] = useState<string | null>(null);
    const [videoMaskUrl, setVideoMaskUrl] = useState<string | null>(null);
    const [showVideoSegmentModal, setShowVideoSegmentModal] = useState(false);
    const [isExtractingFrame, setIsExtractingFrame] = useState(false);

    // Time Selection Modal
    const [showTimeSelectModal, setShowTimeSelectModal] = useState(false);
    const [tempTimestamp, setTempTimestamp] = useState(0);

    // Step 2: Product Upload & Persona
    const [products, setProducts] = useState<ProductItem[]>([]);
    const [isUploadingProduct, setIsUploadingProduct] = useState(false);
    const [uploadType, setUploadType] = useState<'product' | 'mask'>('product');
    const [personaImage, setPersonaImage] = useState<string | null>(null);
    const [activeProductIndex, setActiveProductIndex] = useState<number>(-1); // For masking modal
    const [showProductSegmentModal, setShowProductSegmentModal] = useState(false); // To implement product masking
    const [showSavedMasksModal, setShowSavedMasksModal] = useState(false);

    // Step 3: Prompt & Generate
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Generation Modal
    const [genModal, setGenModal] = useState<{
        isOpen: boolean; videosrc: string | null; status: string;
    }>({ isOpen: false, videosrc: null, status: 'processing' });

    const videoRef = useRef<HTMLVideoElement>(null);

    // Auto-Prompt
    useEffect(() => {
        if (products.length > 0) {
            let productList = '';
            products.forEach(p => {
                productList += `\n"${p.name.toUpperCase()}"\n`;
            });

            const detailedPrompt = `Recreate the reference video EXACTLY, shot by shot, frame by frame.

The ONLY change allowed is the integration of the provided product(s) in place of the original subject/object.
Do NOT alter the surroundings, camera movement, timing, lighting, or environment.

PRODUCT INTEGRATION (USE EXACTLY THESE NAMES):

Integrate/Replace with:
${productList}
These are products to be integrated realistically into the scene.

STRICT RECREATION REQUIREMENTS:

Camera movement: identical to the original (same speed, direction, distance).
Transitions: identical timing and style.
Lighting: identical direction, intensity, shadows, and color temperature.
Physics: realistic material behavior, natural gravity, collision, and motion.
Realism: photo-realistic integration, correct perspective, scale, and interaction.
Timing: same duration, same cuts, same rhythm.

VISUAL QUALITY:

Ultra-realistic
Photorealistic materials and textures
High fidelity
8K resolution
No stylization, no reinterpretation, no creative changes

IMPORTANT:

This is a 1:1 replica of the original video.
The final result must look like the same video, with the same movements and light, only changing the specific elements to the products named above.`;

            setPrompt(detailedPrompt);
        }
    }, [products]);

    // --- HANDLERS ---
    const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('video/')) { alert('Please upload a video file'); return; }

        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
            window.URL.revokeObjectURL(video.src);
            const duration = video.duration;
            // No duration limit - let user upload any length
            setVideoDuration(duration);
            setVideoFile(file);
            setVideoUrl(URL.createObjectURL(file));
            setSelectedTimestamp(duration / 2);
            setTempTimestamp(duration / 2);
        };
        video.src = URL.createObjectURL(file);
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
                // Get raw base64
                const rawBase64 = canvas.toDataURL('image/jpeg', 0.95);

                // Process (resize to 1024)
                const processedUrl = await processImage(rawBase64);

                setExtractedFrameUrl(processedUrl);
                setShowVideoSegmentModal(true);
            }
        } catch (e) { console.error(e); }
        finally { setIsExtractingFrame(false); }
    };

    const confirmFrameTime = () => {
        if (videoRef.current) {
            videoRef.current.currentTime = tempTimestamp;
            // Wait for seek to complete roughly before extracting? 
            // Better to trigger extract in 'onSeeked' or just wait a tiny bit
            setTimeout(() => {
                handleExtractFrame();
                setShowTimeSelectModal(false);
            }, 200);
        }
    };

    // Process image: resize to max 1024px and convert to JPEG
    const processImage = (dataUrl: string, maxSize = 1024): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;

                // Calculate new dimensions (max 1024px)
                if (width > maxSize || height > maxSize) {
                    if (width > height) {
                        height = Math.round((height / width) * maxSize);
                        width = maxSize;
                    } else {
                        width = Math.round((width / height) * maxSize);
                        height = maxSize;
                    }
                }

                // Force multiples of 32 (important for ML models)
                width = Math.floor(width / 32) * 32;
                height = Math.floor(height / 32) * 32;

                // Ensure at least 32x32
                width = Math.max(32, width);
                height = Math.max(32, height);

                // Draw to canvas and export as JPEG (no alpha channel)
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    // Fill with white background first (removes transparency)
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);
                }

                // Export as JPEG at 90% quality
                const processedUrl = canvas.toDataURL('image/jpeg', 0.9);
                console.log(`[Image] Processed: ${img.naturalWidth}x${img.naturalHeight} -> ${width}x${height}`);
                resolve(processedUrl);
            };
            img.onerror = () => resolve(dataUrl); // Fallback to original
            img.src = dataUrl;
        });
    };

    const handleProductUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
            const rawDataUrl = ev.target?.result as string;

            // Process image: resize and convert to JPEG
            const processedUrl = await processImage(rawDataUrl);

            const newProduct: ProductItem = {
                id: crypto.randomUUID(),
                url: processedUrl,
                name: file.name.replace(/\.[^/.]+$/, ''),
                type: uploadType,
                isMasked: false
            };
            setProducts([...products, newProduct]);
            setIsUploadingProduct(false);
        };
        reader.readAsDataURL(file);
    };

    const handleSavedMaskSelect = (maskUrl: string) => {
        const newProduct: ProductItem = {
            id: crypto.randomUUID(),
            url: maskUrl,
            name: `Mask ${products.length + 1}`,
            type: 'mask',
            isMasked: true // Assuming saved masks are already masked/processed
        };
        setProducts([...products, newProduct]);
        setIsUploadingProduct(false);
        setShowSavedMasksModal(false);
    };

    const handlePersonaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const rawUrl = ev.target?.result as string;
            const processedUrl = await processImage(rawUrl);
            setPersonaImage(processedUrl);
        };
        reader.readAsDataURL(file);
    };

    const handleGenerate = async () => {
        if (!videoFile || (products.length === 0 && !prompt)) {
            alert('Please upload a video and add at least one product or instruction.');
            return;
        }

        setIsGenerating(true);
        setGenModal({ isOpen: true, status: 'processing', videosrc: null });

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            // 1. Get Video Dimensions & Base64
            let videoW = 1280;
            let videoH = 720;
            if (videoRef.current) {
                videoW = videoRef.current.videoWidth;
                videoH = videoRef.current.videoHeight;
            }
            console.log(`[CreateYours] Video Dimensions: ${videoW}x${videoH}`);

            // Determine Aspect Ratio
            let aspectRatio = '16:9';
            if (videoH > videoW) aspectRatio = '9:16';
            else if (videoH === videoW) aspectRatio = '1:1';

            const videoBase64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(videoFile);
            });

            // 2. Helper to resize explicitly to video dimensions
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
                    img.onerror = () => resolve(dataUrl);
                    img.src = dataUrl;
                });
            };

            // 3. Process Mask & Frame (Must match video dimensions exactly)
            let finalMaskUrl = null;
            if (videoMaskUrl) {
                finalMaskUrl = await resizeToExact(videoMaskUrl, videoW, videoH);
                console.log('[CreateYours Video] Resized mask to match video');
            }

            let finalFrameUrl = null;
            if (extractedFrameUrl) {
                finalFrameUrl = await resizeToExact(extractedFrameUrl, videoW, videoH);
                console.log('[CreateYours Video] Resized frame to match video');
            }

            // 4. Build Prompt
            let safePrompt = prompt || `Recreate this video with the provided product.`;
            safePrompt += `\n\nINPUT DESCRIPTION:`;
            safePrompt += `\n- VIDEO: The reference video to recreate/edit.`;
            products.forEach((p, i) => {
                safePrompt += `\n- PRODUCT IMAGE ${i + 1} (${p.name}): Product/element to insert into the video.`;
            });
            if (personaImage) safePrompt += `\n- PERSONA IMAGE: Swap the person/face in the video with this image.`;
            if (finalMaskUrl) safePrompt += `\n- MASK: White areas indicate where to replace content.`;

            // Build images payload
            const imagesPayload: string[] = [];

            // Add all products (NO LIMIT - user can upload as many as they want)
            products.forEach(p => imagesPayload.push(p.url));

            if (personaImage && imagesPayload.length < 10) { // Keep some reasonable limit for persona
                imagesPayload.push(personaImage);
            }

            console.log(`[CreateYours Video] Sending ${products.length} product images`);

            console.log('[CreateYours Video] Generating with:', {
                hasVideo: !!videoBase64,
                videoSize: videoBase64.length,
                imagesCount: imagesPayload.length,
                videoDims: `${videoW}x${videoH}`,
                aspectRatio: aspectRatio,
                hasVideoMask: !!finalMaskUrl,
                duration: videoDuration
            });

            // 6. Build Request Body
            const requestBody = {
                video: videoBase64,
                images: imagesPayload,
                prompt: safePrompt,
                model: 'kwaivgi/kling-video-o1/video-edit',
                duration: Math.ceil(videoDuration),
                aspect_ratio: aspectRatio,
                image: finalFrameUrl || undefined,
                target_mask: finalMaskUrl || undefined,
            };


            // Optimistic Credit Deduction
            const cost = getCreditsCost();
            if (deductCreditsOptimistic) {
                deductCreditsOptimistic(cost);
            }

            const response = await fetch('/api/video/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Generation failed');
            }

            const data = await response.json();

            if (data.taskId) {
                // Start polling for result
                console.log('[CreateYours Video] Task started:', data.taskId);
                pollForResult(data.taskId);
            } else {
                throw new Error('No Task ID returned');
            }

        } catch (error: any) {
            console.error('[CreateYours Video] Error:', error);
            const userMessage = getErrorExplanation(error.message);
            setGenModal({ isOpen: true, status: 'failed', videosrc: null });
            alert(userMessage);
            setIsGenerating(false);
        }
    };

    // Function to translate API errors to user-friendly messages
    const getErrorExplanation = (errorMessage: string): string => {
        const msg = errorMessage.toLowerCase();

        if (msg.includes('maximum number') || msg.includes('max') && msg.includes('items')) {
            return '⚠️ Massa imatges!\n\n' +
                'Wavespeed només accepta màxim 4 imatges.\n\n' +
                '🔧 Solució: Redueix a 4 imatges de producte o menys.';
        }

        if (msg.includes('image pixel is invalid') || msg.includes('pixel')) {
            return '❌ Error: Les imatges tenen un format invàlid.\n\n' +
                '🔧 Solucions:\n' +
                '• Prova imatges més petites (màx 1024x1024)\n' +
                '• Utilitza format JPG en lloc de PNG\n' +
                '• Evita imatges amb fons transparent';
        }

        if (msg.includes('video') && (msg.includes('invalid') || msg.includes('format'))) {
            return '❌ Error: El video té un format no suportat.\n\n' +
                '🔧 Solucions:\n' +
                '• Utilitza videos MP4\n' +
                '• Màxim 10 segons de durada\n' +
                '• Resolució màxima 1080p';
        }

        if (msg.includes('timeout') || msg.includes('timed out')) {
            return '⏱️ El procés ha trigat massa.\n\n' +
                '🔧 Solucions:\n' +
                '• Prova amb un video més curt\n' +
                '• Redueix el nombre de productes\n' +
                '• Torna-ho a intentar';
        }

        if (msg.includes('rate limit') || msg.includes('too many')) {
            return '⚠️ Massa peticions. Espera uns minuts i torna-ho a provar.';
        }

        if (msg.includes('credit') || msg.includes('balance') || msg.includes('payment required')) {
            return '💰 No tens prou crèdits. Compra més crèdits per continuar.';
        }

        // Default error
        return `❌ Error en la generació:\n\n${errorMessage}\n\n` +
            '🔧 Consells:\n' +
            '• Comproveu que les imatges siguin JPG\n' +
            '• Proveu amb imatges més petites\n' +
            '• El video ha de ser MP4';
    };

    const pollForResult = async (taskId: string) => {
        const POLL_INTERVAL = 4000;
        const MAX_ATTEMPTS = 90; // ~6 minutes

        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            await new Promise(r => setTimeout(r, POLL_INTERVAL));

            try {
                const res = await fetch(`/api/video/status?taskId=${taskId}&provider=wavespeed`);
                const data = await res.json();

                if (data.data?.status === 'completed' || data.data?.status === 'succeeded') {
                    const videoUrl = data.data.video?.url;
                    if (videoUrl) {
                        setGenModal({ isOpen: true, status: 'completed', videosrc: videoUrl });
                        setIsGenerating(false);

                        // Auto-save to library
                        try {
                            const { data: { user } } = await supabase.auth.getUser();
                            if (user) {
                                await supabase.from('videos').insert({
                                    user_id: user.id,
                                    video_url: videoUrl,
                                    prompt: prompt,
                                    status: 'completed',
                                    task_id: taskId
                                });
                                console.log('[CreateYours Video] Saved to library');
                            }
                        } catch (e) { console.error('Failed to save video:', e); }
                        return;
                    }
                }

                if (data.data?.status === 'failed') {
                    const apiError = data.data.error || data.error || 'Unknown generation error';
                    const userMessage = getErrorExplanation(apiError);
                    setGenModal({ isOpen: true, status: 'failed', videosrc: null });
                    setIsGenerating(false);
                    alert(userMessage);
                    return;
                }
            } catch (e) {
                console.error('Polling error:', e);
            }
        }

        // Timeout
        setGenModal({ isOpen: true, status: 'failed', videosrc: null });
        setIsGenerating(false);
        alert(getErrorExplanation('timeout'));
    };

    // Pricing Logic
    const getCreditsCost = () => {
        if (videoDuration < 3) return 45;
        if (videoDuration <= 5) return 75; // Small buffer logic
        if (videoDuration <= 10) return 75;
        if (videoDuration <= 15) return 95;
        return 135;
    };

    // Render Steps
    return (
        <div className="w-full max-w-6xl mx-auto h-full flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0 px-2">
                <div className="text-left">
                    <h1 className="text-xl font-medium text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-zinc-400" />
                        AI Video Studio
                    </h1>
                </div>
                {/* Minimalist Stepper */}
                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/10 backdrop-blur-md">
                    {[1, 2, 3].map((step) => (
                        <div
                            key={step}
                            onClick={() => step < currentStep && setCurrentStep(step)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all cursor-pointer
                                ${currentStep === step ? 'bg-white text-black' : currentStep > step ? 'bg-zinc-800 text-zinc-400 hover:text-white' : 'text-zinc-600'}
                            `}
                        >
                            {currentStep > step ? <Check className="w-3 h-3" /> : step}
                        </div>
                    ))}
                </div>
                <div>
                    <Button variant="ghost" onClick={onCancel} className="text-zinc-400 hover:text-white">Exit</Button>
                </div>
            </div>

            {/* Main Content Area - Glassy Card */}
            <div className="flex-1 bg-white/5 rounded-sm border border-white/10 backdrop-blur-sm relative overflow-hidden flex flex-col justify-center p-8 transition-all duration-300">

                {/* STEP 1: VIDEO UPLOAD & MASKING */}
                {currentStep === 1 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto w-full h-full flex flex-col items-center">
                        <div className="text-center mb-6 shrink-0">
                            <h2 className="text-2xl font-bold text-white tracking-tight">Upload Source Video</h2>
                            <p className="text-zinc-400 text-sm">Upload your video. We'll extract a frame for you to mask.</p>
                        </div>

                        {!videoUrl ? (
                            <label className="block w-full max-w-xl aspect-video rounded-sm border border-dashed border-zinc-700 hover:border-zinc-500 bg-black/20 hover:bg-black/40 cursor-pointer flex flex-col items-center justify-center gap-4 transition-all group">
                                <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                                <div className="w-16 h-16 rounded-full bg-zinc-900/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Upload className="w-6 h-6 text-zinc-500 group-hover:text-white" />
                                </div>
                                <span className="text-xs font-bold text-zinc-500 tracking-widest uppercase group-hover:text-zinc-300">Select Video File</span>
                            </label>
                        ) : (
                            <div className="flex flex-col-reverse md:flex-row gap-6 w-full h-full min-h-0 overflow-y-auto md:overflow-visible">
                                {/* Video Preview */}
                                <div className="flex-1 relative bg-black border border-zinc-800 rounded-sm overflow-hidden group min-h-[40vh] md:min-h-0">
                                    <video
                                        ref={videoRef}
                                        src={videoUrl}
                                        className="w-full h-full object-contain"
                                        controls
                                        onLoadedMetadata={() => {
                                            if (videoRef.current) videoRef.current.currentTime = videoDuration / 2;
                                        }}
                                    />
                                    <button onClick={() => { setVideoUrl(null); setExtractedFrameUrl(null); setVideoMaskUrl(null); }} className="absolute top-2 right-2 p-2 bg-black/80 rounded-full text-zinc-400 hover:text-white transition-opacity">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Frame Masking Controls */}
                                <div className="w-full md:w-80 shrink-0 flex flex-col gap-4 bg-black/20 p-4 rounded-sm border border-white/5">
                                    <div className="space-y-2">
                                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Selected Frame</span>
                                        <div className="aspect-video bg-black rounded-sm border border-zinc-800 flex items-center justify-center relative overflow-hidden">
                                            {extractedFrameUrl ? (
                                                <>
                                                    <img src={extractedFrameUrl} className="w-full h-full object-contain opacity-50" />
                                                    {videoMaskUrl && <img src={videoMaskUrl} className="absolute inset-0 w-full h-full object-contain mix-blend-screen" />}
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <Button onClick={() => setShowVideoSegmentModal(true)} size="sm" variant="outline" className="bg-black/50 backdrop-blur text-white border-white/20 hover:bg-white hover:text-black">
                                                            <Wand2 className="w-3 h-3 mr-2" />
                                                            {videoMaskUrl ? 'Edit Mask' : 'Start Masking'}
                                                        </Button>
                                                    </div>
                                                </>
                                            ) : (
                                                <Button
                                                    onClick={() => { setShowTimeSelectModal(true); setTempTimestamp(videoRef.current?.currentTime || 0); }}
                                                    disabled={isExtractingFrame}
                                                    size="sm"
                                                    className="bg-white/10 text-white hover:bg-white/20 border border-white/10 font-medium uppercase text-[10px] tracking-wider shadow-none"
                                                >
                                                    {isExtractingFrame ? 'Extracting...' : 'Select Frame'}
                                                </Button>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-zinc-500 leading-relaxed">
                                            Mask the object in the video you want to replace.
                                        </p>
                                    </div>

                                    {videoMaskUrl && (
                                        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-sm flex items-center gap-2">
                                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                                            <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider">Mask Ready</span>
                                        </div>
                                    )}

                                    {/* NEXT STEP BUTTON MOVED HERE */}
                                    <div className="mt-auto pt-4 border-t border-white/5">
                                        <Button
                                            onClick={() => setCurrentStep(2)}
                                            disabled={!extractedFrameUrl}
                                            className="w-full bg-white text-black hover:bg-zinc-200 font-bold tracking-wider uppercase rounded-sm h-10 text-xs disabled:opacity-50 disabled:cursor-not-allowed shadow-none"
                                        >
                                            Next Step
                                            <ChevronRight className="w-3 h-3 ml-2" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* STEP 2: PRODUCTS & PERSONA */}
                {currentStep === 2 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto w-full h-full flex flex-col md:flex-row gap-6 overflow-y-auto md:overflow-visible">

                        {/* LEFT: Product List */}
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-white tracking-tight">Products</h2>
                                    <p className="text-zinc-400 text-xs">Elements to insert</p>
                                </div>
                                <Button onClick={() => setIsUploadingProduct(true)} size="sm" className="bg-white text-black hover:bg-zinc-200 font-bold uppercase text-[10px] shadow-none">
                                    <Plus className="w-3 h-3 mr-1" /> Add
                                </Button>
                            </div>

                            <div className="flex-1 overflow-y-auto grid grid-cols-2 lg:grid-cols-3 gap-3 pr-2">
                                {products.map((p, i) => (
                                    <div key={p.id} className="relative bg-zinc-900/50 border border-white/10 rounded-sm p-3 group">
                                        <div className="aspect-square bg-black/40 rounded-sm mb-2 overflow-hidden relative flex items-center justify-center">
                                            <img src={p.url} className="max-w-full max-h-full object-contain" />
                                            {p.isMasked && <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-purple-500 text-white text-[9px] font-bold uppercase rounded-sm">Masked</div>}
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                                <button
                                                    onClick={() => { setActiveProductIndex(i); setShowProductSegmentModal(true); }}
                                                    className="px-3 py-1 bg-white text-black text-[9px] font-bold uppercase rounded-sm hover:bg-zinc-200"
                                                >
                                                    Refine Mask
                                                </button>
                                            </div>
                                        </div>
                                        <input
                                            value={p.name}
                                            onChange={(e) => {
                                                const newProducts = [...products];
                                                newProducts[i].name = e.target.value;
                                                setProducts(newProducts);
                                            }}
                                            className="w-full bg-transparent border-b border-white/10 text-xs text-white pb-1 focus:outline-none focus:border-white/50"
                                        />
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-[9px] text-zinc-500 uppercase">{p.type}</span>
                                            <button onClick={() => setProducts(products.filter(item => item.id !== p.id))} className="text-zinc-500 hover:text-red-400"><X className="w-3 h-3" /></button>
                                        </div>
                                    </div>
                                ))}
                                {products.length === 0 && (
                                    <div className="col-span-full h-32 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-sm text-zinc-500 gap-2">
                                        <ImageIcon className="w-6 h-6 opacity-50" />
                                        <span className="text-xs">No products added</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT: Persona */}
                        <div className="w-full md:w-80 shrink-0 border-t md:border-t-0 border-l-0 md:border-l border-white/10 pt-6 md:pt-0 pl-0 md:pl-6 flex flex-col">
                            <div className="mb-4">
                                <h2 className="text-xl font-bold text-white tracking-tight">Persona</h2>
                                <p className="text-zinc-400 text-xs">Face swap (Optional)</p>
                            </div>

                            {!personaImage ? (
                                <label className="w-full h-32 md:h-auto md:aspect-square rounded-sm border border-dashed border-zinc-700 bg-white/5 hover:bg-white/10 cursor-pointer flex flex-col items-center justify-center gap-3 transition-all group">
                                    <input type="file" accept="image/*" onChange={handlePersonaUpload} className="hidden" />
                                    <UserCircle2 className="w-8 h-8 md:w-10 md:h-10 text-zinc-600 group-hover:text-white" />
                                    <span className="text-[10px] font-bold text-zinc-500 uppercase group-hover:text-zinc-300">Upload Face</span>
                                </label>
                            ) : (
                                <div className="w-full h-32 md:h-auto md:aspect-square bg-zinc-900 border border-white/10 rounded-sm overflow-hidden relative group">
                                    <img src={personaImage} className="w-full h-full object-contain md:object-cover" />
                                    <button onClick={() => setPersonaImage(null)} className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-red-500">
                                        <X className="w-4 h-4" />
                                    </button>
                                    <div className="absolute bottom-0 inset-x-0 bg-black/60 p-2 text-center">
                                        <span className="text-[10px] text-white font-bold uppercase">Persona Active</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* STEP 3: GENERATE */}
                {currentStep === 3 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto w-full space-y-6">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-white tracking-tight">Summary & Cost</h2>
                        </div>

                        <div className="bg-black/40 border border-white/10 rounded-sm p-4 space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Instruction</label>
                                <span className="text-[10px] text-purple-400 flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI Enhanced</span>
                            </div>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                className="w-full h-32 bg-transparent text-sm text-zinc-300 focus:outline-none resize-none font-mono"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-white/5 border border-white/5 rounded-sm flex flex-col items-center justify-center gap-1">
                                <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Duration</span>
                                <span className="text-xl font-bold text-white">{videoDuration.toFixed(1)}s</span>
                            </div>
                            <div className="p-4 bg-white/5 border border-white/5 rounded-sm flex flex-col items-center justify-center gap-1 relative overflow-hidden">
                                <span className="text-[10px] text-zinc-500 uppercase tracking-widest">Total Cost</span>
                                <span className="text-2xl font-bold text-white">{getCreditsCost()} Credits</span>
                            </div>
                        </div>

                        <div className="pt-4">
                            {(!profile || (profile.credits || 0) < getCreditsCost()) ? (
                                <Button
                                    onClick={() => router.push(`/pricing?returnUrl=${encodeURIComponent(pathname)}`)}
                                    className="w-full h-16 bg-orange-500/10 border border-orange-500/50 text-orange-500 hover:bg-orange-500/20 font-black tracking-wider uppercase py-0 text-sm rounded-sm shadow-none flex flex-col items-center justify-center gap-0.5"
                                >
                                    <span className="text-sm font-black tracking-[0.2em] uppercase">GET CREDITS</span>
                                    <span className="text-[9px] font-medium uppercase tracking-wide text-orange-400">
                                        Insufficient Credits (Need {getCreditsCost()})
                                    </span>
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                    className="w-full bg-white text-black hover:bg-zinc-200 font-bold tracking-wider uppercase py-6 text-sm rounded-sm shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                                >
                                    {isGenerating ? 'PROCESSING...' : 'GENERATE'}
                                </Button>
                            )}
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Footer / Navigation - Conditioned */}
            {currentStep > 1 && (
                <div className="flex items-center justify-between pt-2 pb-2 shrink-0">
                    <Button
                        variant="ghost"
                        onClick={() => setCurrentStep(curr => curr - 1)}
                        className="text-zinc-500 hover:text-white"
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Back
                    </Button>

                    {currentStep < 3 && (
                        <Button
                            onClick={() => setCurrentStep(curr => curr + 1)}
                            disabled={currentStep === 2 && products.length === 0}
                            className="bg-white text-black hover:bg-zinc-200 font-bold tracking-wider uppercase px-8 rounded-sm disabled:opacity-50 shadow-none"
                        >
                            Next Step
                            <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                    )}
                </div>
            )}

            {/* --- MODALS --- */}

            {/* Time Selection Modal */}
            <AnimatePresence>
                {showTimeSelectModal && (
                    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-zinc-950 border border-zinc-800 rounded-lg p-6 w-full max-w-sm space-y-6">
                            <div className="text-center">
                                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Select Frame</h3>
                                <p className="text-xs text-zinc-400 mt-1">Choose the exact moment to extract</p>
                            </div>

                            <div className="space-y-4">
                                <div className="text-center text-2xl font-mono font-bold text-white">
                                    {tempTimestamp.toFixed(2)}s
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max={videoDuration || 10}
                                    step="0.01"
                                    value={tempTimestamp}
                                    onChange={(e) => {
                                        const t = parseFloat(e.target.value);
                                        setTempTimestamp(t);
                                        if (videoRef.current) videoRef.current.currentTime = t;
                                    }}
                                    className="w-full h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                                />
                                <div className="flex justify-between text-[10px] text-zinc-600 font-mono">
                                    <span>0.00s</span>
                                    <span>{videoDuration.toFixed(2)}s</span>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button onClick={() => setShowTimeSelectModal(false)} variant="ghost" className="flex-1 text-zinc-400 hover:text-white rounded-md">Cancel</Button>
                                <Button onClick={confirmFrameTime} className="flex-1 bg-white text-black hover:bg-zinc-200 font-bold uppercase text-xs rounded-md shadow-none">Confirm</Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Add Product Type Modal */}
            <AnimatePresence>
                {isUploadingProduct && (
                    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-zinc-950 border border-zinc-800 rounded-lg w-full max-w-xs overflow-hidden">
                            <div className="p-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                                <h3 className="text-[10px] font-bold text-white uppercase tracking-widest">Add Element</h3>
                                <button onClick={() => setIsUploadingProduct(false)}><X className="w-3 h-3 text-zinc-500 hover:text-white" /></button>
                            </div>
                            <div className="p-4 grid grid-cols-2 gap-3">
                                <button onClick={() => setUploadType('product')} className="relative aspect-square rounded-sm border border-zinc-800 bg-zinc-900/20 hover:bg-zinc-900 flex flex-col items-center justify-center gap-2 group">
                                    <ImageIcon className="w-5 h-5 text-zinc-600 group-hover:text-zinc-300" />
                                    <span className="text-[9px] uppercase tracking-wider text-zinc-600 group-hover:text-zinc-300">Product</span>
                                    <input type="file" onChange={handleProductUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                                </button>
                                <button onClick={() => { setIsUploadingProduct(false); setShowSavedMasksModal(true); }} className="relative aspect-square rounded-sm border border-zinc-800 bg-zinc-900/20 hover:bg-zinc-900 flex flex-col items-center justify-center gap-2 group">
                                    <Eraser className="w-5 h-5 text-zinc-600 group-hover:text-zinc-300" />
                                    <span className="text-[9px] uppercase tracking-wider text-zinc-600 group-hover:text-zinc-300">Mask</span>
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Segmentation Modal (Video Frame or Product) */}
            <SegmentationModal
                isOpen={showVideoSegmentModal || showProductSegmentModal}
                imageSource={showVideoSegmentModal ? (extractedFrameUrl || '') : (products[activeProductIndex]?.url || '')}
                onClose={() => {
                    setShowVideoSegmentModal(false);
                    setShowProductSegmentModal(false);
                }}
                onConfirm={(maskUrl) => {
                    if (showVideoSegmentModal) {
                        setVideoMaskUrl(maskUrl);
                        setShowVideoSegmentModal(false);
                    } else if (showProductSegmentModal && activeProductIndex !== -1) {
                        const newProducts = [...products];
                        newProducts[activeProductIndex].isMasked = true;
                        // Ideally we store the maskUrl somewhere too, effectively mocking it here
                        setProducts(newProducts);
                        setShowProductSegmentModal(false);
                    }
                }}
            />

            {/* Saved Masks Modal */}
            <SavedMasksModal
                isOpen={showSavedMasksModal}
                onClose={() => setShowSavedMasksModal(false)}
                onSelect={handleSavedMaskSelect}
            />

        </div>
    );
};
