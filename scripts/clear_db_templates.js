
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.resolve(__dirname, '../.env.local');
console.log('Loading env from:', envPath);
const result = dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Try to get the service role key, fallback to anon
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function clearTemplates() {
    console.log('🧹 Clearing all templates from the database...');

    // Since ID is SERIAL (integer), we can delete where ID > -1
    const { data, error } = await supabase
        .from('templates')
        .delete()
        .gt('id', -1);

    if (error) {
        console.error('❌ Error deleting templates:', JSON.stringify(error, null, 2));
    } else {
        console.log('✅ All templates have been successfully removed.');
    }
}

clearTemplates();
