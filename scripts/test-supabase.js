const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

// Manually load .env.local
const envPath = path.resolve(__dirname, '../.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const url = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

console.log('--- SUPABASE CONNECTION TEST ---');
console.log('URL:', url);
console.log('Service Role Key:', serviceRoleKey ? `${serviceRoleKey.substring(0, 50)}... (length: ${serviceRoleKey.length})` : 'MISSING');

async function testConnection() {
    try {
        console.log('\nTesting with Service Role Key...');
        const supabase = createClient(url, serviceRoleKey);

        // Try a simple query
        const { data, error } = await supabase.from('profiles').select('id').limit(1);

        if (error) {
            console.log('[ERROR] Supabase query failed:', error);
        } else {
            console.log('[SUCCESS] Supabase connection works! Got data:', data);
        }
    } catch (err) {
        console.error('[EXCEPTION]', err.message);
    }

    try {
        console.log('\nTesting with Anon Key...');
        const supabaseAnon = createClient(url, anonKey);

        const { data, error } = await supabaseAnon.from('profiles').select('id').limit(1);

        if (error) {
            console.log('[ERROR] Supabase (anon) query failed:', error);
        } else {
            console.log('[SUCCESS] Supabase (anon) connection works! Got data:', data);
        }
    } catch (err) {
        console.error('[EXCEPTION]', err.message);
    }
}

testConnection();
