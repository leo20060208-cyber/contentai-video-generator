'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Upload, X, Sparkles, Loader2, Music, Clapperboard, Play, BookOpen, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';

interface InstantClipsEditorProps {
    onBack: () => void;
}

const STYLE_PRESETS = [
    { id: 'cinematic', name: 'Cinematic', icon: '🎬' },
    { id: 'energetic', name: 'Energetic', icon: '⚡' },
    { id: 'minimal', name: 'Minimal', icon: '✨' },
    { id: 'luxury', name: 'Luxury', icon: '💎' },
];

export function InstantClipsEditor({ onBack }: InstantClipsEditorProps) {
    const router = useRouter();
    const [productImage, setProductImage] = useState<string | null>(null);
    const [selectedStyle, setSelectedStyle] = useState('cinematic');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

    const { deductCreditsOptimistic } = useAuth();

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

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            setProductImage(ev.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleGenerate = async () => {
        if (!productImage || isGenerating) return;
        setIsGenerating(true);
        setGenerationProgress(0);

        try {
            const cost = 120; // High quality clips
            if (deductCreditsOptimistic) {
                deductCreditsOptimistic(cost, "Instant Clips Generation");
            }

            const response = await fetch('/api/video/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: `Create a professional product advertisement video for this product with a ${selectedStyle} style. Dynamic camera movements and premium lighting.\n\nSTRICT RECREATION REQUIREMENTS:\n- EXACT DURATION: 5 seconds. Do not change the speed.\n- Maintain high fidelity and cinematic lighting.\n- Photorealistic, 8K resolution.\n- OUTPUT VIDEO MUST HAVE THE SAME RESOLUTION AND ASPECT RATIO AS THE REFERENCE IMAGE.`,
                    image: productImage,
                    duration: 5,
                    model: 'kling-v1',
                    aspect_ratio: '9:16'
                })
            });

            if (!response.ok) throw new Error('Generation failing');
            const data = await response.json();

            if (data.taskId) {
                let completed = false;
                let attempts = 0;
                while (!completed && attempts < 1800) {
                    await new Promise(r => setTimeout(r, 2000));
                    const statusRes = await fetch(`/api/video/status?taskId=${data.taskId}`);
                    const statusData = await statusRes.json();

                    if (statusData.status === 'completed' && statusData.videoUrl) {
                        completed = true;
                        setGenerationProgress(100);
                        setGeneratedVideoUrl(statusData.videoUrl);
                    } else {
                        setGenerationProgress(prev => Math.min(95, prev + 5));
                    }
                    attempts++;
                }
            }
        } catch (e) {
            console.error(e);
            alert('Generation failed');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

            <div className="h-14 flex items-center justify-between px-6 relative z-50">
                <button onClick={onBack} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-xl transition-all text-zinc-400 hover:text-white border border-white/5">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
                <div className="w-full max-w-sm aspect-[9/16] rounded-[32px] bg-zinc-900 border border-white/10 overflow-hidden shadow-2xl relative group">
                    {productImage ? (
                        <>
                            <img src={productImage} className="w-full h-full object-cover" />
                            <button onClick={() => setProductImage(null)} className="absolute top-6 right-6 p-2 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                <X className="w-4 h-4" />
                            </button>
                        </>
                    ) : (
                        <label className="w-full h-full flex flex-col items-center justify-center gap-6 cursor-pointer hover:bg-white/5 transition-colors">
                            <input type="file" className="hidden" onChange={handleUpload} accept="image/*" />
                            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
                                <Upload className="w-6 h-6 text-zinc-400" />
                            </div>
                            <div className="text-center">
                                <span className="text-sm text-white font-bold block mb-1">Upload Product</span>
                                <span className="text-xs text-zinc-500">PNG or JPG</span>
                            </div>
                        </label>
                    )}
                </div>

                <div className="w-full max-w-xl space-y-8">
                    <div className="grid grid-cols-4 gap-3">
                        {STYLE_PRESETS.map((style) => (
                            <button
                                key={style.id}
                                onClick={() => setSelectedStyle(style.id)}
                                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${selectedStyle === style.id ? 'bg-zinc-100 border-white text-black' : 'bg-zinc-900/50 border-white/5 text-zinc-500 hover:border-white/10'}`}
                            >
                                <span className="text-xl">{style.icon}</span>
                                <span className="text-[10px] font-black uppercase tracking-wider">{style.name}</span>
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="flex gap-4">
                            <Button
                                onClick={handleGenerate}
                                disabled={!productImage || isGenerating}
                                className="flex-1 h-14 bg-white text-black hover:bg-zinc-200 font-black text-sm rounded-2xl flex items-center justify-center gap-3 transition-all"
                            >
                                {isGenerating ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <Clapperboard className="w-5 h-5" />
                                        GENERATE INSTANT CLIP
                                    </>
                                )}
                            </Button>

                            <button
                                onClick={() => router.push('/guide/instant-clips')}
                                className="w-16 h-14 bg-zinc-900 shadow-xl border border-white/5 rounded-2xl flex flex-col items-center justify-center text-zinc-500 hover:text-white transition-all group"
                                title="View Guide"
                            >
                                <BookOpen className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                <span className="text-[8px] font-black mt-1 uppercase tracking-tighter">GUIDE</span>
                            </button>
                        </div>
                        <p className="text-[10px] text-zinc-600 text-center uppercase tracking-widest font-bold">
                            Estimated time: 30-45 seconds • Cost: 120 credits
                        </p>
                    </div>
                </div>
            </div>
            {/* Result Overlay */}
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

                        <div className="relative w-full max-w-[400px] aspect-[9/16] bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10">
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
                                onClick={() => handleDownload(generatedVideoUrl, `instant-clip-${Date.now()}.mp4`)}
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
        </div>
    );
}
