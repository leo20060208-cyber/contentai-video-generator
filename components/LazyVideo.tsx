'use client';

import { useEffect, useRef, useState } from 'react';

interface LazyVideoProps {
    src: string;
    className?: string;
    muted?: boolean;
    loop?: boolean;
    playsInline?: boolean;
    autoPlay?: boolean;
    onLoad?: () => void;
    hoverUnmute?: boolean; // New prop: unmute on hover
}

export function LazyVideo({
    src,
    className = '',
    muted = true,
    loop = true,
    playsInline = true,
    autoPlay = true, // Default to true now
    onLoad,
    hoverUnmute = true, // Default: unmute on hover
}: LazyVideoProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const [isMuted, setIsMuted] = useState(true); // Always start muted

    useEffect(() => {
        const videoElement = videoRef.current;
        if (!videoElement) return;

        // Intersection Observer to detect when video enters viewport
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsInView(true);
                        // Autoplay when entering view
                        videoElement.play().catch(() => { });
                    } else {
                        // Pause when leaving view
                        videoElement.pause();
                    }
                });
            },
            {
                rootMargin: '100px',
                threshold: 0.1,
            }
        );

        observer.observe(videoElement);

        return () => {
            observer.disconnect();
        };
    }, []);

    useEffect(() => {
        const videoElement = videoRef.current;
        if (!videoElement || !isInView) return;

        const handleLoadedData = () => {
            setIsLoaded(true);
            onLoad?.();
            // Start playing once loaded
            videoElement.play().catch(() => { });
        };

        videoElement.addEventListener('loadeddata', handleLoadedData);

        return () => {
            videoElement.removeEventListener('loadeddata', handleLoadedData);
        };
    }, [isInView, onLoad]);

    const handleMouseEnter = () => {
        if (hoverUnmute && videoRef.current) {
            setIsMuted(false);
            videoRef.current.muted = false;
        }
    };

    const handleMouseLeave = () => {
        if (hoverUnmute && videoRef.current) {
            setIsMuted(true);
            videoRef.current.muted = true;
        }
    };

    return (
        <div
            className="relative w-full h-full"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Skeleton loader */}
            {!isLoaded && (
                <div className="absolute inset-0 bg-zinc-800 animate-pulse">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent animate-shimmer" />
                </div>
            )}

            {/* Video element */}
            <video
                ref={videoRef}
                src={isInView ? src : undefined}
                className={`${className} transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                muted={isMuted}
                loop={loop}
                playsInline={playsInline}
                autoPlay={autoPlay && isInView}
                preload="metadata"
            />
        </div>
    );
}
