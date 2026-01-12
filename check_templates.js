// Check ALL templates and their image URLs
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
    console.log('=== ALL TEMPLATES ===\n');

    const { data: templates, error } = await supabase
        .from('templates')
        .select('id, title, category, type, before_image_url, before_video_url');

    if (error) {
        console.error('Error:', error);
        return;
    }

    templates.forEach(t => {
        console.log(`ID: ${t.id}`);
        console.log(`  Title: ${t.title}`);
        console.log(`  Category: ${t.category}`);
        console.log(`  Type: ${t.type}`);
        console.log(`  Has before_image: ${!!t.before_image_url}`);
        console.log(`  Has before_video: ${!!t.before_video_url}`);
        console.log('');
    });

    console.log(`Total: ${templates.length} templates`);

    // Identify IMAGE templates (have image, no video)
    const imageTemplates = templates.filter(t =>
        t.before_image_url && !t.before_video_url
    );

    console.log(`\nImage templates (no video): ${imageTemplates.length}`);
    imageTemplates.forEach(t => console.log(`  - ${t.title} (${t.id})`));
}

main();
