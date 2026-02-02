'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { supabase } from '@/lib/supabase';
import { Template } from '@/lib/db/videos';
import { ImageCreateFlow } from '@/components/create-yours/ImageCreateFlow';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

export default function RecreateImagePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ collectionId?: string }> }) {
    const { id } = use(params);
    const query = use(searchParams);
    const collectionId = query.collectionId;
    const router = useRouter();

    // Collection Navigation State
    const [prevId, setPrevId] = useState<string | null>(null);
    const [nextId, setNextId] = useState<string | null>(null);

    // Fetch Collection Navigation
    useEffect(() => {
        if (!collectionId) return;

        async function fetchCollectionNav() {
            const { data: items } = await supabase
                .from('collection_items')
                .select('template_id, order_index')
                .eq('collection_id', collectionId)
                .order('order_index', { ascending: true });

            if (!items) return;

            const currentIndex = items.findIndex(item => item.template_id == id);

            if (currentIndex === -1) return;

            if (currentIndex > 0) {
                setPrevId(String(items[currentIndex - 1].template_id));
            }

            if (currentIndex < items.length - 1) {
                setNextId(String(items[currentIndex + 1].template_id));
            }
        }
        fetchCollectionNav();
    }, [collectionId, id]);

    const [template, setTemplate] = useState<Template | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTemplate = async () => {
            if (!id) return;
            try {
                // Fetch template by ID (using 'videos' table where templates are stored)
                const { data, error } = await supabase
                    .from('templates')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                if (data) setTemplate(data as Template);
            } catch (err) {
                console.error('Error fetching template:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchTemplate();
    }, [id]);

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center text-white">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
        );
    }

    if (!template) {
        return (
            <div className="h-screen flex flex-col items-center justify-center text-white gap-4">
                <p className="text-zinc-500">Template not found.</p>
                <Button variant="ghost" onClick={() => router.back()}>Go Back</Button>
            </div>
        );
    }

    return (
        <ProtectedRoute>
            <div className="min-h-screen md:h-screen md:overflow-hidden pt-20 pb-10 px-4 flex flex-col relative overflow-y-auto md:overflow-y-hidden">
                <div className="flex-1 min-h-0">
                    <ImageCreateFlow
                        initialReferenceImage={template.before_image_url} // Template's before image (reference)
                        initialResultImage={template.after_image_url} // Template's after image (result overlay)
                        initialProductImage={template.product_image_url} // Template's product image for toggle
                        initialProductOutlineImage={template.product_outline_image_url} // Marked image for AI guidance
                        initialPrompt={template.hidden_prompt || template.description} // Template's base prompt (fallback to description for old templates)
                        onCancel={() => router.back()}
                        disableTools={['background', 'person']} // Disable specific tools as requested
                        disableMasking={true} // Templates use Lab outline mask only
                        isRecreate={true}
                    />
                </div>

                {/* Collection Navigation Arrows */}
                {collectionId && (
                    <>
                        {prevId && (
                            <button
                                onClick={() => router.push(`/recreate-image/${prevId}?collectionId=${collectionId}`)}
                                className="fixed left-4 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-black/80 hover:scale-110 transition-all shadow-2xl"
                                title="Previous Template"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                        )}
                        {nextId && (
                            <button
                                onClick={() => router.push(`/recreate-image/${nextId}?collectionId=${collectionId}`)}
                                className="fixed right-4 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-black/80 hover:scale-110 transition-all shadow-2xl"
                                title="Next Template"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        )}
                    </>
                )}
            </div>
        </ProtectedRoute>
    );
}
