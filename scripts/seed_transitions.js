const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Start using service role key if available for RLS bypass, otherwise anon
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const transitions = [
    {
        name: 'Zoom In',
        description: 'Focuses on the center/subject.',
        prompt_template: 'Camera Movement: Slow, steady zoom in towards the center subject. Maintain focus.',
        category: 'transition'
    },
    {
        name: 'Zoom Out',
        description: 'Reveals more context.',
        prompt_template: 'Camera Movement: Slow, steady zoom out to reveal the environment. Maintain focus.',
        category: 'transition'
    },
    {
        name: 'Pan Left',
        description: 'Moves camera view left.',
        prompt_template: 'Camera Movement: Smooth pan to the left.',
        category: 'transition'
    },
    {
        name: 'Pan Right',
        description: 'Moves camera view right.',
        prompt_template: 'Camera Movement: Smooth pan to the right.',
        category: 'transition'
    },
    {
        name: 'Pan Up',
        description: 'Moves camera view up.',
        prompt_template: 'Camera Movement: Smooth tilt/pan upwards.',
        category: 'transition'
    },
    {
        name: 'Pan Down',
        description: 'Moves camera view down.',
        prompt_template: 'Camera Movement: Smooth tilt/pan downwards.',
        category: 'transition'
    }
];

async function seed() {
    console.log('Seeding transitions...');

    for (const t of transitions) {
        const { data, error } = await supabase
            .from('prompt_presets')
            .select('id')
            .eq('name', t.name)
            .eq('category', 'transition')
            .maybeSingle();

        if (error) {
            console.error(`Error checking transition ${t.name}:`, error.message);
            continue;
        }

        if (data) {
            console.log(`Transition "${t.name}" already exists. Skipping.`);
        } else {
            const { error: insertError } = await supabase
                .from('prompt_presets')
                .insert([t]);

            if (insertError) {
                console.error(`Error inserting "${t.name}":`, insertError.message);
            } else {
                console.log(`Inserted "${t.name}"`);
            }
        }
    }
    console.log('Seeding complete.');
}

seed();
