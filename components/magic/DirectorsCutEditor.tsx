'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Upload, X, Sparkles, Loader2, Play, Plus, Trash2, BookOpen, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface DirectorsCutEditorProps {
    onBack: () => void;
}

export function DirectorsCutEditor({ onBack }: DirectorsCutEditorProps) {
    const router = useRouter();
    const [startImage, setStartImage] = useState<string | null>(null);
    const [midImages, setMidImages] = useState<string[]>([]);
    const [endImage, setEndImage] = useState<string | null>(null);
    const [selectedFrame, setSelectedFrame] = useState<{ type: 'start' | 'mid' | 'end', index?: number }>({ type: 'start' });

    const [prompt, setPrompt] = useState('Create a smooth, cinematic transition between these frames.');
    const [duration, setDuration] = useState<4 | 8>(4);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [quality, setQuality] = useState('HD');
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

    const { deductCreditsOptimistic } = useAuth();

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'start' | 'mid' | 'end', index?: number) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const result = ev.target?.result as string;
            if (type === 'start') {
                setStartImage(result);
                setSelectedFrame({ type: 'start' });
            } else if (type === 'mid') {
                if (index !== undefined) {
                    setMidImages(prev => {
                        const next = [...prev];
                        next[index] = result;
                        return next;
                    });
                    setSelectedFrame({ type: 'mid', index });
                } else {
                    setMidImages(prev => [...prev, result]);
                    setSelectedFrame({ type: 'mid', index: midImages.length });
                }
            } else {
                setEndImage(result);
                setSelectedFrame({ type: 'end' });
            }
        };
        reader.readAsDataURL(file);
    };

    const removeMidImage = (index: number) => {
        setMidImages(prev => prev.filter((_, i) => i !== index));
        if (selectedFrame.type === 'mid' && selectedFrame.index === index) {
            setSelectedFrame({ type: 'start' });
        } else if (selectedFrame.type === 'mid' && selectedFrame.index !== undefined && selectedFrame.index > index) {
            setSelectedFrame({ type: 'mid', index: selectedFrame.index - 1 });
        }
    };

    const handleGenerate = async () => {
        if (!startImage || !endImage || isGenerating) return;
        setIsGenerating(true);
        setGenerationProgress(0);

        try {
            // Helper to upload base64 images
            const uploadImage = async (dataUrl: string, prefix: string) => {
                // If it's already a URL, return it
                if (dataUrl.startsWith('http')) return dataUrl;

                const blob = await fetch(dataUrl).then(r => r.blob());
                const fileName = `magic-video/inputs/${Date.now()}-${prefix}.png`;
                const { data, error } = await supabase.storage
                    .from('videos')
                    .upload(fileName, blob, { contentType: 'image/png' });

                if (error) throw error;
                const { data: { publicUrl } } = supabase.storage
                    .from('videos')
                    .getPublicUrl(fileName);
                return publicUrl;
            };

            setGenerationProgress(5);

            // Upload images
            const startUrl = await uploadImage(startImage, 'start');
            const endUrl = await uploadImage(endImage, 'end');
            const midUrls = await Promise.all(
                midImages.map((img, i) => uploadImage(img, `mid-${i}`))
            );

            setGenerationProgress(15);

            // Credits check (Optimistic)
            const cost = duration === 8 ? 55 : 30;
            if (deductCreditsOptimistic) {
                deductCreditsOptimistic(cost, "Director's Cut Generation");
            }

            // Get session for Auth
            const { data: { session } } = await supabase.auth.getSession();

            // Call API
            const response = await fetch('/api/magic-video/directors-cut', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    startImage: startUrl,
                    endImage: endUrl,
                    midImages: midUrls,
                    prompt: prompt || `Create a smooth transition based on the images, maintaining chronological order: Start -> Mid -> End.`, // Default if empty
                    duration,
                    aspectRatio
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Generation failing');
            }

            const data = await response.json();
            setGenerationProgress(20);

            if (data.taskId) {
                let completed = false;
                let attempts = 0;
                const maxAttempts = 90; // 3 minutes max

                while (!completed && attempts < maxAttempts) {
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

                if (!completed) throw new Error('Generation timed out');
            }
        } catch (e: any) {
            console.error(e);
            alert('Generation failed: ' + e.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const currentImage = selectedFrame.type === 'start'
        ? startImage
        : selectedFrame.type === 'end'
            ? endImage
            : selectedFrame.index !== undefined ? midImages[selectedFrame.index] : null;

    return (
        <div className="fixed inset-0 top-16 bg-transparent flex flex-col overflow-hidden">



            {/* Main Content Area */}
            <div className="flex-1 flex relative items-center justify-center px-20 pt-16 min-h-0 overflow-hidden">
                {/* Left Sidebar - Frame Slots */}
                <div className="absolute left-8 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-50">
                    <div className="flex flex-col gap-4 p-2 bg-zinc-900/60 backdrop-blur-md border border-white/10 rounded-2xl max-h-[70vh] overflow-y-auto custom-scrollbar pr-2 shadow-2xl">
                        {/* Start Frame Slot */}
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest px-1">Start</span>
                            <div
                                onClick={() => setSelectedFrame({ type: 'start' })}
                                className={`relative w-16 h-16 rounded-xl border transition-all cursor-pointer overflow-hidden ${selectedFrame.type === 'start' ? 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.2)]' : 'border-white/5 hover:border-white/10'}`}
                            >
                                {startImage ? (
                                    <img src={startImage} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-transparent flex items-center justify-center">
                                        <Plus className="w-4 h-4 text-zinc-700" />
                                    </div>
                                )}
                                <input type="file" className="hidden" id="start-upload" onChange={(e) => handleUpload(e, 'start')} />
                            </div>
                        </div>

                        {/* Mid Frame Slots */}
                        {midImages.map((img, i) => (
                            <div key={i} className="flex flex-col gap-1.5 group/slot relative">
                                <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest px-1">Mid {i + 1}</span>
                                <div
                                    onClick={() => setSelectedFrame({ type: 'mid', index: i })}
                                    className={`relative w-16 h-16 rounded-xl border transition-all cursor-pointer overflow-hidden ${selectedFrame.type === 'mid' && selectedFrame.index === i ? 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.2)]' : 'border-white/5 hover:border-white/10'}`}
                                >
                                    <img src={img} className="w-full h-full object-cover" />
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeMidImage(i); }}
                                        className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover/slot:opacity-100 transition-opacity hover:bg-red-500"
                                    >
                                        <X className="w-3 h-3 text-white" />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Add Mid Button */}
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest px-1">Add Mid</span>
                            <label className="relative w-16 h-16 rounded-xl border border-dashed border-white/10 hover:border-white/20 transition-all cursor-pointer flex items-center justify-center group/add">
                                <Plus className="w-5 h-5 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                                <input type="file" className="hidden" onChange={(e) => handleUpload(e, 'mid')} />
                            </label>
                        </div>

                        {/* End Frame Slot */}
                        <div className="flex flex-col gap-1.5">
                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest px-1">End</span>
                            <div
                                onClick={() => setSelectedFrame({ type: 'end' })}
                                className={`relative w-16 h-16 rounded-xl border transition-all cursor-pointer overflow-hidden ${selectedFrame.type === 'end' ? 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.2)]' : 'border-white/5 hover:border-white/10'}`}
                            >
                                {endImage ? (
                                    <img src={endImage} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-transparent flex items-center justify-center">
                                        <Plus className="w-4 h-4 text-zinc-700" />
                                    </div>
                                )}
                                <input type="file" className="hidden" id="end-upload" onChange={(e) => handleUpload(e, 'end')} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative w-full h-full flex items-center justify-center py-12">
                    <div className="relative aspect-video w-full max-w-4xl rounded-3xl overflow-hidden bg-transparent">
                        {currentImage ? (
                            <div className="relative w-full h-full group">
                                <img src={currentImage} className="w-full h-full object-contain" />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <label className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 cursor-pointer hover:bg-white/20 transition-all flex items-center gap-3">
                                        <Upload className="w-5 h-5 text-white" />
                                        <span className="text-sm font-bold text-white">Replace {selectedFrame.type === 'mid' ? `Middle ${selectedFrame.index! + 1}` : selectedFrame.type.charAt(0).toUpperCase() + selectedFrame.type.slice(1)} Frame</span>
                                        <input type="file" className="hidden" onChange={(e) => handleUpload(e, selectedFrame.type, selectedFrame.index)} />
                                    </label>
                                </div>
                            </div>
                        ) : (
                            <label className="w-full h-full flex flex-col items-center justify-center gap-6 cursor-pointer hover:bg-white/[0.02] transition-colors group">
                                <input type="file" className="hidden" onChange={(e) => handleUpload(e, selectedFrame.type, selectedFrame.index)} />
                                <div className="w-20 h-20 rounded-full bg-white/[0.03] flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform">
                                    <Upload className="w-8 h-8 text-zinc-500" />
                                </div>
                                <div className="text-center">
                                    <p className="text-lg font-bold text-white mb-1">Select {selectedFrame.type.toUpperCase()}{selectedFrame.type === 'mid' ? ` ${selectedFrame.index! + 1}` : ''} Frame</p>
                                    <p className="text-sm text-zinc-500">{selectedFrame.type === 'start' ? 'Pick an image to start the transition' : selectedFrame.type === 'end' ? 'Pick an image to end the transition' : 'Pick a middle frame for the transition'}</p>
                                </div>
                            </label>
                        )}
                    </div>
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

                        <div className="relative w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10">
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
                                onClick={() => {
                                    const a = document.createElement('a');
                                    a.href = generatedVideoUrl;
                                    a.download = `directors-cut-${Date.now()}.mp4`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                }}
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

            {/* Bottom Panel (Floating Prompt Bar) */}
            <div className="p-3 md:pb-4 relative z-50 shrink-0">
                <div className="max-w-3xl mx-auto">
                    <div className="bg-zinc-900/60 backdrop-blur-md rounded-xl p-1.5 flex flex-col gap-1.5 border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.05)]">
                        <div className="flex gap-2">
                            <div className="flex-1 bg-transparent rounded-lg p-2">
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    className="w-full bg-transparent border-none focus:ring-0 text-xs text-white placeholder-zinc-500 resize-none h-6 custom-scrollbar leading-tight focus:bg-transparent"
                                    placeholder="Describe the video... (Auto-Prompt Active: Chronological Flow & Cinematic Lighting)"
                                />
                            </div>

                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || !startImage || !endImage}
                                className="w-40 bg-white/5 hover:bg-white/10 backdrop-blur-md disabled:bg-transparent disabled:text-zinc-700 text-orange-500 border border-orange-500/30 hover:border-orange-500/60 font-bold text-[10px] rounded-lg transition-all flex flex-col items-center justify-center gap-0.5 shadow-lg shadow-orange-500/10"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>{generationProgress}%</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="flex items-center gap-1 text-[10px]">
                                            GENERATE CUT
                                            <span className="bg-orange-500/20 text-orange-200 px-1 rounded text-[8px] border border-orange-500/30">AUTO</span>
                                        </span>
                                        <span className="text-[7px] opacity-40">COST: {duration === 8 ? 55 : 30} CR</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Control Badges */}
                        <div className="flex items-center justify-between px-2 pb-1">
                            <div className="flex items-center gap-2">
                                <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
                                    {[4, 8].map((d) => (
                                        <button
                                            key={d}
                                            onClick={() => {
                                                const oldVal = `${duration}s duration`;
                                                const newVal = `${d}s duration`;
                                                setDuration(d as 4 | 8);
                                                setPrompt(prev => {
                                                    if (!prev) return newVal;
                                                    if (prev.includes(oldVal)) return prev.replace(oldVal, newVal);
                                                    if (prev.includes(`${d}s`)) return prev;
                                                    return `${prev}, ${newVal}`;
                                                });
                                            }}
                                            className={`px-4 py-1.5 rounded-lg text-[9px] font-black transition-all ${duration === d ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-white'}`}
                                        >
                                            {d}s
                                        </button>
                                    ))}
                                </div>

                                <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
                                    {['16:9', '9:16', '1:1', '4:3', '21:9'].map((ratio) => (
                                        <button
                                            key={ratio}
                                            onClick={() => {
                                                const oldVal = `${aspectRatio} aspect ratio`;
                                                const newVal = `${ratio} aspect ratio`;
                                                setAspectRatio(ratio);
                                                setPrompt(prev => {
                                                    if (!prev) return newVal;
                                                    if (prev.includes(oldVal)) return prev.replace(oldVal, newVal);
                                                    if (prev.includes(ratio)) return prev;
                                                    return `${prev}, ${newVal}`;
                                                });
                                            }}
                                            className={`px-4 py-1.5 rounded-lg text-[9px] font-black transition-all ${aspectRatio === ratio ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-white'}`}
                                        >
                                            {ratio}
                                        </button>
                                    ))}
                                </div>

                            </div>

                            <div className="flex items-center gap-2">
                                {/* GUIDE button */}
                                <button
                                    onClick={() => router.push('/guide/directors-cut')}
                                    className="text-[9px] font-black text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-widest flex items-center gap-1"
                                    title="View Guide"
                                >
                                    <BookOpen className="w-3 h-3" />
                                    GUIDE
                                </button>

                                <label className="text-[9px] font-black text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-widest flex items-center gap-2 cursor-pointer">
                                    <Plus className="w-3 h-3" />
                                    ADD MID FRAME
                                    <input type="file" className="hidden" onChange={(e) => handleUpload(e, 'mid')} />
                                </label>
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
        </div>
    );
}
