'use client';

import { cn } from '@/lib/utils/cn';
import { motion, HTMLMotionProps } from 'framer-motion';
import { forwardRef } from 'react';

interface CardProps extends HTMLMotionProps<"div"> {
    variant?: 'default' | 'glass' | 'elevated';
    hover?: boolean;
    children: React.ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
    ({ className, variant = 'default', hover = true, children, ...props }, ref) => {
        return (
            <motion.div
                ref={ref}
                whileHover={hover ? { y: -4, scale: 1.01 } : undefined}
                transition={{ duration: 0.2 }}
                className={cn(
                    "rounded-2xl transition-all duration-300",
                    // Variants
                    variant === 'default' && "bg-zinc-900 border border-white/5",
                    variant === 'glass' && "bg-zinc-900/60 backdrop-blur-xl border border-white/5",
                    variant === 'elevated' && "bg-zinc-800 border border-white/5 shadow-2xl shadow-black/50",
                    // Hover effects
                    hover && "hover:border-white/20 hover:shadow-xl hover:shadow-black/30",
                    className
                )}
                {...props}
            >
                {children}
            </motion.div>
        );
    }
);

Card.displayName = 'Card';
