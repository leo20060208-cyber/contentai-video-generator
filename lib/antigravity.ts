import { createClient } from '@supabase/supabase-js';
import { FreepikClient } from './freepik';

// Helper to get Supabase client (lazy initialization to avoid build-time errors)
function getSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase environment variables');
    }
    
    return createClient(supabaseUrl, supabaseKey);
}

// Helper to get FreepikClient (lazy initialization)
function getFreepikClient() {
    return new FreepikClient(process.env.FREEPIK_API_KEY!);
}

export async function generate_antigravity_video(templateId: number, userImageUrl: string) {
    console.log(`[Antigravity] Starting generation for Template #${templateId}`);

    const supabase = getSupabaseClient();
    const freepik = getFreepikClient();

    // 1. Fetch Template Data
    const { data: template, error } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .single();

    if (error || !template) {
        throw new Error(`Template not found: ${error?.message}`);
    }

    // 2. Validate Template Readiness
    // For Antigravity, we prefer having a mask, but if not, we fallback to standard Image-to-Video
    // The prompt requested specifically to use "Kling Elements Pro"

    // 3. Prepare Payload for Kling Elements Pro
    // Kling Elements Pro (kling-elements-pro) allows multiple image inputs.
    // Logic: Input Image (User Product) is the main subject.
    // The Template's "Video" or "Image" acts as the style/frame reference via Prompt?
    // Actually, Kling Elements supports "images" array.
    // If we have a composed "First Frame" (User Image + Background), that would be ideal.
    // But per requirements: "user_image_url" is primary. 
    // And "prompt" guides integration.

    const finalPrompt = `High quality, cinematic, the object highlights integrates naturally into the scene. ${template.title || ''} context.`;

    try {
        // Get the mask URL - could be from replaced_object_mask_url or mask_video_url
        const maskUrl = template.replaced_object_mask_url || template.mask_video_url;
        console.log(`[Antigravity] Sending to AI (Kling Std). Mask: ${maskUrl ? 'YES' : 'NO'}`);

        const result = await freepik.generateVideo({
            model: 'kling-v2.5', // Maps to kling-v2-1-std in FreepikClient
            image_url: userImageUrl,
            static_mask: maskUrl, // Pass the saved mask for motion control
            prompt: finalPrompt,
            negative_prompt: "distortion, morphing, bad physics, floating objects",
            duration: 5
        });

        console.log(`[Antigravity] Task Started: ${result.data.task_id}`);

        // Return the Task ID so the frontend can poll
        return {
            taskId: result.data.task_id,
            status: 'submitted',
            provider: 'freepik-kling'
        };

    } catch (e: any) {
        console.error('[Antigravity] Generation Failed:', e);
        throw e;
    }
}
