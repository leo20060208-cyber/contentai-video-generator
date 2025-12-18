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
}

export function LazyVideo({
    src,
    className = '',
    muted = true,
    loop = true,
    playsInline = true,
    autoPlay = false,
    onLoad,
}: LazyVideoProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(false);

    useEffect(() => {
        const videoElement = videoRef.current;
        if (!videoElement) return;

        // Intersection Observer to detect when video enters viewport
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsInView(true);
                        observer.unobserve(videoElement);
                    }
                });
            },
            {
                rootMargin: '200px', // Start loading 200px before entering viewport
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
        };

        videoElement.addEventListener('loadeddata', handleLoadedData);

        return () => {
            videoElement.removeEventListener('loadeddata', handleLoadedData);
        };
    }, [isInView, onLoad]);

    return (
        <div className="relative w-full h-full">
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
                muted={muted}
                loop={loop}
                playsInline={playsInline}
                autoPlay={autoPlay && isInView}
                preload="none"
            />
        </div>
    );
}
