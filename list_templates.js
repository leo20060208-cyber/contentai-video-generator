// Run with: node list_templates.js
// Lists all templates to see what we have

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function listTemplates() {
    const { data: templates, error } = await supabase
        .from('templates')
        .select('*');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`\n=== ${templates.length} TEMPLATES ===\n`);
    templates.forEach((t, i) => {
        console.log(`[${i + 1}] ID: ${t.id}`);
        console.log(`    Title: ${t.title}`);
        console.log(`    Category: ${t.category}`);
        console.log(`    Type: ${t.type}`);
        console.log(`    Has Before Video: ${!!t.before_video_url}`);
        console.log(`    Has Before Image: ${!!t.before_image_url}`);
        console.log(`    Has Mask: ${!!t.replaced_object_mask_url}`);
        console.log('');
    });
}

listTemplates();
