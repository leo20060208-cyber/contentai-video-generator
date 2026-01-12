'use client';
import { motion } from 'framer-motion';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

const Button = forwardRef<HTMLButtonElement, any>((props, ref) => {
    return (
        <motion.button
            ref={ref}
            className={cn("bg-green-500 p-4 rounded", props.className)}
            {...props}
        >
            {props.children}
        </motion.button>
    );
});
Button.displayName = 'Button';

export default function TestButtonPage() {
    return (
        <div className="pt-24 text-white">
            <Button>INLINE BUTTON TEST</Button>
        </div>
    );
}
