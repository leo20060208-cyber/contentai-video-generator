import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { KlingClient } from '@/lib/kling';
import { createReplicatePrediction, ReplicateModel } from '@/lib/replicate';
import { FreepikClient } from '@/lib/freepik';
import { AtlasClient } from '@/lib/atlas';
import { WavespeedClient } from '@/lib/wavespeed';

import { checkCredits, deductCredits } from '@/lib/db/credits';

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

        // Initialize Supabase (Cookie-based client)
        const supabase = await createClient();
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

        // 1. Try getting user from Cookies
        let { data: { user } } = await supabase.auth.getUser();
        let userId = user?.id || null;
        let token: string | undefined;

        // 2. Fallback: Check for Authorization Header (Bearer Token)
        // This is crucial if the client is sending a token manually but cookies aren't being sent/read
        if (!userId) {
            const authHeader = request.headers.get('authorization');
            if (authHeader) {
                token = authHeader.replace('Bearer ', '');
                console.log('[API] Cookies failed, trying Bearer token...');
                const { data: { user: headerUser }, error: headerError } = await supabase.auth.getUser(token);

                if (headerUser) {
                    userId = headerUser.id;
                    console.log('[API] Authenticated via Bearer token');
                } else {
                    console.warn('[API] Bearer token validation failed:', headerError?.message);
                }
            }
        }

        if (!userId) {
            console.warn('[API] Auth failed: No user found in cookies or header');
            return NextResponse.json({ error: 'Unauthorized: Login required for video generation' }, { status: 401 });
        }

        const body = await request.json();
        const { prompt, image, images, video, model, duration, aspect_ratio, target_mask, audio_url } = body;

        // Calculate Cost with Correct Formula
        const vidDuration = duration || 5;
        let cost = 75;

        if (vidDuration <= 15) {
            cost = 75;
        } else if (vidDuration <= 20) {
            cost = 130;
        } else {
            // +30 credits per each additional 5 seconds after 20s
            const extraSeconds = vidDuration - 20;
            const extraBlocks = Math.ceil(extraSeconds / 5);
            cost = 130 + (extraBlocks * 30);
        }

        // Check Credits
        const hasCredits = await checkCredits(userId, cost);
        if (!hasCredits) {
            console.warn(`[API] User ${userId} has insufficient credits for video gen (Cost: ${cost}).`);
            return NextResponse.json({ error: 'Insufficient credits', code: 'INSUFFICIENT_CREDITS' }, { status: 402 });
        }

        // Deduct Credits
        const deducted = await deductCredits(userId, cost, `Video Generation (${model}, ${vidDuration}s)`);
        if (!deducted) {
            return NextResponse.json({ error: 'Failed to process credits' }, { status: 500 });
        }

        console.log('[API] Request parsed:', {
            hasPrompt: !!prompt,
            promptLength: prompt?.length,
            hasImage: !!image,
            hasImages: !!images && images.length > 0,
            hasVideo: !!video,
            videoLength: video?.length,
            imageLength: image?.length,
            model,
            hasAudio: !!audio_url,
            userId,
            cost,
            duration: vidDuration
        });

        // === DETAILED API LOG ===
        console.log('');
        console.log('╔═══════════════════════════════════════╗');
        console.log('║  API VIDEO GENERATE - RECEIVED        ║');
        console.log('╠═══════════════════════════════════════╣');
        console.log('║ Video:        ', video ? `✅ ${(video.length / 1024).toFixed(0)}KB` : '❌ NO');
        console.log('║ Image (frame):', image ? `✅ ${(image.length / 1024).toFixed(0)}KB` : '❌ NO');
        console.log('║ Images:       ', images ? `✅ ${images.length} items` : '❌ NO');
        console.log('║ Target Mask:  ', target_mask ? `✅ ${(target_mask.length / 1024).toFixed(0)}KB` : '❌ NO');
        console.log('║ Duration:', `${vidDuration}s`.padEnd(32), '║');
        console.log('║ Cost:', `${cost} crèdits`.padEnd(34), '║');
        console.log('║ Model:', (model || '').substring(0, 33).padEnd(34), '║');
        console.log('╚═══════════════════════════════════════╝');
        console.log('');

        // Helper to save video to DB
        const saveVideoToDb = async (taskId: string, provider: string) => {
            if (!userId) {
                console.warn('[API] Cannot save video: No User ID');
                return;
            }

            try {
                // Use Service Role Key if available to bypass RLS, otherwise try as the user
                // Note: If using Anon key without user token, RLS will likely block the insert.
                const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
                const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

                let dbClient = supabase;

                // Priority 1: Service Role (Admin)
                if (serviceRoleKey) {
                    dbClient = createAdminClient(supabaseUrl, serviceRoleKey);
                }
                // Priority 2: User Context (if token exists)
                else if (token && anonKey) {
                    // We have a token either from header or we should extract it from session
                    // If we authenticated via cookies, we might not have 'token' variable set from header.
                    // But for RLS, we prefer Service Role anyway.
                    // If we only have cookies, we can't easily pass a token to createClient unless we extract it.
                    // However, we are saving using admin privileges (Service Role) typically.
                    dbClient = createAdminClient(supabaseUrl, anonKey, {
                        global: { headers: { Authorization: `Bearer ${token}` } }
                    });
                }

                console.log(`[API] Saving video with client mode: ${serviceRoleKey ? 'ServiceRole' : (token ? 'UserAuth' : 'Anon')}`);

                const { data, error } = await dbClient.from('videos').insert({
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

            // 1. Handle "images" array (Reference-to-Video / Video-Edit)
            let finalImages: string[] = [];
            if (images && Array.isArray(images) && images.length > 0) {
                console.log(`[API] Processing ${images.length} images for Wavespeed...`);
                const uploadedImages = await Promise.all(images.map(async (img: string, index: number) => {
                    // Skip blob URLs - they won't work server-side
                    if (img && img.startsWith('blob:')) {
                        console.warn(`[API] Image ${index}: Skipping blob URL (not valid server-side)`);
                        return null;
                    }
                    // Upload base64 images to Supabase
                    if (img && img.startsWith('data:')) {
                        try {
                            const base64Data = img.split('base64,')[1];
                            const buffer = Buffer.from(base64Data, 'base64');
                            const mimeType = img.split(';')[0].split(':')[1] || 'image/png';
                            const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : 'png';
                            const fileName = `temp-gen/${Date.now()}-${index}-${Math.random().toString(36).substring(7)}.${ext}`;
                            const { error: uploadError } = await supabase.storage.from('videos').upload(fileName, buffer, {
                                contentType: mimeType,
                                upsert: true
                            });
                            if (!uploadError) {
                                const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(fileName);
                                console.log(`[API] Image ${index}: Uploaded to ${publicUrl}`);
                                return publicUrl;
                            } else {
                                console.error(`[API] Image ${index}: Upload failed:`, uploadError);
                                return null;
                            }
                        } catch (e) {
                            console.error(`[API] Image ${index}: Error uploading:`, e);
                            return null;
                        }
                    }
                    // Already a valid URL
                    if (img && (img.startsWith('http://') || img.startsWith('https://'))) {
                        console.log(`[API] Image ${index}: Using existing URL`);
                        return img;
                    }
                    console.warn(`[API] Image ${index}: Unknown format, skipping`);
                    return null;
                }));

                // Filter out nulls and ensure we only have valid URLs
                finalImages = uploadedImages.filter((url): url is string => url !== null && url.startsWith('http'));
                console.log(`[API] Final images count: ${finalImages.length} (from ${images.length} inputs)`);
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
            let finalVideoUrl = undefined;
            if (model === 'kwaivgi/kling-video-o1/video-edit') {
                // First try the video field (new Create Yours flow)
                if (video && video.startsWith('data:')) {
                    try {
                        console.log('[API] Converting base64 video to URL...');
                        const base64Data = video.split('base64,')[1];
                        const buffer = Buffer.from(base64Data, 'base64');
                        const mimeType = video.split(';')[0].split(':')[1] || 'video/mp4';
                        const ext = mimeType.includes('webm') ? 'webm' : 'mp4';
                        const fileName = `temp-gen/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
                        const { error: uploadError } = await supabase.storage.from('videos').upload(fileName, buffer, {
                            contentType: mimeType,
                            upsert: true
                        });
                        if (!uploadError) {
                            const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(fileName);
                            finalVideoUrl = publicUrl;
                            console.log('[API] Video uploaded to:', finalVideoUrl);
                        } else {
                            console.error('[API] Video upload error:', uploadError);
                        }
                    } catch (e) {
                        console.error('[API] Error processing base64 video:', e);
                    }
                } else if (video) {
                    // Already a URL
                    finalVideoUrl = video;
                } else if (audio_url) {
                    // Fallback to audio_url (template's video)
                    finalVideoUrl = audio_url;
                }
            }

            // 3.5. Handle Target Mask (if exists)
            let finalMaskUrl = undefined;
            if (target_mask && target_mask.startsWith('data:')) {
                try {
                    console.log('[API] Converting base64 mask to URL...');
                    const base64Data = target_mask.split('base64,')[1];
                    const buffer = Buffer.from(base64Data, 'base64');
                    const fileName = `temp-gen/${Date.now()}-mask-${Math.random().toString(36).substring(7)}.png`;
                    const { error: uploadError } = await supabase.storage.from('videos').upload(fileName, buffer, {
                        contentType: 'image/png',
                        upsert: true
                    });
                    if (!uploadError) {
                        const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(fileName);
                        finalMaskUrl = publicUrl;
                        console.log('[API] Mask uploaded to:', finalMaskUrl);
                    } else {
                        console.error('[API] Mask upload error:', uploadError);
                    }
                } catch (e) {
                    console.error('[API] Error processing mask:', e);
                }
            } else if (target_mask) {
                finalMaskUrl = target_mask;
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

            // Always send image_url (extracted frame or image), not just for non-video-edit models
            const result = await wavespeedClient.generateVideo({
                prompt,
                image_url: finalImageUrl,  // ✅ SEMPRE enviar frame extret
                images: finalImages,
                video_url: finalVideoUrl,
                target_mask: finalMaskUrl,  // ✅ Enviar màscara
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
