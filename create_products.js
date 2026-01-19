const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

if (!process.env.STRIPE_SECRET_KEY) {
    console.error('Error: STRIPE_SECRET_KEY not found in .env.local');
    process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function createProducts() {
    console.log('Creating products...');

    try {
        // 1. Single Video Product
        const singleVideo = await stripe.products.create({
            name: 'Single Video (75 Credits)',
            description: 'One-time purchase for a single video generation',
        });

        const singleVideoPrice = await stripe.prices.create({
            product: singleVideo.id,
            unit_amount: 500, // €5.00
            currency: 'eur',
        });

        console.log('✅ Created "Single Video"');
        console.log(`   Product ID: ${singleVideo.id}`);
        console.log(`   Price ID:   ${singleVideoPrice.id}`);

        // 2. Top-up Product
        const topUp = await stripe.products.create({
            name: 'Credit Top-up (75 Credits)',
            description: 'Instant credit top-up for subscribers',
        });

        const topUpPrice = await stripe.prices.create({
            product: topUp.id,
            unit_amount: 350, // €3.50
            currency: 'eur',
        });

        console.log('\n✅ Created "Credit Top-up"');
        console.log(`   Product ID: ${topUp.id}`);
        console.log(`   Price ID:   ${topUpPrice.id}`);

        console.log('\nCopy these Price IDs into app/pricing/page.tsx');

    } catch (error) {
        console.error('Error creating products:', error);
    }
}

createProducts();
