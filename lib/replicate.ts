import Replicate from 'replicate';

// Check if token is set
const token = process.env.REPLICATE_API_TOKEN;
if (!token) {
    console.error('⚠️ REPLICATE_API_TOKEN is not set in environment variables');
}

const replicate = new Replicate({
    auth: token,
});

export type ReplicateModel =
    | 'svd'
    | 'animate-diff'
    | 'minimax'
    | 'hunyuan'
    | 'wan21'
    | 'luma'
    | 'flux-schnell' // For Text-to-Image
    | 'sdxl'         // For Image-to-Image
    | 'llava'        // For Image-to-Text
    | 'nano-banana'; // Google Nano Banana Pro

export interface ReplicateVideoParams {
    prompt: string;
    image?: string;
    model: ReplicateModel;
    duration?: number;
    // For Flux/Image models
    aspect_ratio?: string;
    go_fast?: boolean;
    megapixels?: string;
    num_outputs?: number;
    output_format?: string;
    output_quality?: number;
    // SDXL
    refine?: string;
    scheduler?: string;
    lora_scale?: number;
    guidance_scale?: number;
    apply_watermark?: boolean;
    high_noise_frac?: number;
    negative_prompt?: string;
    prompt_strength?: number;
    num_inference_steps?: number;
    target_mask?: string; // Mask for the object to replace (inpainting/editing)
}

// Map models to their version IDs or owner/name for lookup
const MODEL_VERSIONS: Record<string, string> = {
    'svd': "3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438", // Verified SVD-XT
    'animate-diff': "beecf59c4aee8d81bf04f0381033dfa10dc16e845b4ae00d281e2fa377e48a9f",
    'sdxl': "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b", // Standard SDXL
    // LLaVA will use dynamic lookup
};

async function getModelVersion(model: ReplicateModel): Promise<string> {
    if (model === 'svd') return MODEL_VERSIONS.svd;
    if (model === 'animate-diff') return MODEL_VERSIONS['animate-diff'];

    // For Minimax or others without fixed hash, fetch latest
    if (model === 'minimax') {
        // Cache this? For now, fetch every time (it's fast enough or cached by Replicate client internally?)
        // actually replicate.models.get returns version object
        const modelData = await replicate.models.get('minimax', 'video-01');
        return modelData.latest_version?.id || '';
    }

    if (model === 'flux-schnell') {
        const modelData = await replicate.models.get('black-forest-labs', 'flux-schnell');
        return modelData.latest_version?.id || '';
    }

    if (model === 'nano-banana') {
        // User explicitly requests the Google model ("Nano Banana" / Imagen 3).
        // Strictly use 'google/imagen-3' or 'google/imagen-3-fast' and do NOT fallback to SDXL.
        try {
            const modelData = await replicate.models.get('google', 'imagen-3');
            return modelData.latest_version?.id || '';
        } catch (e) {
            // Fallback to fast version ONLY if standard fails, but stay within Google ecosystem.
            const modelData = await replicate.models.get('google', 'imagen-3-fast');
            return modelData.latest_version?.id || '';
        }
    }

    if (model === 'luma') {
        const modelData = await replicate.models.get('luma', 'ray');
        return modelData.latest_version?.id || '';
    }

    if (model === 'hunyuan') {
        const modelData = await replicate.models.get('tencent', 'hunyuan-video');
        return modelData.latest_version?.id || '';
    }

    if (model === 'sdxl') return MODEL_VERSIONS.sdxl;

    if (model === 'wan21') return ''; // Handled dynamically in createReplicatePrediction based on image input

    if (model === 'llava') {
        // Dynamic lookup for LLaVA
        const modelData = await replicate.models.get('yorickvp', 'llava-13b');
        return modelData.latest_version?.id || '';
    }

    throw new Error(`Model version not found for ${model}`);
}

export async function createReplicatePrediction(params: ReplicateVideoParams) {
    if (!token) throw new Error('REPLICATE_API_TOKEN is missing');

    let version = await getModelVersion(params.model);
    let input: any = {};

    switch (params.model) {
        case 'svd':
            input = {
                input_image: params.image,
                video_length: "25_frames_with_svd_xt",
                sizing_strategy: "maintain_aspect_ratio",
                frames_per_second: 6,
                motion_bucket_id: 127,
                cond_aug: 0.02,
                mask: params.target_mask // Try experimental mask support
            };
            break;
        case 'animate-diff':
            input = {
                prompt: params.prompt,
                motion_module: "mm_sd_v15_v2.ckpt",
                path: "to_you",
            };
            break;
        case 'minimax':
            input = {
                prompt: params.prompt,
                first_frame_image: params.image,
                mask: params.target_mask // Try experimental mask support
            };
            break;
        case 'flux-schnell':
            input = {
                prompt: params.prompt,
                aspect_ratio: params.aspect_ratio || "16:9",
                go_fast: true,
                megapixels: "1",
                num_outputs: 1,
                output_format: "webp",
                output_quality: 90
            };
            break;
        case 'sdxl':
            input = {
                prompt: params.prompt,
                image: params.image, // Image-to-Image
                refine: "expert_ensemble_refiner",
                scheduler: "K_EULER",
                lora_scale: 0.6,
                num_outputs: 1,
                guidance_scale: 7.5,
                apply_watermark: false,
                high_noise_frac: 0.8,
                negative_prompt: "text, watermark, low quality, distortion",
                prompt_strength: 0.65, // Balanced: 65% change (enough for background)
                num_inference_steps: 30
            };
            break;
        case 'nano-banana':
            // Google Imagen 3 Input Schema
            input = {
                prompt: params.prompt,
                image: params.image,
                aspect_ratio: "16:9",
                safety_filter_level: "block_only_high"
            };
            break;
        case 'luma':
            // Luma Ray 2
            input = {
                prompt: params.prompt,
                aspect_ratio: params.aspect_ratio || "16:9",
                loop: false
            };
            break;
        case 'hunyuan':
            // Tencent Hunyuan Video
            input = {
                prompt: params.prompt,
                video_length: 129, // ~5 seconds (default)
                resolution: "1280x720",
                seed: Math.floor(Math.random() * 1000000)
            };
            break;
        case 'wan21':
            // Wan 2.1 (Wavespeed AI)
            if (params.image) {
                // Image to Video
                version = "wavespeedai/wan-2.1-i2v-720p"; // Using slug directly, fetch latest version if needed or let Replicate handle slug
                const modelData = await replicate.models.get('wavespeedai', 'wan-2.1-i2v-720p');
                version = modelData.latest_version?.id || '';

                input = {
                    prompt: params.prompt,
                    image: params.image,
                    num_frames: 81,
                    aspect_ratio: params.aspect_ratio || "16:9",
                    sample_shift: 5,
                    sample_steps: 30,
                    sample_guide_scale: 5
                };
            } else {
                // Text to Video
                const modelData = await replicate.models.get('wavespeedai', 'wan-2.1-t2v-720p');
                version = modelData.latest_version?.id || '';

                input = {
                    prompt: params.prompt,
                    aspect_ratio: params.aspect_ratio || "16:9",
                    sample_shift: 5,
                    sample_steps: 30,
                    sample_guide_scale: 5
                };
            }
            break;

        case 'llava':
            input = {
                image: params.image,
                prompt: params.prompt || "Describe this video frame in detail, focusing on movement, lighting, and style.",
                max_tokens: 1024,
                temperature: 0.2
            };
            break;
    }

    console.log(`[Replicate] Creating prediction for ${params.model} (Version: ${version})`, { hasMask: !!params.target_mask });

    // Use predictions.create instead of run (ASYNC)
    const prediction = await replicate.predictions.create({
        version: version,
        input: input,
    });

    return prediction;
}

export async function getReplicatePredictionStatus(predictionId: string) {
    if (!token) throw new Error('REPLICATE_API_TOKEN is missing');
    return await replicate.predictions.get(predictionId);
}

export async function generateImageDescription(imageUrl: string): Promise<string> {
    if (!token) throw new Error('REPLICATE_API_TOKEN is missing');

    // Using LLaVA 13B for description
    const output = await replicate.run(
        "yorickvp/llava-13b:b5f6212d8328505531263986382965d956e174b8893796dd7b89f5c4048F190B",
        {
            input: {
                image: imageUrl,
                prompt: "Describe this image in detail, focusing on lighting, atmosphere, colors, and subject style. Write it as a prompt for video generation.",
                max_tokens: 1024,
                temperature: 0.2
            }
        }
    );

    // Output is usually an array of strings
    if (Array.isArray(output)) {
        return output.join('');
    }
    return String(output);
}
