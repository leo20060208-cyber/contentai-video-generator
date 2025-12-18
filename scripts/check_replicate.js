
const dotenv = require('dotenv');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
dotenv.config({ path: envPath });

const key = 'REPLICATE_API_TOKEN';
const val = process.env[key];

if (val) {
    console.log(`✅ ${key} is set. Length: ${val.length}`);
} else {
    console.log(`❌ ${key} is MISSING.`);
}
