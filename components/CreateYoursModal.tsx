'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, ChevronRight, ChevronLeft, Sparkles, Film, ImageIcon, Wand2, Folder } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SegmentationModal } from '@/components/SegmentationModal';
import { GeneratingModal } from '@/components/GeneratingModal';
import { SavedMasksModal } from '@/components/SavedMasksModal';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const sanitizeStorageFileName = (inputName: string): string => {
    // Supabase Storage object keys are picky: avoid spaces, emojis, and special chars.
    // Keep it stable and readable.
    const normalized = (inputName || 'file')
        .normalize('NFKD')
        // Replace anything not safe for storage keys
        .replace(/[^a-zA-Z0-9._-]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');

    // Avoid empty names
    return normalized.length > 0 ? normalized : 'file';
};

const uploadToStorageViaApi = async (params: {
    token: string;
    file: File;
    prefix: 'user-videos' | 'frames' | 'products';
}): Promise<{ storagePath: string; signedUrl: string }> => {
    const form = new FormData();
    form.append('file', params.file);
    form.append('prefix', params.prefix);

    const res = await fetch('/api/storage/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${params.token}` },
        body: form
    });

    const raw = await res.text();
    const data: unknown = raw ? JSON.parse(raw) : {};
    if (!res.ok) {
        const msg =
            typeof data === 'object' && data !== null && 'error' in data && typeof (data as { error?: unknown }).error === 'string'
                ? (data as { error: string }).error
                : (raw || 'Upload failed');
        throw new Error(msg);
    }
    const parsed = data as { success?: boolean; storagePath?: unknown; signedUrl?: unknown };
    const storagePath = typeof parsed.storagePath === 'string' ? parsed.storagePath : null;
    const signedUrl = typeof parsed.signedUrl === 'string' ? parsed.signedUrl : null;
    if (!storagePath || !signedUrl) throw new Error('Upload did not return signedUrl/storagePath');
    return { storagePath, signedUrl };
};

interface CreateYoursModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CreateYoursModal = ({ isOpen, onClose }: CreateYoursModalProps) => {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);

    // Step 1: Video Upload
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [videoDuration, setVideoDuration] = useState<number>(0);
    const [selectedTimestamp, setSelectedTimestamp] = useState<number>(0);
    const [extractedFrameUrl, setExtractedFrameUrl] = useState<string | null>(null);
    const [videoMaskUrl, setVideoMaskUrl] = useState<string | null>(null);
    const [showVideoSegmentModal, setShowVideoSegmentModal] = useState(false);
    const [isExtractingFrame, setIsExtractingFrame] = useState(false);

    // Step 2: Product Upload
    const [productImage, setProductImage] = useState<string | null>(null);
    const [productImageUrl, setProductImageUrl] = useState<string | null>(null);
    const [productMaskUrl, setProductMaskUrl] = useState<string | null>(null);
    const [productName, setProductName] = useState<string>('');
    const [showProductSegmentModal, setShowProductSegmentModal] = useState(false);
    const [showSavedMasksModal, setShowSavedMasksModal] = useState(false);

    // Step 3: Prompt & Generate
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Generation Modal
    const [genModal, setGenModal] = useState<{
        isOpen: boolean;
        status: 'processing' | 'mixing_audio' | 'completed' | 'failed';
        videoUrl: string | null;
        taskId: string | null;
        provider: string | null;
        errorMessage: string | null;
        sourceVideoUrl: string | null;
        sourceVideoPath: string | null;
    }>({
        isOpen: false,
        status: 'processing',
        videoUrl: null,
        taskId: null
        ,
        provider: null,
        errorMessage: null,
        sourceVideoUrl: null,
        sourceVideoPath: null
    });

    const videoRef = useRef<HTMLVideoElement>(null);
    const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const failGeneration = (message: unknown) => {
        const msg =
            typeof message === 'string' && message.trim().length > 0
                ? message
                : (message && typeof message === 'object' && 'message' in (message as Record<string, unknown>) && typeof (message as { message?: unknown }).message === 'string'
                    ? (message as { message: string }).message
                    : 'Error desconegut. Revisa la consola del navegador o els logs del servidor.');

        setGenModal(prev => ({
            ...prev,
            isOpen: true,
            status: 'failed',
            errorMessage: msg
        }));
    };

    // Cleanup polling when modal closes/unmounts
    useEffect(() => {
        if (!genModal.isOpen && pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        };
    }, [genModal.isOpen]);

    // Handle video upload
    const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check if video
        if (!file.type.startsWith('video/')) {
            alert('Please upload a video file');
            return;
        }

        // Create video element to check duration
        const video = document.createElement('video');
        video.preload = 'metadata';

        video.onloadedmetadata = () => {
            window.URL.revokeObjectURL(video.src);
            const duration = video.duration;

            if (duration > 10) {
                alert('⚠️ Video massa llarg!\\n\\nLa duració màxima és de 10 segons.\\nEl teu vídeo dura ' + Math.round(duration) + ' segons.');
                return;
            }

            setVideoDuration(duration);
            setVideoFile(file);
            setVideoUrl(URL.createObjectURL(file));
            setSelectedTimestamp(duration / 2); // Default to middle
        };

        video.src = URL.createObjectURL(file);
    };

    // Extract frame at selected timestamp using Canvas (client-side)
    const handleExtractFrame = async () => {
        if (!videoRef.current) return;

        setIsExtractingFrame(true);
        try {
            // Create canvas to capture frame
            const video = videoRef.current;
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Could not get canvas context');

            // Draw current frame
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Convert to blob
            const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob((b) => {
                    if (b) resolve(b);
                    else reject(new Error('Failed to create blob'));
                }, 'image/jpeg', 0.95);
            });

            // IMPORTANT:
            // Use a local data URL for segmentation preview to avoid CORS/tainted-canvas issues.
            // (The segmentation API already supports data: URIs.)
            const localPreviewUrl = canvas.toDataURL('image/jpeg', 0.95);
            setExtractedFrameUrl(localPreviewUrl);
            setShowVideoSegmentModal(true);
        } catch (error) {
            console.error('Error extracting frame:', error);
            alert('Error extracting frame. Please try again.');
        } finally {
            setIsExtractingFrame(false);
        }
    };

    // Handle product upload
    const handleProductUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset any previous mask when changing product image
        setProductMaskUrl(null);

        const reader = new FileReader();
        reader.onload = async (loadEvent) => {
            const base64 = loadEvent.target?.result as string;
            setProductImage(base64);
            setProductImageUrl(null);
            setProductName(file.name.replace(/\.[^/.]+$/, '')); // Remove extension
            setShowProductSegmentModal(true);

            // Upload original product image via backend to avoid Storage/RLS + huge base64 payloads
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;
                if (!token) return;
                const uploaded = await uploadToStorageViaApi({ token, file, prefix: 'products' });
                setProductImageUrl(uploaded.signedUrl);
            } catch (err) {
                console.warn('Product upload exception (will fallback to base64):', err);
            }
        };
        reader.readAsDataURL(file);
    };

    const resetProduct = () => {
        setProductImage(null);
        setProductImageUrl(null);
        setProductMaskUrl(null);
        setProductName('');
        setShowProductSegmentModal(false);
    };

    // Handle saved mask selection
    const handleSavedMaskSelect = (maskUrl: string) => {
        setProductImage(maskUrl);
        setProductImageUrl(maskUrl);
        setProductMaskUrl(maskUrl);
        setProductName('Saved Mask');
        setShowSavedMasksModal(false);
    };

    // Handle generation
    const handleGenerate = async () => {
        const productReferenceImage = productImageUrl || productImage || productMaskUrl;
        if (!videoUrl || !videoFile || !extractedFrameUrl || !productReferenceImage) {
            alert('Please complete all steps');
            return;
        }

        setIsGenerating(true);
        setGenModal({
            isOpen: true,
            status: 'processing',
            videoUrl: null,
            taskId: null,
            provider: null,
            errorMessage: null,
            sourceVideoUrl: null,
            sourceVideoPath: null
        });

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) throw new Error('Not authenticated');

            // Upload video to permanent location
            const uploadedVideo = await uploadToStorageViaApi({ token, file: videoFile!, prefix: 'user-videos' });
            const fileName = uploadedVideo.storagePath;
            const signedUrl = uploadedVideo.signedUrl;

            setGenModal(prev => ({ ...prev, sourceVideoUrl: signedUrl, sourceVideoPath: fileName }));

            // IMPORTANT:
            // - Segmentation returns a *mask overlay*, not the product image.
            // - Video-edit expects a reference image of the product (texture/color), so prefer the original product image.
            // Note: Product masking is optional; the model needs a product reference image.
            // Prefer the uploaded URL when available.
            if (!productReferenceImage) throw new Error('Missing product reference image');

            const response = await fetch('/api/video/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    model: 'kwaivgi/kling-video-o1/video-edit',
                    images: [productReferenceImage],
                    audio_url: signedUrl, // Signed URL for provider access
                    audio_storage_path: fileName, // Allows server to create a signed URL (works even if bucket is private)
                    prompt: prompt || 'Recreate this video with the new product',
                    duration: Math.min(videoDuration, 10),
                    aspect_ratio: '9:16'
                })
            });

            const rawText = await response.text();
            let data: unknown = {};
            try {
                data = rawText ? JSON.parse(rawText) : {};
            } catch {
                // keep as {}
            }

            if (!response.ok) {
                const errMsg =
                    typeof data === 'object' && data !== null && 'error' in data && typeof (data as { error?: unknown }).error === 'string'
                        ? (data as { error: string }).error
                        : (rawText || 'Generation failed');
                throw new Error(errMsg);
            }

            const parsed = data as { taskId?: unknown; provider?: unknown };
            const taskId = typeof parsed.taskId === 'string' ? parsed.taskId : null;
            const provider = typeof parsed.provider === 'string' ? parsed.provider : null;

            if (taskId) {
                // Avoid TS narrowing issues inside state updater closure
                setGenModal(prev => ({ ...prev, taskId, provider }));
                // Start polling
                startPolling(taskId, provider, signedUrl, fileName);
            } else {
                throw new Error('No taskId returned from server');
            }
        } catch (error) {
            console.error('Error generating:', error);
            failGeneration(error);
        } finally {
            setIsGenerating(false);
        }
    };

    // Polling logic
    const startPolling = (taskId: string, provider: string | null, sourceVideoUrl: string, sourceVideoPath: string) => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }

        const interval = setInterval(async () => {
            try {
                const providerParam = provider || 'wavespeed';
                // Skip persistence here to speed up the pipeline; merge step will upload final.
                const res = await fetch(`/api/video/status?taskId=${encodeURIComponent(taskId)}&provider=${encodeURIComponent(providerParam)}&skip_persist=1`);
                const raw = await res.text();
                const data: unknown = raw ? JSON.parse(raw) : {};

                if (!res.ok) {
                    const apiErr =
                        typeof data === 'object' && data !== null && 'error' in data && typeof (data as { error?: unknown }).error === 'string'
                            ? (data as { error: string }).error
                            : (raw || 'Status check failed');
                    throw new Error(apiErr);
                }

                const payload = data as {
                    data?: { status?: string; video?: { url?: string } | null; error?: string | null; statusMessage?: string | null };
                    error?: string;
                };

                if (payload.data?.status === 'completed' || payload.data?.status === 'succeeded') {
                    clearInterval(interval);
                    pollingIntervalRef.current = null;
                    const generatedVideoUrl = payload.data?.video?.url;
                    const generatedVideoStoragePath = payload.data?.video && 'storagePath' in payload.data.video
                        ? (payload.data.video as { storagePath?: string | null }).storagePath ?? null
                        : null;

                    if (generatedVideoUrl && videoUrl) {
                        // Merge audio
                        setGenModal(prev => ({ ...prev, status: 'mixing_audio' }));

                        const mergeController = new AbortController();
                        const mergeTimeout = setTimeout(() => mergeController.abort(), 240_000); // 4 min
                        let mergeRes: Response | null = null;
                        try {
                            mergeRes = await fetch('/api/video/merge-audio', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    videoId: taskId,
                                    videoUrl: generatedVideoUrl,
                                    videoStoragePath: generatedVideoStoragePath,
                                    // IMPORTANT: server cannot fetch `blob:` URLs; use the uploaded public URL
                                    audioUrl: sourceVideoUrl,
                                    audioStoragePath: sourceVideoPath
                                }),
                                signal: mergeController.signal
                            });
                        } catch (mergeErr) {
                            // If merge fails/timeouts, still return the generated video URL (no audio) instead of blocking the user.
                            console.warn('Audio merge failed, falling back to video without merged audio:', mergeErr);
                            setGenModal(prev => ({
                                ...prev,
                                status: 'completed',
                                videoUrl: generatedVideoUrl,
                                errorMessage: 'No s’ha pogut unir l’àudio. Mostrant el vídeo generat sense àudio.'
                            }));
                            clearInterval(interval);
                            pollingIntervalRef.current = null;
                            return;
                        } finally {
                            clearTimeout(mergeTimeout);
                        }

                        const mergeText = await mergeRes.text();
                        const mergeData: unknown = mergeText ? JSON.parse(mergeText) : {};

                        if (!mergeRes.ok) {
                            const mergeErr =
                                typeof mergeData === 'object' && mergeData !== null && 'error' in mergeData && typeof (mergeData as { error?: unknown }).error === 'string'
                                    ? (mergeData as { error: string }).error
                                    : (mergeText || 'Audio merge failed');
                            // Fallback to video without merged audio
                            setGenModal(prev => ({
                                ...prev,
                                status: 'completed',
                                videoUrl: generatedVideoUrl,
                                errorMessage: `No s’ha pogut unir l’àudio (${mergeErr}). Mostrant el vídeo generat sense àudio.`
                            }));
                            return;
                        }

                        if (typeof mergeData === 'object' && mergeData !== null && 'url' in mergeData && typeof (mergeData as { url?: unknown }).url === 'string') {
                            // Update DB
                            await supabase
                                .from('videos')
                                .update({ video_url: mergeData.url, status: 'completed' })
                                .eq('task_id', taskId);

                            setGenModal(prev => ({ ...prev, status: 'completed', videoUrl: (mergeData as { url: string }).url }));
                        } else {
                            throw new Error('Audio merge did not return a URL');
                        }
                    }
                } else if (payload.data?.status === 'failed') {
                    clearInterval(interval);
                    pollingIntervalRef.current = null;
                    const failMsg =
                        payload.data?.error ||
                        payload.data?.statusMessage ||
                        payload.error ||
                        'La generació ha fallat. Si us plau, torna-ho a intentar.';
                    failGeneration(failMsg);
                } else if ((payload.data?.status === 'completed' || payload.data?.status === 'succeeded') && !payload.data?.video?.url) {
                    // Completed but no URL is an actionable failure for the UI
                    clearInterval(interval);
                    pollingIntervalRef.current = null;
                    failGeneration('El proveïdor ha marcat el vídeo com a completat però no ha retornat cap URL.');
                }
            } catch (e) {
                console.error('Polling error', e);
                clearInterval(interval);
                pollingIntervalRef.current = null;
                failGeneration(e);
            }
        }, 4000);
        pollingIntervalRef.current = interval;
    };

    const canProceedStep1 = !!(videoUrl && extractedFrameUrl);
    // Masking is optional for step 2; allow proceeding with product image (or uploaded URL).
    const canProceedStep2 = !!(productImageUrl || productImage);
    const canGenerate = canProceedStep1 && canProceedStep2;

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            onClick={onClose}
                        />

                        {/* Modal */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-2xl bg-zinc-900 rounded-3xl shadow-2xl border border-white/10 my-8 mx-auto max-h-[90vh] flex flex-col"
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-white/10">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">Create Yours</h2>
                                        <p className="text-sm text-zinc-400 mt-1">Recreate your video in 3 easy steps</p>
                                    </div>
                                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>

                                {/* Progress Steps */}
                                <div className="flex items-center gap-2 mt-6">
                                    {[1, 2, 3].map((step) => (
                                        <div key={step} className="flex-1 flex items-center gap-2">
                                            <div className={`flex-1 h-1 rounded-full transition-colors ${currentStep >= step ? 'bg-orange-500' : 'bg-zinc-800'
                                                }`} />
                                            <span className={`text-xs font-medium ${currentStep >= step ? 'text-orange-500' : 'text-zinc-600'
                                                }`}>
                                                {step === 1 ? 'Video' : step === 2 ? 'Product' : 'Generate'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 overflow-y-auto flex-1 relative z-0">
                                {/* STEP 1: Video Upload */}
                                {currentStep === 1 && (
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-lg font-semibold text-white mb-2">Upload Your Video</h3>
                                            <p className="text-sm text-zinc-400 mb-4">Maximum duration: 10 seconds</p>

                                            {!videoUrl ? (
                                                <label className="block w-full aspect-video rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-800/30 hover:bg-zinc-800 cursor-pointer transition-colors">
                                                    <input
                                                        type="file"
                                                        accept="video/*"
                                                        className="hidden"
                                                        onChange={handleVideoUpload}
                                                    />
                                                    <div className="flex flex-col items-center justify-center h-full">
                                                        <Upload className="w-12 h-12 text-zinc-600 mb-3" />
                                                        <span className="text-sm text-zinc-500">Click to upload video</span>
                                                        <span className="text-xs text-zinc-600 mt-1">Max 10 seconds</span>
                                                    </div>
                                                </label>
                                            ) : (
                                                <div className="space-y-4">
                                                    <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
                                                        <video
                                                            ref={videoRef}
                                                            src={videoUrl}
                                                            className="w-full h-full object-contain"
                                                            controls
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-white mb-2">
                                                            Select Frame ({selectedTimestamp.toFixed(1)}s)
                                                        </label>
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max={videoDuration}
                                                            step="0.1"
                                                            value={selectedTimestamp}
                                                            onChange={(e) => {
                                                                const time = parseFloat(e.target.value);
                                                                setSelectedTimestamp(time);
                                                                if (videoRef.current) {
                                                                    videoRef.current.currentTime = time;
                                                                }
                                                            }}
                                                            className="w-full"
                                                        />
                                                    </div>

                                                    {!extractedFrameUrl ? (
                                                        <Button
                                                            onClick={handleExtractFrame}
                                                            disabled={isExtractingFrame}
                                                            className="w-full bg-orange-500 hover:bg-orange-600"
                                                        >
                                                            {isExtractingFrame ? 'Extracting...' : 'Extract Frame & Create Mask'}
                                                        </Button>
                                                    ) : (
                                                        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                                                            <div className="w-2 h-2 rounded-full bg-green-500" />
                                                            <span className="text-sm text-green-400">Frame extracted & mask created</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* STEP 2: Product Upload */}
                                {currentStep === 2 && (
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-lg font-semibold text-white mb-2">Upload Your Product</h3>
                                            <p className="text-sm text-zinc-400 mb-4">Upload the product image you want to insert</p>

                                            {!productImage ? (
                                                <div className="space-y-4">
                                                    <label className="block w-full aspect-square max-w-sm mx-auto rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-800/30 hover:bg-zinc-800 cursor-pointer transition-colors">
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={handleProductUpload}
                                                        />
                                                        <div className="flex flex-col items-center justify-center h-full">
                                                            <ImageIcon className="w-12 h-12 text-zinc-600 mb-3" />
                                                            <span className="text-sm text-zinc-500">Click to upload product image</span>
                                                        </div>
                                                    </label>

                                                    <div className="text-center">
                                                        <span className="text-xs text-zinc-500">or</span>
                                                    </div>

                                                    <Button
                                                        onClick={() => setShowSavedMasksModal(true)}
                                                        variant="secondary"
                                                        className="w-full max-w-sm mx-auto flex items-center justify-center gap-2"
                                                    >
                                                        <Folder className="w-4 h-4" />
                                                        Choose from Saved Masks
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    <div className="flex flex-wrap items-center justify-center gap-2">
                                                        <label className="cursor-pointer">
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                className="hidden"
                                                                onChange={handleProductUpload}
                                                            />
                                                            <span className="inline-flex">
                                                                <Button type="button" variant="secondary" className="flex items-center gap-2">
                                                                    <Upload className="w-4 h-4" />
                                                                    Change Image
                                                                </Button>
                                                            </span>
                                                        </label>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            onClick={resetProduct}
                                                            className="text-zinc-300 hover:text-white"
                                                        >
                                                            Remove
                                                        </Button>
                                                    </div>
                                                    <div className="relative aspect-square max-w-sm mx-auto rounded-xl overflow-hidden bg-black">
                                                        <img src={productImage} alt="Product" className="w-full h-full object-contain" />
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-white mb-2">
                                                            Product Name
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={productName}
                                                            onChange={(e) => setProductName(e.target.value)}
                                                            placeholder="e.g., Red Hoodie"
                                                            className="w-full max-w-sm mx-auto block px-4 py-2 rounded-lg bg-zinc-800 border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500"
                                                        />
                                                    </div>

                                                    {productMaskUrl && (
                                                        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                                                            <div className="w-2 h-2 rounded-full bg-green-500" />
                                                            <span className="text-sm text-green-400">Product mask created</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* STEP 3: Prompt & Generate */}
                                {currentStep === 3 && (
                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-lg font-semibold text-white mb-2">Add Your Prompt</h3>
                                            <p className="text-sm text-zinc-400 mb-4">Describe how you want the video to look (optional)</p>

                                            <textarea
                                                value={prompt}
                                                onChange={(e) => setPrompt(e.target.value)}
                                                placeholder="e.g., A futuristic city scene with neon lights..."
                                                className="w-full h-32 p-4 rounded-xl bg-zinc-800 border border-white/10 text-white resize-none focus:outline-none focus:border-orange-500"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 rounded-xl bg-zinc-800/50 border border-white/5">
                                                <div className="text-xs text-zinc-500 mb-1">Video Duration</div>
                                                <div className="text-lg font-semibold text-white">{videoDuration.toFixed(1)}s</div>
                                            </div>
                                            <div className="p-4 rounded-xl bg-zinc-800/50 border border-white/5">
                                                <div className="text-xs text-zinc-500 mb-1">Model</div>
                                                <div className="text-lg font-semibold text-white">Video Edit</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-white/10 flex items-center justify-between relative z-20 pointer-events-auto">
                                <Button
                                    variant="secondary"
                                    onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : onClose()}
                                    className="flex items-center gap-2"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    {currentStep === 1 ? 'Cancel' : 'Back'}
                                </Button>

                                {currentStep < 3 ? (
                                    <Button
                                        type="button"
                                        onClick={() => setCurrentStep((s) => Math.min(s + 1, 3))}
                                        // Step 2 masking is optional; don't block navigation here.
                                        // Final validation happens on "Generate".
                                        disabled={currentStep === 1 ? !canProceedStep1 : false}
                                        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600"
                                    >
                                        Next
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleGenerate}
                                        disabled={!canGenerate || isGenerating}
                                        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        Generate Video
                                    </Button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Segmentation Modals */}
            <SegmentationModal
                isOpen={showVideoSegmentModal}
                imageSource={extractedFrameUrl || ''}
                onClose={() => setShowVideoSegmentModal(false)}
                onConfirm={(maskUrl) => {
                    // If user clicks "Skip Masking", still mark step as completed.
                    // Some parts of the UI historically depended on a non-null mask value.
                    setVideoMaskUrl(maskUrl ?? extractedFrameUrl ?? 'skipped');
                    setShowVideoSegmentModal(false);
                    // If user skips masking, still allow continuing the flow.
                    // Auto-advance to keep UX smooth (user can always go back).
                    setCurrentStep((s) => (s === 1 ? 2 : s));
                }}
            />

            <SegmentationModal
                isOpen={showProductSegmentModal}
                imageSource={productImage || ''}
                onClose={() => setShowProductSegmentModal(false)}
                onConfirm={(maskUrl) => {
                    // If user clicks "Skip Masking", still mark step as completed.
                    // Use the product image (URL/base64) as a fallback marker.
                    setProductMaskUrl(maskUrl ?? productImageUrl ?? productImage ?? 'skipped');
                    setShowProductSegmentModal(false);
                    // Masking is optional for Create Yours; proceed even when skipped.
                    setCurrentStep((s) => (s === 2 ? 3 : s));
                }}
            />

            {/* Saved Masks Modal */}
            <SavedMasksModal
                isOpen={showSavedMasksModal}
                onClose={() => setShowSavedMasksModal(false)}
                onSelect={handleSavedMaskSelect}
            />

            {/* Generation Modal */}
            <GeneratingModal
                isOpen={genModal.isOpen}
                status={genModal.status}
                videoUrl={genModal.videoUrl}
                errorMessage={genModal.errorMessage}
                onClose={() => {
                    setGenModal(prev => ({ ...prev, isOpen: false }));
                    onClose(); // Close Create Yours modal too
                }}
                onGoToStudio={() => { }}
                onGoToMyVideos={() => router.push('/profile')}
            />
        </>
    );
};
