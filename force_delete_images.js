// Force delete ALL images - user wants to start fresh
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, key);

async function main() {
    // Get all images
    const { data: images } = await supabase.from('images').select('*');
    console.log('Current images:', images?.length || 0);

    if (!images || images.length === 0) {
        console.log('No images to delete');
        return;
    }

    // Delete each one
    for (const img of images) {
        console.log(`Deleting: ${img.id} - ${img.prompt?.slice(0, 30)}`);
        const { error } = await supabase.from('images').delete().eq('id', img.id);
        if (error) console.log('  Error:', error.message);
        else console.log('  OK');
    }

    // Verify
    const { data: remaining } = await supabase.from('images').select('id');
    console.log('\nRemaining images:', remaining?.length || 0);
}

main();
