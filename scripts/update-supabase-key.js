const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');

// Correct service role key provided by user
const correctServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqdHRqbXFhd25hc2RmbXZwb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTA4MzkwMywiZXhwIjoyMDgwNjU5OTAzfQ.fx9kzR585EBxwW0f4gXQXg9J22tmBHcNT0coxKBNyfQ';

try {
    let content = fs.readFileSync(envPath, 'utf8');

    // Replace the SUPABASE_SERVICE_ROLE_KEY line
    const regex = /^SUPABASE_SERVICE_ROLE_KEY=.*$/m;

    if (content.match(regex)) {
        console.log('Found SUPABASE_SERVICE_ROLE_KEY. Replacing with correct key...');
        content = content.replace(regex, `SUPABASE_SERVICE_ROLE_KEY=${correctServiceRoleKey}`);
    } else {
        console.log('SUPABASE_SERVICE_ROLE_KEY not found. Adding it...');
        content += `\nSUPABASE_SERVICE_ROLE_KEY=${correctServiceRoleKey}`;
    }

    // Also update the NEXT_PUBLIC variant if it exists
    const regexPublic = /^NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=.*$/m;
    if (content.match(regexPublic)) {
        console.log('Also updating NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY...');
        content = content.replace(regexPublic, `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=${correctServiceRoleKey}`);
    }

    fs.writeFileSync(envPath, content);
    console.log('SUCCESS: .env.local has been updated with the correct service role key.');
} catch (error) {
    console.error('FAILED:', error);
}
