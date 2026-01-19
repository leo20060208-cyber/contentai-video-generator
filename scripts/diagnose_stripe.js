require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
});

async function main() {
    const email = 'emilsw2006@gmail.com';
    console.log(`Checking Stripe for email: ${email}...`);

    try {
        const customers = await stripe.customers.list({ email: email, limit: 1 });
        if (customers.data.length === 0) {
            console.log('No customer found directly by email.');
            // Try searching by name or just list all recent subscriptions if needed, 
            // but email is usually reliable if they paid via Checkout.
            return;
        }

        const customer = customers.data[0];
        console.log(`Found Customer: ${customer.id} (${customer.name})`);

        const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'all',
            limit: 5,
        });

        if (subscriptions.data.length === 0) {
            console.log('No subscriptions found for this customer.');
        } else {
            console.log('--- Subscriptions ---');
            subscriptions.data.forEach(sub => {
                const item = sub.items.data[0];
                const price = item.price;
                const product = price.product;
                const priceId = price.id;

                console.log(`ID: ${sub.id}`);
                console.log(`Status: ${sub.status}`);
                console.log(`Price ID: ${priceId}`);
                console.log(`Amount: ${price.unit_amount / 100} ${price.currency.toUpperCase()}`);
                console.log(`Product ID: ${price.product}`);
                console.log('---------------------');
            });
        }

    } catch (err) {
        console.error('Error:', err.message);
    }
}

main();
