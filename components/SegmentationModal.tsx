'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect, useCallback } from 'react';
import { MousePointer2, Check, X, Undo2, Zap, RefreshCcw, AlertTriangle, Layers } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface SegmentationModalProps {
    isOpen: boolean;
    imageSource: string; // Base64 or URL
    initialMask?: string | null;
    onClose: () => void;
    onConfirm: (maskUrl: string | null, points?: { x: number, y: number, label: number }[], maskIndex?: number, trackingDuration?: number) => void;
    videoDuration?: number; // Optional: If provided, shows tracking slider
}

// Processing resolution (match SAM 2 sweet spot)
const PROCESS_MAX_DIM = 1024;

export function SegmentationModal({ isOpen, imageSource, initialMask, videoDuration, onClose, onConfirm }: SegmentationModalProps) {
    // --- Canvas & Core State ---
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [processedImage, setProcessedImage] = useState<string | null>(null); // The resized base64 sent to API
    const [processedDims, setProcessedDims] = useState<{ w: number, h: number } | null>(null);

    // --- Selection State ---
    const [points, setPoints] = useState<{ x: number, y: number, label: number }[]>([]);
    const [segmentMask, setSegmentMask] = useState<string | null>(initialMask || null); // Mask URL

    // --- Queue & Rate Limiting ---
    const [isSegmenting, setIsSegmenting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const isRequestInFlight = useRef(false);
    const pendingPoints = useRef<{ x: number, y: number, label: number }[] | null>(null);
    const rateLimitDelayTimeout = useRef<NodeJS.Timeout | null>(null);

    // --- History/Variants ---
    const [availableMasks, setAvailableMasks] = useState<string[]>([]);

    // --- Tracking (Video Only) ---
    const [trackEnd, setTrackEnd] = useState<number>(videoDuration || 0);

    useEffect(() => {
        if (videoDuration) setTrackEnd(videoDuration);
    }, [videoDuration]);

    // 1. Initialize & Resize Image
    useEffect(() => {
        if (!isOpen || !imageSource) return;

        // Reset State
        setPoints([]);
        setSegmentMask(initialMask || null);
        setAvailableMasks([]);
        setProcessedImage(null);
        setErrorMsg(null);
        isRequestInFlight.current = false;
        pendingPoints.current = null;

        const img = new Image();
        img.crossOrigin = "anonymous"; // Fix Tainted Canvas error
        img.src = imageSource;
        img.onload = () => {
            // Calculate Resize (preserve aspect ratio)
            let w = img.naturalWidth;
            let h = img.naturalHeight;
            let scale = 1;

            if (w > PROCESS_MAX_DIM || h > PROCESS_MAX_DIM) {
                if (w > h) {
                    scale = PROCESS_MAX_DIM / w;
                    w = PROCESS_MAX_DIM;
                    h = h * scale;
                } else {
                    scale = PROCESS_MAX_DIM / h;
                    h = PROCESS_MAX_DIM;
                    w = w * scale;
                }
            }

            w = Math.floor(w);
            h = Math.floor(h);

            const offCanvas = document.createElement('canvas');
            offCanvas.width = w;
            offCanvas.height = h;
            const ctx = offCanvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, w, h);

            setProcessedImage(offCanvas.toDataURL('image/jpeg', 0.8));
            setProcessedDims({ w, h });
        };
    }, [isOpen, imageSource]);

    // 2. Render Loop (Draw Canvas)
    useEffect(() => {
        if (!isOpen || !processedImage || !processedDims || !canvasRef.current || !containerRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.src = processedImage;
        img.onload = () => {
            const container = containerRef.current!;
            const maxWidth = container.clientWidth;
            const maxHeight = container.clientHeight;

            const ratio = processedDims.w / processedDims.h;
            let displayW = maxWidth;
            let displayH = maxWidth / ratio;

            if (displayH > maxHeight) {
                displayH = maxHeight;
                displayW = displayH * ratio;
            }

            canvas.width = processedDims.w;
            canvas.height = processedDims.h;

            canvas.style.width = `${displayW}px`;
            canvas.style.height = `${displayH}px`;

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, processedDims.w, processedDims.h);

            if (segmentMask) {
                const maskImg = new Image();
                maskImg.src = segmentMask;
                maskImg.onload = () => {
                    ctx.globalAlpha = 0.6;
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.drawImage(maskImg, 0, 0, processedDims.w, processedDims.h);
                    ctx.globalAlpha = 1.0;
                    drawPoints(ctx);
                };
                maskImg.onerror = () => { drawPoints(ctx); };
            } else {
                drawPoints(ctx);
            }
        };

        const drawPoints = (context: CanvasRenderingContext2D) => {
            if (points.length === 0) return;

            points.forEach(p => {
                context.beginPath();
                context.arc(p.x, p.y, 8, 0, 2 * Math.PI);
                context.fillStyle = '#22c55e'; // Always green now
                context.strokeStyle = 'white';
                context.lineWidth = 2;
                context.fill();
                context.stroke();
            });
        };

    }, [processedImage, processedDims, segmentMask, points, isOpen]);

    // 3. Queue Logic
    const triggerSegmentationQueue = useCallback(async (currentPoints: typeof points) => {
        // Update pending points purely to enable "collapsing" requests
        pendingPoints.current = currentPoints;

        if (isRequestInFlight.current) {
            // Already busy, do nothing. pendingPoints will be picked up when current job finishes.
            return;
        }

        // Start processing
        processQueue();
    }, [processedImage]);

    const processQueue = async () => {
        if (!pendingPoints.current || !processedImage) {
            isRequestInFlight.current = false;
            setIsSegmenting(false);
            return;
        }

        isRequestInFlight.current = true;
        setIsSegmenting(true);
        setErrorMsg(null);

        // Sanclture current batch
        const batchPoints = pendingPoints.current;
        pendingPoints.current = null; // Clear pending so we can detect new clicks during await

        try {
            const response = await fetch('/api/segment-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageUrl: processedImage,
                    points: batchPoints
                })
                // No Abort signal! We let it finish to not waste Rate Limits.
            });

            if (response.status === 429) {
                setErrorMsg("Quota Exceeded (Wait 10s)");
                // Backoff and retry? Or just stop queue?
                // Better to just stop and let user click again or wait.
                // But let's pause the queue for 5 seconds to avoid spam loop.
                await new Promise(r => setTimeout(r, 5000));
            } else if (!response.ok) {
                const errText = await response.text();
                let errMsg = `${response.status}`;
                try {
                    const jsonErr = JSON.parse(errText);
                    if (jsonErr.details) errMsg += `: ${jsonErr.details}`;
                    else if (jsonErr.error) errMsg += `: ${jsonErr.error}`;
                } catch {
                    errMsg += `: ${errText.slice(0, 100)}`;
                }
                console.error("API Error Response:", errText);
                throw new Error(errMsg);
            } else {
                const data = await response.json();
                if (data.success) {
                    console.log('SAM2 Raw JSON:', JSON.stringify(data.result, null, 2));
                    // Handle various Replicate output formats (string, array of strings, array of objects)
                    let results = Array.isArray(data.result) ? data.result : [data.result];

                    // Normalize to strings
                    results = results.map((r: any) => {
                        if (typeof r === 'string') return r;
                        if (typeof r === 'object') {
                            // Try all common keys
                            return r?.url || r?.output || r?.mask || r?.image || r?.segmentation || null;
                        }
                        return null;
                    }).filter(Boolean);

                    if (results.length > 0) {
                        setAvailableMasks(results);
                        setSegmentMask(results[0]);
                    } else {
                        console.error('Unexpected SAM2 result format (Detailed):', JSON.stringify(data.result));

                        // Fallback: If it's an object with ANY string values, try to grab the first one
                        if (Array.isArray(data.result) && data.result.length > 0) {
                            const firstResult = data.result[0];
                            if (typeof firstResult === 'object') {
                                const firstVal = Object.values(firstResult).find(v => typeof v === 'string' && (v as string).startsWith('http'));
                                if (firstVal) {
                                    const url = firstVal as string;
                                    console.log('Found fallback URL:', url);
                                    setSegmentMask(url);
                                }
                            }
                        }
                    }
                }
            }

        } catch (e) {
            console.error(e);
            if (!errorMsg) setErrorMsg("Retrying...");
        } finally {
            // Check if more points arrived while we were busy
            if (pendingPoints.current) {
                // Wait a small delay to be polite to the API rate limit (e.g. 1s)
                setTimeout(() => {
                    processQueue();
                }, 1000); // 1.5s delay between sequential calls
            } else {
                isRequestInFlight.current = false;
                setIsSegmenting(false);
            }
        }
    };

    // 4. Interaction
    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!processedDims) return;

        e.preventDefault();
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const safeX = Math.max(0, Math.min(x, processedDims.w - 1));
        const safeY = Math.max(0, Math.min(y, processedDims.h - 1));
        const label = 1;

        // Update UI Immediately
        const newPoints = [...points, { x: safeX, y: safeY, label }];
        setPoints(newPoints);

        // Push to Queue
        triggerSegmentationQueue(newPoints);
    };

    const handleUndo = () => {
        const newPts = points.slice(0, -1);
        setPoints(newPts);
        if (newPts.length > 0) triggerSegmentationQueue(newPts);
        else {
            setSegmentMask(null);
            pendingPoints.current = null; // Cancel pending if empty
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4"
                >
                    <div className="w-full max-w-5xl h-[90vh] flex flex-col">
                        {/* Header */}
                        <div className="flex justify-between items-center mb-4 shrink-0">
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-orange-500" />
                                    Click to Select Product
                                </h2>
                                <p className="text-xs text-zinc-400">
                                    Click points on the product. The AI will learn and refine.
                                </p>
                            </div>
                            <Button variant="ghost" onClick={onClose}><X className="w-5 h-5" /></Button>
                        </div>

                        {/* Interactive Canvas Area */}

                        <div ref={containerRef} className="flex-1 bg-zinc-900/50 rounded-xl border border-white/10 relative overflow-hidden flex items-center justify-center">
                            {!processedImage && (
                                <div className="absolute inset-0 flex items-center justify-center text-zinc-500 animate-pulse">
                                    Preparing Image...
                                </div>
                            )}

                            <canvas
                                ref={canvasRef}
                                onMouseDown={handleCanvasClick}
                                onContextMenu={(e) => e.preventDefault()}
                                className="cursor-crosshair shadow-2xl rounded-lg"
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                    objectFit: 'contain'
                                }}
                            />

                            {/* Status Overlay */}
                            {(isSegmenting || errorMsg) && (
                                <div className="absolute top-4 right-4 bg-black/80 backdrop-blur px-4 py-2 rounded-full flex items-center gap-3 border border-white/20 pointer-events-none shadow-xl">
                                    {errorMsg ? (
                                        <>
                                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                                            <span className="text-xs text-yellow-200 font-medium">{errorMsg}</span>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-3 h-3 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                                            <span className="text-xs text-white">Thinking...</span>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Video Tracking Slider (If videoDuration provided) */}
                        {videoDuration && videoDuration > 0 && (
                            <div className="mt-4 bg-zinc-900/50 p-4 rounded-xl border border-white/10 shrink-0">
                                <div className="flex justify-between text-xs text-zinc-400 mb-2">
                                    <span className="font-semibold text-white">Tracking Duration</span>
                                    <span>Track until: <span className="text-orange-500 font-bold">{trackEnd.toFixed(1)}s</span> / {videoDuration.toFixed(1)}s</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max={videoDuration}
                                    step="0.1"
                                    value={trackEnd}
                                    onChange={(e) => setTrackEnd(parseFloat(e.target.value))}
                                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                                />
                                <p className="text-[10px] text-zinc-500 mt-1">
                                    The AI will track the selected object from 0s to {trackEnd.toFixed(1)}s.
                                </p>
                            </div>
                        )}

                        {/* Actions Footer */}
                        <div className="mt-4 shrink-0 flex gap-4 justify-end items-center">
                            <Button type="button" variant="ghost" onClick={() => {
                                setPoints([]);
                                setSegmentMask(null);
                                pendingPoints.current = null;
                            }} disabled={points.length === 0}>
                                <RefreshCcw className="w-4 h-4 mr-2" /> Reset
                            </Button>

                            <Button type="button" variant="ghost" onClick={handleUndo} disabled={points.length === 0}>
                                <Undo2 className="w-4 h-4 mr-2" /> Undo
                            </Button>

                            <div className="flex-1 flex justify-center">
                                {availableMasks.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => {
                                            const currentIndex = availableMasks.indexOf(segmentMask || '');
                                            const nextIndex = (currentIndex + 1) % availableMasks.length;
                                            setSegmentMask(availableMasks[nextIndex]);
                                        }}
                                        className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-600"
                                    >
                                        <Layers className="w-3 h-3 mr-2" />
                                        Try Alternate Mask ({availableMasks.indexOf(segmentMask || '') + 1}/{availableMasks.length})
                                    </Button>
                                )}
                            </div>

                            <Button type="button" onClick={() => onConfirm(null)} variant="outline" className="border-zinc-700 hover:bg-zinc-800 mr-2">
                                Skip Masking
                            </Button>

                            <Button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('✅ [Modal] Done Clicked');
                                    const idx = availableMasks.indexOf(segmentMask || '');
                                    const finalIdx = idx !== -1 ? idx : 0;
                                    console.log('✅ [Modal] Calling onConfirm with:', { segmentMask, pointsCount: points.length, finalIdx, trackEnd });
                                    onConfirm(segmentMask, points, finalIdx, trackEnd);
                                }}
                                disabled={!segmentMask && points.length === 0}
                                className="bg-orange-600 hover:bg-orange-700 min-w-[140px]"
                            >
                                <Check className="w-4 h-4 mr-2" />
                                Done
                            </Button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
