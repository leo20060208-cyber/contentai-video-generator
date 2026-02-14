'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, Sparkles, Plus, Layers, Image as ImageIcon, Video, Play, Pause, Wand2, Search, Check, Info, Brush, Eraser, Move, BookOpen, ImagePlus, ChevronRight, ChevronLeft, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { SavedMasksModal } from '@/components/SavedMasksModal';

// Initialize Supabase Client for Realtime (if needed) or direct DB access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

interface ProductLayer {
    id: string;
    url: string; // The image source
    type: 'product' | 'mask'; // Is this a product or a text/shape mask?
    name: string;
    prompt: string;
    details: { id: string; url: string; description: string }[]; // New: Array of detail images with descriptions
    maskPoints: { points: number[][]; type: 'brush' | 'eraser'; width: number }[];
    maskColor: string;
}

const LAYER_COLORS = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#F97316', '#06B6D4', '#84CC16'];

interface NewVideoCreateFlowProps {
    onCancel?: () => void;
    initialVideo?: File | null;
}

export const NewVideoCreateFlow = ({ onCancel, initialVideo }: NewVideoCreateFlowProps) => {
    const router = useRouter();
    const pathname = usePathname();
    const { user, session, profile, deductCreditsOptimistic } = useAuth();

    // --- STATE ---

    // Video State
    const [videoFile, setVideoFile] = useState<File | null>(initialVideo || null);
    const [videoUrl, setVideoUrl] = useState<string | null>(initialVideo ? URL.createObjectURL(initialVideo) : null);
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
    const [skipMask, setSkipMask] = useState(false);

    // Additional Tools
    const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
    const [uploadType, setUploadType] = useState<'product' | 'background' | 'person' | 'detail'>('product');

    const [targetLayerId, setTargetLayerId] = useState<string | null>(null); // For detail image upload
    const [detailUploadTargetId, setDetailUploadTargetId] = useState<string | null>(null);
    const [showSavedMasksModal, setShowSavedMasksModal] = useState(false);
    const [showAddOptions, setShowAddOptions] = useState(false);

    // Prompt
    const [prompt, setPrompt] = useState('');
    const [productSubstitutions, setProductSubstitutions] = useState<string[]>([]);
    const [additionalDetails, setAdditionalDetails] = useState('');
    const [editMode, setEditMode] = useState<'change' | 'chat'>('chat');
    const [chatHistory, setChatHistory] = useState<{ type: 'user' | 'result', content: string, images?: string[] }[]>([]);
    const [chatImages, setChatImages] = useState<string[]>([]);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const chatImageInputRef = useRef<HTMLInputElement>(null);

    // Generation Status
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
    const [taskId, setTaskId] = useState<string | null>(null);
    const [genStatus, setGenStatus] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'workspace' | 'result'>('workspace');

    // Auto-scroll chat history
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory, isGenerating]);
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

    // Default Prompt State
    const [defaultPrompt, setDefaultPrompt] = useState("Recreate the reference video EXACTLY, shot by shot, frame by frame. The ONLY changes allowed are the instructions below. Maintain original camera movement, lighting, and physics.");
    const [defaultChatPrompt, setDefaultChatPrompt] = useState("");

    useEffect(() => {
        async function loadDefault() {
            try {
                const { getSectionContent } = await import('@/lib/db/content');
                const [changeData, chatData] = await Promise.all([
                    getSectionContent('video_editing_default_prompt'),
                    getSectionContent('video_editing_chat_default_prompt')
                ]);
                if (changeData?.prompt) setDefaultPrompt(changeData.prompt);
                if (chatData?.prompt) setDefaultChatPrompt(chatData.prompt);
            } catch (e) { console.error("Failed to load default prompt", e); }
        }
        loadDefault();
    }, []);

    // Construct Prompt (Auto)
    useEffect(() => {
        if (editMode === 'chat') {
            const aspectStr = (videoRef.current?.videoWidth && videoRef.current?.videoHeight)
                ? `\n\nDimensions: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`
                : '';

            let finalChatPrompt = defaultChatPrompt;
            if (finalChatPrompt) {
                if (finalChatPrompt.includes('{{USER_MESSAGE}}')) {
                    finalChatPrompt = finalChatPrompt.replace('{{USER_MESSAGE}}', additionalDetails);
                } else {
                    finalChatPrompt = `${finalChatPrompt}\n\n${additionalDetails}`;
                }
                setPrompt(finalChatPrompt + aspectStr);
            } else {
                setPrompt(additionalDetails + aspectStr);
            }
            return;
        }

        let instructions = "";

        if (layers.length > 0) {
            instructions += "PRODUCT INTEGRATION:\n";
            layers.forEach((layer, i) => {
                const sub = productSubstitutions[i] || layer.name;
                instructions += `• Product ${i + 1} (${sub}): Integrate realistically.`;
                if (layer.prompt) {
                    instructions += ` Description: ${layer.prompt}`;
                }

                if (layer.details && layer.details.length > 0) {
                    layer.details.forEach((detail, idx) => {
                        instructions += ` Detail ${idx + 1}: Use provided detail image. Note: ${detail.description || 'Texture/Material reference'}.`;
                    });
                }
                instructions += "\n";
            });
        }



        const hasMask = layers.some(l => l.maskPoints.length > 0);
        if (hasMask && !skipMask) {
            instructions += "\nMASK: Only modify the content within the provided mask area.\n";
        } else if (skipMask) {
            instructions += "\nMODE: Full frame editing (Masking skipped). Modify the entire scene as needed based on instructions.\n";
        }

        if (additionalDetails.trim()) {
            instructions += `\nADDITIONAL NOTES: ${additionalDetails.trim()}\n`;
        }

        // Construct final prompt using template
        let finalPrompt = defaultPrompt;
        const durationStr = `${Math.ceil(videoDuration) || 'X'}`;

        // Inject Insertions
        if (finalPrompt.includes('{{INSERTIONS}}')) {
            finalPrompt = finalPrompt.replace('{{INSERTIONS}}', instructions);
        } else {
            // Fallback: Append instructions if placeholder missing
            finalPrompt = `${finalPrompt}\n\n${instructions}`;
        }

        // Inject Duration
        if (finalPrompt.includes('{{DURATION}}')) {
            finalPrompt = finalPrompt.replace('{{DURATION}}', durationStr);
        } else if (!finalPrompt.includes('EXACT DURATION')) {
            // Only append generic duration req if it seems missing from template
            finalPrompt += `\nSTRICT RECREATION REQUIREMENTS:\n- EXACT DURATION: ${durationStr} seconds. Do not change the speed.`;
        }

        if (prompt !== finalPrompt) setPrompt(finalPrompt);
    }, [layers, productSubstitutions, backgroundImage, skipMask, videoDuration, defaultPrompt, defaultChatPrompt, additionalDetails, editMode]);

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
    }, [layers.length, extractedFrameUrl]);

    const handleProductUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const processed = await processImage(ev.target?.result as string);


            if (uploadType === 'background') {
                setBackgroundImage(processed);
                setUploadType('product');
            } else if (uploadType === 'detail' && detailUploadTargetId) {

                // Add new detail to specific layer
                setLayers(layers.map(l => {
                    if (l.id === detailUploadTargetId) {
                        return {
                            ...l,
                            details: [
                                ...(l.details || []),
                                {
                                    id: crypto.randomUUID(),
                                    url: processed,
                                    description: ''
                                }
                            ]
                        };
                    }
                    return l;
                }));
                setUploadType('product');
                setDetailUploadTargetId(null);
            } else {
                // Default: Add new Product Layer
                const newLayer: ProductLayer = {
                    id: crypto.randomUUID(),
                    url: processed,
                    type: 'product',
                    name: file.name.replace(/\.[^/.]+$/, ''),
                    prompt: '',
                    maskPoints: [],
                    maskColor: LAYER_COLORS[layers.length % LAYER_COLORS.length],
                    details: []
                };
                setLayers([...layers, newLayer]);
                setSelectedLayerId(newLayer.id);
                // Trigger frame selection immediately after adding a product
                setIsExtractingFrame(false);
            }
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

        // Auto-create mask layer in Chat Mode if none selected
        if (editMode === 'chat' && !selectedLayerId) {
            // Check if we already have a chat mask (optional optimization)
            const existingMask = layers.find(l => l.name === 'Chat Mask');
            if (existingMask) {
                setSelectedLayerId(existingMask.id);
            } else {
                const newLayer: ProductLayer = {
                    id: crypto.randomUUID(),
                    url: '', // Mask layer doesn't need a product image
                    type: 'mask',
                    name: 'Chat Mask',
                    prompt: 'Edit this area',
                    maskPoints: [],
                    maskColor: '#F97316', // Orange
                    details: []
                };
                setLayers([...layers, newLayer]);
                setSelectedLayerId(newLayer.id);
            }
        }

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

        // In SVG mode with vectorEffect="non-scaling-stroke", 'width' is pixels on screen
        if (selectedLayerId) {
            setLayers(layers.map(l => {
                if (l.id === selectedLayerId) {
                    return {
                        ...l,
                        maskPoints: [...l.maskPoints, {
                            points: currentStroke,
                            type: activeTool,
                            width: brushSize
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

                // stroke.width is screen pixels. We must scale to canvas pixels.
                // rect.width on screen -> w on canvas
                const rect = imageContainerRef.current?.getBoundingClientRect();
                const screenWidth = rect?.width || 1;
                const canvasScaledWidth = (stroke.width / screenWidth) * w;

                ctx.lineWidth = canvasScaledWidth;
                ctx.strokeStyle = stroke.type === 'eraser' ? 'black' : 'white';

                ctx.beginPath();
                if (stroke.points.length === 1) {
                    ctx.lineTo(stroke.points[0][0] * w, stroke.points[0][1] * h);
                } else {
                    ctx.moveTo(stroke.points[0][0] * w, stroke.points[0][1] * h);
                    for (let i = 1; i < stroke.points.length; i++) {
                        ctx.lineTo(stroke.points[i][0] * w, stroke.points[i][1] * h);
                    }
                }
                ctx.stroke();
            });
        });

        return canvas.toDataURL('image/png');
    };



    // --- GENERATION ---

    // Pricing Logic
    const getCreditsCost = () => {
        if (videoDuration < 3) return 45;
        if (videoDuration <= 9) return 75;
        if (videoDuration <= 14) return 95;
        if (videoDuration <= 19) return 130;
        if (videoDuration <= 25) return 150;
        return 150; // Should be blocked, but fallback
    };

    const uploadToSupabase = async (file: File | string, path: string): Promise<string | null> => {
        try {
            let body: File | Blob | Buffer;
            let contentType: string;

            if (file instanceof File) {
                body = file;
                contentType = file.type;
            } else if (typeof file === 'string' && file.startsWith('data:')) {
                // Convert Base64 to Blob
                const res = await fetch(file);
                const blob = await res.blob();
                body = blob;
                contentType = blob.type;
            } else if (typeof file === 'string' && file.startsWith('http')) {
                // If already in our Supabase, don't re-upload
                if (file.includes(supabaseUrl)) {
                    return file;
                }

                try {
                    console.log('[Create] Re-uploading remote URL to Supabase:', file);
                    const res = await fetch(file);
                    if (!res.ok) throw new Error(`Fetch failed with status ${res.status}`);
                    const blob = await res.blob();
                    body = blob;
                    contentType = blob.type;
                } catch (e) {
                    console.warn('[Create] Could not fetch remote URL, returning as is:', e);
                    return file;
                }
            } else {
                return file as string; // Already a URL
            }

            const fileName = `${path}/${Date.now()}-${Math.random().toString(36).substring(7)}.${contentType.split('/')[1]}`;
            const { error: uploadError } = await supabase.storage.from('videos').upload(fileName, body, {
                contentType,
                upsert: true
            });

            if (uploadError) {
                console.error('Upload error:', uploadError);
                return null;
            }

            const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(fileName);
            return publicUrl;
        } catch (e) {
            console.error('Upload exception:', e);
            return null;
        }
    };

    const handleDownload = async (url: string, filename: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error("Download failed", error);
            window.open(url, '_blank');
        }
    };

    const handleGenerate = async () => {
        const usedPrompt = editMode === 'chat' ? additionalDetails : prompt;

        // Add to Chat History if in chat mode
        if (editMode === 'chat' && (additionalDetails.trim() || chatImages.length > 0)) {
            setChatHistory(prev => [...prev, {
                type: 'user',
                content: additionalDetails.trim(),
                images: chatImages.length > 0 ? [...chatImages] : undefined
            }]);
            setAdditionalDetails('');
            setChatImages([]);
        }

        if (!videoFile && !videoUrl) {
            alert("Please upload a video or provide a reference.");
            return;
        }

        if (editMode !== 'chat' && layers.length === 0) {
            alert("Please add at least one product layer.");
            return;
        }

        if (editMode === 'chat' && layers.length === 0 && !usedPrompt) {
            alert("Please add a product or provide an instruction.");
            return;
        }

        if (videoDuration > 30) {
            alert("Video duration exceeds the maximum limit of 30 seconds.");
            return;
        }

        setIsGenerating(true);
        setGenStatus('preparing');

        try {
            // 1. Upload Base Video to Supabase Storage (Avoid Payload Limits)
            setGenStatus('Uploading video...');
            const uploadedVideoUrl = await uploadToSupabase(videoFile || videoUrl!, 'user-inputs');
            if (!uploadedVideoUrl) throw new Error('Failed to upload video file');
            console.log('[Create] Video uploaded to:', uploadedVideoUrl);

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
            if (hasMask && !skipMask) {
                const rawMask = await generateMaskImage(videoW, videoH);
                if (rawMask) {
                    // Upload Mask too? Usually small enough, but safer to upload.
                    // For now, keep as base64 or upload if needed. The API handles base64 for masks fairly well.
                    // Let's upload to be consistent and safe.
                    finalMaskUrl = await uploadToSupabase(rawMask, 'masks');
                }
            }

            // Also extracted frame if available
            let finalFrameUrl = null;
            if (extractedFrameUrl) {
                const resizedFrame = await resizeToExact(extractedFrameUrl, videoW, videoH);
                finalFrameUrl = await uploadToSupabase(resizedFrame, 'frames');
            }

            // 4. Products & Tools Payload - Upload All
            const imagesPayload: string[] = [];
            for (const layer of layers) {
                const url = await uploadToSupabase(layer.url, 'products');
                if (url) imagesPayload.push(url);

                if (layer.details) {
                    for (const d of layer.details) {
                        const dUrl = await uploadToSupabase(d.url, 'details');
                        if (dUrl) imagesPayload.push(dUrl);
                    }
                }
            }
            if (backgroundImage) {
                const bgUrl = await uploadToSupabase(backgroundImage, 'backgrounds');
                if (bgUrl) imagesPayload.push(bgUrl);
            }


            // Add supplementary chat images if present
            if (editMode === 'chat' && chatImages.length > 0) {
                for (const img of chatImages) {
                    const cUrl = await uploadToSupabase(img, 'chat-images');
                    if (cUrl) imagesPayload.push(cUrl);
                }
            }

            // 5. Submit
            setGenStatus('Submitting job...');
            const cost = getCreditsCost();
            if (deductCreditsOptimistic) deductCreditsOptimistic(cost);

            // Aspect Ratio
            let aspectRatio = '16:9';
            const ratioValue = videoW / videoH;

            if (Math.abs(ratioValue - 1) < 0.1) aspectRatio = '1:1';
            else if (ratioValue < 1) {
                // Portrait
                if (Math.abs(ratioValue - (9 / 16)) < 0.2) aspectRatio = '9:16';
                else if (Math.abs(ratioValue - (3 / 4)) < 0.2) aspectRatio = '3:4';
                else aspectRatio = '9:16'; // Default portrait
            } else {
                // Landscape
                if (Math.abs(ratioValue - (16 / 9)) < 0.2) aspectRatio = '16:9';
                else if (Math.abs(ratioValue - (4 / 3)) < 0.2) aspectRatio = '4:3';
                else if (Math.abs(ratioValue - (21 / 9)) < 0.2) aspectRatio = '21:9';
                else aspectRatio = '16:9'; // Default landscape
            }

            // === DETAILED PAYLOAD LOG ===
            console.log('');
            console.log('╔═══════════════════════════════════════╗');
            console.log('║     CREATE VIDEO PAYLOAD              ║');
            console.log('╠═══════════════════════════════════════╣');
            console.log('║ 1. Vídeo URL:       ', uploadedVideoUrl ? '✅ YES' : '❌ NO');
            console.log('║ 2. Frame URL:       ', finalFrameUrl ? '✅ YES' : '❌ NO');
            console.log('║ 3. Màscara URL:     ', finalMaskUrl ? '✅ YES' : '❌ NO');
            console.log('║ 4. Imatges (URLs):  ', imagesPayload.length);
            console.log('║ Duració:', `${Math.ceil(videoDuration)}s`.padEnd(31), '║');
            console.log('║ Cost:', `${getCreditsCost()} crèdits`.padEnd(34), '║');
            console.log('╚═══════════════════════════════════════╝');
            console.log('');


            console.log('[Create] Submitting generation request...');
            console.log('[Create] Auth Session:', !!session);
            console.log('[Create] Auth Token present:', !!session?.access_token);
            if (!session?.access_token) {
                console.warn('[Create] ⚠️ NO AUTH TOKEN! Request might fail if cookies are missing.');
            }

            const response = await fetch('/api/video/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
                },
                body: JSON.stringify({
                    video: uploadedVideoUrl, // Send URL!
                    images: imagesPayload, // Send URLs!
                    prompt: usedPrompt,
                    model: 'kwaivgi/kling-video-o1/video-edit',
                    duration: Math.ceil(videoDuration),
                    aspect_ratio: aspectRatio,
                    image: finalFrameUrl || undefined, // Send URL
                    target_mask: finalMaskUrl || undefined, // Send URL
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
            setGenStatus(null);
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

                        // Add to Chat History
                        setChatHistory(prev => [...prev, { type: 'result', content: url }]);

                        // Iterative Editing: Update reference video in Chat Mode
                        if (editMode === 'chat') {
                            setVideoUrl(url);
                            setVideoFile(null); // Clear file to use URL as source
                        }
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
        <div className="w-full max-w-[1600px] mx-auto h-full flex flex-col gap-2 md:gap-4 overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between shrink-0 px-4 py-2">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-medium text-white flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-zinc-400" /> AI Video Studio
                    </h1>
                    <Link
                        href="/videos"
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-lg text-xs font-medium text-zinc-400 hover:text-white transition-all backdrop-blur-sm"
                    >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Library</span>
                    </Link>
                </div>
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
            <div className="flex-1 flex flex-col md:flex-row gap-4 md:gap-6 min-h-0 px-4 pb-10 overflow-hidden">

                {/* LEFT SIDEBAR (Inputs) */}
                <div className="w-full md:w-[280px] lg:w-[300px] xl:w-[340px] flex flex-col gap-0 shrink-0 h-[40%] md:h-full border border-white/10 rounded-sm overflow-hidden bg-zinc-900/50 backdrop-blur-sm transition-all duration-300">
                    {/* Mode Tabs */}
                    <div className="flex gap-1 border-b border-white/5 bg-black/20">
                        <button
                            onClick={() => setEditMode('change')}
                            className={`flex-1 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${editMode === 'change'
                                ? 'text-white border-b-2 border-orange-500 bg-white/5'
                                : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            Change Objects
                        </button>
                        <button
                            onClick={() => setEditMode('chat')}
                            className={`flex-1 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${editMode === 'chat'
                                ? 'text-white border-b-2 border-orange-500 bg-white/5'
                                : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            Chat Mode
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">

                        {/* 1. Base Video (Logic Only) */}
                        {videoUrl && (
                            <video
                                ref={videoRef}
                                src={videoUrl}
                                className="hidden"
                                onLoadedMetadata={(e) => {
                                    const duration = e.currentTarget.duration;
                                    if (duration > 30) {
                                        alert("Video duration exceeds the maximum limit of 30 seconds. Please upload a shorter video.");
                                        setVideoFile(null);
                                        setVideoUrl(null);
                                        setVideoDuration(0);
                                    } else {
                                        setVideoDuration(duration);
                                    }
                                }}
                            />
                        )}

                        {/* 2. Layers - Only in CHANGE mode */}
                        {editMode === 'change' && (
                            <div className="p-4 border-b border-white/5">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Product Layers</h3>
                                    <div className="relative">
                                        <label
                                            className="text-[10px] bg-white/10 hover:bg-white/20 text-white px-2 py-0.5 rounded-sm flex items-center gap-1 cursor-pointer"
                                        >
                                            <Plus className="w-3 h-3" /> Add Product
                                            <input type="file" onChange={(e) => { handleProductUpload(e); setShowAddOptions(false); }} className="hidden" accept="image/*" />
                                        </label>

                                    </div>
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
                                                {layer.url && <img src={layer.url} className="w-8 h-8 object-contain bg-black/40 rounded-sm" />}
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[10px] text-white truncate font-medium">{layer.name}</div>
                                                    <div className="text-[9px] text-zinc-500 truncate">Product {i + 1}</div>
                                                </div>
                                                <button onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); }}><X className="w-3 h-3 text-zinc-600 hover:text-red-400" /></button>
                                            </div>

                                            {/* Product Prompt */}
                                            <div className="mt-2 px-1" onClick={(e) => e.stopPropagation()}>
                                                <div className="text-[9px] text-zinc-500 mb-1">Product Prompt</div>
                                                <textarea
                                                    value={layer.prompt}
                                                    onChange={(e) => {
                                                        const newLayers = [...layers];
                                                        newLayers[i].prompt = e.target.value;
                                                        setLayers(newLayers);
                                                    }}
                                                    placeholder="Describe the product..."
                                                    className="w-full h-10 bg-black/20 border border-white/5 rounded-sm p-1.5 text-[10px] text-zinc-300 focus:outline-none focus:border-white/10 resize-none"
                                                />
                                            </div>

                                            {/* Details Section */}
                                            <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-white/5">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Details & Textures (optional)</span>
                                                    <div className="relative group/tooltip">
                                                        <Info className="w-2.5 h-2.5 text-zinc-600" />
                                                        <div className="absolute bottom-full right-0 mb-2 w-40 bg-black/90 border border-white/10 p-2 rounded-sm opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity z-10">
                                                            <p className="text-[9px] text-zinc-400">Add close-up images to help the AI understand materials, logos, or textures.</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* List of Details */}
                                                {layer.details && layer.details.map((detail, dIndex) => (
                                                    <div key={detail.id} className="flex gap-2 items-start bg-black/20 p-1 rounded-sm border border-white/5">
                                                        <div className="relative w-8 h-8 shrink-0 rounded-sm overflow-hidden border border-white/5 group/d">
                                                            <img src={detail.url} className="w-full h-full object-cover" />
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const newDetails = layer.details.filter(d => d.id !== detail.id);
                                                                    setLayers(layers.map(l => l.id === layer.id ? { ...l, details: newDetails } : l));
                                                                }}
                                                                className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/d:opacity-100 transition-opacity"
                                                            >
                                                                <X className="w-3 h-3 text-white" />
                                                            </button>
                                                        </div>
                                                        <textarea
                                                            placeholder="Describe placement or texture..."
                                                            className="flex-1 bg-transparent text-[9px] text-zinc-300 focus:outline-none resize-none h-8 py-0.5 leading-tight"
                                                            value={detail.description}
                                                            onChange={(e) => {
                                                                const newDetails = [...layer.details];
                                                                newDetails[dIndex] = { ...newDetails[dIndex], description: e.target.value };
                                                                setLayers(layers.map(l => l.id === layer.id ? { ...l, details: newDetails } : l));
                                                            }}
                                                        />
                                                    </div>
                                                ))}

                                                {/* Add Detail Button (File Input Wrapper) */}
                                                <label
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setUploadType('detail');
                                                        setDetailUploadTargetId(layer.id);
                                                    }}
                                                    className="flex items-center justify-center gap-1 py-1 bg-white/5 hover:bg-white/10 border border-dashed border-white/10 rounded-sm cursor-pointer transition-colors"
                                                >
                                                    <Plus className="w-2.5 h-2.5 text-zinc-500" />
                                                    <span className="text-[9px] text-zinc-500">Add Detail Image (optional)</span>
                                                    <input type="file" onChange={handleProductUpload} className="hidden" accept="image/*" />
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                    {layers.length === 0 && <div className="text-[10px] text-zinc-600 italic px-1">No products added</div>}
                                </div>

                                {/* Skip Mask Option */}
                                <div className="mt-3 flex items-center gap-2 px-1">
                                    <button
                                        onClick={() => setSkipMask(!skipMask)}
                                        className={`w-3 h-3 rounded-[2px] border flex items-center justify-center transition-colors ${skipMask ? 'bg-purple-500 border-purple-500' : 'border-zinc-600 bg-transparent'}`}
                                    >
                                        {skipMask && <Check className="w-2.5 h-2.5 text-black" />}
                                    </button>
                                    <span className="text-[10px] text-zinc-400">Skip Masking (Edit Full Frame)</span>
                                </div>
                            </div>
                        )}



                        {/* 4. Prompt */}
                        <div className="p-4 space-y-3">
                            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex justify-between items-center">
                                Prompt
                                {editMode === 'change' && <span className="text-purple-500 flex items-center gap-1 text-[9px]"><Sparkles className="w-3 h-3" /> Auto-Generated</span>}
                            </h3>

                            {/* Chat History Section */}
                            {editMode === 'chat' && chatHistory.length > 0 && (
                                <div
                                    ref={chatContainerRef}
                                    className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar p-2 bg-black/10 rounded-sm border border-white/5 scroll-smooth"
                                >
                                    {chatHistory.map((item, idx) => (
                                        <div key={idx} className={`flex ${item.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] rounded-lg p-2 text-[10px] ${item.type === 'user'
                                                ? 'bg-orange-500/10 border border-orange-500/30 text-zinc-200'
                                                : 'bg-zinc-800 border border-white/10'
                                                }`}>
                                                {item.type === 'user' ? (
                                                    <div className="space-y-2">
                                                        {item.images && item.images.length > 0 && (
                                                            <div className="flex flex-wrap gap-1">
                                                                {item.images.map((img, i) => (
                                                                    <img key={i} src={img} className="w-16 h-16 object-cover rounded border border-white/10" />
                                                                ))}
                                                            </div>
                                                        )}
                                                        {item.content && <p>{item.content}</p>}
                                                    </div>
                                                ) : (
                                                    <div className="relative group cursor-pointer" onClick={() => {
                                                        setGeneratedVideo(item.content);
                                                        setViewMode('result');
                                                    }}>
                                                        <video src={item.content} className="w-20 h-20 object-cover rounded-sm border border-white/10" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-sm text-[8px] text-white">
                                                            <Play className="w-4 h-4" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Loading State Bubble */}
                                    {isGenerating && (
                                        <div className="flex justify-start animate-in fade-in slide-in-from-left-2 duration-300">
                                            <div className="bg-zinc-800 border border-white/10 rounded-lg p-2 text-[10px] flex items-center gap-2">
                                                <Loader2 className="w-3 h-3 animate-spin text-orange-500" />
                                                <span className="text-zinc-400">Generating Magic Video...</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Additional Prompt Input */}
                            <div className="space-y-1">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[9px] text-zinc-400 font-medium">Add Prompt (optional)</label>
                                    {editMode === 'chat' && (
                                        <button
                                            onClick={() => chatImageInputRef.current?.click()}
                                            className="p-1 text-zinc-400 hover:text-orange-500 transition-colors"
                                            title="Add supplementary image"
                                        >
                                            <ImagePlus className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    ref={chatImageInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    multiple
                                    onChange={(e) => {
                                        const files = Array.from(e.target.files || []);
                                        files.forEach(file => {
                                            const reader = new FileReader();
                                            reader.onload = (ev) => {
                                                setChatImages(prev => [...prev, ev.target?.result as string]);
                                            };
                                            reader.readAsDataURL(file);
                                        });
                                        e.target.value = '';
                                    }}
                                />

                                {chatImages.length > 0 && editMode === 'chat' && (
                                    <div className="flex flex-wrap gap-2 mb-2 p-1 bg-black/20 rounded border border-white/5 max-h-24 overflow-y-auto">
                                        {chatImages.map((img, idx) => (
                                            <div key={idx} className="relative w-10 h-10 group pl-0.5">
                                                <img src={img} className="w-full h-full object-cover rounded border border-zinc-700 shadow-lg" />
                                                <button
                                                    onClick={() => setChatImages(prev => prev.filter((_, i) => i !== idx))}
                                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="w-2 h-2" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <textarea
                                    value={additionalDetails}
                                    onChange={(e) => setAdditionalDetails(e.target.value)}
                                    placeholder={editMode === 'chat' ? "Type your command..." : "Add specific details or changes..."}
                                    className="w-full h-16 bg-zinc-950/50 border border-white/10 rounded-sm p-2 text-[10px] text-zinc-300 focus:text-white resize-none outline-none font-mono focus:border-white/20 transition-colors"
                                />

                                {/* Paint Button (Chat Mode Only) */}
                                {editMode === 'chat' && (
                                    extractedFrameUrl ? (
                                        <button
                                            onClick={() => setExtractedFrameUrl(null)}
                                            className="w-full py-1.5 mt-1 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-sm text-[10px] font-bold text-red-400 uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                                        >
                                            <X className="w-3 h-3" />
                                            Cancel Painting
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setShowFrameSelector(true)}
                                            className="w-full py-1.5 mt-1 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-sm text-[10px] font-bold text-zinc-300 uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Brush className="w-3 h-3" />
                                            Paint / Edit Frame
                                        </button>
                                    )
                                )}
                            </div>

                            {/* View Full Prompt Toggle */}
                            <div className="pt-2">
                                <details className="group">
                                    <summary className="flex items-center gap-2 cursor-pointer text-[9px] text-zinc-500 hover:text-zinc-300 transition-colors select-none list-none">
                                        <div className="flex items-center gap-1">
                                            <span className="group-open:rotate-90 transition-transform">▶</span>
                                            View Full Prompt
                                        </div>
                                    </summary>
                                    <div className="mt-2 animate-in slide-in-from-top-1 fade-in duration-200">
                                        <textarea
                                            value={prompt}
                                            onChange={(e) => setPrompt(e.target.value)}
                                            className="w-full h-32 bg-zinc-950/30 border border-white/5 rounded-sm p-2 text-[9px] text-zinc-500 focus:text-zinc-300 resize-none outline-none font-mono"
                                        />
                                    </div>
                                </details>
                            </div>
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
                        <div className="flex-1 w-full h-full flex items-center justify-center bg-black overflow-hidden relative group">
                            <video src={generatedVideo} controls autoPlay loop className="w-full h-full object-contain" />
                            <div className="absolute bottom-6 right-6 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleDownload(generatedVideo, `content-ai-video-${Date.now()}.mp4`)}
                                    className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-lg border border-white/20 transition-all flex items-center gap-2 text-xs font-bold shadow-2xl"
                                >
                                    <Download className="w-4 h-4" />
                                    Download Video
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 relative bg-zinc-950/50 flex flex-row overflow-hidden">

                            {/* LEFT SIDE: EDITOR CANVAS */}
                            <div className="flex-1 relative flex items-center justify-center bg-zinc-950/50 px-4">
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
                                            {editMode !== 'chat' && layers.length === 0 && (
                                                <div className="bg-black/80 text-white text-xs px-3 py-1 rounded-full mb-2 border border-white/20 animate-pulse">
                                                    Add a product to start editing
                                                </div>
                                            )}
                                            {editMode !== 'chat' && !showFrameSelector && (
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
                                    /* EDITOR CANVAS (Left Side of Split) */
                                    <div className="w-full h-full flex flex-col items-center justify-center relative">
                                        <div
                                            ref={imageContainerRef}
                                            className={`relative shadow-2xl ${activeTool === 'brush' ? 'cursor-none' : ''}`}
                                            style={{ aspectRatio: `${dimensions.width}/${dimensions.height}`, maxHeight: '90%', maxWidth: '100%', touchAction: 'none' }}
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


                                            {/* SVG Overlay for Masks */}
                                            <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" viewBox="0 0 100 100" preserveAspectRatio="none">
                                                <defs>
                                                    {layers.map((layer) => (
                                                        <mask key={`mask-def-${layer.id}`} id={`mask-${layer.id}`}>
                                                            <rect x="0" y="0" width="100%" height="100%" fill="black" />
                                                            {layer.maskPoints.map((stroke, i) => (
                                                                <polyline
                                                                    key={`stroke-${layer.id}-${i}`}
                                                                    points={stroke.points.map(p => `${p[0] * 100} ${p[1] * 100}`).join(', ')}
                                                                    fill="none"
                                                                    stroke={stroke.type === 'eraser' ? 'black' : 'white'}
                                                                    strokeWidth={stroke.width || 40}
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    vectorEffect="non-scaling-stroke"
                                                                />
                                                            ))}
                                                        </mask>
                                                    ))}
                                                </defs>

                                                {/* Layer Masks */}
                                                {layers.map((layer) => (
                                                    <rect
                                                        key={`layer-rect-${layer.id}`}
                                                        x="0" y="0" width="100%" height="100%"
                                                        fill={layer.maskColor}
                                                        opacity="0.6"
                                                        mask={`url(#mask-${layer.id})`}
                                                        style={{ pointerEvents: 'none' }}
                                                    />
                                                ))}

                                                {/* Current Stroke Preview */}
                                                {currentStroke.length > 0 && (
                                                    <polyline
                                                        points={currentStroke.map(p => `${p[0] * 100} ${p[1] * 100}`).join(', ')}
                                                        fill="none"
                                                        stroke={activeTool === 'eraser' ? 'rgba(255,255,255,0.5)' : (selectedLayerId ? layers.find(l => l.id === selectedLayerId)?.maskColor : 'rgba(249, 115, 22, 0.5)')}
                                                        strokeWidth={brushSize}
                                                        strokeOpacity={activeTool === 'eraser' ? 1 : 0.8}
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        vectorEffect="non-scaling-stroke"
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
                                                        backgroundColor: activeTool === 'eraser' ? 'rgba(255,255,255,0.2)' : (selectedLayerId ? layers.find(l => l.id === selectedLayerId)?.maskColor : 'rgba(249, 115, 22, 0.5)'),
                                                        opacity: 0.8
                                                    }}
                                                />
                                            )}

                                        </div>

                                        {/* Vertical Right Toolbar */}
                                        {(layers.length > 0 || editMode === 'chat') && (
                                            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-col items-center gap-4 bg-zinc-900/80 backdrop-blur-md px-2 py-4 rounded-full z-50 border border-white/10">
                                                {/* Back Button */}
                                                <button
                                                    onClick={() => setExtractedFrameUrl(null)}
                                                    className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-all border-b border-white/10 pb-4 mb-2"
                                                    title="Exit Painting"
                                                >
                                                    <ChevronLeft size={16} />
                                                </button>

                                                {/* Tools */}
                                                <div className="flex flex-col items-center gap-2">
                                                    <button
                                                        onClick={() => setActiveTool('brush')}
                                                        className={`p-2 rounded-full transition-all ${activeTool === 'brush' ? 'bg-white text-black' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                                                        title="Brush Tool"
                                                    >
                                                        <Brush size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => setActiveTool('eraser')}
                                                        className={`p-2 rounded-full transition-all ${activeTool === 'eraser' ? 'bg-white text-black' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                                                        title="Eraser Tool"
                                                    >
                                                        <Eraser size={16} />
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
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* RIGHT SIDE: REFERENCE VIDEO (Split View) */}
                            {extractedFrameUrl && videoUrl && (
                                <div className="hidden lg:flex w-[25%] border-l border-white/10 bg-black/20 flex-col items-center justify-center p-4 relative">
                                    <div className="absolute top-4 left-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-black/50 px-2 py-1 rounded-sm backdrop-blur-sm">
                                        Reference Video
                                    </div>
                                    <video src={videoUrl} controls className="w-full max-h-full object-contain rounded-sm shadow-xl" />
                                </div>
                            )}

                        </div>
                    )}
                </div>

                <SavedMasksModal
                    isOpen={showSavedMasksModal}
                    onClose={() => setShowSavedMasksModal(false)}
                    onSelect={(url) => {
                        const newLayer: ProductLayer = {
                            id: crypto.randomUUID(),
                            url: url,
                            type: 'mask',
                            name: 'Saved Mask',
                            prompt: '',
                            maskPoints: [],
                            maskColor: LAYER_COLORS[layers.length % LAYER_COLORS.length],
                            details: []
                        };
                        setLayers([...layers, newLayer]);
                        setSelectedLayerId(newLayer.id);
                        setShowSavedMasksModal(false);
                    }}
                />
            </div>
        </div>
    );
};
