
'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Image as ImageIcon, Volume2, VolumeX } from 'lucide-react';
import Image from 'next/image';

interface BeforeAfterVideoSliderProps {
    beforeVideoUrl?: string | null;
    afterVideoUrl?: string | null;
    beforeImageUrl?: string | null;
    afterImageUrl?: string | null;
    className?: string;
    // New Props for Base Toggle
    baseMode?: 'reference' | 'product';
    onBaseModeChange?: (mode: 'reference' | 'product') => void;
    showBaseToggle?: boolean;
    // Compare button
    onCompareClick?: () => void;
}

export function BeforeAfterVideoSlider({
    beforeVideoUrl,
    afterVideoUrl,
    beforeImageUrl,
    afterImageUrl,
    className = '',
    baseMode = 'reference',
    onBaseModeChange,
    showBaseToggle = false,
    onCompareClick
}: BeforeAfterVideoSliderProps) {
    const [sliderPosition, setSliderPosition] = useState(50); // 0-100%
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [isHovering, setIsHovering] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const beforeVideoRef = useRef<HTMLVideoElement>(null);
    const afterVideoRef = useRef<HTMLVideoElement>(null);

    // Determine what to show for each layer
    const beforeSrc = beforeVideoUrl || beforeImageUrl;
    const afterSrc = afterVideoUrl || afterImageUrl;

    const isBeforeVideo = !!beforeVideoUrl;
    const isAfterVideo = !!afterVideoUrl;
    const hasAnyVideo = isBeforeVideo || isAfterVideo;

    // Handle Hover Interaction
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
        setSliderPosition(percentage);
        setIsHovering(true);
    };

    const handleMouseLeave = () => {
        setIsHovering(false);
        setSliderPosition(50); // Optional: Reset to center on leave, or keep last position
    };

    // Sync video playback
    const togglePlayPause = async () => {
        const bVideo = beforeVideoRef.current;
        const aVideo = afterVideoRef.current;

        // If currently playing, we want to pause
        if (isPlaying) {
            if (bVideo) bVideo.pause();
            if (aVideo) aVideo.pause();
            setIsPlaying(false);
        } else {
            // If currently paused, we want to play
            // Reset to sync if significant drift? 
            // For now just play both
            try {
                const promises = [];
                if (bVideo) promises.push(bVideo.play());
                if (aVideo) promises.push(aVideo.play());

                await Promise.allSettled(promises);
                setIsPlaying(true);
            } catch (e) {
                console.error("Playback failed", e);
                // Even if one fails, we set state to what we attempted? 
                // Better to set isPlaying to true if at least one works
                setIsPlaying(true);
            }
        }
    };

    const toggleMute = () => {
        setIsMuted(!isMuted);
    };

    // Auto-sync mute/volume state
    useEffect(() => {
        if (beforeVideoRef.current) beforeVideoRef.current.muted = isMuted;
        if (afterVideoRef.current) afterVideoRef.current.muted = isMuted;
    }, [isMuted]);

    // Sync video times
    const handleTimeUpdate = () => {
        if (!beforeVideoRef.current || !afterVideoRef.current) return;
        const timeDiff = Math.abs(beforeVideoRef.current.currentTime - afterVideoRef.current.currentTime);
        if (timeDiff > 0.1) {
            afterVideoRef.current.currentTime = beforeVideoRef.current.currentTime;
        }
    };

    // Render helper
    const renderMedia = (isTopLayer: boolean) => {
        const isVideo = isTopLayer ? isAfterVideo : isBeforeVideo;
        const src = isTopLayer ? afterSrc : beforeSrc;
        const ref = isTopLayer ? afterVideoRef : beforeVideoRef;
        const videoSrc = isTopLayer ? afterVideoUrl : beforeVideoUrl;

        if (!src) {
            return (
                <div className="absolute inset-0 w-full h-full bg-transparent flex items-center justify-center">
                    <span className="text-zinc-600 font-mono text-xs p-4 text-center">
                        {isTopLayer ? "After" : "Before"} Empty
                    </span>
                </div>
            );
        }

        if (isVideo && videoSrc) {
            return (
                <video
                    ref={ref}
                    src={videoSrc}
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none" // pointer-events-none is key for hover passthrough
                    loop
                    playsInline
                    muted={isMuted}
                    onTimeUpdate={!isTopLayer ? handleTimeUpdate : undefined}
                />
            );
        } else {
            return (
                <div className="absolute inset-0 w-full h-full pointer-events-none !bg-transparent">
                    <Image
                        src={src}
                        alt={isTopLayer ? "After" : "Before"}
                        fill
                        className="object-contain !bg-transparent"
                    />
                </div>
            );
        }
    };

    // Auto-play on mount
    useEffect(() => {
        const attemptPlay = async () => {
            try {
                if (beforeVideoRef.current) await beforeVideoRef.current.play();
                if (afterVideoRef.current) await afterVideoRef.current.play();
                setIsPlaying(true);
            } catch (e) {
                console.log("Autoplay blocked, paused");
                setIsPlaying(false);
            }
        }
        if (hasAnyVideo) attemptPlay();
    }, [hasAnyVideo]);


    const sliderNavStyle = { left: `${sliderPosition}%`, top: 0, bottom: 0, width: '2px', cursor: 'ew-resize' };

    return (
        <div className={`flex flex-col gap-4 w-full h-full ${className}`}>

            {/* Main Video Container */}
            <div
                className="relative overflow-hidden rounded-2xl bg-transparent w-full flex-1 flex items-center justify-center border border-white/5 shadow-2xl cursor-crosshair group"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                ref={containerRef}
            >
                <div className="relative w-full h-full mx-auto bg-transparent">

                    {/* Before Media (Background Layer) */}
                    {renderMedia(false)}

                    {/* After Media (Top Layer, Clipped) */}
                    <div
                        className="absolute inset-0 overflow-hidden pointer-events-none bg-transparent"
                        style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }} // Shows right part
                    >
                        {renderMedia(true)}
                    </div>

                    {/* Slider Line */}
                    <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white z-20 pointer-events-none shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                        style={{ left: `${sliderPosition}%` }}
                    />

                    {/* Labels */}
                    <div className={`absolute top-4 left-4 pointer-events-none transition-opacity duration-300 ${isHovering ? 'opacity-0' : 'opacity-100'}`}>
                        <span className="bg-black/50 text-white text-[10px] uppercase font-bold px-2 py-1 rounded backdrop-blur-sm tracking-wider">Original</span>
                    </div>
                    <div className={`absolute bottom-4 right-4 pointer-events-none transition-opacity duration-300 ${isHovering ? 'opacity-0' : 'opacity-100'}`}>
                        <span className="bg-white/90 text-black text-[10px] uppercase font-bold px-2 py-1 rounded backdrop-blur-sm tracking-wider shadow-lg">Generated</span>
                    </div>

                </div>
            </div>

            {/* Controls Below - Spread across bottom */}
            <div className="flex items-center justify-between w-full">
                {/* Left: Base Toggle + Compare Button */}
                <div className="flex flex-col gap-2 min-w-[200px]">
                    {showBaseToggle && onBaseModeChange && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => onBaseModeChange('reference')}
                                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${baseMode === 'reference' ? 'text-white' : 'text-zinc-500 hover:text-white'}`}
                            >
                                Reference
                            </button>
                            <button
                                onClick={() => onBaseModeChange('product')}
                                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${baseMode === 'product' ? 'text-white' : 'text-zinc-500 hover:text-white'}`}
                            >
                                Product
                            </button>
                        </div>
                    )}
                    {onCompareClick && (
                        <button
                            onClick={onCompareClick}
                            className="px-4 py-2 bg-purple-500/90 hover:bg-purple-500 text-white font-bold uppercase text-[10px] tracking-wider rounded-md shadow-lg transition-all"
                        >
                            Compare
                        </button>
                    )}
                </div>

                {/* Center: Play/Pause Button */}
                {hasAnyVideo && (
                    <button
                        onClick={togglePlayPause}
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white hover:text-zinc-300 transition-all"
                    >
                        {isPlaying ? (
                            <Pause className="w-5 h-5 fill-current" />
                        ) : (
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                        )}
                    </button>
                )}

                {/* Right: Mute/Unmute Button */}
                <div className="flex items-center gap-2 justify-end min-w-[140px]">
                    {hasAnyVideo && (
                        <button
                            onClick={toggleMute}
                            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${isMuted ? 'text-zinc-500 hover:text-white' : 'text-white hover:text-zinc-300'}`}
                        >
                            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
