import { supabase } from '@/lib/supabase';

export interface Video {
    id: string;
    user_id: string;
    title: string;
    thumbnail_url: string | null;
    video_url: string | null;
    duration: string | null;
    views: number;
    status: 'processing' | 'completed' | 'failed';
    created_at: string;
    // Extended fields
    audio_url?: string | null;
    has_audio?: boolean;
    audio_duration?: number | null;
    project_data?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    source_video_url?: string | null;
    refinement_prompt?: string | null;
    parent_video_id?: string | null;
}

export async function getUserVideos(userId: string): Promise<Video[]> {
    const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', userId)
        // .not('video_url', 'is', null) // Removed to allow processing videos
        // .neq('video_url', '') // Removed to allow processing videos
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching videos:', error);
        return [];
    }

    return data || [];
}

export async function createVideo(
    video: Omit<Video, 'id' | 'created_at' | 'views'>
): Promise<Video | null> {
    const { data, error } = await supabase
        .from('videos')
        .insert([{ ...video, views: 0 }])
        .select()
        .single();

    if (error) {
        console.error('Error creating video:', error);
        return null;
    }

    return data;
}

export async function updateVideo(
    id: string,
    updates: Partial<Omit<Video, 'id' | 'user_id' | 'created_at'>>
): Promise<Video | null> {
    const { data, error } = await supabase
        .from('videos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating video:', error);
        return null;
    }

    return data;
}

export async function deleteVideo(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting video:', error);
        return false;
    }

    return true;
}

export async function getVideo(id: string): Promise<Video | null> {
    const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching video:', error);
        return null;
    }

    return data;
}

export async function saveTemplate(userId: string, templateId: number): Promise<boolean> {
    const { error } = await supabase
        .from('saved_templates')
        .insert([{ user_id: userId, template_id: templateId }]);

    if (error) {
        console.error('Error saving template:', error);
        return false;
    }

    return true;
}

export async function unsaveTemplate(userId: string, templateId: number): Promise<boolean> {
    const { error } = await supabase
        .from('saved_templates')
        .delete()
        .eq('user_id', userId)
        .eq('template_id', templateId);

    if (error) {
        console.error('Error unsaving template:', error);
        return false;
    }

    return true;
}

export interface Template {
    id: number;
    title: string;
    category: string;
    before_image_url: string;
    after_image_url: string;
    before_video_url?: string | null;
    after_video_url?: string | null;
    views_count: string;
    is_trending: boolean;
    // New multi-method generation fields
    generation_method?: 'prompt_images' | 'video_to_video' | 'template_video';
    template_type?: 'recreate' | 'inpainting' | 'composite';
    ai_model?: string;
    reference_images?: {
        start: string;
        middle: string;
        end: string;
    };
    keyframe_prompts?: {
        start: string;
        middle: string;
        end: string;
    };
    product_swap_prompt?: string;
    template_video_url?: string;
    estimated_cost_credits?: number; // Estimated cost in credits
    replaced_object_mask_url?: string; // URL of the mask defining the object to replace
    hidden_prompt?: string;
    description?: string;

    // Composite / Clean Plate fields
    clean_background_url?: string;
    style_prompt?: string; // Prompt regarding lighting/style from Vision analysis
    motion_data?: any; // JSON object for match moving coordinates
    required_image_count?: number;
    image_descriptions?: string[]; // e.g. ["Front view", "Back view"]
    image_instructions?: string; // Specific instructions for image validity
    duration?: number; // Duration of the generated video in seconds
}

export async function getTemplates(): Promise<Template[]> {
    const { data, error } = await supabase
        .from('templates')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        console.error('Error fetching templates:', error);
        return [];
    }

    // Filter out known fake templates by title
    // Filter out known fake templates by title
    const FAKE_TITLES = [
        'Product Showcase',
        'Unboxing Experience',
        'Skincare Routine',
        'Food Commercial',
        'Fashion Reel',
        'Tech Product Demo',
        'Lifestyle Shot',
        'Makeup Tutorial',
        'Dropship Winner',
        'Street Style',
        'Before & After'
    ];

    const cleanData = (data || []).filter(t => !FAKE_TITLES.includes(t.title));

    return cleanData;
}

export async function deleteTemplate(id: number): Promise<boolean> {
    const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting template:', error);
        return false;
    }
    return true;
}

export async function getCategories(): Promise<string[]> {
    try {
        const { data, error } = await supabase
            .from('templates')
            .select('category');

        if (error) throw error;

        // Strictly return only these categories as requested, ensuring no old/other categories appear in filters
        return ['All', 'VISUAL', 'CLOTHING BRANDS', 'ASMR', 'DROP SHIPPING', 'ECOMMERCE', 'BRAND', 'VISUAL TEMPLATES', 'TEMPLATES'];
    } catch {
        // Fallback
        return ['All', 'VISUAL', 'CLOTHING BRANDS', 'ASMR', 'DROP SHIPPING', 'ECOMMERCE', 'BRAND', 'VISUAL TEMPLATES', 'TEMPLATES'];
    }
}

export async function getSavedTemplatesWithData(userId: string): Promise<Template[]> {
    try {
        // First, get the saved template IDs
        const { data: savedData, error: savedError } = await supabase
            .from('saved_templates')
            .select('template_id')
            .eq('user_id', userId);

        if (savedError) {
            console.error('Error fetching saved templates:', savedError.message || savedError);
            return [];
        }

        if (!savedData || savedData.length === 0) {
            console.log('No saved templates for user', userId);
            return [];
        }

        // Extract template IDs
        const templateIds = savedData.map(item => item.template_id);

        // Then fetch the actual templates
        const { data: templatesData, error: templatesError } = await supabase
            .from('templates')
            .select('*')
            .in('id', templateIds);

        if (templatesError) {
            console.error('Error fetching template data:', templatesError.message || templatesError);
            return [];
        }

        console.log(`Fetched ${templatesData?.length || 0} saved templates for user ${userId}`);
        return templatesData || [];
    } catch (err) {
        console.error('Exception in getSavedTemplatesWithData:', err);
        return [];
    }
}

export async function getSavedTemplates(userId: string): Promise<number[]> {
    const { data, error } = await supabase
        .from('saved_templates')
        .select('template_id')
        .eq('user_id', userId);

    if (error) {
        console.error('Error fetching saved templates:', error);
        return [];
    }

    return (data || []).map(item => item.template_id);
}
