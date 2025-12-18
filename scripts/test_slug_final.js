
const fetch = require('node-fetch');

const API_KEY = 'FPSX438b3b416256f6f1f065771fb2ae7492';
const TEXT_URL = 'https://api.freepik.com/v1/ai/text-to-video';
const IMAGE_URL = 'https://api.freepik.com/v1/ai/image-to-video';
const IMG = "https://placehold.co/600x400.png";

async function test(slug) {
    console.log(`\n--- Testing ${slug} ---`);

    // Text
    try {
        const res = await fetch(`${TEXT_URL}/${slug}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-freepik-api-key': API_KEY },
            body: JSON.stringify({ prompt: "test", duration: "5" })
        });
        console.log(`TEXT: ${res.status} ${res.statusText}`);
    } catch (e) { console.log(`TEXT ERR: ${e.message}`); }

    // Image
    try {
        const res = await fetch(`${IMAGE_URL}/${slug}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-freepik-api-key': API_KEY },
            body: JSON.stringify({ prompt: "test", image: IMG, duration: "5" }) // Image string
        });
        console.log(`IMAGE: ${res.status} ${res.statusText}`);
    } catch (e) { console.log(`IMAGE ERR: ${e.message}`); }
}

async function run() {
    await test('kling-v2-1-std');
    await test('kling-v2-1-master');
}

run();
