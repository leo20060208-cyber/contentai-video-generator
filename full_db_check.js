// Full DB check
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('URL:', supabaseUrl);
console.log('Key type:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE' : 'ANON');

const supabase = createClient(supabaseUrl, key);

async function main() {
    // Check templates
    const { data: templates, error: tErr } = await supabase.from('templates').select('id, title');
    console.log('\n=== TEMPLATES ===');
    console.log('Count:', templates?.length || 0);
    if (tErr) console.log('Error:', tErr.message);
    templates?.forEach(t => console.log(`  ${t.id}: ${t.title}`));

    // Check images
    const { data: images, error: iErr } = await supabase.from('images').select('id, prompt, url').limit(10);
    console.log('\n=== IMAGES ===');
    console.log('Count:', images?.length || 0);
    if (iErr) console.log('Error:', iErr.message);
    images?.forEach(i => console.log(`  ${i.id}: ${i.prompt?.slice(0, 40)}`));

    // DELETE ALL TEMPLATES except ICE
    if (templates && templates.length > 0) {
        console.log('\n=== DELETING NON-ICE TEMPLATES ===');
        for (const t of templates) {
            if (t.title?.toLowerCase().includes('ice')) {
                console.log(`KEEPING: ${t.title}`);
                continue;
            }
            const { error } = await supabase.from('templates').delete().eq('id', t.id);
            if (error) {
                console.log(`FAILED to delete ${t.title}: ${error.message}`);
            } else {
                console.log(`DELETED: ${t.title}`);
            }
        }
    }

    // Final count
    const { data: remaining } = await supabase.from('templates').select('id, title');
    console.log('\n=== REMAINING TEMPLATES ===');
    console.log('Count:', remaining?.length || 0);
    remaining?.forEach(t => console.log(`  ${t.id}: ${t.title}`));
}

main().catch(console.error);
