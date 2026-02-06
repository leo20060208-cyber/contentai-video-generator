// Quick script to check what's stored in the database for preset toggles
import { supabase } from './lib/supabase.js';

async function checkPresetToggles() {
    const { data, error } = await supabase
        .from('site_content')
        .select('*')
        .in('section_key', ['living_background_presets_enabled', 'transition_presets_enabled']);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Database content:');
    console.log(JSON.stringify(data, null, 2));

    data?.forEach(row => {
        console.log(`\n${row.section_key}:`);
        console.log('  Raw content:', row.content);
        console.log('  content.enabled:', row.content?.enabled);
        console.log('  Type:', typeof row.content);
    });
}

checkPresetToggles();
