const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function listProducts() {
    try {
        const prices = await stripe.prices.list({
            limit: 20,
            expand: ['data.product']
        });

        const products = prices.data.map(p => ({
            productName: p.product.name,
            priceId: p.id,
            amount: p.unit_amount / 100,
            currency: p.currency
        }));

        const fs = require('fs');
        fs.writeFileSync('prices.json', JSON.stringify(products, null, 2));
        console.log('Written to prices.json');

    } catch (error) {
        console.error(error);
    }
}

listProducts();
