
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Check if we have service role key, otherwise anon key might not have permission depending on RLS. 
// However, my RLS policy for 'insert' allows 'authenticated'. 
// To run this as a script without a user session, I effectively need SERVICE_ROLE_KEY or I need to disable RLS temporarily.
// Or I can use the service role key if available in .env.local.
// Usually .env.local has SUPABASE_SERVICE_ROLE_KEY.

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const presets = [
    {
        name: "Natura (fulles, herba)",
        description: "...soft wind rustling through leaves and tall grass.",
        prompt_template: "The foreground subject remains absolutely still, sharp, and in perfect focus. Subtle, realistic motion is applied exclusively to the background, which should be softly out of focus (bokeh effect). Soft wind rustling through leaves and tall grass. Maintain strong temporal consistency. Professional studio lighting, 4k, high resolution."
    },
    {
        name: "Ciutat (llums, trànsit)",
        description: "...shimmering city lights, gentle car movement blur, and light atmospheric haze.",
        prompt_template: "The foreground subject remains absolutely still, sharp, and in perfect focus. Subtle, realistic motion is applied exclusively to the background, which should be softly out of focus (bokeh effect). Shimmering city lights, gentle car movement blur, and light atmospheric haze. Maintain strong temporal consistency. Professional studio lighting, 4k, high resolution."
    },
    {
        name: "Aigua (mar, riu, pluja)",
        description: "...gentle water ripples, distant waves, or soft rain falling.",
        prompt_template: "The foreground subject remains absolutely still, sharp, and in perfect focus. Subtle, realistic motion is applied exclusively to the background, which should be softly out of focus (bokeh effect). Gentle water ripples, distant waves, or soft rain falling. Maintain strong temporal consistency. Professional studio lighting, 4k, high resolution."
    },
    {
        name: "Cels (núvols, fum)",
        description: "...slow-moving clouds, drifting smoke, or subtle atmospheric fog.",
        prompt_template: "The foreground subject remains absolutely still, sharp, and in perfect focus. Subtle, realistic motion is applied exclusively to the background, which should be softly out of focus (bokeh effect). Slow-moving clouds, drifting smoke, or subtle atmospheric fog. Maintain strong temporal consistency. Professional studio lighting, 4k, high resolution."
    },
    {
        name: "Fons abstractes/decolorats",
        description: "...gradual color shifts, subtle light pulsations, or slowly swirling bokeh effects.",
        prompt_template: "The foreground subject remains absolutely still, sharp, and in perfect focus. Subtle, realistic motion is applied exclusively to the background, which should be softly out of focus (bokeh effect). Gradual color shifts, subtle light pulsations, or slowly swirling bokeh effects. Maintain strong temporal consistency. Professional studio lighting, 4k, high resolution."
    },
    {
        name: "Neu / Partícules",
        description: "...light snowfall, gentle drifting snow, or subtle floating dust.",
        prompt_template: "The foreground subject remains absolutely still, sharp, and in perfect focus. Subtle, realistic motion is applied exclusively to the background, which should be softly out of focus (bokeh effect). Light snowfall, gentle drifting snow, or subtle floating dust. Maintain strong temporal consistency. Professional studio lighting, 4k, high resolution."
    },
    {
        name: "Objectes en moviment (molt subtil)",
        description: "...very subtle movement of distant objects like a slowly rotating fan or a distant flag waving gently.",
        prompt_template: "The foreground subject remains absolutely still, sharp, and in perfect focus. Subtle, realistic motion is applied exclusively to the background, which should be softly out of focus (bokeh effect). Very subtle movement of distant objects like a slowly rotating fan or a distant flag waving gently. Maintain strong temporal consistency. Professional studio lighting, 4k, high resolution."
    }
];

async function seed() {
    console.log('Seeding presets...');

    // Optional: clear existing to avoid duplicates if running multiple times? 
    // For now, let's just insert. Duplicate names might be annoying but harmless.
    // Ideally checking if exists.

    for (const p of presets) {
        const { data: existing } = await supabase.from('prompt_presets').select('id').eq('name', p.name).single();
        if (existing) {
            console.log(`Skipping ${p.name}, already exists.`);
            continue;
        }

        const { error } = await supabase.from('prompt_presets').insert([p]);
        if (error) {
            console.error(`Error inserting ${p.name}:`, error);
        } else {
            console.log(`Inserted ${p.name}`);
        }
    }
    console.log('Done.');
}

seed();
