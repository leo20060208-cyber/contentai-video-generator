import { createClient } from '@/lib/supabase/server';
import { DirectorsCutPageClient } from '@/components/magic/DirectorsCutPageClient';

export const dynamic = 'force-dynamic';

export default async function DirectorsCutPage() {
    const supabase = await createClient();

    // Parallel fetch for speed
    const [
        { data: heroData },
        { data: defaultPromptData },
        { data: presetsData }
    ] = await Promise.all([
        supabase.from('site_content').select('content').eq('section_key', 'magic_video_hub').single(),
        supabase.from('site_content').select('content').eq('section_key', 'directors_cut_default_prompt').single(),
        supabase.from('prompt_presets').select('*').eq('category', 'transition').order('created_at', { ascending: false })
    ]);

    // Parse Hero Media
    let heroMedia = null;
    if (heroData?.content?.directorsCut?.mediaUrl) {
        heroMedia = {
            type: heroData.content.directorsCut.mediaType,
            url: heroData.content.directorsCut.mediaUrl
        };
    }

    // Parse Default Prompt
    const defaultPrompt = defaultPromptData?.content?.prompt || '';

    return (
        <DirectorsCutPageClient
            initialHeroMedia={heroMedia}
            initialDefaultPrompt={defaultPrompt}
            initialPresets={presetsData || []}
        />
    );
}
