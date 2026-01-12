'use client';

import { useEffect, useRef, useState } from 'react';

interface LazyVideoProps {
    src: string;
    className?: string; // Optional
    muted?: boolean;
    loop?: boolean;
    playsInline?: boolean;
    autoPlay?: boolean;
    onLoad?: () => void;
    hoverUnmute?: boolean;
}


export function LazyVideo({
    src,
    className = '',
    muted = true,
    loop = true,
    playsInline = true,
    autoPlay = true,
    onLoad,
}: LazyVideoProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isIntersecting, setIntersecting] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIntersecting(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );

        if (videoRef.current) {
            observer.observe(videoRef.current);
        }

        return () => {
            observer.disconnect();
        };
    }, []);

    return (
        <video
            ref={videoRef}
            className={className}
            muted={muted}
            loop={loop}
            playsInline={playsInline}
            autoPlay={autoPlay}
            onLoadedData={onLoad}
            src={isIntersecting ? src : undefined}
        />
    );
}
