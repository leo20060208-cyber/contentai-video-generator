const { createClient } = require('@supabase/supabase-js');

// Credentials from .env.local
const SUPABASE_URL = 'https://hjttjmqawnasdfmvpobn.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqdHRqbXFhd25hc2RmbXZwb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTA4MzkwMywiZXhwIjoyMDgwNjU5OTAzfQ.fx9kzR585EBxwW0f4gXQXg9J22tmBHcNT0coxKBNyfQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspectConstraint() {
    console.log('Inspecting constraint...');

    // 1. Get a valid user to satisfy Foreign Key constraint
    const { data: users, error: userError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (userError || !users || users.users.length === 0) {
        console.error('Could not fetch a valid user for probing:', userError);
        return;
    }
    const userId = users.users[0].id;
    console.log(`Using real User ID for probe: ${userId}`);

    // Expanded list of probability
    const types = ['usage', 'purchase', 'spent', 'bought', 'deduction', 'refill', 'credit', 'debit', 'subtraction', 'cost', 'fee', 'charge', 'CONTENT_GENERATION', 'generation'];
    // const userId = '00000000-0000-0000-0000-000000000000'; // Dummy - REMOVED

    for (const t of types) {
        try {
            // We can't easily insert into `credit_transactions` directly if RLS is on, but we are admin.
            // We will try to insert a dummy row.
            const { error } = await supabase.from('credit_transactions').insert({
                user_id: userId,
                amount: 0,
                type: t,
                description: 'Probe',
                balance_after: 100 // Required field
            });

            if (error) {
                console.log(`Type '${t}' rejected: ${error.message} (${error.details || ''})`);
            } else {
                console.log(`SUCCESS! Type '${t}' is allowed!`);
                // Cleanup happens automatically if we don't commit? No, via API it commits.
                await supabase.from('credit_transactions').delete().eq('user_id', userId).eq('type', t);
                return;
            }
        } catch (e) { console.log(e); }
    }
}

inspectConstraint();
