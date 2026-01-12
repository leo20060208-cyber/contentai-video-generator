const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');

// Service role key from the user's env (already there as NEXT_PUBLIC_)
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqdHRqbXFhd25hc2RmbXZwb2JuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTA4MzkwMywiZXhwIjoyMDgwNjU5OTkwM30.fx9kzR585EBxwW0f4gXQXg9J22tmBHcNT0coxKBNyfQ';

try {
    let content = fs.readFileSync(envPath, 'utf8');

    // Check if SUPABASE_SERVICE_ROLE_KEY (without NEXT_PUBLIC_) exists
    if (content.includes('SUPABASE_SERVICE_ROLE_KEY=') && !content.includes('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=')) {
        console.log('SUPABASE_SERVICE_ROLE_KEY already exists (without NEXT_PUBLIC_ prefix). No changes needed.');
    } else if (content.match(/^SUPABASE_SERVICE_ROLE_KEY=/m)) {
        console.log('SUPABASE_SERVICE_ROLE_KEY line exists. Checking if valid...');
    } else {
        console.log('Adding SUPABASE_SERVICE_ROLE_KEY to .env.local...');
        content += `\nSUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}\n`;
        fs.writeFileSync(envPath, content);
        console.log('SUCCESS: Added SUPABASE_SERVICE_ROLE_KEY to .env.local');
    }
} catch (error) {
    console.error('FAILED:', error);
}
