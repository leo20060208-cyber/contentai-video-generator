'use client';

import { motion } from 'framer-motion';
import {
    ShoppingBag,
    Truck,
    Eye,
    Headphones,
    ShoppingCart,
    Star,
    Frame
} from 'lucide-react';

const businesses = [
    { name: 'VISUAL', description: 'Create stunning visual content', icon: Eye },
    { name: 'CLOTHING BRANDS', description: 'Showcase your latest collection', icon: ShoppingBag },
    { name: 'ASMR', description: 'Satisfying sounds & visuals', icon: Headphones },
    { name: 'DROP SHIPPING', description: 'Create winning ads instantly', icon: Truck },
    { name: 'ECOMMERCE', description: 'Turn products into viral ads', icon: ShoppingCart },
    { name: 'BRAND', description: 'Build your unique identity', icon: Star },
    { name: 'VISUAL TEMPLATES', description: 'Starting points for your creativity', icon: Frame },
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

export function BusinessGrid() {
    return (
        <section className="py-24 px-4 relative">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent pointer-events-none" />

            <div className="container mx-auto max-w-6xl relative z-10">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <span className="text-orange-500 text-sm font-semibold tracking-wider uppercase mb-4 block">
                        Who Benefits
                    </span>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
                        Built for every business
                    </h2>
                    <p className="text-zinc-400 text-lg max-w-xl mx-auto">
                        From solo creators to enterprise brands, transform your video content
                    </p>
                </motion.div>

                {/* Grid */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4"
                >
                    {businesses.map((business) => (
                        <motion.div
                            key={business.name}
                            variants={itemVariants}
                            whileHover={{
                                scale: 1.02,
                                borderColor: 'rgba(249, 115, 22, 0.3)',
                            }}
                            className="group relative p-6 rounded-2xl bg-zinc-900/50 border border-white/5 transition-all duration-300 hover:bg-zinc-900 cursor-pointer"
                        >
                            {/* Icon */}
                            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4 group-hover:bg-orange-500/10 transition-colors">
                                <business.icon className="w-6 h-6 text-zinc-400 group-hover:text-orange-500 transition-colors" />
                            </div>

                            {/* Content */}
                            <h3 className="font-semibold text-white mb-1 group-hover:text-orange-500 transition-colors">
                                {business.name}
                            </h3>
                            <p className="text-sm text-zinc-500">
                                {business.description}
                            </p>

                            {/* Hover glow effect */}
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
