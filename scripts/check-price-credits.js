const path = require('path');
const dotenv = require('dotenv');
const Stripe = require('stripe');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function check() {
    try {
        console.log('=== DIAGNÓSTICO DE PRECIOS Y CRÉDITOS EN STRIPE ===\n');

        // Fetch all active prices with product expansion
        const prices = await stripe.prices.list({
            active: true,
            limit: 20,
            expand: ['data.product']
        });

        console.log(`Total de precios activos: ${prices.data.length}\n`);
        console.log('─'.repeat(80));

        for (const price of prices.data) {
            const product = price.product;
            const productName = typeof product === 'string' ? 'N/A' : product.name;
            const productMeta = typeof product === 'string' ? {} : product.metadata || {};
            const priceMeta = price.metadata || {};

            console.log(`\nProduct: ${productName}`);
            console.log(`  Product ID: ${typeof product === 'string' ? product : product.id}`);
            console.log(`  Price ID: ${price.id}`);
            console.log(`  Amount: ${(price.unit_amount || 0) / 100} ${price.currency?.toUpperCase()}`);
            console.log(`  Interval: ${price.recurring?.interval || 'one_time'}`);
            console.log(`  Price Metadata: ${JSON.stringify(priceMeta)}`);
            console.log(`  Product Metadata: ${JSON.stringify(productMeta)}`);

            // Check for credits
            const credits = priceMeta.credits || productMeta.credits;
            console.log(`  >> CREDITS: ${credits || '❌ NO CONFIGURADO'}`);
        }

        console.log('\n' + '─'.repeat(80));
        console.log('\nCOMPARACIÓN CON config.ts:');
        console.log('  Starter expected priceId: price_1Smt3w3pHdaDhch3uYpZJJ4g');
        console.log('  Pro expected priceId: price_1Smt4A3pHdaDhch3FI9DCmnU');
        console.log('  Elite expected priceId: price_1Smt4S3pHdaDhch3JQZ2Sd99');

    } catch (error) {
        console.error('Error:', error.message);
    }
}

check();
