
const fetch = require('node-fetch');

const API_KEY = 'FPSX438b3b416256f6f1f065771fb2ae7492';
const BASE_URL = 'https://api.freepik.com/v1/ai/text-to-video';

async function test(slug) {
    const url = `${BASE_URL}/${slug}`;
    console.log(`\nTesting ${slug}...`);
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-freepik-api-key': API_KEY
            },
            body: JSON.stringify({
                prompt: "test video",
                duration: "5"
            })
        });

        console.log(`STATUS: ${res.status} ${res.statusText}`);
        const text = await res.text();
        console.log(`RESPONSE: ${text}`);
    } catch (e) {
        console.log(`EXCEPTION: ${e.message}`);
    }
}

async function run() {
    await test('kling-v2-1-std');
    await test('kling-v2-1-master');
}

run();
