
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deleteBadImage() {
    console.log('Searching for images with prompt starting with "Create an exact"...');

    // 1. Find the image(s)
    const { data: images, error: searchError } = await supabase
        .from('images')
        .select('*')
        .ilike('prompt', 'Create an exact%');

    if (searchError) {
        console.error('Error searching:', searchError);
        return;
    }

    if (!images || images.length === 0) {
        console.log('No matching images found.');
        return;
    }

    console.log(`Found ${images.length} images to delete.`);
    images.forEach(img => console.log(`- ID: ${img.id}, Prompt: ${img.prompt.substring(0, 50)}...`));

    // 2. Delete them
    const { error: deleteError } = await supabase
        .from('images')
        .delete()
        .ilike('prompt', 'Create an exact%');

    if (deleteError) {
        console.error('Error deleting:', deleteError);
    } else {
        console.log('Successfully deleted bad images.');
    }
}

deleteBadImage();
