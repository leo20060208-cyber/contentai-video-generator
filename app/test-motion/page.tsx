'use client';
import { motion } from 'framer-motion';

export default function TestMotionPage() {
    return (
        <div className="pt-24">
            <motion.button
                whileHover={{ scale: 1.1 }}
                className="text-white bg-blue-500 rounded p-4"
            >
                TEST MOTION BUTTON
            </motion.button>
        </div>
    );
}
