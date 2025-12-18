
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    console.log('URL:', supabaseUrl);
    console.log('Key:', supabaseKey ? 'Found' : 'Missing');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProcessing() {
    const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) console.error(error);
    else {
        console.log('--- RECENT VIDEOS ---');
        data.forEach(v => {
            console.log(`ID: ${v.id} | Status: ${v.status} | TaskID: ${v.task_id} | Model: ${v.model} | Created: ${v.created_at}`);
        });
        console.log('---------------------');
    }
}

checkProcessing();
