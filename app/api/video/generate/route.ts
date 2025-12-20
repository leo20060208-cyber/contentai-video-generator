
import { NextResponse } from 'next/server';
import { KlingClient } from '@/lib/kling';
import { createReplicatePrediction, ReplicateModel } from '@/lib/replicate';
import { FreepikClient } from '@/lib/freepik';
import { AtlasClient } from '@/lib/atlas';
import { WavespeedClient } from '@/lib/wavespeed';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { requireVideoGenerationEntitlement } from '@/lib/billing/entitlementsServer';

// Initialize client with environment variables
const klingClient = new KlingClient({
    accessKey: process.env.KLING_ACCESS_KEY || '',
    secretKey: process.env.KLING_SECRET_KEY || ''
});

const freepikClient = new FreepikClient();
const atlasClient = new AtlasClient();
const wavespeedClient = new WavespeedClient();

// Increase body size limit for base64 images
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds

export async function POST(request: Request) {
    try {
        console.log('[API] Video generation request received');

        // Billing gate (also authenticates the user)
        const entitlement = await requireVideoGenerationEntitlement({
            authorizationHeader: request.headers.get('authorization'),
        });
        if (!entitlement.ok || !entitlement.userId) {
            const status = entitlement.error === 'Unauthorized' ? 401 : 402;
            return NextResponse.json(
                {
                    success: false,
                    error: entitlement.error || 'Payment required',
                    code: status === 401 ? 'UNAUTHORIZED' : 'PAYMENT_REQUIRED',
                    next: '/pricing',
                },
                { status }
            );
        }

        const userId = entitlement.userId;

        // Service client for storage + DB writes
        const supabase = createServerSupabaseClient('service');

        const body = await request.json();
        const { prompt, image, images, model, duration, aspect_ratio, target_mask, audio_url } = body;

        console.log('[API] Request parsed:', {
            hasPrompt: !!prompt,
            promptLength: prompt?.length,
            hasImage: !!image,
            hasImages: !!images && images.length > 0,
            imageLength: image?.length,
            model,
            hasAudio: !!audio_url,
            userId // Log userId to debug
        });

        // Helper to save video to DB
        const saveVideoToDb = async (taskId: string, provider: string) => {
            try {
                const { data, error } = await supabase.from('videos').insert({
                    user_id: userId,
                    prompt: prompt || 'No prompt',
                    title: prompt ? prompt.slice(0, 50) : 'Generated Video',
                    model: model,
                    status: 'processing',
                    task_id: taskId,
                    provider: provider,
                    audio_url: audio_url || null
                }).select(); // Add select to verify return

                if (error) {
                    console.error('[API] Failed to save video to DB:', JSON.stringify(error));
                } else {
                    console.log('[API] Video saved to DB successfully. ID:', data?.[0]?.id || 'unknown');
                }
            } catch (e) {
                console.error('[API] DB Save Exception:', e);
            }
        };

        // --- NEW: Wavespeed Integration (Priority for Kling) ---
        const useWavespeed = !!process.env.WAVESPEED_API_KEY && (
            model === 'kling-v1' ||
            model === 'kling-standard' ||
            model === 'kling' ||
            model.includes('wavespeed') ||
            model.includes('kwaivgi') // Catch-all for new models
        );

        if (useWavespeed) {
            console.log(`[API] Using Wavespeed for model: ${model}`);

            // 1. Handle "images" array (Reference-to-Video)
            let finalImages: string[] = [];
            if (images && Array.isArray(images) && images.length > 0) {
                console.log(`[API] Processing ${images.length} images for Wavespeed...`);
                finalImages = await Promise.all(images.map(async (img: string) => {
                    if (img && img.startsWith('data:')) {
                        try {
                            const base64Data = img.split('base64,')[1];
                            const buffer = Buffer.from(base64Data, 'base64');
                            const fileName = `temp-gen/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
                            const { error: uploadError } = await supabase.storage.from('videos').upload(fileName, buffer, {
                                contentType: 'image/png',
                                upsert: true
                            });
                            if (!uploadError) {
                                const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(fileName);
                                return publicUrl;
                            }
                        } catch (e) {
                            console.error('[API] Error uploading image from array:', e);
                        }
                    }
                    return img; // Return original if not base64 or upload failed (fallback)
                }));
            }

            // 2. Handle single "image" (Standard I2V or fallback)
            let finalImageUrl = image;
            if (image && image.startsWith('data:')) {
                try {
                    console.log('[API] Converting base64 image to URL (for Wavespeed)...');
                    const base64Data = image.split('base64,')[1];
                    const buffer = Buffer.from(base64Data, 'base64');
                    const fileName = `temp-gen/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
                    const { error: uploadError } = await supabase.storage.from('videos').upload(fileName, buffer, {
                        contentType: 'image/png',
                        upsert: true
                    });
                    if (!uploadError) {
                        const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(fileName);
                        finalImageUrl = publicUrl;
                    }
                } catch (e) {
                    console.error('[API] Error processing base64 image for Wavespeed:', e);
                }
            }

            // 3. Handle Video Input (Video-Edit)
            // Use provided 'audio_url' as the source video if model is video-edit
            // (Assuming audio_url points to the template's video)
            let finalVideoUrl = undefined;
            if (model === 'kwaivgi/kling-video-o1/video-edit') {
                finalVideoUrl = audio_url;
            }

            // 4. AI Image Refinement (Nano Banana) for "Original" Mode
            // If model is 'wavespeed-kling-o1' (Smart Comp), refine the collage first.
            if (model === 'wavespeed-kling-o1' && finalImageUrl) {
                console.log('[API] Refinement Step: Polishing composite with Nano Banana...');
                try {
                    const refinedResult = await wavespeedClient.editImage({
                        images: [finalImageUrl],
                        prompt: `Photorealistic, perfect lighting, realistic shadows, seamless integration. ${prompt}`,
                        model: 'google/nano-banana/edit'
                    });

                    if (refinedResult.url) {
                        console.log(`[API] Refinement Success! New Source: ${refinedResult.url}`);
                        finalImageUrl = refinedResult.url;

                        // Optionally upload this refined image to Supabase if we want to keep it?
                        // For now, passing the Wavespeed/Banana URL directly to Kling is faster.
                    } else if (refinedResult.taskId) {
                        console.log(`[API] Refinement queued (Async). Task: ${refinedResult.taskId}. Cannot wait, proceeding with original.`);
                        // Ideally we should wait, but Nano Banana is fast. If it returns TaskId, we might block.
                        // For now, fallback to original if async.
                    }
                } catch (refineError) {
                    console.error('[API] Refinement Failed:', refineError);
                    console.warn('[API] Proceeding with original composite.');
                }
            }

            const result = await wavespeedClient.generateVideo({
                prompt,
                image_url: finalImageUrl,
                images: finalImages,
                video_url: finalVideoUrl,
                duration: duration || 5,
                aspect_ratio: aspect_ratio || '16:9',
                model: model
            });

            if (result.taskId) {
                await saveVideoToDb(result.taskId, 'wavespeed');
                return NextResponse.json({
                    taskId: result.taskId,
                    provider: 'wavespeed',
                    status: 'processing'
                });
            }
        }

        // Explicit error for Wavespeed specific models if key is missing
        if ((model === 'wavespeed-kling-o1' || model.includes('wavespeed')) && !useWavespeed) {
            console.error('[API] Wavespeed key missing for explicit Wavespeed model request');
            return NextResponse.json({
                error: 'Wavespeed API Key is missing. Please add WAVESPEED_API_KEY to your .env.local file.',
                debug: { model, hasKey: !!process.env.WAVESPEED_API_KEY }
            }, { status: 500 });
        }

        // --- NEW: Atlas Cloud Integration ---
        // Force standard kling-v1 etc to use Atlas if key is present to try the new API
        // Checking for ATLASCLOUD_API_KEY presence to decide
        const useAtlas = !!process.env.ATLASCLOUD_API_KEY && (
            model === 'kling-v1' ||
            model === 'kling-standard' ||
            model === 'kling' ||
            // Also if explicit Atlas model
            model.includes('atlas')
        );

        if (useAtlas) {
            console.log(`[API] Using Atlas Cloud for model: ${model}`);

            // Handle Base64 Image Upload first (Same as Freepik)
            let finalImageUrl = image;
            if (image && image.startsWith('data:')) {
                try {
                    console.log('[API] Converting base64 image to URL (for Atlas)...');
                    const base64Data = image.split('base64,')[1];
                    const buffer = Buffer.from(base64Data, 'base64');
                    const fileName = `temp-gen/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
                    const { error: uploadError } = await supabase.storage.from('videos').upload(fileName, buffer, {
                        contentType: 'image/png',
                        upsert: true
                    });
                    if (!uploadError) {
                        const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(fileName);
                        finalImageUrl = publicUrl;
                    }
                } catch (e) {
                    console.error('[API] Error processing base64 image for Atlas:', e);
                }
            }

            const result = await atlasClient.generateVideo({
                prompt,
                image_url: finalImageUrl,
                duration: duration || 5,
                aspect_ratio: aspect_ratio || '16:9',
                model: 'kwaivgi/kling-video-o1/reference-to-video' // Force the model user requested for now
            });

            if (result.taskId) {
                await saveVideoToDb(result.taskId, 'atlas');
                return NextResponse.json({
                    taskId: result.taskId,
                    provider: 'atlas',
                    status: 'processing'
                });
            }
        }


        // 1. Freepik Models - Route ALL Kling models through Freepik (Fallback if NO Atlas Key)
        const freepikModels = [
            'kling-v1', 'kling-v2', 'kling-v2.5', 'kling-pro',
            'kling-standard', 'kling-elements-pro',
        ];
        if (freepikModels.includes(model) || model.startsWith('kling') || model.startsWith('freepik-')) {
            // ... (Existing Freepik Logic)

            // NOTE: If we get here, it means we didn't use Atlas.
            // But we already checked keys above. If useAtlas was false but it is a kling model, 
            // we fall through to here.

            // STRICTLY use environment variable to avoid stale hardcoded keys
            const apiKey = process.env.FREEPIK_API_KEY;

            if (!apiKey) {
                console.error('[API] FREEPIK_API_KEY not found in environment');
                return NextResponse.json({ error: 'Freepik API Key missing in environment variables' }, { status: 500 });
            }

            // ... (Rest of existing Freepik Logic is fine to keep as fallback or alternative)
            // Duplicating the logic block for simplicity of replacement

            console.log(`[API] Using Freepik for model: ${model}`);

            let finalImageUrl = image;
            if (image && image.startsWith('data:')) {
                try {
                    console.log('[API] Converting base64 image to URL...');
                    const base64Data = image.split('base64,')[1];
                    const buffer = Buffer.from(base64Data, 'base64');
                    const fileName = `temp-gen/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;

                    const { error: uploadError } = await supabase.storage
                        .from('videos')
                        .upload(fileName, buffer, {
                            contentType: 'image/png',
                            upsert: true
                        });

                    if (uploadError) {
                        console.error('[API] Upload error:', uploadError);
                    } else {
                        const { data: { publicUrl } } = supabase.storage
                            .from('videos')
                            .getPublicUrl(fileName);
                        finalImageUrl = publicUrl;
                        console.log('[API] Image uploaded to:', finalImageUrl);
                    }
                } catch (e) {
                    console.error('[API] Error processing base64 image:', e);
                }
            }

            // Generate via Freepik
            const result = await freepikClient.generateVideo({
                prompt,
                image_url: finalImageUrl, // Send URL instead of base64
                model: model,
                duration: duration || 5,
                aspect_ratio: aspect_ratio || '16:9',
                static_mask: target_mask
            });

            console.log('[API] Freepik Task Started:', result);

            if (result.data?.task_id) {
                await saveVideoToDb(result.data.task_id, 'freepik');
            }

            return NextResponse.json({
                taskId: result.data.task_id,
                provider: 'freepik',
                status: 'processing'
            });
        }

        // 2. Replicate Models
        const replicateModels = ['svd', 'animate-diff', 'minimax', 'wan21', 'luma', 'hunyuan'];
        if (replicateModels.includes(model)) {
            // ... (Existing Replicate logic)
            console.log(`[API] Using Replicate for model: ${model}`);

            if (!process.env.REPLICATE_API_TOKEN) {
                return NextResponse.json({ error: 'Replicate API Token missing' }, { status: 500 });
            }

            try {
                const prediction = await createReplicatePrediction({
                    model: model as ReplicateModel,
                    prompt: prompt || '',
                    image: image,
                    target_mask: target_mask
                });

                if (prediction.id) {
                    await saveVideoToDb(prediction.id, 'replicate');
                }

                return NextResponse.json({
                    taskId: prediction.id,
                    provider: 'replicate',
                    status: 'processing'
                });
            } catch (repError) {
                console.error('[API] Replicate creation failed:', repError);
                return NextResponse.json(
                    { error: `Replicate Error: ${(repError as Error).message}` },
                    { status: 500 }
                );
            }
        }

        // 3. Fallback
        return NextResponse.json({ error: 'Unknown model provider' }, { status: 400 });

    } catch (error) {
        console.error('[API] Fatal error:', error);
        return NextResponse.json(
            { error: (error as Error).message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
