'use client';

import { cn } from '@/lib/utils/cn';
import { motion, HTMLMotionProps } from 'framer-motion';
import { forwardRef } from 'react';

interface ButtonProps extends HTMLMotionProps<"button"> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    children: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
        return (
            <motion.button
                ref={ref}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                    "inline-flex items-center justify-center font-semibold rounded-full transition-all duration-300",
                    // Sizes
                    size === 'sm' && "px-4 py-2 text-sm",
                    size === 'md' && "px-6 py-3 text-sm",
                    size === 'lg' && "px-8 py-4 text-base",
                    // Variants
                    variant === 'primary' && "bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/25",
                    variant === 'secondary' && "bg-zinc-800 text-white hover:bg-zinc-700",
                    variant === 'ghost' && "bg-transparent text-white hover:bg-white/10",
                    variant === 'outline' && "bg-transparent border border-white/20 text-white hover:bg-white/5 hover:border-white/40",
                    className
                )}
                {...props}
            >
                {children}
            </motion.button>
        );
    }
);

Button.displayName = 'Button';
