import { supabase } from '@/lib/supabase';

export interface SectionContent {
    title: string;
    description: string;
    features: FeatureItem[];
}

export interface FeatureItem {
    title: string;
    description: string;
    tags: string[];
    icon: string;
    color: string;
    reference_image?: string;
    product_image?: string;
    result_image?: string;
    result_label?: string;
}

export async function getSectionContent(sectionKey: string) {
    const { data, error } = await supabase
        .from('site_content')
        .select('content')
        .eq('section_key', sectionKey)
        .maybeSingle();

    if (error) {
        // PGRST116 means no rows found (expected for new sections)
        if (error.code === 'PGRST116') return null;

        console.error(`Error fetching content for ${sectionKey}:`, error);
        return null;
    }

    return data?.content;
}

export async function updateSectionContent(sectionKey: string, content: any) {
    const { error } = await supabase
        .from('site_content')
        .upsert({ section_key: sectionKey, content, updated_at: new Date() }, { onConflict: 'section_key' });

    if (error) {
        throw error;
    }
}
