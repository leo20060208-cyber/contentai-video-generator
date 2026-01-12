// Delete all templates except ICE using service role key
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Try service role key first
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Service key available:', !!serviceKey);
console.log('Using key type:', serviceKey ? 'SERVICE_ROLE' : 'ANON');

const supabase = createClient(supabaseUrl, serviceKey || anonKey);

async function main() {
    // Get all templates
    const { data: templates, error } = await supabase
        .from('templates')
        .select('id, title');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Found', templates.length, 'templates');

    // Delete all except ICE
    for (const t of templates) {
        if (t.title && t.title.toLowerCase().includes('ice')) {
            console.log('KEEPING:', t.title);
            continue;
        }

        console.log('Deleting:', t.title, '(id:', t.id, ')');

        const { error: delError } = await supabase
            .from('templates')
            .delete()
            .eq('id', t.id);

        if (delError) {
            console.error('  FAILED:', delError.message);
        } else {
            console.log('  SUCCESS');
        }
    }

    // Final check
    const { data: remaining } = await supabase.from('templates').select('title');
    console.log('\nRemaining:', remaining?.map(t => t.title));
}

main();
