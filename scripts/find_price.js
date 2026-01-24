require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

async function main() {
    const productId = 'prod_Tqlfo1BZrepFwk';
    console.log(`Looking for prices for product: ${productId}`);
    try {
        const prices = await stripe.prices.list({ product: productId, active: true });
        if (prices.data.length === 0) {
            console.log('No active prices found for this product.');
        }
        prices.data.forEach(p => {
            console.log(`FOUND_PRICE_ID: ${p.id} | Amount: ${p.unit_amount / 100} ${p.currency}`);
        });
    } catch (e) {
        console.error('Error fetching prices:', e.message);
    }
}
main();
