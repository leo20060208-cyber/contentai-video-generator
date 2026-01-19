require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
});

async function main() {
    const fs = require('fs');
    try {
        console.log('Using Key:', process.env.STRIPE_SECRET_KEY ? 'Present' : 'Missing');

        const prices = await stripe.prices.list({
            active: true,
            limit: 50,
            expand: ['data.product']
        });

        const output = prices.data.map(p => ({
            productName: typeof p.product === 'string' ? p.product : p.product.name,
            priceId: p.id,
            amount: p.unit_amount / 100,
            currency: p.currency,
            type: p.type
        }));

        fs.writeFileSync('valid_prices.json', JSON.stringify(output, null, 2));
        console.log('Successfully wrote prices to valid_prices.json');

    } catch (err) {
        console.error('Error fetching prices:', err.message);
    }
}

main();
