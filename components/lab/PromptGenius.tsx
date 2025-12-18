
'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Upload, Sparkles, Loader2, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PromptGeniusProps {
    onApply?: (data: { prompt: string; description: string }) => void;
}

export function PromptGenius({ onApply }: PromptGeniusProps) {
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [context, setContext] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setVideoFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleGenerate = async () => {
        if (!videoFile) return;

        setIsGenerating(true);
        const formData = new FormData();
        formData.append('video', videoFile);
        formData.append('context', context);

        try {
            const res = await fetch('/api/lab/gen-prompt', {
                method: 'POST',
                body: formData
            });
            const json = await res.json();

            if (json.success) {
                setResult(json.data);
            } else {
                alert('Analysis failed: ' + json.error);
            }
        } catch (e) {
            console.error(e);
            alert('Error generating prompt');
        } finally {
            setIsGenerating(false);
        }
    };

    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Prompt Genius</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* LEFT: Inputs */}
                <div className="space-y-4">

                    {/* Video Upload */}
                    <div className="relative aspect-video bg-black rounded-lg border-2 border-dashed border-zinc-800 hover:border-purple-500/50 transition-colors overflow-hidden group">
                        {previewUrl ? (
                            <video src={previewUrl} className="w-full h-full object-cover" controls />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 pointer-events-none">
                                <Upload className="w-8 h-8 mb-2" />
                                <span className="text-xs">Upload Reference Video</span>
                            </div>
                        )}
                        <input
                            type="file"
                            accept="video/*"
                            onChange={handleFileChange}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                    </div>

                    {/* Context Input */}
                    <div>
                        <label className="text-xs text-zinc-400 mb-1 block">What is the object currently in the video? (Optional context)</label>
                        <input
                            type="text"
                            value={context}
                            onChange={(e) => setContext(e.target.value)}
                            placeholder="e.g. A bottle of red wine"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                        />
                    </div>

                    <Button
                        onClick={handleGenerate}
                        disabled={!videoFile || isGenerating}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Analyzing Physics & Light...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4 mr-2" />
                                Generate Magic Prompt
                            </>
                        )}
                    </Button>
                </div>

                {/* RIGHT: Results */}
                <div className="space-y-4">
                    <AnimatePresence mode="wait">
                        {result ? (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-4"
                            >
                                {/* Skeleton Prompt */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-xs text-zinc-400">
                                        <span className="font-bold text-purple-400">TEMPLATE PROMPT (Product Swap)</span>
                                        <button
                                            onClick={() => copyToClipboard(result.skeleton_prompt, 'prompt')}
                                            className="hover:text-white flex items-center gap-1"
                                        >
                                            {copiedField === 'prompt' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                            {copiedField === 'prompt' ? 'Copied' : 'Copy'}
                                        </button>
                                    </div>
                                    <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 text-sm text-zinc-300 leading-relaxed font-mono">
                                        {result.skeleton_prompt}
                                    </div>
                                </div>

                                {/* Technical Analysis */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-xs text-zinc-400">
                                        <span className="font-bold text-blue-400">TECHNICAL / HIDDEN PROMPT</span>
                                        <button
                                            onClick={() => copyToClipboard(result.technical_analysis, 'tech')}
                                            className="hover:text-white flex items-center gap-1"
                                        >
                                            {copiedField === 'tech' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                            {copiedField === 'tech' ? 'Copied' : 'Copy'}
                                        </button>
                                    </div>
                                    <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 text-sm text-zinc-400">
                                        {result.technical_analysis}
                                    </div>
                                </div>

                                {/* Action Detection */}
                                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                                    <span className="text-xs text-green-400 font-bold block mb-1">DETECTED ACTION</span>
                                    <p className="text-sm text-green-300">{result.detected_object_action}</p>
                                </div>

                                {onApply && (
                                    <Button
                                        onClick={() => onApply({
                                            prompt: result.skeleton_prompt,
                                            description: result.technical_analysis
                                        })}
                                        className="w-full bg-zinc-800 hover:bg-zinc-700 text-white"
                                    >
                                        Use in Template Form
                                    </Button>
                                )}

                            </motion.div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-zinc-600 border-2 border-dashed border-zinc-800 rounded-xl min-h-[300px]">
                                <Sparkles className="w-12 h-12 mb-4 opacity-20" />
                                <p className="text-sm">Upload a video to awake the genius.</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
