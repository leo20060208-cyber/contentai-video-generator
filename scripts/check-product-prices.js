
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const Stripe = require('stripe');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function check() {
    let output = '';
    const log = (msg) => {
        console.log(msg);
        output += msg + '\n';
    };

    try {
        log('Fetching all active products...');
        const products = await stripe.products.list({ limit: 100, active: true, expand: ['data.default_price'] });

        if (products.data.length === 0) {
            log('No active products found.');
        } else {
            products.data.forEach(product => {
                log(`\nProduct: ${product.name} (${product.id})`);
                if (product.default_price) {
                    const price = product.default_price;
                    const priceId = typeof price === 'string' ? price : price.id;
                    log(`  Default Price ID: ${priceId}`);
                    if (typeof price !== 'string') {
                        log(`  Amount: ${price.unit_amount / 100} ${price.currency.toUpperCase()}`);
                        log(`  Type: ${price.type}`);
                    }
                } else {
                    log('  ❌ NO DEFAULT PRICE SET');
                }
            });
        }
    } catch (e) {
        log(`Error fetching products: ${e.message}`);
    }
    fs.writeFileSync('product_prices_utf8.txt', output);
}

check();
