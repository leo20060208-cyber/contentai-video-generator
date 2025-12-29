'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, ChevronRight, ChevronLeft, Sparkles, Film, ImageIcon, Wand2, Folder, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SegmentationModal } from '@/components/SegmentationModal';
import { GeneratingModal } from '@/components/GeneratingModal';
import { SavedMasksModal } from '@/components/SavedMasksModal';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { saveUserMask } from '@/lib/db/masks';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface CreateYoursFlowProps {
    onCancel?: () => void;
    initialData?: any;
}

export const CreateYoursFlow = ({ onCancel }: CreateYoursFlowProps) => {
    const router = useRouter();
    const { user } = useAuth();
    const [currentStep, setCurrentStep] = useState(1);

    // Step 1: Video Upload
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [videoDuration, setVideoDuration] = useState<number>(0);
    const [selectedTimestamp, setSelectedTimestamp] = useState<number>(0);
    const [extractedFrameUrl, setExtractedFrameUrl] = useState<string | null>(null);
    const [videoMaskUrl, setVideoMaskUrl] = useState<string | null>(null);
    const [videoMaskSkipped, setVideoMaskSkipped] = useState(false);
    const [showVideoSegmentModal, setShowVideoSegmentModal] = useState(false);
    const [isExtractingFrame, setIsExtractingFrame] = useState(false);

    // Step 2: Product Upload - MULTI-IMAGE SUPPORT
    const [productImages, setProductImages] = useState<{ url: string, name: string, isMask: boolean }[]>([]);
    const [activeProductIndex, setActiveProductIndex] = useState<number>(-1);
    const [showProductSegmentModal, setShowProductSegmentModal] = useState(false);
    const [showSavedMasksModal, setShowSavedMasksModal] = useState(false);
    const [isSavingMask, setIsSavingMask] = useState(false);

    // Optional: Change Persona
    const [personaImage, setPersonaImage] = useState<string | null>(null);

    // Step 3: Prompt & Generate
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Generation Modal
    const [genModal, setGenModal] = useState<{
        isOpen: boolean;
        status: 'processing' | 'mixing_audio' | 'completed' | 'failed';
        videoUrl: string | null;
        taskId: string | null;
    }>({
        isOpen: false,
        status: 'processing',
        videoUrl: null,
        taskId: null
    });

    const videoRef = useRef<HTMLVideoElement>(null);

    // Auto-generate prompt when products change
    useEffect(() => {
        if (productImages.length > 0) {
            const names = productImages.map(p => p.name).join(', ');
            const autoPrompt = `Please recreate this video, replacing the original product(s) with: ${names}. Keep the same style, lighting, and camera movements.`;
            setPrompt(autoPrompt);
        }
    }, [productImages]);

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

            if (duration > 20) {
                alert('⚠️ Video massa llarg!\n\nLa duració màxima és de 20 segons.\nEl teu vídeo dura ' + Math.round(duration) + ' segons.');
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

            // Upload to Supabase
            const fileName = `frames/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
            const { error: uploadError } = await supabase.storage
                .from('videos')
                .upload(fileName, blob, {
                    contentType: 'image/jpeg'
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('videos')
                .getPublicUrl(fileName);

            setExtractedFrameUrl(publicUrl);
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

        console.log('📷 [UPLOAD] Starting product upload...');

        const reader = new FileReader();
        reader.onload = (loadEvent) => {
            const base64 = loadEvent.target?.result as string;

            // Add to product images array
            setProductImages(prev => [...prev, {
                url: base64, // Initially use same image for both
                name: file.name.replace(/\.[^/.]+$/, ''),
                isMask: false // Not masked yet
            }]);
        };
        reader.readAsDataURL(file);
    };

    // Handle saved mask selection
    const handleSavedMaskSelect = (maskUrl: string) => {
        setProductImages(prev => [...prev, {
            url: maskUrl,
            name: 'Saved Mask',
            isMask: true
        }]);
        setShowSavedMasksModal(false);
    };

    // Handle delete product
    const handleDeleteProduct = (index: number) => {
        setProductImages(prev => prev.filter((_, i) => i !== index));
    };

    // Handle persona upload
    const handlePersonaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (loadEvent) => {
            setPersonaImage(loadEvent.target?.result as string);
            setActiveProductIndex(-100); // Use -100 for Persona
            setShowProductSegmentModal(true);
        };
        reader.readAsDataURL(file);
    };

    // Handle generation
    const handleGenerate = async () => {
        // Check if we have the minimum required data
        const hasVideoSource = videoUrl && (videoMaskUrl || videoMaskSkipped || extractedFrameUrl);
        const hasProductSource = productImages.length > 0;

        if (!hasVideoSource || !hasProductSource) {
            alert('Please complete all steps');
            return;
        }

        if (!videoFile) {
            alert('Video file not found. Please re-upload the video.');
            return;
        }

        setIsGenerating(true);
        setGenModal({ isOpen: true, status: 'processing', videoUrl: null, taskId: null });

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            // Upload video to permanent location
            const fileName = `user-videos/${Date.now()}_${videoFile.name}`;
            const { error: uploadError } = await supabase.storage
                .from('videos')
                .upload(fileName, videoFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('videos')
                .getPublicUrl(fileName);

            // Prepare images array: Products + Persona
            const imagesToUse = productImages.map(p => p.url);
            if (personaImage) {
                imagesToUse.push(personaImage);
            }

            const response = await fetch('/api/video/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    model: 'kwaivgi/kling-video-o1/video-edit',
                    images: imagesToUse,
                    audio_url: publicUrl, // Original video for Video Edit
                    prompt: prompt || 'Recreate this video with the new products',
                    duration: Math.min(videoDuration, 10),
                    aspect_ratio: '9:16'
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Generation failed');
            }
            const data = await response.json();

            if (data.taskId) {
                setGenModal(prev => ({ ...prev, taskId: data.taskId }));
                // Start polling
                startPolling(data.taskId);
            }
        } catch (error) {
            console.error('Error generating:', error);
            setGenModal(prev => ({ ...prev, status: 'failed' }));
        } finally {
            setIsGenerating(false);
        }
    };

    // Polling logic
    const startPolling = (taskId: string) => {
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/video/status?taskId=${taskId}&provider=wavespeed`);
                const data = await res.json();

                if (data.data?.status === 'completed' || data.data?.status === 'succeeded') {
                    clearInterval(interval);
                    const generatedVideoUrl = data.data.video?.url;

                    if (generatedVideoUrl && videoUrl) {
                        // Merge audio
                        setGenModal(prev => ({ ...prev, status: 'mixing_audio' }));

                        const mergeRes = await fetch('/api/video/merge-audio', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                videoId: taskId,
                                videoUrl: generatedVideoUrl,
                                audioUrl: videoUrl
                            })
                        });

                        const mergeData = await mergeRes.json();
                        if (mergeData.url) {
                            // Update DB
                            await supabase
                                .from('videos')
                                .update({ video_url: mergeData.url, status: 'completed' })
                                .eq('task_id', taskId);

                            setGenModal(prev => ({ ...prev, status: 'completed', videoUrl: mergeData.url }));
                        }
                    }
                } else if (data.data?.status === 'failed') {
                    clearInterval(interval);
                    setGenModal(prev => ({ ...prev, status: 'failed' }));
                }
            } catch (e) {
                console.error('Polling error', e);
            }
        }, 4000);
    };

    // SIMPLIFIED: Just check if we have the minimum required data
    // Step 1: Need video URL and extracted frame (or skipped)
    const canProceedStep1 = !!(videoUrl && (extractedFrameUrl || videoMaskSkipped));
    // Step 2: Need at least one product image
    const canProceedStep2 = productImages.length > 0;
    const canGenerate = canProceedStep1 && canProceedStep2;

    return (
        <div className="w-full max-w-3xl mx-auto flex flex-col gap-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-white">Create Yours</h1>
                    <p className="text-sm text-zinc-400 mt-0.5">Recreate your video in 3 easy steps</p>
                </div>

                {/* Progress Steps */}
                <div className="flex items-center gap-1.5 bg-zinc-900/50 p-1.5 rounded-xl border border-white/5">
                    {[1, 2, 3].map((step) => (
                        <div key={step} className="flex items-center gap-1.5">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${currentStep >= step ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-500'
                                }`}>
                                {step}
                            </div>
                            {step < 3 && <div className={`w-6 h-0.5 ${currentStep > step ? 'bg-orange-500' : 'bg-zinc-800'}`} />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Content Card */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-3xl p-5 md:p-6 min-h-[45vh]">
                {/* STEP 1: Video Upload */}
                {currentStep === 1 && (
                    <div className="max-w-xl mx-auto space-y-4">
                        <div className="text-center">
                            <h3 className="text-lg font-semibold text-white mb-1">Upload Your Video</h3>
                            <p className="text-xs text-zinc-400">Maximum duration: 20 seconds</p>
                        </div>

                        {!videoUrl ? (
                            <label className="block w-full aspect-video rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-800/30 hover:bg-zinc-800/50 cursor-pointer transition-all group">
                                <input
                                    type="file"
                                    accept="video/*"
                                    className="hidden"
                                    onChange={handleVideoUpload}
                                />
                                <div className="flex flex-col items-center justify-center h-full gap-3">
                                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                                        <Upload className="w-6 h-6 text-zinc-400 group-hover:text-white" />
                                    </div>
                                    <div className="text-center px-4">
                                        <span className="text-base font-medium text-white block">Click to upload video</span>
                                        <span className="text-xs text-zinc-500 mt-1">or drag and drop here</span>
                                    </div>
                                </div>
                            </label>
                        ) : (
                            <div className="space-y-6">
                                <div className="relative aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl">
                                    <video
                                        ref={videoRef}
                                        src={videoUrl}
                                        className="w-full h-full object-contain"
                                        controls
                                    />
                                    <button
                                        onClick={() => {
                                            setVideoUrl(null);
                                            setVideoFile(null);
                                        }}
                                        className="absolute top-4 right-4 p-2 bg-black/60 rounded-full text-white hover:bg-red-500 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="bg-zinc-900 p-4 rounded-2x border border-white/5 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-medium text-white">
                                            Select Key Frame
                                        </label>
                                        <span className="text-[10px] font-mono text-zinc-400">{selectedTimestamp.toFixed(1)}s</span>
                                    </div>

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
                                        className="w-full accent-orange-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                                    />

                                    {!extractedFrameUrl && !videoMaskSkipped ? (
                                        <div className="flex justify-center">
                                            <Button
                                                onClick={handleExtractFrame}
                                                disabled={isExtractingFrame}
                                                className="py-1.5 px-6 bg-orange-500 hover:bg-orange-600 text-xs font-bold shadow-md shadow-orange-500/10 rounded-md"
                                            >
                                                {isExtractingFrame ? 'Extracting...' : 'Extract Frame'}
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                                            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                                                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                            </div>
                                            <span className="text-sm font-medium text-green-400">
                                                {videoMaskSkipped
                                                    ? 'Mask skipped - using original frame'
                                                    : 'Frame extracted & processed successfully'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 2: Product Upload */}
                {currentStep === 2 && (
                    <div className="max-w-3xl mx-auto space-y-5">
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-1">Upload Your Products</h3>
                            <p className="text-xs text-zinc-400">Upload one or more product images to insert into your video</p>
                        </div>

                        {/* Product List Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {productImages.map((product, index) => (
                                <div key={index} className="relative group bg-zinc-800 rounded-2xl p-3 border border-white/5 hover:border-orange-500/50 transition-colors">
                                    <div className="aspect-square rounded-xl overflow-hidden bg-black mb-3 relative">
                                        <img src={product.url} alt={product.name} className="w-full h-full object-contain" />
                                        {product.isMask && (
                                            <div className="absolute top-2 left-2 bg-green-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded shadow-lg">
                                                MASKED
                                            </div>
                                        )}
                                        <button
                                            onClick={() => handleDeleteProduct(index)}
                                            className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-red-500 text-white p-1 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    <input
                                        type="text"
                                        value={product.name}
                                        onChange={(e) => {
                                            const newName = e.target.value;
                                            setProductImages(prev => prev.map((p, i) => i === index ? { ...p, name: newName } : p));
                                        }}
                                        className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500 mb-2"
                                        placeholder="Product Name"
                                    />

                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="w-full text-[10px] h-7"
                                        onClick={() => {
                                            setActiveProductIndex(index);
                                            setShowProductSegmentModal(true);
                                        }}
                                    >
                                        <Wand2 className="w-2.5 h-2.5 mr-1.5" />
                                        {product.isMask ? 'Refine Mask' : 'Create Mask'}
                                    </Button>
                                </div>
                            ))}

                            {/* Add New Product Card */}
                            <label className="aspect-[3/4] rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-800/30 hover:bg-zinc-800/50 cursor-pointer transition-colors flex flex-col items-center justify-center gap-3 group">
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleProductUpload}
                                />
                                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                                    <Upload className="w-6 h-6 text-zinc-400 group-hover:text-white" />
                                </div>
                                <span className="text-sm font-medium text-zinc-400 group-hover:text-white">Add Product</span>
                            </label>

                            <button
                                onClick={() => setShowSavedMasksModal(true)}
                                className="aspect-[3/4] rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-800/30 hover:bg-zinc-800/50 cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 group"
                            >
                                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                                    <Folder className="w-5 h-5 text-zinc-400 group-hover:text-white" />
                                </div>
                                <span className="text-xs font-medium text-zinc-400 group-hover:text-white text-center">From Saved<br />Masks</span>
                            </button>
                        </div>

                        {/* OPTIONAL: Change Persona */}
                        <div className="pt-6 border-t border-white/10">
                            <h3 className="text-base font-semibold text-white mb-1">Change Persona (Optional)</h3>
                            <p className="text-xs text-zinc-400 mb-4">Upload a photo to swap the person in the video</p>

                            {!personaImage ? (
                                <label className="flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed border-zinc-700 bg-zinc-800/30 hover:bg-zinc-800/50 cursor-pointer transition-colors group">
                                    <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                                        <ImageIcon className="w-7 h-7 text-zinc-400 group-hover:text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <span className="text-base font-medium text-white block">Upload Person Photo</span>
                                        <span className="text-sm text-zinc-500">Click to browse</span>
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handlePersonaUpload}
                                    />
                                </label>
                            ) : (
                                <div className="flex items-center gap-6 p-4 rounded-2xl bg-zinc-800 border border-white/5">
                                    <div className="w-20 h-20 rounded-xl overflow-hidden border border-white/10 shadow-lg">
                                        <img src={personaImage} alt="Persona" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1">
                                        <span className="text-lg text-white font-medium block">Persona Active</span>
                                        <p className="text-sm text-zinc-500">This face will be used in the generated video</p>
                                    </div>
                                    <button
                                        onClick={() => setPersonaImage(null)}
                                        className="p-3 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* STEP 3: Prompt & Generate */}
                {currentStep === 3 && (
                    <div className="max-w-3xl mx-auto space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-1">Final Details</h3>
                            <p className="text-xs text-zinc-400">Review your prompt and generate your video</p>
                        </div>

                        <div className="space-y-3">
                            <label className="block text-xs font-medium text-white">Your Prompt</label>
                            <div className="relative">
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="e.g., Please recreate this video with my product..."
                                    className="w-full h-28 p-4 rounded-xl bg-zinc-900 border border-white/10 text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                />
                                {productImages.length > 0 && (
                                    <div className="absolute bottom-4 right-4 flex items-center gap-2 text-xs bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
                                        <Sparkles className="w-3 h-3 text-orange-500" />
                                        <span className="text-zinc-400">Context: <span className="text-white">{productImages.length} Products</span></span>
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-zinc-500 px-2">
                                {productImages.length > 0
                                    ? "Prompt auto-generated based on your uploaded products. Feel free to refine it."
                                    : "Describe how you want the video to look."}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="p-3.5 rounded-2xl bg-zinc-900 border border-white/5 flex flex-col items-center text-center gap-1.5">
                                <div className="text-[10px] text-zinc-500">Duration</div>
                                <div className="text-lg font-bold text-white flex items-center gap-1.5">
                                    <Film className="w-4 h-4 text-zinc-600" />
                                    {videoDuration.toFixed(1)}s
                                </div>
                            </div>
                            <div className="p-3.5 rounded-2xl bg-zinc-900 border border-white/5 flex flex-col items-center text-center gap-1.5">
                                <div className="text-[10px] text-zinc-500">AI Model</div>
                                <div className="text-lg font-bold text-white flex items-center gap-1.5">
                                    <Wand2 className="w-4 h-4 text-purple-500" />
                                    Video-Edit
                                </div>
                            </div>
                            <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex flex-col items-center text-center gap-1.5">
                                <div className="text-[10px] text-orange-400">Estimated Cost</div>
                                <div className="text-lg font-bold text-orange-500 flex items-center gap-1.5">
                                    {videoDuration <= 10 ? '75' : videoDuration <= 15 ? '95' : '130'} Credits
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                        if (currentStep > 1) {
                            setCurrentStep(currentStep - 1);
                        } else if (onCancel) {
                            onCancel();
                        } else {
                            router.back();
                        }
                    }}
                    className="flex items-center gap-2 text-zinc-400 hover:text-white"
                >
                    <ChevronLeft className="w-4 h-4" />
                    {currentStep === 1 ? 'Cancel' : 'Back'}
                </Button>

                {currentStep < 3 ? (
                    <Button
                        onClick={() => setCurrentStep(currentStep + 1)}
                        disabled={currentStep === 1 ? !canProceedStep1 : !canProceedStep2}
                        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 px-6 py-2.5 text-sm rounded-xl shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                ) : (
                    <Button
                        onClick={handleGenerate}
                        disabled={!canGenerate || isGenerating}
                        className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 px-6 py-2.5 text-sm rounded-xl shadow-xl shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Sparkles className="w-4 h-4" />
                        {isGenerating ? 'Generating...' : 'Generate Video'}
                    </Button>
                )}
            </div>

            {/* Segmentation Modals */}
            <SegmentationModal
                isOpen={showVideoSegmentModal}
                imageSource={extractedFrameUrl || ''}
                onClose={() => {
                    setVideoMaskUrl(extractedFrameUrl);
                    setVideoMaskSkipped(true);
                    setShowVideoSegmentModal(false);
                }}
                onConfirm={(maskUrl) => {
                    if (maskUrl) {
                        setVideoMaskUrl(maskUrl);
                        setVideoMaskSkipped(false);
                    } else {
                        setVideoMaskUrl(extractedFrameUrl);
                        setVideoMaskSkipped(true);
                    }
                    setShowVideoSegmentModal(false);
                }}
            />

            <SegmentationModal
                isOpen={showProductSegmentModal}
                imageSource={activeProductIndex === -100 ? (personaImage || '') : (productImages[activeProductIndex]?.url || '')}
                onClose={() => setShowProductSegmentModal(false)}
                onConfirm={(maskUrl) => {
                    const index = activeProductIndex;

                    if (index === -100) {
                        if (maskUrl) setPersonaImage(maskUrl);
                        setShowProductSegmentModal(false);
                        return;
                    }

                    if (index === -1 || !productImages[index]) {
                        setShowProductSegmentModal(false);
                        return;
                    }

                    if (maskUrl) {
                        setProductImages(prev => prev.map((p, i) =>
                            i === index ? { ...p, url: maskUrl, isMask: true } : p
                        ));

                        if (user) {
                            setIsSavingMask(true);
                            saveUserMask(user.id, maskUrl, productImages[index].name + ' Mask')
                                .then(() => console.log('✅ Mask saved automatically'))
                                .catch((e) => console.error('Failed to save mask:', e))
                                .finally(() => setIsSavingMask(false));
                        }
                    }
                    setShowProductSegmentModal(false);
                }}
            />

            <SavedMasksModal
                isOpen={showSavedMasksModal}
                onClose={() => setShowSavedMasksModal(false)}
                onSelect={handleSavedMaskSelect}
            />

            <GeneratingModal
                isOpen={genModal.isOpen}
                status={genModal.status}
                videoUrl={genModal.videoUrl}
                onClose={() => {
                    setGenModal(prev => ({ ...prev, isOpen: false }));
                    router.push('/profile'); // Redirect to profile or library after generation
                }}
                onGoToStudio={() => { }}
                onGoToMyVideos={() => router.push('/profile')}
            />
        </div>
    );
};
