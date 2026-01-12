// Check and delete from IMAGES table (user generated images)
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, key);

async function main() {
    // Get ALL images
    const { data: images, error } = await supabase
        .from('images')
        .select('id, prompt, category, url, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        console.log('Error:', error.message);
        return;
    }

    console.log('=== ALL IMAGES IN DATABASE ===');
    console.log('Total:', images.length);

    images.forEach((img, i) => {
        console.log(`\n${i + 1}. ID: ${img.id}`);
        console.log(`   Prompt: ${img.prompt?.slice(0, 50) || 'N/A'}`);
        console.log(`   Category: ${img.category}`);
        console.log(`   Created: ${img.created_at}`);
    });

    // Lab images would have specific prompts or come from Lab flow
    // For now, let's identify which ones to keep:
    // - ICE related images
    // - Lab-created images (if there's a marker)

    const labImages = images.filter(img =>
        img.prompt?.toLowerCase().includes('ice') ||
        img.category === 'Lab' ||
        img.category === 'lab'
    );

    const nonLabImages = images.filter(img =>
        !img.prompt?.toLowerCase().includes('ice') &&
        img.category !== 'Lab' &&
        img.category !== 'lab'
    );

    console.log('\n=== LAB IMAGES (KEEP) ===');
    labImages.forEach(img => console.log(`  - ${img.prompt?.slice(0, 40)}`));

    console.log('\n=== NON-LAB IMAGES (DELETE) ===');
    nonLabImages.forEach(img => console.log(`  - ${img.id}: ${img.prompt?.slice(0, 40)}`));

    // DELETE non-lab images
    if (nonLabImages.length > 0) {
        console.log('\n=== DELETING... ===');
        for (const img of nonLabImages) {
            const { error: delErr } = await supabase.from('images').delete().eq('id', img.id);
            if (delErr) {
                console.log(`FAILED: ${img.id} - ${delErr.message}`);
            } else {
                console.log(`DELETED: ${img.id}`);
            }
        }
    }

    // Final count
    const { data: remaining } = await supabase.from('images').select('id');
    console.log('\n=== REMAINING IMAGES ===');
    console.log('Count:', remaining?.length || 0);
}

main().catch(console.error);
