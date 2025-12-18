
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
const envPath = path.resolve(__dirname, '../.env.local');
dotenv.config({ path: envPath });

const keys = [
    'REPLICATE_API_TOKEN',
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
];

console.log('--- Environment Check ---');
keys.forEach(key => {
    const exists = !!process.env[key];
    console.log(`${key}: ${exists ? '✅ Present' : '❌ Missing'}`);
    if (exists && key === 'REPLICATE_API_TOKEN') {
        const val = process.env[key];
        console.log(`Length: ${val.length}, Starts with: ${val.substring(0, 3)}...`);
    }
});
console.log('-------------------------');
