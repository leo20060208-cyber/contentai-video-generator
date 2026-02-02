import { supabase, isSupabaseConfigured } from '@/lib/supabase';

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
    if (!isSupabaseConfigured) {
        console.warn('⚠️ getUserVideos: Offline Mode - returning empty list');
        return [];
    }
    const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', userId)
        // .not('video_url', 'is', null) // Removed to allow processing videos
        // .neq('video_url', '') // Removed to allow processing videos
        .order('created_at', { ascending: false });

    if (error) {
        // Suppress generic "Failed to fetch" errors which just mean Supabase is unreachable/offline
        const isNetworkError =
            error.message?.includes('fetch') ||
            error.message?.includes('network') ||
            // Supabase 500s can sometimes look like this if the URL is invalid
            (typeof error.details === 'string' && error.details.includes('fetch'));

        if (isNetworkError) {
            console.warn('⚠️ Supabase unreachable (Offline Mode). Returning empty user videos list.');
        } else {
            console.error('Error fetching videos:', error);
        }
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

export interface ProductSlot {
    id: string;
    name: string;
    description?: string;
    isRequired: boolean;
    timeRange?: {
        startSecond: number;
        endSecond: number;
    };
    defaultPromptPart?: string;
    type?: 'product' | 'person';
}

export interface Template {
    id: number;
    title: string;
    category: string;
    type?: 'video' | 'image';
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
    mask_video_url?: string;
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

    // Product Slots - Time-based product configuration
    product_slots?: ProductSlot[];

    // Original Product Image (used for generating the result)
    product_image_url?: string;
    // Marked Product Image (with underlined products for AI)
    product_outline_image_url?: string;

    // Allowed Tiers Configuration
    allowed_tiers?: string[]; // e.g. ['normal', 'pro']

    // Explore Library Fields
    is_explore?: boolean;
    explore_grid_cols?: number;
    explore_grid_rows?: number;

    // Additional fields used in Lab
    video_url?: string | null;
    is_pro?: boolean;
}

// Mock data removed as per user request
export const MOCK_TEMPLATES: Template[] = [];

export async function getTemplates(): Promise<Template[]> {
    const { data, error } = await supabase
        .from('templates')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        console.error('❌ Supabase getTemplates error details:', JSON.stringify(error, null, 2));
        return [];
    }

    console.log('✅ Supabase getTemplates data length:', data?.length);
    if (data && data.length > 0) {
        console.log('Sample template:', data[0].title);
    }

    // Filter out known fake templates by title and System/Hero templates
    const BLACKLIST_TITLES = [
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
        'Before & After',
        'Hero Video',
        'Hero Image',
        'Hero Library'
    ];

    const cleanData = (data || []).filter(t => {
        // Filter out titles in blacklist
        if (BLACKLIST_TITLES.includes(t.title)) return false;

        // Filter out strict Hero templates (identified by description tag)
        if (t.description && (t.description.includes('[HERO_VIDEO]') || t.description.includes('[HERO_IMAGE]') || t.description.includes('[HERO_LIBRARY]'))) {
            return false;
        }

        return true;
    });

    if (cleanData.length === 0) {
        console.log("No templates found in DB after cleaning.");
        return [];
    }

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

export async function setHeroTemplate(id: number, type: 'video' | 'image'): Promise<boolean> {
    // First, clear existing hero of this type
    const tag = `[HERO_${type.toUpperCase()}]`;
    const { data: allTemplates } = await supabase.from('templates').select('*');

    if (allTemplates) {
        for (const t of allTemplates) {
            if (t.description?.includes(tag)) {
                const newDesc = t.description.replace(tag, '').trim();
                await supabase.from('templates').update({ description: newDesc }).eq('id', t.id);
            }
        }
    }

    // Set new hero
    const calculateNewDescription = (currentDesc: string | null) => {
        const clean = (currentDesc || '').trim();
        return `${clean} ${tag}`;
    };

    // Fetch current description to append
    const { data: current } = await supabase.from('templates').select('description').eq('id', id).single();
    if (!current) return false;

    const { error } = await supabase
        .from('templates')
        .update({ description: calculateNewDescription(current.description) })
        .eq('id', id);

    if (error) {
        console.error(`Error setting hero ${type}:`, error);
        return false;
    }
    return true;
}

export async function getHeroTemplate(type: 'video' | 'image' | 'library'): Promise<Template | null> {
    const tag = `[HERO_${type.toUpperCase()}]`;
    const { data, error } = await supabase
        .from('templates')
        .select('*')
        .ilike('description', `%${tag}%`)
        .limit(1)
        .maybeSingle();

    if (error) {
        console.warn(`getHeroTemplate ${type} error:`, error);
        return null;
    }
    return data;
}

export async function setHeroFromTask(taskId: string, type: 'video' | 'image', coverUrl?: string): Promise<boolean> {
    // 1. Get the video from the task_id
    const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .select('*')
        .eq('task_id', taskId)
        .single();

    if (videoError || !videoData) {
        console.error('Error fetching video from task:', videoError);
        return false;
    }

    const { video_url } = videoData;
    if (!video_url) return false;

    // 2. Find or Create the Hero Template
    let heroTemplate = await getHeroTemplate(type);

    if (!heroTemplate) {
        // Create new if doesn't exist
        const tag = `[HERO_${type.toUpperCase()}]`;
        const { data: newTemplate, error: createError } = await supabase
            .from('templates')
            .insert([{
                title: `Hero ${type === 'video' ? 'Video' : 'Image'}`,
                category: 'VISUAL',
                before_image_url: coverUrl || '',
                after_image_url: coverUrl || '',
                description: `Generated from Lab. ${tag}`,
                views_count: '0',
                is_trending: false
            }])
            .select()
            .single();

        if (createError || !newTemplate) {
            console.error('Error creating hero template:', createError);
            return false;
        }
        heroTemplate = newTemplate;
    }

    // 3. Update the template with the new content
    const updates: any = {};
    if (type === 'video') {
        updates.after_video_url = video_url;
        if (coverUrl) updates.after_image_url = coverUrl;
    } else {
        // Image mode
        if (coverUrl) updates.after_image_url = coverUrl;
        else updates.after_image_url = video_url;
    }

    if (!heroTemplate) return false;

    const { error: updateError } = await supabase
        .from('templates')
        .update(updates)
        .eq('id', heroTemplate.id);

    if (updateError) {
        console.error('Error updating hero template:', updateError);
        return false;
    }

    return true;
}

export async function updateHeroContent(url: string, type: 'video' | 'image' | 'library'): Promise<boolean> {
    // 1. Find or Create the Hero Template
    let heroTemplate = await getHeroTemplate(type);

    if (!heroTemplate) {
        // Create new if doesn't exist
        const tag = `[HERO_${type.toUpperCase()}]`;
        const title = type === 'library' ? 'Hero Library' : type === 'video' ? 'Hero Video' : 'Hero Image';

        const { data: newTemplate, error: createError } = await supabase
            .from('templates')
            .insert([{
                title: title,
                category: 'VISUAL',
                before_image_url: url, // Use the uploaded URL as thumbnail/cover
                after_image_url: url,
                after_video_url: type === 'video' || type === 'library' ? url : null, // Library can be video too
                description: `Uploaded from Lab. ${tag}`,
                views_count: '0',
                is_trending: false
            }])
            .select()
            .single();

        if (createError || !newTemplate) {
            console.error('Error creating hero template:', createError);
            return false;
        }
        heroTemplate = newTemplate;
    }

    if (!heroTemplate) return false;

    // 2. Update the template with the new content
    const updates: any = {};
    if (type === 'video') {
        updates.after_video_url = url;
        updates.after_image_url = url;
    } else if (type === 'library') {
        // Library can be image or video depending on valid url extension, but we save to both for flexibility
        // If it's a video file type:
        if (url.match(/\.(mp4|webm|mov)$/i)) {
            updates.after_video_url = url;
            updates.after_image_url = url; // thumb
        } else {
            updates.after_image_url = url;
            updates.before_image_url = url;
        }
    } else {
        // Image mode
        updates.after_image_url = url;
        updates.before_image_url = url;
    }

    const { error: updateError } = await supabase
        .from('templates')
        .update(updates)
        .eq('id', heroTemplate.id);

    if (updateError) {
        console.error('Error updating hero template:', updateError);
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
    if (!isSupabaseConfigured) {
        return [];
    }
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
    if (!isSupabaseConfigured) {
        return [];
    }
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
