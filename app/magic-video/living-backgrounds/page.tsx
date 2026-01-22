import { createClient } from '@/lib/supabase/server';
import { LivingBackgroundPageClient } from '@/components/magic/LivingBackgroundPageClient';

export const dynamic = 'force-dynamic';

export default async function LivingBackgroundsPage() {
    const supabase = await createClient();

    // Parallel fetch
    const [
        { data: heroData },
        { data: defaultPromptData },
        { data: presetsData }
    ] = await Promise.all([
        supabase.from('site_content').select('content').eq('section_key', 'magic_video_hub').single(),
        supabase.from('site_content').select('content').eq('section_key', 'living_background_default_prompt').single(),
        supabase.from('prompt_presets').select('*').eq('category', 'living_background').order('created_at', { ascending: false })
    ]);

    // Parse Hero Media
    let heroMedia = null;
    if (heroData?.content?.livingBackgrounds?.mediaUrl) {
        heroMedia = {
            type: heroData.content.livingBackgrounds.mediaType,
            url: heroData.content.livingBackgrounds.mediaUrl
        };
    }

    // Parse Default Prompt
    const defaultPrompt = defaultPromptData?.content?.prompt || '';

    return (
        <LivingBackgroundPageClient
            initialHeroMedia={heroMedia}
            initialDefaultPrompt={defaultPrompt}
            initialPresets={presetsData || []}
        />
    );
}
