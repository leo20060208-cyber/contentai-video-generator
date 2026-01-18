const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hjttjmqawnasdfmvpobn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqdHRqbXFhd25hc2RmbXZwb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTA4MzkwMywiZXhwIjoyMDgwNjU5OTAzfQ.fx9kzR585EBxwW0f4gXQXg9J22tmBHcNT0coxKBNyfQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updatePrompts() {
    console.log('Updating prompts...');

    const prompts = [
        {
            key: 'video_editing_default_prompt',
            content: {
                prompt: `Recreate the reference video EXACTLY, shot by shot, frame by frame. The ONLY changes allowed are the instructions below. Maintain original camera movement, lighting, and physics.

{{INSERTIONS}}

STRICT RECREATION REQUIREMENTS:
- EXACT DURATION: {{DURATION}} seconds. Do not change the speed.
- Camera movement: identical to original.
- Lighting: identical direction, intensity, shadows.
- Physics: realistic material behavior.
- 8K resolution, high fidelity, photorealistic.
- OUTPUT VIDEO MUST HAVE THE SAME RESOLUTION AND ASPECT RATIO AS THE REFERENCE VIDEO.`
            }
        },
        {
            key: 'living_background_default_prompt',
            content: {
                prompt: `Keep the main subject/product perfectly still and sharp. Animate only the background areas I have painted with a smooth, natural motion.

STRICT RECREATION REQUIREMENTS:
- EXACT DURATION: {{DURATION}} seconds. Do not change the speed.
- Maintain original style and lighting.
- Photorealistic, high fidelity.
- OUTPUT VIDEO MUST HAVE THE SAME RESOLUTION AND ASPECT RATIO AS THE REFERENCE IMAGE.`
            }
        },
        {
            key: 'directors_cut_default_prompt',
            content: {
                prompt: `Create a smooth, cinematic transition between these frames. Maintain consistency in lighting, style, and subject matter throughout the sequence.`
            }
        },
        {
            key: 'image_editing_default_prompt',
            content: {
                prompt: `{{INSERTIONS}}

STRICT RECREATION REQUIREMENTS:
1. PIXEL PERFECT: The unmasked areas must match Image 1 EXACTLY.
2. MASK GUIDE: Do NOT render the colored markers from Image 2. They are invisible guides.
3. Lighting: identical direction, intensity, shadows.
4. Physics: realistic material behavior.
5. Photorealistic, high fidelity.
6. OUTPUT IMAGE MUST HAVE THE SAME RESOLUTION AND ASPECT RATIO AS THE REFERENCE IMAGE.`
            }
        }
    ];

    for (const p of prompts) {
        const { error } = await supabase
            .from('site_content')
            .upsert({ section_key: p.key, content: p.content, updated_at: new Date() }, { onConflict: 'section_key' });

        if (error) {
            console.error(`Error updating ${p.key}:`, error);
        } else {
            console.log(`Updated ${p.key}`);
        }
    }
}

updatePrompts();
