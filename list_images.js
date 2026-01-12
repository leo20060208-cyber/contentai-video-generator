// Run with: node list_images.js
// Lists recently created images to understand what to clean up

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function listImages() {
    const { data: images, error } = await supabase
        .from('images')
        .select('id, prompt, category, url, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`\n=== Recent ${images.length} IMAGES ===\n`);
    images.forEach((img, i) => {
        console.log(`[${i + 1}] ID: ${img.id}`);
        console.log(`    Prompt: ${img.prompt?.substring(0, 50)}...`);
        console.log(`    Category: ${img.category}`);
        console.log(`    Created: ${img.created_at}`);
        console.log('');
    });
}

listImages();
