const { createClient } = require('@supabase/supabase-js');

// Hardcoded credentials for this check script only
const SUPABASE_URL = 'https://hjttjmqawnasdfmvpobn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqdHRqbXFhd25hc2RmbXZwb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTA4MzkwMywiZXhwIjoyMDgwNjU5OTAzfQ.fx9kzR585EBxwW0f4gXQXg9J22tmBHcNT0coxKBNyfQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkFunctions() {
    console.log('Checking database functions...');

    const dummyUUID = '00000000-0000-0000-0000-000000000000';

    try {
        const { data, error } = await supabase.rpc('deduct_credits_v2', {
            p_user_id: dummyUUID,
            p_amount: 1,
            p_description: 'Test Check'
        });

        if (error) {
            console.error('RPC Error:', error);
        } else {
            console.log('Function exists! Result (expected false/error for dummy user):', data);
        }
    } catch (e) {
        console.error('Exception calling RPC:', e);
    }
}

checkFunctions();
