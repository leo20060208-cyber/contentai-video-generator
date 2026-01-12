'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, ChevronRight, ChevronLeft, Sparkles, Wand2, Plus, Layers, Image as ImageIcon, MousePointer2, Eraser, Scissors, Coins, Brush, Eye, EyeOff, Search, User, Move, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase';
import { getSectionContent } from '@/lib/db/content';
import { SavedMasksModal } from '@/components/SavedMasksModal';
import { BeforeAfterSlider } from '@/components/BeforeAfterSlider';
import { RefreshCcw } from 'lucide-react';

// Types
interface ProductLayer {
    id: string;
    url: string; // The image source
    type: 'product' | 'mask'; // Is this a product or a text/shape mask?
    x: number;
    y: number;
    scale: number;
    rotation: number;
    zIndex: number;
    detailText?: string;
    detailImage?: string;
    // Masking
    maskPoints: { points: number[][]; type: 'brush' | 'eraser'; width: number }[]; // Array of stroke objects
    maskColor: string;
}

const MASK_COLORS = ['#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#FFA500', '#800080']; // Red, Blue, Green, Yellow, Orange, Purple


interface ImageCreateFlowProps {
    onCancel?: () => void;
    initialReferenceImage?: string | null;
    initialResultImage?: string | null;
    initialProductImage?: string | null;
    initialProductOutlineImage?: string | null;
    initialPrompt?: string | null;
    disableTools?: ('background' | 'person')[];
    disableMasking?: boolean; // For templates: disable painting masks (use Lab outline only)
}

export const ImageCreateFlow = ({ onCancel, initialReferenceImage, initialResultImage, initialProductImage, initialProductOutlineImage, initialPrompt, disableTools = [] }: ImageCreateFlowProps) => {
    const router = useRouter();
    const pathname = usePathname();
    const { user, session, profile, deductCreditsOptimistic } = useAuth();

    // STATE
    const [referenceImage, setReferenceImage] = useState<string | null>(initialReferenceImage || null);
    const [backgroundImage, setBackgroundImage] = useState<string | null>(null); // NEW
    const [personImage, setPersonImage] = useState<string | null>(null); // Face Swap / Person Replacement
    const [defaultPrompt, setDefaultPrompt] = useState<string>('RECREATE this reference image EXACTLY. Maintain the SAME composition, lighting, shadows, colors, perspective, and dimensions. The output must be IDENTICAL to the reference except for the modifications below.'); // Fallback default

    // Tools State
    const [activeTool, setActiveTool] = useState<'move' | 'brush' | 'eraser'>('brush');
    const [brushSize, setBrushSize] = useState(40); // User adjustable brush size
    const [cleanupMask, setCleanupMask] = useState<{ points: number[][] }[]>([]); // Array of strokes
    const [currentStroke, setCurrentStroke] = useState<number[][]>([]);

    const [isSegmentingRef, setIsSegmentingRef] = useState(false);
    const [maskOverlay, setMaskOverlay] = useState<string | null>(null);

    const [layers, setLayers] = useState<ProductLayer[]>([]);
    const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

    // Upload Modal
    const [isUploadingProduct, setIsUploadingProduct] = useState(false);
    const [uploadType, setUploadType] = useState<'product' | 'mask'>('product');
    const [tempUploadImage, setTempUploadImage] = useState<string | null>(null);
    const [isSegmentingUpload, setIsSegmentingUpload] = useState(false);

    // Generation
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(initialResultImage || null);
    const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error' | null>(null);
    const [viewMode, setViewMode] = useState<'workspace' | 'result'>('workspace'); // Toggle view - always start in workspace

    // State for Aspect Ratio
    const [aspectRatio, setAspectRatio] = useState<number>(16 / 9);

    // Canvas Refs
    const imageContainerRef = useRef<HTMLDivElement>(null);
    const currentStrokeRef = useRef<number[][]>([]);

    // New State for Refinement
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    // Mouse Position for Custom Cursor
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    // Model Selection State
    const [modelTier, setModelTier] = useState<'normal' | 'pro'>('normal');

    // Result View State
    const [beforeImageSource, setBeforeImageSource] = useState<'reference' | 'product'>('reference');
    const [isHoveringCanvas, setIsHoveringCanvas] = useState(false);

    const handleReferenceLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget;
        setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        setAspectRatio(img.naturalWidth / img.naturalHeight);
    };

    // Additional State for Refinement
    // Additional State for Refinement
    const [isRefining, setIsRefining] = useState(false);

    // Profile Masks State
    const [showMaskSelectModal, setShowMaskSelectModal] = useState(false);

    // State for editable prompt parts
    const [productSubstitutions, setProductSubstitutions] = useState<string[]>([]);
    const [additionalDetails, setAdditionalDetails] = useState('');

    // Ref for auto-scrolling to substitution inputs
    const substitutionSectionRef = useRef<HTMLDivElement>(null);
    const [pendingFocusIndex, setPendingFocusIndex] = useState<number | null>(null);

    // Reset states when reference image changes
    useEffect(() => {
        if (!referenceImage) {
            setProductSubstitutions([]);
            setAdditionalDetails('');
            setPrompt('');
        }
    }, [referenceImage]);

    // Fetch default prompt from database on mount
    useEffect(() => {
        const loadDefaultPrompt = async () => {
            try {
                const data = await getSectionContent('create_yours_image_default_prompt');
                if (data?.prompt) {
                    setDefaultPrompt(data.prompt);
                }
            } catch (error) {
                console.error('Error loading default prompt:', error);
                // Keep hardcoded fallback
            }
        };
        loadDefaultPrompt();
    }, []);

    // Sync substitutions array with ALL layers (products + masks)
    useEffect(() => {
        // Both products and masks can have substitution instructions
        setProductSubstitutions(prev => {
            const newSubs = [...prev];
            while (newSubs.length < layers.length) {
                newSubs.push('');
            }
            return newSubs.slice(0, layers.length);
        });
    }, [layers]);

    // Build the final prompt - focused on exact recreation + substitutions
    useEffect(() => {
        if (!referenceImage) {
            setPrompt('');
            return;
        }

        // --- NEW PROMPT LOGIC FOR [REF, MASK, PRODUCTS] STRUCTURE ---
        // Image 1: Reference
        // Image 2: Mask (Ref + Overlay)
        // Image 3+: Products

        let p = "IMAGE ROLES:\n";
        p += "- Image 1: CLEAN REFERENCE IMAGE. The original scene.\n";
        p += "- Image 2: MASK GUIDE. A BLACK image with COLORED MARKERS indicating where to place products.\n";

        // Products start at Image 3
        let currentImageIndex = 2; // Last used index (1=Ref, 2=Mask)

        layers.forEach((layer, i) => {
            if (layer.type === 'product') {
                currentImageIndex++;
                p += `- Image ${currentImageIndex}: PRODUCT ${i + 1} to be inserted.\n`;
                if (layer.detailImage) {
                    currentImageIndex++;
                    p += `- Image ${currentImageIndex}: TEXTURE/DETAIL Reference for Product ${i + 1}.\n`;
                }
            }
        });

        p += "\nINSTRUCTIONS:\n";
        p += "RECREATE the scene from Image 1 EXACTLY. Keep the background, lighting, and style IDENTICAL. only perform the following SUBSTITUTIONS:\n\n";

        // Reset index for instruction mapping
        currentImageIndex = 2;

        layers.forEach((layer, i) => {
            const instruction = productSubstitutions[i]?.trim();
            const colorName = layer.maskColor === '#FF0000' ? 'RED' : layer.maskColor === '#0000FF' ? 'BLUE' : layer.maskColor === '#00FF00' ? 'GREEN' : layer.maskColor === '#FFFF00' ? 'YELLOW' : 'COLORED';

            if (layer.type === 'product') {
                currentImageIndex++;
                const productImgIdx = currentImageIndex;

                let detailTxt = "";
                if (layer.detailText) detailTxt += ` Details: ${layer.detailText}.`;
                if (layer.detailImage) {
                    currentImageIndex++;
                    detailTxt += ` (Use Image ${currentImageIndex} for close-up details).`;
                }

                p += `• PRODUCT ${i + 1}: Look at the ${colorName} area in Image 2 (Mask Guide). REPLACE the object at that location with the PRODUCT from Image ${productImgIdx}. ${instruction || ''}${detailTxt}\n`;
            } else {
                // Mask layer (just text instruction usually)
                p += `• EDIT: Applies to the ${colorName} area shown in Image 2. ${instruction || 'Modify this area.'}\n`;
            }
        });

        if (additionalDetails.trim()) {
            p += `\nADDITIONAL NOTES: ${additionalDetails.trim()}\n`;
        }

        p += "\nCRITICAL RULES:\n";
        p += "1. PIXEL PERFECT: The unmasked areas must match Image 1 EXACTLY.\n";
        p += "2. MASK GUIDE: Do NOT render the colored markers from Image 2. They are invisible guides.\n";
        p += "3. INTEGRATION: Match the lighting, shadows, and perspective of Image 1 when inserting Image 3+.\n";

        setPrompt(p);
    }, [referenceImage, productSubstitutions, additionalDetails, layers]);

    // --- HANDLERS ---

    const handleUpload = (
        e: React.ChangeEvent<HTMLInputElement>,
        callback: (url: string) => void
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => callback(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    const handleSmartSegment = async (type: 'ref' | 'upload', x: number, y: number) => {
        // ... (existing implementation)
        if (type === 'ref') {
            const maskStyle = `radial-gradient(circle at ${x}px ${y}px, rgba(168, 85, 247, 0.4) 0%, transparent 50%)`;
            setMaskOverlay(maskStyle);
            setIsSegmentingRef(false);
        } else {
            console.log(`Segmenting Upload at ${x},${y}`);
        }
    };

    const addLayer = () => {
        if (!tempUploadImage) return;
        const newLayer: ProductLayer = {
            id: crypto.randomUUID(),
            url: tempUploadImage,
            type: uploadType,
            x: 0,
            y: 0,
            scale: 1,
            rotation: 0,
            zIndex: layers.length + 1,
            maskPoints: [],
            maskColor: MASK_COLORS[layers.length % MASK_COLORS.length]
        };
        setLayers([...layers, newLayer]);
        setSelectedLayerId(newLayer.id);
        setTempUploadImage(null);
        setIsUploadingProduct(false);
        setIsSegmentingUpload(false);

        // If adding a product, scroll to substitution section and focus input
        if (uploadType === 'product') {
            const newIndex = layers.filter(l => l.type === 'product').length; // Index of new product
            setPendingFocusIndex(newIndex);
            setTimeout(() => {
                substitutionSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    };

    const handleSavedMaskSelect = (maskUrl: string) => {
        // Add as layer
        const newLayer: ProductLayer = {
            id: crypto.randomUUID(),
            url: maskUrl,
            type: 'mask',
            x: 0,
            y: 0,
            scale: 1,
            rotation: 0,
            zIndex: layers.length + 1,
            maskPoints: [],
            maskColor: MASK_COLORS[layers.length % MASK_COLORS.length]
        };
        setLayers([...layers, newLayer]);
        setSelectedLayerId(newLayer.id);
        setIsUploadingProduct(false);
        setShowMaskSelectModal(false);
    };

    // Helper to process response
    const removeLayer = (id: string) => {
        setLayers(layers.filter(l => l.id !== id));
        if (selectedLayerId === id) setSelectedLayerId(null);
    };

    // Brush Handlers
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
        if (p) {
            const stroke = [p, p];
            currentStrokeRef.current = stroke;
            setCurrentStroke(stroke);
        }
    };

    const handleBrushMove = (e: React.MouseEvent | React.TouchEvent) => {
        if ((activeTool !== 'brush' && activeTool !== 'eraser') || currentStrokeRef.current.length === 0) return;
        const p = getPoint(e);
        if (p) {
            const newStroke = [...currentStrokeRef.current, p];
            currentStrokeRef.current = newStroke;
            setCurrentStroke(newStroke);
        }
    };

    const handleBrushEnd = () => {
        if ((activeTool !== 'brush' && activeTool !== 'eraser') || currentStrokeRef.current.length === 0) return;

        const strokeToSave = currentStrokeRef.current;
        const strokeObj: { points: number[][]; type: 'brush' | 'eraser'; width: number } = {
            points: strokeToSave,
            type: activeTool === 'eraser' ? 'eraser' : 'brush',
            width: brushSize
        };

        // If a layer is selected, add stroke to THAT layer's mask
        if (selectedLayerId) {
            const newLayers = layers.map(l => {
                if (l.id === selectedLayerId) {
                    return { ...l, maskPoints: [...l.maskPoints, strokeObj] };
                }
                return l;
            });
            setLayers(newLayers);
        } else {
            // Fallback to global cleanup mask (legacy behavior)
            // Cleanup mask is still structured as { points: number[][] }[] in state definition line 57?
            setCleanupMask([...cleanupMask, { points: strokeToSave }]);
        }
        currentStrokeRef.current = [];
        setCurrentStroke([]);
    };

    const clearMask = () => {
        if (selectedLayerId) {
            const newLayers = layers.map(l => {
                if (l.id === selectedLayerId) {
                    return { ...l, maskPoints: [] };
                }
                return l;
            });
            setLayers(newLayers);
        } else {
            setCleanupMask([]);
        }
    };


    // Helper: Generate Mask Image from Strokes (Now Overlaid on Reference)
    const generateMaskImage = async (w?: number, h?: number): Promise<string | null> => {
        // We always generate mask if there are layers with masks OR cleanupMask
        const hasLayerMasks = layers.some(l => l.maskPoints.length > 0);
        if (cleanupMask.length === 0 && !hasLayerMasks) return null;

        const canvas = document.createElement('canvas');
        // Use passed dimensions, or state, or default 1024
        const targetW = w || (dimensions?.width && dimensions.width > 0 ? dimensions.width : 1024);
        const targetH = h || (dimensions?.height && dimensions.height > 0 ? dimensions.height : 1024);

        canvas.width = targetW;
        canvas.height = targetH;

        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // 1. Draw Black Background (Strict Masking for AI)
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Remove Reference Image drawing - AI needs black + color to understand "mask"

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Draw Cleanup Mask (Pink/White for AI?)
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 40;
        cleanupMask.forEach(stroke => {
            if (stroke.points.length < 2) return;
            ctx.beginPath();
            ctx.moveTo(stroke.points[0][0] * targetW, stroke.points[0][1] * targetH);
            for (let i = 1; i < stroke.points.length; i++) {
                ctx.lineTo(stroke.points[i][0] * targetW, stroke.points[i][1] * targetH);
            }
            ctx.stroke();
        });

        // Draw Layer Masks
        layers.forEach(layer => {
            layer.maskPoints.forEach(stroke => {
                ctx.strokeStyle = stroke.type === 'eraser' ? 'black' : layer.maskColor;
                ctx.lineWidth = stroke.width || 40;

                // Ensure opacity if desired, but solid colors are usually better for explicit masking commands
                ctx.globalAlpha = 0.7;

                if (stroke.points.length < 2) return;
                ctx.beginPath();
                ctx.moveTo(stroke.points[0][0] * targetW, stroke.points[0][1] * targetH);
                for (let i = 1; i < stroke.points.length; i++) {
                    ctx.lineTo(stroke.points[i][0] * targetW, stroke.points[i][1] * targetH);
                }
                ctx.stroke();
                ctx.globalAlpha = 1.0;
            });
        });

        return canvas.toDataURL('image/png');
    };

    const processGenerationResponse = async (data: any, usedPrompt: string) => {
        let finalUrl = null;
        if (data.url) finalUrl = data.url;
        else if (data.taskId) {
            for (let i = 0; i < 40; i++) {
                await new Promise(r => setTimeout(r, 2000));
                const s = await fetch(`/api/image/status?taskId=${data.taskId}`).then(r => r.json());
                if (s.status === 'completed') {
                    finalUrl = s.url;
                    break;
                }
            }
        }

        if (finalUrl) {
            setGeneratedImage(finalUrl);
            setSaveStatus('saving');

            // Auto-Save using Supabase Client directly for consistency
            try {
                const { error } = await supabase.from('images').insert({
                    user_id: user?.id,
                    url: finalUrl,
                    prompt: usedPrompt,
                    reference_url: referenceImage?.startsWith('http') ? referenceImage : null, // Avoid saving Base64
                    category: 'Create'
                });

                if (error) throw error;
                setSaveStatus('saved');
                console.log("Image auto-saved to library");
            } catch (err) {
                console.error("Failed to auto-save image:", JSON.stringify(err, null, 2));
                setSaveStatus('error');
            }

        } else {
            throw new Error("Generation timed out");
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        setSaveStatus(null);
        try {
            console.log('[Create] Starting generation...');

            // 1. Resolve Strict Dimensions from Reference Image
            let actualDimensions = { ...dimensions };

            // If dimensions are missing, try to fetch them from referenceImage
            if (referenceImage && (actualDimensions.width === 0 || actualDimensions.height === 0)) {
                try {
                    const getImageDimensions = (url: string) => new Promise<{ width: number, height: number }>((resolve) => {
                        const img = new Image();
                        img.crossOrigin = 'Anonymous';
                        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
                        img.onerror = () => {
                            console.warn('[Create] Failed to load reference image for dimensions');
                            resolve({ width: 0, height: 0 });
                        };
                        img.src = url;
                    });
                    const dims = await getImageDimensions(referenceImage);
                    if (dims.width > 0) actualDimensions = dims;
                } catch (e) { console.warn("Failed to resolve dimensions", e); }
            }

            console.log(`[Create] Target Dimensions: ${actualDimensions.width}x${actualDimensions.height}`);

            // 2. Helper: Resize Image to Exact Dimensions
            const resizeToExact = (dataUrl: string, w: number, h: number): Promise<string> => {
                return new Promise((resolve) => {
                    if (w === 0 || h === 0) { resolve(dataUrl); return; }
                    const img = new window.Image();
                    img.crossOrigin = 'Anonymous';
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = w;
                        canvas.height = h;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.drawImage(img, 0, 0, w, h); // Stretch to fit
                        }
                        resolve(canvas.toDataURL('image/png'));
                    };
                    img.onerror = () => resolve(dataUrl);
                    img.src = dataUrl;
                });
            };

            // 3. Build & Resize Payload [REF, MASK, PRODUCTS...]
            const imagesPayload: string[] = [];

            // 1. Reference Image (First) - Keep Original
            if (referenceImage) {
                imagesPayload.push(referenceImage);
            } else {
                throw new Error("Reference Image is required");
            }

            // 2. Generate Mask (Ref + Overlay)
            // Always generate mask if we have layers. If not, maybe just ref? But logic assumes mask 2nd.
            // If no mask, we probably shouldn't be here in this flow, but let's handle it.
            const maskDataUrl = await generateMaskImage(actualDimensions.width, actualDimensions.height);

            if (maskDataUrl) {
                imagesPayload.push(maskDataUrl);
            } else {
                // If no mask drawn, maybe push reference again as dummy mask? Or handle as error?
                // Strategy: Push Reference as "Empty Mask" so index logic holds
                imagesPayload.push(referenceImage);
            }

            // 3. Resize Layers (Products AND Saved Masks)
            for (const layer of layers) {
                // Process both products AND saved masks
                if (layer.type === 'product' || layer.type === 'mask') {
                    // Main Product/Mask Image
                    const resizedLayer = await resizeToExact(layer.url, actualDimensions.width, actualDimensions.height);
                    imagesPayload.push(resizedLayer);

                    // Detail Image (only for products, not masks)
                    if (layer.type === 'product' && layer.detailImage) {
                        const resizedDetail = await resizeToExact(layer.detailImage, actualDimensions.width, actualDimensions.height);
                        imagesPayload.push(resizedDetail);
                    }
                }
            }

            // 4. ADD Marked Outline Image (Guidance)
            if (initialProductOutlineImage) {
                const resizedOutline = await resizeToExact(initialProductOutlineImage, actualDimensions.width, actualDimensions.height);
                imagesPayload.push(resizedOutline);
            }

            // === DETAILED PAYLOAD LOG ===
            console.log('');
            console.log('╔═══════════════════════════════════════╗');
            console.log('║     CREATE IMAGE PAYLOAD              ║');
            console.log('╠═══════════════════════════════════════╣');
            console.log('║ 1. Referència:      ', referenceImage ? '✅ YES' : '❌ NO');
            console.log('║ 2. Màscara Pintada: ', maskDataUrl ? '✅ YES' : '❌ NO');

            let productCount = 0;
            let maskCount = 0;
            layers.forEach((layer) => {
                if (layer.type === 'product') {
                    productCount++;
                    console.log(`║    Producte ${productCount}:      ✅ ${layer.url.substring(0, 30)}...`);
                } else if (layer.type === 'mask') {
                    maskCount++;
                    console.log(`║    Màscara ${maskCount}:       ✅ ${layer.url.substring(0, 30)}...`);
                }
            });

            console.log('║ 3. Outline (Template):', initialProductOutlineImage ? '✅ YES' : '❌ NO');
            console.log('║                                       ║');
            console.log('║ TOTAL Imatges Payload:', imagesPayload.length.toString().padEnd(18), '║');
            console.log('║ Dimensions:', `${actualDimensions.width}x${actualDimensions.height}`.padEnd(28), '║');
            console.log('║ Tier:', (modelTier || 'normal').padEnd(33), '║');
            console.log('╚═══════════════════════════════════════╝');
            console.log('');

            // Optimistic Credit Deduction
            const cost = modelTier === 'pro' ? 18 : 6; // Estimate or fetch from constant
            if (deductCreditsOptimistic) {
                deductCreditsOptimistic(cost, 'Generate image');
            }

            const res = await fetch('/api/image/refine', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
                },
                body: JSON.stringify({
                    images: imagesPayload,
                    prompt: prompt,
                    maskImage: maskDataUrl || undefined,
                    dimensions: actualDimensions.width > 0 ? actualDimensions : undefined,
                    userId: user?.id,
                    tier: modelTier // Pass selected tier
                })
            });

            if (res.status === 402) {
                router.push(`/pricing?returnUrl=${encodeURIComponent(pathname)}`);
                return;
            }

            if (!res.ok) throw new Error('Generation failed');
            const data = await res.json();

            // Revert back using the helper (just call it manually or copy logic if scope issue)
            // But we can Reuse processGenerationResponse
            await processGenerationResponse(data, prompt);
            if (data.url || data.taskId) setViewMode('result');

        } catch (error) {
            console.error(error);
            alert('Generation failed or timed out');
        } finally {
            setIsGenerating(false);
        }
    };

    // Refine Handlers
    const handleRemoveObjects = async () => {
        if (!generatedImage) return;
        setIsRefining(true);
        try {
            const cleanupPrompt = "Remove any extra objects, artifacts, or distractions from the background. Keep only the main product/subject clean and isolated on the background.";
            const res = await fetch('/api/image/refine', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
                },
                body: JSON.stringify({ images: [generatedImage], prompt: cleanupPrompt })
            });

            if (res.status === 402) {
                router.push(`/pricing?returnUrl=${encodeURIComponent(pathname)}`);
                return;
            }

            if (!res.ok) throw new Error('Cleanup failed');
            const data = await res.json();
            await processGenerationResponse(data, cleanupPrompt);
        } catch (e) {
            console.error(e);
            alert('Failed to cleanup image');
        } finally {
            setIsRefining(false);
        }
    };

    const handleChangeBackground = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !generatedImage) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
            const bgBase64 = ev.target?.result as string;
            setIsRefining(true);
            try {
                const editPrompt = "Replace the background of the first image with the content of the second image. IMPORTANT: Keep the main product AND any people, hands, or props in the foreground exactly as is. Only replace the environmental backdrop. Do NOT count people or auxiliary objects as background.";
                const res = await fetch('/api/image/refine', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
                    },
                    body: JSON.stringify({ images: [generatedImage, bgBase64], prompt: editPrompt })
                });

                if (res.status === 402) {
                    router.push(`/pricing?returnUrl=${encodeURIComponent(pathname)}`);
                    return;
                }

                if (!res.ok) throw new Error('Background change failed');
                const data = await res.json();
                await processGenerationResponse(data, editPrompt);
            } catch (e) {
                console.error(e);
                alert('Failed to change background');
            } finally {
                setIsRefining(false);
            }
        };
        reader.readAsDataURL(file);
        e.target.value = ''; // Reset input
    };


    return (
        <div className="w-full max-w-[1600px] mx-auto h-[90vh] flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0 px-4">
                <h1 className="text-xl font-medium text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-zinc-400" /> AI Image Studio
                </h1>
                <div className="flex gap-2">
                    {generatedImage && generatedImage !== initialResultImage && (
                        <div className="flex bg-white/5 rounded-sm p-1 gap-1 border border-white/10">
                            <button
                                onClick={() => setViewMode('workspace')}
                                className={`px-3 py-1 text-[10px] rounded-sm transition-colors ${viewMode === 'workspace' ? 'bg-white text-black font-bold' : 'text-zinc-400 hover:text-white'}`}
                            >
                                Workspace
                            </button>
                            <button
                                onClick={() => setViewMode('result')}
                                className={`px-3 py-1 text-[10px] rounded-sm transition-colors ${viewMode === 'result' ? 'bg-green-500 text-black font-bold' : 'text-zinc-400 hover:text-white'}`}
                            >
                                Result
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0 px-4 overflow-y-auto md:overflow-visible">

                {/* LEFT COLUMN: Controls */}
                <div className="w-full md:w-[340px] flex flex-col gap-0 shrink-0 h-auto md:h-full border border-white/10 rounded-sm overflow-hidden bg-zinc-900/50 backdrop-blur-sm">

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {/* 1. Reference Image - Hidden if using Template (initialReferenceImage present) */}
                        {!initialReferenceImage && (
                            <div className="p-4 border-b border-white/5">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Base Image</h3>
                                    {referenceImage && !initialReferenceImage && <button onClick={() => setReferenceImage(null)}><X className="w-3 h-3 text-zinc-500" /></button>}
                                </div>

                                {!referenceImage ? (
                                    <label className="block w-full aspect-video rounded-sm border border-dashed border-white/10 hover:border-white/20 bg-white/5 cursor-pointer flex flex-col items-center justify-center gap-2 transition-colors">
                                        <input type="file" onChange={(e) => handleUpload(e, setReferenceImage)} className="hidden" accept="image/*" />
                                        <Upload className="w-4 h-4 text-zinc-600" />
                                        <span className="text-[10px] text-zinc-600">Upload Reference</span>
                                    </label>
                                ) : (
                                    <div className="relative group">
                                        <img
                                            src={referenceImage}
                                            className="w-full rounded-sm border border-white/10"
                                            onLoad={handleReferenceLoad}
                                        />
                                        {/* Display extracted dimensions */}
                                        <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-sm backdrop-blur-md font-mono">
                                            {dimensions.width} x {dimensions.height}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}


                        {/* 2. Additional Layers (Moved Up) */}
                        <div className="p-4 border-b border-white/5">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Additional Layers</h3>
                                <button onClick={() => setIsUploadingProduct(true)} className="text-[10px] bg-white/10 hover:bg-white/20 text-white px-2 py-0.5 rounded-sm flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>
                            </div>
                            <div className="space-y-1">
                                {layers.map((layer, i) => (
                                    <div key={layer.id} onClick={() => setSelectedLayerId(layer.id)} className={`flex items-center gap-2 p-2 rounded-sm cursor-pointer ${selectedLayerId === layer.id ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                                        <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: layer.maskColor }} title="Mask Color" />
                                        <img src={layer.url} className="w-6 h-6 object-contain bg-black/40 rounded-sm" />
                                        <span className="text-[10px] text-zinc-300 flex-1 truncate">Layer {i + 1}</span>

                                        {/* Mask Tool Toggle */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedLayerId(layer.id);
                                                setActiveTool(activeTool === 'brush' ? 'move' : 'brush');
                                            }}
                                            className={`p-1 rounded-sm ${selectedLayerId === layer.id && activeTool === 'brush' ? 'bg-purple-500/20 text-purple-400' : 'text-zinc-600 hover:text-zinc-400'}`}
                                            title="Paint Mask"
                                        >
                                            <Brush className="w-3 h-3" />
                                        </button>

                                        <button onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); }}><X className="w-3 h-3 text-zinc-600 hover:text-red-400" /></button>
                                    </div>
                                ))}
                                {layers.length === 0 && <div className="text-[10px] text-zinc-600 italic px-1">No layers added</div>}
                            </div>
                        </div>

                        {/* 3. Editing Tools (Change BG, Remove Obj) */}
                        <div className="p-4 border-b border-white/5 space-y-4">
                            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Editing Tools</h3>

                            {/* Background Tool */}
                            {!disableTools.includes('background') && (
                                <div className="space-y-2">
                                    <label className="flex items-center justify-between text-[11px] text-zinc-300">
                                        <span className="flex items-center gap-2"><ImageIcon className="w-3 h-3 text-blue-400" /> New Background</span>
                                        {backgroundImage && <button onClick={() => setBackgroundImage(null)} className="text-zinc-600 hover:text-red-400 text-[10px]">Remove</button>}
                                    </label>
                                    {!backgroundImage ? (
                                        <label className="flex items-center justify-center w-full h-10 border border-dashed border-white/20 rounded-sm bg-white/5 hover:bg-white/10 cursor-pointer text-[10px] text-zinc-500 gap-2 transition-colors">
                                            <Plus className="w-3 h-3" /> Upload Background
                                            <input type="file" onChange={(e) => handleUpload(e, setBackgroundImage)} className="hidden" accept="image/*" />
                                        </label>
                                    ) : (
                                        <div className="relative w-full h-20 bg-black/50 rounded-sm overflow-hidden border border-white/10">
                                            <img src={backgroundImage} className="w-full h-full object-contain opacity-80" />
                                            <div className="absolute top-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-sm">BG</div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Person / Face Swap Tool */}
                            {!disableTools.includes('person') && (
                                <div className="space-y-2 pt-2 border-t border-white/5">
                                    <label className="flex items-center justify-between text-[11px] text-zinc-300">
                                        <span className="flex items-center gap-2"><User className="w-3 h-3 text-orange-400" /> Change Person (Face Swap)</span>
                                        {personImage && <button onClick={() => setPersonImage(null)} className="text-zinc-600 hover:text-red-400 text-[10px]">Remove</button>}
                                    </label>
                                    {!personImage ? (
                                        <label className="flex items-center justify-center w-full h-10 border border-dashed border-white/20 rounded-sm bg-white/5 hover:bg-white/10 cursor-pointer text-[10px] text-zinc-500 gap-2 transition-colors">
                                            <Plus className="w-3 h-3" /> Upload Person
                                            <input type="file" onChange={(e) => handleUpload(e, setPersonImage)} className="hidden" accept="image/*" />
                                        </label>
                                    ) : (
                                        <div className="relative w-full h-20 bg-black/50 rounded-sm overflow-hidden border border-white/10">
                                            <img src={personImage} className="w-full h-full object-contain opacity-80" />
                                            <div className="absolute top-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-sm">Person</div>
                                        </div>
                                    )}
                                </div>
                            )}



                        </div>

                        {/* 4. Smart Prompt Section */}
                        <div className="p-4 space-y-3 border-b border-white/5">
                            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex justify-between">
                                Prompt <span className="text-purple-500 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Auto</span>
                            </h3>

                            {/* Product Substitution Inputs */}
                            {layers.length > 0 && (
                                <div ref={substitutionSectionRef} className="space-y-2">
                                    <label className="text-[10px] text-zinc-400 font-medium flex items-center gap-1">
                                        <Layers className="w-3 h-3" /> What does each layer replace?
                                    </label>
                                    {layers.map((layer, i) => (
                                        <div key={layer.id} className="bg-black/20 p-2 rounded-sm border border-white/5 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <div className="relative w-8 h-8 shrink-0 bg-black/40 rounded-sm overflow-hidden border border-white/10">
                                                    <img src={layer.url} className="w-full h-full object-contain" />
                                                    <div className="absolute top-0 right-0 bg-zinc-800 text-[8px] text-zinc-400 px-1">{layer.type === 'product' ? 'Prod' : 'Mask'}</div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <input
                                                        value={productSubstitutions[i] || ''}
                                                        onChange={(e) => {
                                                            const newSubs = [...productSubstitutions];
                                                            newSubs[i] = e.target.value;
                                                            setProductSubstitutions(newSubs);
                                                        }}
                                                        placeholder={layer.type === 'product' ? `Replace [object] with ${i + 1}...` : "Describe change..."}
                                                        className="w-full bg-transparent border-b border-white/10 text-[10px] text-zinc-300 focus:border-white/40 focus:outline-none pb-1 placeholder:text-zinc-600"
                                                    />
                                                </div>
                                            </div>

                                            {/* DETAIL ENHANCEMENT */}
                                            <div className="pl-10 space-y-2">
                                                <div className="flex items-start gap-2">
                                                    <Search className="w-3 h-3 text-zinc-600 mt-1" />
                                                    <div className="flex-1 space-y-2">
                                                        <textarea
                                                            value={layer.detailText || ''}
                                                            onChange={(e) => {
                                                                const newLayers = [...layers];
                                                                newLayers[i] = { ...newLayers[i], detailText: e.target.value };
                                                                setLayers(newLayers);
                                                            }}
                                                            placeholder="Add extra details (e.g. 'Gold embroidery on collar', 'Rough texture')..."
                                                            className="w-full bg-white/5 border border-white/5 rounded-sm p-2 text-[10px] text-zinc-400 focus:text-zinc-200 resize-none outline-none min-h-[40px]"
                                                        />

                                                        {/* Detail Image Upload */}
                                                        <div className="flex items-center gap-2">
                                                            {layer.detailImage ? (
                                                                <div className="relative group w-12 h-12 bg-black/40 border border-white/10 rounded-sm overflow-hidden">
                                                                    <img src={layer.detailImage} className="w-full h-full object-contain" />
                                                                    <button
                                                                        onClick={() => {
                                                                            const newLayers = [...layers];
                                                                            newLayers[i] = { ...newLayers[i], detailImage: undefined };
                                                                            setLayers(newLayers);
                                                                        }}
                                                                        className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    >
                                                                        <X className="w-4 h-4 text-white" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <label className="w-12 h-12 flex flex-col items-center justify-center border border-dashed border-zinc-700 hover:border-zinc-500 rounded-sm cursor-pointer bg-black/20 text-[8px] text-zinc-500 gap-1 hover:text-zinc-300 transition-colors">
                                                                    <ImageIcon className="w-3 h-3" />
                                                                    <span>Detail</span>
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        className="hidden"
                                                                        onChange={(e) => {
                                                                            const file = e.target.files?.[0];
                                                                            if (file) {
                                                                                const reader = new FileReader();
                                                                                reader.onload = (loadEv) => {
                                                                                    const newLayers = [...layers];
                                                                                    newLayers[i] = { ...newLayers[i], detailImage: loadEv.target?.result as string };
                                                                                    setLayers(newLayers);
                                                                                };
                                                                                reader.readAsDataURL(file);
                                                                            }
                                                                        }}
                                                                    />
                                                                </label>
                                                            )}
                                                            <span className="text-[9px] text-zinc-600 italic">
                                                                {layer.detailImage ? "Detail image added" : "Upload close-up photo (Optional)"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <p className="text-[9px] text-zinc-600 italic">e.g. "the black jacket" or "remove the person on the left"</p>
                                </div>
                            )}

                            {/* Additional Details */}
                            <div className="space-y-1">
                                <label className="text-[10px] text-zinc-400 font-medium">Additional Details (optional)</label>
                                <textarea
                                    value={additionalDetails}
                                    onChange={(e) => setAdditionalDetails(e.target.value)}
                                    placeholder="Any extra instructions... (e.g., 'keep the same mood', 'make it brighter')"
                                    className="w-full h-12 bg-black/20 border border-white/10 rounded-sm p-2 text-[10px] text-zinc-400 placeholder:text-zinc-600 resize-none outline-none focus:border-white/20"
                                />
                            </div>

                            {/* Collapsible Full Prompt Preview */}
                            <details className="group">
                                <summary className="text-[9px] text-zinc-500 cursor-pointer hover:text-zinc-400 list-none flex items-center gap-1">
                                    <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
                                    View Full Prompt
                                </summary>
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    className="w-full h-24 mt-2 bg-black/20 border border-white/10 rounded-sm p-3 text-[9px] text-zinc-500 resize-none outline-none focus:border-white/20 font-mono"
                                />
                            </details>
                        </div>
                    </div>

                    {/* Generate Button */}
                    <div className="p-4 border-t border-white/10 bg-black/20">
                        {/* Generate Button Area */}
                        <div className="p-4 border-t border-white/10 bg-black/20 space-y-3">
                            {/* Dimension Inputs */}
                            {/* Dimension Inputs Removed */}

                            <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-sm border border-white/5 mb-4">
                                <button
                                    onClick={() => setModelTier('normal')}
                                    className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-sm transition-all ${modelTier === 'normal' ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    <span className="text-[9px] font-bold uppercase tracking-wider">Normal</span>
                                    <span className="text-[7px] font-medium opacity-60">6 Credits</span>
                                </button>
                                <button
                                    onClick={() => setModelTier('pro')}
                                    className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-sm transition-all ${modelTier === 'pro' ? 'bg-gradient-to-br from-purple-900/80 to-blue-900/80 text-white shadow-md border border-purple-500/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    <span className="text-[9px] font-bold uppercase tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">Pro</span>
                                    <span className="text-[7px] font-medium opacity-60">18 Credits</span>
                                </button>
                            </div>

                            {(!profile || (profile.credits || 0) < (modelTier === 'pro' ? 18 : 6)) ? (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => router.push(`/pricing?returnUrl=${encodeURIComponent(pathname)}`)}
                                        className="flex-1 h-10 text-[11px] font-bold tracking-[0.2em] uppercase rounded-sm flex flex-col items-center justify-center gap-0.5 transition-all bg-orange-500/10 border border-orange-500/50 text-orange-500 hover:bg-orange-500/20"
                                    >
                                        <span className="text-sm font-black tracking-[0.2em] uppercase">GET CREDITS</span>
                                        <span className="text-[9px] font-medium uppercase tracking-wide text-orange-400">Insufficient Credits (Need {modelTier === 'pro' ? 18 : 6})</span>
                                    </button>
                                    <button
                                        onClick={() => window.open('/guide/image-editing', '_blank')}
                                        className="w-10 h-10 flex items-center justify-center rounded-sm bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                                        title="Read Guide"
                                    >
                                        <BookOpen className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleGenerate}
                                            disabled={isGenerating || !referenceImage}
                                            className={`flex-1 h-10 text-[11px] font-bold tracking-[0.2em] uppercase rounded-sm flex items-center justify-center gap-2 transition-all ${isGenerating || !referenceImage ? 'bg-white/5 text-zinc-600 border border-white/5 cursor-not-allowed' : 'bg-white text-black hover:bg-zinc-200'}`}
                                        >
                                            {isGenerating ? <><Sparkles className="w-4 h-4 animate-spin" /> Processing...</> : (
                                                <div className="flex flex-col items-center leading-none">
                                                    <span>Generate {modelTier === 'pro' ? '(Pro)' : ''}</span>
                                                    <span className="text-[8px] opacity-60 font-medium normal-case tracking-normal">Cost: {modelTier === 'pro' ? '18' : '6'} Credits</span>
                                                </div>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => window.open('/guide/image-editing', '_blank')}
                                            className="w-10 h-10 flex items-center justify-center rounded-sm bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                                            title="Read Guide"
                                        >
                                            <BookOpen className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* CENTER: Canvas / Result View */}
                <div className="flex-1 bg-zinc-950/50 rounded-sm border border-white/5 relative overflow-hidden flex items-center justify-center select-none min-h-[50vh] md:min-h-0">

                    {/* View: WORKSPACE */}
                    {viewMode === 'workspace' && (
                        initialResultImage ? (
                            <div className="relative w-full h-full flex flex-col items-center justify-center">
                                {/* Comparison Slider Container */}
                                <div className="relative w-full max-w-4xl h-full md:h-[65vh] shadow-2xl rounded-2xl border border-white/5 overflow-hidden bg-transparent group">
                                    <BeforeAfterSlider
                                        initialPosition={50}
                                        before={
                                            <div className="w-full h-full flex items-center justify-center relative">
                                                <img src={beforeImageSource === 'reference' ? referenceImage! : (initialProductImage || referenceImage!)} className="w-full h-full object-contain pointer-events-none" />
                                                <div className="absolute top-4 left-4 bg-black/50 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm uppercase tracking-wider font-bold z-50 transition-opacity duration-300 group-hover:opacity-0">{beforeImageSource === 'reference' ? 'Reference' : 'Product'}</div>
                                            </div>
                                        }
                                        after={
                                            <div className="w-full h-full relative">
                                                <img src={initialResultImage} className="w-full h-full object-contain pointer-events-none" />
                                                <div className="absolute top-4 right-4 bg-white/90 text-black text-[10px] px-2 py-1 rounded backdrop-blur-sm uppercase tracking-wider font-bold z-50 shadow-lg transition-opacity duration-300 group-hover:opacity-0">Result</div>
                                            </div>
                                        }
                                    />
                                </div>


                                {/* Control Bar - Minimal */}
                                <div className="w-full max-w-4xl mt-4 flex items-center justify-center gap-4">
                                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mr-2">Compare:</span>
                                    <button
                                        onClick={() => setBeforeImageSource('reference')}
                                        className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${beforeImageSource === 'reference' ? 'text-white' : 'text-zinc-500 hover:text-white'}`}
                                    >
                                        Reference
                                    </button>
                                    {initialProductImage && (
                                        <button
                                            onClick={() => setBeforeImageSource('product')}
                                            className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${beforeImageSource === 'product' ? 'text-white' : 'text-zinc-500 hover:text-white'}`}
                                        >
                                            Product
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            referenceImage ? (
                                <div className="w-full h-full flex flex-row items-center justify-center gap-6 pl-10 pr-10">
                                    <div
                                        ref={imageContainerRef}
                                        className={`relative shadow-2xl ${activeTool === 'brush' ? 'cursor-none' : ''}`}
                                        style={{ aspectRatio, maxHeight: '90%', maxWidth: 'calc(100% - 120px)', touchAction: 'none' }}
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
                                        {/* Base Image */}
                                        <img src={referenceImage} className="w-full h-full object-contain pointer-events-none" onLoad={handleReferenceLoad} />

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

                                            {/* Global Cleanup Mask (Deprecated but kept for compat) */}
                                            {cleanupMask.map((stroke, i) => (
                                                <polyline key={`clean-${i}`} points={stroke.points.map(p => `${p[0] * 100} ${p[1] * 100}`).join(', ')} fill="none" stroke="rgba(236, 72, 153, 0.5)" strokeWidth="40" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                                            ))}

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
                                                    stroke={activeTool === 'eraser' ? 'rgba(255,255,255,0.5)' : (selectedLayerId ? layers.find(l => l.id === selectedLayerId)?.maskColor : 'rgba(236, 72, 153, 0.5)')}
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
                                                    backgroundColor: activeTool === 'eraser' ? 'rgba(255,255,255,0.2)' : (layers.find(l => l.id === selectedLayerId)?.maskColor || 'rgba(255,0,0,0.5)'),
                                                    opacity: 0.8
                                                }}
                                            />
                                        )}
                                    </div>

                                    {/* Floating Toolbar - Vertical Static Right */}
                                    {layers.length > 0 && (
                                        <div className="flex flex-col items-center gap-4 bg-transparent px-3 py-6 rounded-full z-50 flex-none">
                                            {/* Layer Indicator */}
                                            <div className="mb-2 flex flex-col items-center gap-2 border-b border-white/10 pb-4 w-full">
                                                <div className={`w-3 h-3 rounded-full ${selectedLayerId ? '' : 'bg-gray-500'}`} style={{ backgroundColor: selectedLayerId ? layers.find(l => l.id === selectedLayerId)?.maskColor : undefined }}></div>
                                                <span className="text-[10px] font-medium text-gray-300 whitespace-nowrap writing-vertical-lr rotate-180 hidden">
                                                    {selectedLayerId ? 'Layer Active' : 'Select'}
                                                </span>
                                            </div>

                                            {/* Tools */}
                                            <div className="flex flex-col items-center gap-2">
                                                <button
                                                    onClick={() => setActiveTool('brush')}
                                                    className={`p-2 rounded-full transition-all ${activeTool === 'brush' ? 'bg-white text-black' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                                                    style={{ backgroundColor: activeTool === 'brush' && selectedLayerId ? layers.find(l => l.id === selectedLayerId)?.maskColor : undefined, color: activeTool === 'brush' && selectedLayerId ? 'white' : undefined }}
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
                                                title="Clear Layer Mask"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-4 opacity-30">
                                    <Plus className="w-12 h-12" />
                                    <span className="uppercase tracking-[0.2em] text-xs">Start by uploading a reference</span>
                                </div>
                            )
                        )
                    )}

                    {/* View: RESULT */}
                    {/* View: RESULT */}
                    {/* View: RESULT */}
                    {/* View: RESULT */}
                    {/* View: RESULT */}
                    {/* View: RESULT */}
                    {/* View: RESULT */}
                    {/* View: RESULT */}
                    {viewMode === 'result' && generatedImage && (
                        <div className="relative w-full h-full flex flex-col items-center justify-center p-4 gap-4">

                            {/* Before/After Slider Container */}
                            <div className="relative w-full max-w-4xl h-full md:h-[65vh] overflow-hidden group">
                                <BeforeAfterSlider
                                    initialPosition={50}
                                    before={
                                        <div className="w-full h-full flex items-center justify-center relative">
                                            <img
                                                src={beforeImageSource === 'reference' ? referenceImage! : (layers.find(l => l.type === 'product')?.url || referenceImage!)}
                                                className="w-full h-full object-contain pointer-events-none"
                                            />
                                            <div className="absolute top-4 left-4 bg-black/50 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm uppercase tracking-wider font-bold z-50 transition-opacity duration-300 group-hover:opacity-0">
                                                {beforeImageSource === 'reference' ? 'Reference' : 'Product'}
                                            </div>
                                        </div>
                                    }
                                    after={
                                        <div className="w-full h-full relative">
                                            <img
                                                src={generatedImage}
                                                className="w-full h-full object-contain pointer-events-none"
                                            />
                                            <div className="absolute top-4 right-4 bg-white/90 text-black text-[10px] px-2 py-1 rounded backdrop-blur-sm uppercase tracking-wider font-bold z-50 shadow-lg transition-opacity duration-300 group-hover:opacity-0">Result</div>
                                        </div>
                                    }
                                />
                            </div>

                            {/* Controls Below - Centered */}
                            <div className="flex items-center justify-center gap-3">
                                <button
                                    onClick={() => setBeforeImageSource('reference')}
                                    className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${beforeImageSource === 'reference' ? 'text-white' : 'text-zinc-500 hover:text-white'}`}
                                >
                                    Reference
                                </button>
                                {layers.some(l => l.type === 'product') && (
                                    <button
                                        onClick={() => setBeforeImageSource('product')}
                                        className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${beforeImageSource === 'product' ? 'text-white' : 'text-zinc-500 hover:text-white'}`}
                                    >
                                        Product
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>



                {/* Add Layer Modal (Reused) */}
                <AnimatePresence>
                    {isUploadingProduct && (
                        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                                className="bg-zinc-950 border border-zinc-800 rounded-lg w-full max-w-xs overflow-hidden"
                            >
                                <div className="p-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                                    <h3 className="text-[10px] font-bold text-white uppercase tracking-widest">Add Element</h3>
                                    <button onClick={() => { setIsUploadingProduct(false); setTempUploadImage(null); }}><X className="w-3 h-3 text-zinc-500 hover:text-white" /></button>
                                </div>

                                <div className="p-3">
                                    {!tempUploadImage ? (
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => setUploadType('product')}
                                                className="relative aspect-square rounded-sm border border-zinc-800 bg-zinc-900/20 hover:bg-zinc-900 transition-all flex flex-col items-center justify-center gap-2 group"
                                            >
                                                <ImageIcon className="w-5 h-5 text-zinc-600 group-hover:text-zinc-300" />
                                                <span className="text-[9px] uppercase tracking-wider text-zinc-600 group-hover:text-zinc-300">Product</span>
                                                <input type="file" onChange={(e) => { setUploadType('product'); handleUpload(e, setTempUploadImage); }} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                                            </button>
                                            <button
                                                onClick={() => { setUploadType('mask'); setShowMaskSelectModal(true); }}
                                                className="relative aspect-square rounded-sm border border-zinc-800 bg-zinc-900/20 hover:bg-zinc-900 transition-all flex flex-col items-center justify-center gap-2 group"
                                            >
                                                <Eraser className="w-5 h-5 text-zinc-600 group-hover:text-zinc-300" />
                                                <span className="text-[9px] uppercase tracking-wider text-zinc-600 group-hover:text-zinc-300">Mask</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="relative aspect-square bg-black border border-zinc-800 rounded-sm p-2 flex items-center justify-center bg-[url('/transparent-grid.png')]">
                                                <img src={tempUploadImage} className="max-w-full max-h-full object-contain" />
                                            </div>
                                            <div className="flex gap-2">
                                                <Button onClick={addLayer} className="flex-1 bg-white text-black hover:bg-zinc-200 font-bold tracking-wider uppercase text-[10px] h-8">
                                                    Add
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Mask Selection Modal */}
                <AnimatePresence>
                    {showMaskSelectModal && (
                        <SavedMasksModal
                            isOpen={showMaskSelectModal}
                            onClose={() => setShowMaskSelectModal(false)}
                            onSelect={handleSavedMaskSelect}
                        />
                    )}
                </AnimatePresence>

            </div >
        </div >
    );
};
