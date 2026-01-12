
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const Stripe = require('stripe');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function check() {
    try {
        console.log('Listing all products...');
        const products = await stripe.products.list({ limit: 100, active: true });

        const lines = products.data.map(p => `ID: ${p.id} | Name: ${p.name} | Description: ${p.description || 'N/A'}`);
        fs.writeFileSync('stripe_products_utf8.txt', lines.join('\n'));
        console.log('Written to stripe_products_utf8.txt');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

check();
