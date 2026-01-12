'use client';

import React, { useState, useRef, MouseEvent, ReactNode } from 'react';

interface BeforeAfterSliderProps {
    before: ReactNode;
    after: ReactNode;
    className?: string;
    initialPosition?: number; // 0-100, default 50
}

export function BeforeAfterSlider({ before, after, className = '', initialPosition = 50 }: BeforeAfterSliderProps) {
    const [sliderSate, setSliderState] = useState(initialPosition);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percentage = (x / rect.width) * 100;
        setSliderState(percentage);
    };

    const handleMouseLeave = () => {
        setSliderState(initialPosition);
    };

    return (
        <div
            ref={containerRef}
            className={`relative w-full h-full overflow-hidden select-none ${className}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            {/* Background Layer (After) - Fully Visible */}
            <div className="absolute inset-0 w-full h-full">
                {after}
            </div>

            {/* Foreground Layer (Before) - Clipped */}
            <div
                className="absolute inset-0 w-full h-full will-change-[clip-path]"
                style={{
                    clipPath: `polygon(0 0, ${sliderSate}% 0, ${sliderSate}% 100%, 0 100%)`
                }}
            >
                {before}
            </div>

            {/* Comparison Line */}
            <div
                className="absolute top-0 bottom-0 w-[1px] bg-white/30 pointer-events-none z-10"
                style={{ left: `${sliderSate}%` }}
            />
        </div>
    );
}
