'use client';

import { useState, useEffect, use, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
    Image as ImageIcon,
    Sparkles,
    X,
    Check,
    Zap,
    Clock,
    TrendingUp,
    Info,
    Upload,
    UserCircle2,
    ArrowLeft,
    Search,
    Volume2,
    VolumeX,
    Video,
    BookOpen,
    Plus,
    Layers,
    Wand2,
    Play,
    Pause,
    Loader2,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/auth/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { supabase } from '@/lib/supabase';
import { Template } from '@/lib/db/videos';
import { BeforeAfterVideoSlider } from '@/components/BeforeAfterVideoSlider';
import { SavedMasksModal } from '@/components/SavedMasksModal';

// Available Models
const ALL_MODELS = [
    {
        id: 'kwaivgi/kling-video-o1/video-edit',
        name: 'Kling Video Edit',
        description: 'Edit existing video (User Prompt + Product Ref).',
        costCredits: 75,
        timeMin: 60,
        timeMax: 120,
        successRate: 85,
        speed: 'Fast'
    },
    {
        id: 'kling-v1', // Fallback/Standard
        name: 'Kling Standard',
        description: 'Standard generation.',
        costCredits: 75,
        timeMin: 60,
        timeMax: 120,
        successRate: 90,
        speed: 'Medium'
    }
];

interface ProductLayer {
    id: string;
    url: string;
    name: string;
    detailText?: string;
}

export default function RecreatePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ collectionId?: string }> }) {
    const { id } = use(params);
    const query = use(searchParams);
    const collectionId = query.collectionId;
    const router = useRouter();
    const pathname = usePathname();
    const { profile, deductCreditsOptimistic } = useAuth();

    // --- STATE ---
    const [template, setTemplate] = useState<Template | null>(null);
    const [loading, setLoading] = useState(true);

    // Dynamic Layers (replacing static slots)
    const [layers, setLayers] = useState<ProductLayer[]>([]);
    const [productSubstitutions, setProductSubstitutions] = useState<string[]>([]);

    // Prompt
    const [prompt, setPrompt] = useState('');
    const [keepAudio, setKeepAudio] = useState(true);
    const [selectedModel, setSelectedModel] = useState<string>('kwaivgi/kling-video-o1/video-edit');

    // UI State
    const [showSavedMasksModal, setShowSavedMasksModal] = useState(false);

    // Generation
    const [isGenerating, setIsGenerating] = useState(false);
    const [genState, setGenState] = useState<{
        status: 'idle' | 'processing' | 'mixing_audio' | 'completed' | 'failed';
        taskId: string | null;
        videoUrl: string | null;
    }>({ status: 'idle', taskId: null, videoUrl: null });

    const [viewMode, setViewMode] = useState<'workspace' | 'result'>('workspace');
    const [activeComparison, setActiveComparison] = useState<'reference' | 'result'>('result');
    const [activeBase, setActiveBase] = useState<'reference' | 'product'>('reference');
    const [timer, setTimer] = useState(0);

    // Collection Navigation State
    const [prevId, setPrevId] = useState<string | null>(null);
    const [nextId, setNextId] = useState<string | null>(null);

    // Fetch Collection Navigation
    useEffect(() => {
        if (!collectionId) return;

        async function fetchCollectionNav() {
            // Fetch all items in collection ordered by index
            const { data: items } = await supabase
                .from('collection_items')
                .select('template_id, order_index')
                .eq('collection_id', collectionId)
                .order('order_index', { ascending: true });

            if (!items) return;

            // Find current index
            const currentIndex = items.findIndex(item => item.template_id == id); // Loose equality as id is string, template_id is default INT but JS allows loose check or cast

            if (currentIndex === -1) return;

            // Determine Prev
            if (currentIndex > 0) {
                setPrevId(String(items[currentIndex - 1].template_id));
            }

            // Determine Next
            if (currentIndex < items.length - 1) {
                setNextId(String(items[currentIndex + 1].template_id));
            }
        }
        fetchCollectionNav();
    }, [collectionId, id]);

    // --- HELPERS ---
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

    // --- EFFECTS ---

    useEffect(() => {
        let isMounted = true;
        async function loadTemplate() {
            try {
                const { data, error } = await supabase.from('templates').select('*').eq('id', id).single();
                if (isMounted) {
                    if (data && !error) {
                        setTemplate(data as Template);
                        if (data.ai_model) setSelectedModel(data.ai_model);
                    } else {
                        setTemplate({
                            id: Number(id),
                            title: 'Recreate Video',
                            description: '',
                            type: 'video',
                            category: 'VISUAL',
                            before_image_url: '',
                            after_image_url: '',
                            views_count: '0',
                            is_trending: false
                        } as Template);
                    }
                    setLoading(false);
                }
            } catch (err) {
                console.error(err);
                if (isMounted) setLoading(false);
            }
        }
        if (id) loadTemplate();
        return () => { isMounted = false; };
    }, [id]);

    // Sync substitutions
    useEffect(() => {
        setProductSubstitutions(prev => {
            const newSubs = [...prev];
            while (newSubs.length < layers.length) newSubs.push('');
            return newSubs.slice(0, layers.length);
        });
    }, [layers]);

    // Auto-Prompt
    useEffect(() => {
        if (!template) return;

        let p = `Recreate the reference video "${template.title}" EXACTLY, shot by shot. `;
        p += "The ONLY change allowed is the integration of the provided product(s) in place of the original subject/object.\n\n";

        if (layers.length > 0) {
            p += "PRODUCT INTEGRATION:\n";
            layers.forEach((layer, i) => {
                const sub = productSubstitutions[i] || layer.name;
                p += `• Product ${i + 1} (${sub}): Integrate realistically.\n`;
                if (layer.detailText) p += `  Detail: ${layer.detailText}\n`;
            });
        }

        p += "\nSTRICT RECREATION REQUIREMENTS:\n";
        p += "- Camera movement: identical to original.\n";
        p += "- Lighting: match original atmosphere.\n";
        p += "- High fidelity, photorealistic.\n";

        setPrompt(p);
    }, [layers, productSubstitutions, template]);

    // Timer Logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isGenerating || genState.status === 'processing' || genState.status === 'mixing_audio') {
            setTimer(0);
            interval = setInterval(() => {
                setTimer(prev => prev + 1);
            }, 1000);
        } else {
            setTimer(0);
        }
        return () => clearInterval(interval);
    }, [isGenerating, genState.status]);

    // Polling
    useEffect(() => {
        if (genState.status !== 'processing' || !genState.taskId) return;

        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/video/status?taskId=${genState.taskId}&provider=wavespeed`);
                const data = await res.json();
                const status = data.data?.status;

                if (status === 'completed' || status === 'succeeded') {
                    const videoUrl = data.data.video?.url;
                    if (videoUrl) {
                        // Handle Audio Merge if requested
                        if (keepAudio && template?.before_video_url) {
                            setGenState(p => ({ ...p, status: 'mixing_audio' }));
                            try {
                                const mergeRes = await fetch('/api/video/merge-audio', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        videoId: genState.taskId,
                                        videoUrl: videoUrl,
                                        audioUrl: template.before_video_url
                                    })
                                });
                                const mergeData = await mergeRes.json();
                                if (mergeData.url) {
                                    await supabase.from('videos').update({ video_url: mergeData.url, status: 'completed' }).eq('task_id', genState.taskId);
                                    setGenState(p => ({ ...p, status: 'completed', videoUrl: mergeData.url }));
                                    setViewMode('result');
                                } else {
                                    setGenState(p => ({ ...p, status: 'completed', videoUrl: videoUrl }));
                                    setViewMode('result');
                                }
                            } catch (e) {
                                console.error("Audio merge failed", e);
                                setGenState(p => ({ ...p, status: 'completed', videoUrl: videoUrl }));
                                setViewMode('result');
                            }
                        } else {
                            setGenState(p => ({ ...p, status: 'completed', videoUrl: videoUrl }));
                            setViewMode('result');
                        }
                    }
                } else if (status === 'failed') {
                    setGenState(p => ({ ...p, status: 'failed' }));
                    setIsGenerating(false);
                }
            } catch (e) {
                console.error("Polling error", e);
            }
        }, 4000);

        return () => clearInterval(interval);
    }, [genState, keepAudio, template]);


    // --- HANDLERS ---

    const handleProductUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const processed = await processImage(ev.target?.result as string);
            const newLayer: ProductLayer = {
                id: crypto.randomUUID(),
                url: processed,
                name: file.name.replace(/\.[^/.]+$/, ''),
            };
            setLayers([...layers, newLayer]);
        };
        reader.readAsDataURL(file);
    };

    const removeLayer = (id: string) => {
        setLayers(layers.filter(l => l.id !== id));
    };

    const handleGenerate = async () => {
        if (!template) return;

        if (layers.length === 0) {
            alert(`Please upload at least one product image.`);
            return;
        }

        setIsGenerating(true);
        setGenState({ status: 'processing', taskId: null, videoUrl: null });
        setViewMode('workspace');

        try {
            const { data: { session } } = await supabase.auth.getSession();

            const productImages = layers.map(l => l.url);
            // Add Marked/Outline Product Image if available in template
            if (template.product_outline_image_url) {
                productImages.push(template.product_outline_image_url);
            }

            // API Call
            const cost = 75;
            deductCreditsOptimistic?.(cost, 'Recreate Video');

            const res = await fetch('/api/video/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
                },
                body: JSON.stringify({
                    images: productImages,
                    prompt: prompt,
                    model: selectedModel,
                    duration: 5,
                    video_id: template.id,
                    audio_url: keepAudio ? template.before_video_url : undefined,
                    // Pass template video as base video if strictly needed by API, though 'video_id' usually suffices for templates logic
                    // If model matches video-edit, we might need to send video url explicitly if backend doesn't resolve from ID
                    video: template.before_video_url
                })
            });

            const data = await res.json();
            if (data.taskId) {
                setGenState(p => ({ ...p, taskId: data.taskId }));
            } else {
                throw new Error(data.error || "No task ID returned");
            }
        } catch (e: any) {
            console.error(e);
            alert("Error: " + e.message);
            setIsGenerating(false);
            setGenState(p => ({ ...p, status: 'failed' }));
        }
    };


    // --- RENDER ---

    if (loading || !template) return (
        <div className="min-h-screen pt-20 flex items-center justify-center text-zinc-500">
            <Loader2 className="h-6 w-6 animate-spin" />
        </div>
    );

    const getCreditsCost = () => {
        // Get duration from template or default to 5s
        const duration = template?.duration || 5;

        if (duration <= 15) return 75;
        if (duration <= 20) return 130;

        // +30 credits per each additional 5 seconds after 20s
        const extraSeconds = duration - 20;
        const extraBlocks = Math.ceil(extraSeconds / 5);
        return 130 + (extraBlocks * 30);
    };

    return (
        <ProtectedRoute>
            <div className="w-full max-w-[1600px] mx-auto h-[90vh] flex flex-col gap-4 pt-24 px-4">

                {/* HEADER */}
                <div className="flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={() => router.back()} size="sm" className="text-zinc-400 hover:text-white pl-0">
                            <ArrowLeft className="w-4 h-4 mr-2" /> Back
                        </Button>
                        <h1 className="text-xl font-bold text-white uppercase tracking-wider">{template.title}</h1>
                    </div>
                    {genState.videoUrl && (
                        <div className="flex bg-white/5 rounded-sm p-1 gap-1 border border-white/10">
                            <button onClick={() => setViewMode('workspace')} className={`px-3 py-1 text-[10px] rounded-sm transition-colors ${viewMode === 'workspace' ? 'bg-white text-black font-bold' : 'text-zinc-400 hover:text-white'}`}>Workspace</button>
                            <button onClick={() => setViewMode('result')} className={`px-3 py-1 text-[10px] rounded-sm transition-colors ${viewMode === 'result' ? 'bg-green-500 text-black font-bold' : 'text-zinc-400 hover:text-white'}`}>Result</button>
                        </div>
                    )}
                </div>

                <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0 overflow-hidden">

                    {/* LEFT SIDEBAR (Inputs) */}
                    <div className="w-full md:w-[340px] shrink-0 flex flex-col gap-0 h-[55%] md:h-full border border-white/10 rounded-sm overflow-hidden bg-zinc-900/50 backdrop-blur-sm">

                        <div className="flex-1 overflow-y-auto custom-scrollbar">

                            {/* 1. Base Video (Read Only from Template) */}
                            <div className="p-4 border-b border-white/5">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Base Video (Template)</h3>
                                </div>
                                <div className="space-y-2">
                                    <div className="relative aspect-video bg-black rounded-sm overflow-hidden border border-white/10 group">
                                        {template.before_video_url ? (
                                            <video src={template.before_video_url} className="w-full h-full object-contain" controls />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-zinc-600">
                                                <Video className="w-8 h-8 opacity-20" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="text-[10px] text-zinc-500 font-mono px-2 flex-1">
                                            Original Timing preserved
                                        </div>
                                        <div className="flex items-center gap-2 bg-white/5 rounded-sm px-2 py-1">
                                            {keepAudio ? <Volume2 className="w-3 h-3 text-green-400" /> : <VolumeX className="w-3 h-3 text-zinc-500" />}
                                            <button
                                                onClick={() => setKeepAudio(!keepAudio)}
                                                className="text-[9px] text-zinc-400 hover:text-white uppercase tracking-wider font-bold"
                                            >
                                                {keepAudio ? 'Audio On' : 'Audio Off'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Layers (Dynamic) */}
                            <div className="p-4 border-b border-white/5">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Product Layers</h3>
                                    <button className="relative overflow-hidden">
                                        <label className="text-[10px] bg-white/10 hover:bg-white/20 text-white px-2 py-0.5 rounded-sm flex items-center gap-1 cursor-pointer">
                                            <Plus className="w-3 h-3" /> Add
                                            <input type="file" onChange={handleProductUpload} className="hidden" accept="image/*" />
                                        </label>
                                    </button>
                                </div>
                                <div className="space-y-1">
                                    {layers.map((layer, i) => (
                                        <div key={layer.id} className="flex flex-col gap-1 bg-white/5 p-2 rounded-sm border border-white/5">
                                            <div className="flex items-center gap-2">
                                                <img src={layer.url} className="w-8 h-8 object-contain bg-black/40 rounded-sm" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[10px] text-white truncate font-medium">{layer.name}</div>
                                                    <div className="text-[9px] text-zinc-500 truncate">Product {i + 1}</div>
                                                </div>
                                                <button onClick={() => removeLayer(layer.id)}><X className="w-3 h-3 text-zinc-600 hover:text-red-400" /></button>
                                            </div>
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
                                </div>
                            </div>

                            {/* 3. Prompt (Auto) */}
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

                        {/* Generate Button Wrapper */}
                        <div className="p-4 border-t border-white/10 bg-zinc-950">
                            <div className="flex gap-2">
                                {(!profile || (profile.credits || 0) < getCreditsCost()) ? (
                                    <Button
                                        onClick={() => router.push('/pricing')}
                                        className="flex-1 bg-black border border-orange-600 text-orange-500 font-bold uppercase h-10 rounded-sm flex flex-col items-center justify-center gap-0.5 hover:bg-orange-950/30 transition-colors shadow-[0_0_15px_rgba(234,88,12,0.1)] leading-none"
                                    >
                                        <span className="text-[11px] tracking-widest">GET CREDITS</span>
                                        <span className="text-[8px] opacity-80 decoration-none">NEED {getCreditsCost()} CREDITS</span>
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleGenerate}
                                        disabled={isGenerating || layers.length === 0}
                                        className="flex-1 bg-white text-black hover:bg-zinc-200 font-bold tracking-wider uppercase h-10 text-[11px] rounded-sm shadow-[0_0_15px_rgba(255,255,255,0.1)] flex items-center justify-center"
                                    >
                                        {isGenerating ? (
                                            <span className="flex items-center gap-2">
                                                <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                                {genState.status === 'mixing_audio' ? `Mixing Audio... (${Math.floor(timer / 60)}:${(timer % 60).toString().padStart(2, '0')})` : `Generating... (${Math.floor(timer / 60)}:${(timer % 60).toString().padStart(2, '0')})`}
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

                    {/* MAIN CONTENT CENTER */}
                    <div className="flex-1 bg-zinc-900/20 rounded-sm border border-white/5 relative overflow-hidden flex flex-col">
                        <div className="flex-1 flex items-center justify-center p-8">
                            {viewMode === 'workspace' ? (
                                <div className="w-full h-full flex items-center justify-center">
                                    {/* Before / After Slider */}
                                    {/* Before / After Slider */}
                                    {template.before_video_url ? (
                                        <div className="max-w-4xl w-full h-full md:h-[65vh] relative group/slider rounded-sm overflow-hidden">
                                            <BeforeAfterVideoSlider
                                                // BASE (Bottom): Toggle between Template Video (Reference) and Product Image
                                                beforeVideoUrl={activeBase === 'reference' ? template.before_video_url : null}
                                                beforeImageUrl={activeBase === 'product' ? (template.product_image_url || layers.find(l => l.url)?.url || null) : null}
                                                showBaseToggle={true}
                                                baseMode={activeBase}
                                                onBaseModeChange={setActiveBase}

                                                // OVERLAY (Top): Toggle betwen Result (measured) or Reference (Template target)
                                                // Usually we compare Result vs Reference Base. 
                                                // If we toggle base to product, we compare Result vs Product.
                                                afterVideoUrl={activeComparison === 'result' ? (genState.videoUrl || template.after_video_url) : (template.after_video_url || template.before_video_url)}
                                            />



                                            {/* Toggle Control Overlay - Top Right (Comparison Target) */}
                                            {genState.videoUrl && (
                                                <div className="absolute top-4 right-4 z-30 flex bg-black/60 backdrop-blur-md rounded-lg p-1 border border-white/10 shadow-xl opacity-0 group-hover/slider:opacity-100 transition-opacity duration-300">
                                                    <button
                                                        onClick={() => setActiveComparison('reference')}
                                                        className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${activeComparison === 'reference'
                                                            ? 'bg-zinc-100 text-black shadow-sm'
                                                            : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                                            }`}
                                                    >
                                                        Compare to Ref
                                                    </button>
                                                    <button
                                                        onClick={() => setActiveComparison('result')}
                                                        className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${activeComparison === 'result'
                                                            ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-sm'
                                                            : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                                            }`}
                                                    >
                                                        Result
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-zinc-500 flex flex-col items-center gap-2">
                                            <Video className="w-12 h-12 opacity-20" />
                                            <span>No base video for this template</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-black rounded-sm overflow-hidden">
                                    {genState.videoUrl ? (
                                        <video src={genState.videoUrl} controls autoPlay loop className="max-w-full max-h-full" />
                                    ) : (
                                        <span className="text-zinc-500">No result</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* MODALS */}
                <SavedMasksModal
                    isOpen={showSavedMasksModal}
                    onClose={() => setShowSavedMasksModal(false)}
                    onSelect={(url) => {
                        const newLayer: ProductLayer = {
                            id: crypto.randomUUID(),
                            url: url,
                            name: 'Saved Mask',
                        };
                        setLayers([...layers, newLayer]);
                        setShowSavedMasksModal(false);
                    }}
                />
            </div>
        </ProtectedRoute>
    );
}
