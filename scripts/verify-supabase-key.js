const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Manually load .env.local
const envPath = path.resolve(__dirname, '../.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

console.log('--- SUPABASE KEY DIAGNOSIS ---');

const url = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = envConfig.SUPABASE_SERVICE_ROLE_KEY;
const serviceRoleKeyPublic = envConfig.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

console.log('NEXT_PUBLIC_SUPABASE_URL:', url ? `${url.substring(0, 30)}...` : 'MISSING');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', anonKey ? `${anonKey.substring(0, 20)}... (length: ${anonKey.length})` : 'MISSING');
console.log('SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? `${serviceRoleKey.substring(0, 20)}... (length: ${serviceRoleKey.length})` : 'MISSING');
console.log('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKeyPublic ? `${serviceRoleKeyPublic.substring(0, 20)}... (length: ${serviceRoleKeyPublic.length})` : 'MISSING');

// The key should be a JWT, so it should have 3 parts separated by dots
if (serviceRoleKey) {
    const parts = serviceRoleKey.split('.');
    if (parts.length === 3) {
        console.log('SUPABASE_SERVICE_ROLE_KEY format: VALID JWT (3 parts)');
    } else {
        console.log('[ERROR] SUPABASE_SERVICE_ROLE_KEY format: INVALID (expected 3 parts, got ' + parts.length + ')');
    }
}

console.log('----------------------------');
