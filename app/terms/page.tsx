'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSectionContent } from '@/lib/db/content';
import { Loader2, Shield, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TermsPage() {
    const router = useRouter();
    const [content, setContent] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const data = await getSectionContent('plus_info_pages');
                if (data && data.pages && data.pages['terms']) {
                    setContent(data.pages['terms']);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading) return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
    );

    return (
        <div className="min-h-screen bg-black text-white pt-32 pb-20 px-4 md:px-8">
            <div className="max-w-3xl mx-auto">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <button onClick={() => router.back()} className="flex items-center gap-2 text-zinc-500 hover:text-white mb-12 transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-widest">Back</span>
                    </button>

                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center">
                            <Shield className="w-6 h-6 text-orange-500" />
                        </div>
                        <h1 className="text-4xl font-black uppercase tracking-tight italic">
                            {content?.title || 'Terms of Service'}
                        </h1>
                    </div>

                    <div
                        className="prose prose-invert prose-orange max-w-none 
                            prose-h2:text-xl prose-h2:font-bold prose-h2:text-white prose-h2:mt-10 mb-6
                            prose-p:text-zinc-400 prose-p:leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: content?.content || '<p>Terms of service content coming soon.</p>' }}
                    />

                    <div className="mt-20 pt-8 border-t border-white/5 text-center">
                        <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">
                            Last Updated: January 14, 2026
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
