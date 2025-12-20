'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface BeforeAfterVideoSliderProps {
    beforeVideoUrl: string;
    afterVideoUrl: string;
    beforePosterUrl?: string;
    afterPosterUrl?: string;
    className?: string;
}

export function BeforeAfterVideoSlider({
    beforeVideoUrl,
    afterVideoUrl,
    beforePosterUrl,
    afterPosterUrl,
    className = ''
}: BeforeAfterVideoSliderProps) {
    const [sliderPosition, setSliderPosition] = useState(50); // 0-100%
    const [isDragging, setIsDragging] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showLabels, setShowLabels] = useState(true); // Control label visibility
    const [isHovering, setIsHovering] = useState(false); // Control hover state
    const [isMuted, setIsMuted] = useState(false); // If it plays, it should play with sound
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const beforeVideoRef = useRef<HTMLVideoElement>(null);
    const afterVideoRef = useRef<HTMLVideoElement>(null);

    // Handle drag events
    const handleMouseDown = () => {
        setIsDragging(true);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
        setSliderPosition(percentage);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Touch events for mobile
    const handleTouchMove = (e: TouchEvent) => {
        if (!isDragging || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = e.touches[0].clientX - rect.left;
        const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
        setSliderPosition(percentage);
    };

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.addEventListener('touchmove', handleTouchMove);
            document.addEventListener('touchend', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleMouseUp);
        };
    }, [isDragging]);

    const syncMuteState = () => {
        if (!beforeVideoRef.current || !afterVideoRef.current) return;
        // To avoid echo, only the BEFORE video can have audio.
        beforeVideoRef.current.muted = isMuted;
        beforeVideoRef.current.volume = isMuted ? 0 : 1;
        afterVideoRef.current.muted = true;
        afterVideoRef.current.volume = 0;
    };

    useEffect(() => {
        syncMuteState();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isMuted]);

    const playWithSound = async () => {
        if (!beforeVideoRef.current || !afterVideoRef.current) return;
        try {
            setIsMuted(false);
            syncMuteState();
            await beforeVideoRef.current.play();
            await afterVideoRef.current.play();
            setIsPlaying(true);
        } catch {
            // If the browser blocks playback, user can try again (or use native controls if enabled elsewhere).
        }
    };

    const togglePlayPause = async () => {
        if (!beforeVideoRef.current || !afterVideoRef.current) return;

        if (isPlaying) {
            beforeVideoRef.current.pause();
            afterVideoRef.current.pause();
            setIsPlaying(false);
            return;
        }

        // Start playback with sound (requires user gesture; click on the player/button is a gesture).
        await playWithSound();
    };

    // Sync video times
    const handleTimeUpdate = () => {
        if (!beforeVideoRef.current || !afterVideoRef.current) return;

        // Keep videos in sync
        const timeDiff = Math.abs(beforeVideoRef.current.currentTime - afterVideoRef.current.currentTime);
        if (timeDiff > 0.1) {
            afterVideoRef.current.currentTime = beforeVideoRef.current.currentTime;
        }
    };

    // Handle video end
    const handleVideoEnd = () => {
        setIsPlaying(false);
        if (beforeVideoRef.current && afterVideoRef.current) {
            beforeVideoRef.current.currentTime = 0;
            afterVideoRef.current.currentTime = 0;
        }
    };

    return (
        <div className={`relative overflow-hidden rounded-2xl bg-zinc-900 ${className}`}>
            <div
                ref={containerRef}
                className="relative w-full max-w-[420px] mx-auto"
                style={{
                    aspectRatio: '9/16',
                    maxHeight: '70vh',
                }}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                onClick={() => {
                    // user gesture: allow unmute
                    if (isMuted) setIsMuted(false);
                }}
            >
                {/* After Video (Background Layer) */}
                <video
                    ref={afterVideoRef}
                    src={afterVideoUrl}
                    poster={afterPosterUrl}
                    className="absolute inset-0 w-full h-full object-cover"
                    loop
                    playsInline
                    preload="metadata"
                    muted
                    onEnded={handleVideoEnd}
                    onLoadedMetadata={() => setIsLoaded(true)}
                    onError={() => { setHasError(true); setIsLoaded(true); }}
                />

                {/* Before Video (Clipped Layer) */}
                <div
                    className="absolute inset-0 overflow-hidden"
                    style={{
                        clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
                    }}
                >
                    <video
                        ref={beforeVideoRef}
                        src={beforeVideoUrl}
                        poster={beforePosterUrl}
                        className="absolute inset-0 w-full h-full object-cover"
                        loop
                        playsInline
                        preload="metadata"
                        muted={isMuted}
                        onTimeUpdate={handleTimeUpdate}
                        onEnded={handleVideoEnd}
                        onLoadedMetadata={() => setIsLoaded(true)}
                        onError={() => { setHasError(true); setIsLoaded(true); }}
                    />
                </div>

                {/* Slider Line - Only visible on hover or while dragging */}
                <div
                    className={`absolute top-0 bottom-0 w-0.5 bg-white/80 cursor-ew-resize z-20 transition-opacity duration-300 ${isHovering || isDragging ? 'opacity-100' : 'opacity-0'
                        }`}
                    style={{ left: `${sliderPosition}%` }}
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleMouseDown}
                />

                {/* Labels - Conditional - MOVED HIGHER */}
                {showLabels && (
                    <>
                        <div className="absolute top-6 left-4 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-white text-xs font-semibold z-10">
                            Before
                        </div>
                        <div className="absolute top-6 right-4 px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-semibold z-10">
                            After
                        </div>
                    </>
                )}

                {/* Lightweight loader (does not cover the whole preview) */}
                {!isLoaded && !hasError && (
                    <div className="absolute inset-0 z-[5] pointer-events-none flex items-center justify-center">
                        <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
                    </div>
                )}

                {/* Error fallback */}
                {hasError && (
                    <div className="absolute inset-0 z-[6] flex items-center justify-center bg-black/40 backdrop-blur-sm text-zinc-200 text-sm">
                        Preview unavailable
                    </div>
                )}

                {/* Play/Pause Button - SMALLER and AT BOTTOM CENTER */}
                <button
                    onClick={togglePlayPause}
                    className={`absolute bottom-16 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-all shadow-lg z-10 group ${isHovering ? 'opacity-100' : 'opacity-0'
                        }`}
                >
                    {isPlaying ? (
                        <Pause className="w-4 h-4 text-white" />
                    ) : (
                        <Play className="w-4 h-4 text-white ml-0.5" />
                    )}
                </button>

                {/* Hint to enable sound */}
                {!isPlaying && isHovering && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-[11px] z-10">
                        Click to play (with sound)
                    </div>
                )}
            </div>
        </div>
    );
}
