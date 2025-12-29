'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

interface BeforeAfterVideoSliderProps {
    beforeVideoUrl?: string | null;
    afterVideoUrl?: string | null;
    beforeImageUrl?: string | null;
    afterImageUrl?: string | null;
    className?: string;
}

export function BeforeAfterVideoSlider({
    beforeVideoUrl,
    afterVideoUrl,
    beforeImageUrl,
    afterImageUrl,
    className = ''
}: BeforeAfterVideoSliderProps) {
    const [sliderPosition, setSliderPosition] = useState(50); // 0-100%
    const [isDragging, setIsDragging] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal'); // horizontal line (up/down), vertical line (left/right)
    const [showLabels, setShowLabels] = useState(true);
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

    // Handle drag events
    const handleDrag = (clientX: number, clientY: number) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();

        let percentage;
        if (orientation === 'horizontal') {
            // Horizontal line moves Vertically (Y axis)
            const y = clientY - rect.top;
            percentage = Math.max(0, Math.min(100, (y / rect.height) * 100));
        } else {
            // Vertical line moves Horizontally (X axis)
            const x = clientX - rect.left;
            percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
        }
        setSliderPosition(percentage);
    };

    const handleMouseDown = () => setIsDragging(true);
    const handleMouseUp = () => setIsDragging(false);

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        handleDrag(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
        if (!isDragging) return;
        handleDrag(e.touches[0].clientX, e.touches[0].clientY);
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
    }, [isDragging, orientation]);

    // Sync video playback
    const togglePlayPause = () => {
        const bVideo = beforeVideoRef.current;
        const aVideo = afterVideoRef.current;

        if (isPlaying) {
            if (bVideo) bVideo.pause();
            if (aVideo) aVideo.pause();
        } else {
            if (bVideo) bVideo.play().catch(() => { });
            if (aVideo) aVideo.play().catch(() => { });
        }
        setIsPlaying(!isPlaying);
    };

    const toggleMute = () => {
        setIsMuted(!isMuted);
        if (beforeVideoRef.current) beforeVideoRef.current.muted = !isMuted;
        if (afterVideoRef.current) afterVideoRef.current.muted = !isMuted;
    };

    // Auto-sync mute state when refs change or mount
    useEffect(() => {
        if (beforeVideoRef.current) beforeVideoRef.current.muted = isMuted;
        if (afterVideoRef.current) afterVideoRef.current.muted = isMuted;
    }, [isMuted, beforeVideoUrl, afterVideoUrl]);


    // Sync video times
    const handleTimeUpdate = () => {
        if (!beforeVideoRef.current || !afterVideoRef.current) return;
        const timeDiff = Math.abs(beforeVideoRef.current.currentTime - afterVideoRef.current.currentTime);
        if (timeDiff > 0.1) {
            afterVideoRef.current.currentTime = beforeVideoRef.current.currentTime;
        }
    };

    const handleVideoEnd = () => {
        setIsPlaying(false);
        if (beforeVideoRef.current) beforeVideoRef.current.currentTime = 0;
        if (afterVideoRef.current) afterVideoRef.current.currentTime = 0;
    };

    // Render helper
    const renderMedia = (isTopLayer: boolean) => {
        const isVideo = isTopLayer ? isAfterVideo : isBeforeVideo;
        const src = isTopLayer ? afterSrc : beforeSrc;
        const ref = isTopLayer ? afterVideoRef : beforeVideoRef;
        const videoSrc = isTopLayer ? afterVideoUrl : beforeVideoUrl;

        if (!src) {
            return (
                <div className="absolute inset-0 w-full h-full bg-zinc-900/50 flex items-center justify-center">
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
                    className="absolute inset-0 w-full h-full object-cover"
                    loop
                    playsInline
                    muted={isMuted} // Controlled
                    onTimeUpdate={!isTopLayer ? handleTimeUpdate : undefined}
                // onEnded={handleVideoEnd}
                />
            );
        } else {
            return (
                <div className="relative w-full h-full">
                    <Image
                        src={src}
                        alt={isTopLayer ? "After" : "Before"}
                        fill
                        className="object-cover"
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


    // Styles based on orientation
    const isHorizontal = orientation === 'horizontal'; // Line is horizontal, moves vertical

    const sliderBarStyle = isHorizontal
        ? { top: `${sliderPosition}%`, left: 0, right: 0, height: '2px', cursor: 'ns-resize' }
        : { left: `${sliderPosition}%`, top: 0, bottom: 0, width: '2px', cursor: 'ew-resize' };

    return (
        <div className={`flex flex-col gap-4 w-full h-full ${className}`}>

            {/* Main Video Container */}
            <div
                className="relative overflow-hidden rounded-2xl bg-zinc-900 w-full flex-1 flex items-center justify-center border border-white/5 shadow-2xl"
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
            >
                <div
                    ref={containerRef}
                    className="relative w-full h-full mx-auto"
                    style={{

                    }}
                >
                    {/* Before Media (Background Layer) */}
                    {renderMedia(false)}

                    {/* After Media (Top Layer, Clipped) */}
                    <div
                        className="absolute inset-0 overflow-hidden"
                        style={isHorizontal
                            ? { clipPath: `inset(0 0 ${100 - sliderPosition}% 0)` } // Shows top part
                            : { clipPath: `inset(0 0 0 ${sliderPosition}%)` } // Shows right part
                        }
                    >
                        {renderMedia(true)}
                    </div>

                    {/* Slider Handle - thin line only */}
                    <div
                        className={`absolute bg-white z-20 transition-opacity duration-300 hover:opacity-100 ${isDragging ? 'opacity-100' : 'opacity-70'}`}
                        style={sliderBarStyle}
                        onMouseDown={handleMouseDown}
                        onTouchStart={handleMouseDown}
                    />

                    {/* Labels */}
                    {showLabels && (
                        <>
                            <div className={`absolute transition-opacity duration-300 ${isHovering ? 'opacity-0' : 'opacity-100'} top-4 left-4 px-2 py-1 rounded bg-black/40 text-white/70 text-[10px] uppercase tracking-wider font-medium pointer-events-none`}>
                                Before
                            </div>
                            <div className={`absolute transition-opacity duration-300 ${isHovering ? 'opacity-0' : 'opacity-100'} bottom-4 right-4 px-2 py-1 rounded bg-orange-500/80 text-white text-[10px] uppercase tracking-wider font-medium pointer-events-none`}>
                                After
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Controls Bar */}
            <div className="h-14 bg-zinc-900 border border-white/10 rounded-xl flex items-center justify-between px-4 shadow-lg shrink-0">

                {/* Left: Orientation */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setOrientation(prev => prev === 'horizontal' ? 'vertical' : 'horizontal')}
                        className="w-10 h-10 rounded-lg flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                        title="Change Comparison Layout"
                    >
                        {orientation === 'horizontal' ? (
                            <div className="flex flex-col gap-1 items-center">
                                <div className="w-5 h-2 bg-current opacity-30 rounded-sm"></div>
                                <div className="w-5 h-0.5 bg-current"></div>
                                <div className="w-5 h-2 bg-current opacity-30 rounded-sm"></div>
                            </div>
                        ) : (
                            <div className="flex gap-1 items-center">
                                <div className="h-4 w-1.5 bg-current opacity-30 rounded-sm"></div>
                                <div className="h-4 w-0.5 bg-current"></div>
                                <div className="h-4 w-1.5 bg-current opacity-30 rounded-sm"></div>
                            </div>
                        )}
                    </button>
                    <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider hidden sm:block">
                        {orientation === 'horizontal' ? 'Vertical Swipe' : 'Horizontal Swipe'}
                    </span>
                </div>

                {/* Center: Play/Pause */}
                {hasAnyVideo && (
                    <button
                        onClick={togglePlayPause}
                        className="w-12 h-12 rounded-full flex items-center justify-center bg-white text-black hover:bg-zinc-200 transition-transform active:scale-95 shadow-lg shadow-white/5"
                    >
                        {isPlaying ? (
                            <Pause className="w-5 h-5 fill-current" />
                        ) : (
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                        )}
                    </button>
                )}

                {/* Right: Mute/Unmute */}
                <div className="flex items-center gap-2 justify-end min-w-[100px]">
                    {hasAnyVideo && (
                        <button
                            onClick={toggleMute}
                            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${isMuted ? 'bg-zinc-800 text-zinc-400 hover:text-white' : 'bg-zinc-800 text-white'}`}
                        >
                            {isMuted ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                            )}
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}
