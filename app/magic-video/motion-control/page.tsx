import { createClient } from '@/lib/supabase/server';
import { MotionControlPageClient } from '@/components/magic/MotionControlPageClient';

export const dynamic = 'force-dynamic';

export default async function MotionControlPage() {
    const supabase = await createClient();

    // Parallel fetch for speed
    const [
        { data: heroData },
        { data: defaultPromptData },
        { data: presetsData }
    ] = await Promise.all([
        supabase.from('site_content').select('content').eq('section_key', 'magic_video_hub').single(),
        supabase.from('site_content').select('content').eq('section_key', 'motion_control_default_prompt').single(),
        supabase.from('prompt_presets').select('*').eq('category', 'motion_control').order('created_at', { ascending: false })
    ]);

    // Parse Hero Media
    let heroMedia = null;
    if (heroData?.content?.motionControl?.mediaUrl) {
        heroMedia = {
            type: heroData.content.motionControl.mediaType,
            url: heroData.content.motionControl.mediaUrl
        };
    } else {
        // Fallback to match Hub Page default
        heroMedia = {
            type: 'image',
            url: '/images/what-we-do/recreate-template-video-2.png'
        };
    }

    // Parse Default Prompt
    const defaultPrompt = defaultPromptData?.content?.prompt || '';

    return (
        <MotionControlPageClient
            initialHeroMedia={heroMedia}
            initialDefaultPrompt={defaultPrompt}
            initialPresets={presetsData || []}
        />
    );
}
