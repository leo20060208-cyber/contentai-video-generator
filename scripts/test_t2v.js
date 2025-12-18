
const fetch = require('node-fetch');

const API_KEY = 'FPSX438b3b416256f6f1f065771fb2ae7492';
const TEXT_URL = 'https://api.freepik.com/v1/ai/text-to-video';

async function test(slug) {
    console.log(`\nTesting ${slug}...`);
    try {
        const res = await fetch(`${TEXT_URL}/${slug}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-freepik-api-key': API_KEY },
            body: JSON.stringify({ prompt: "test video generation", duration: "5" })
        });

        console.log(`STATUS: ${res.status}`);
        const text = await res.text();
        console.log(`BODY: ${text.substring(0, 100)}`);
    } catch (e) {
        console.log(`ERR: ${e.message}`);
    }
}

async function run() {
    await test('minimax');
    await test('kling-v2-1-master');
}

run();
