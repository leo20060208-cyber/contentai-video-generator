
const fetch = require('node-fetch');

const API_KEY = 'FPSX438b3b416256f6f1f065771fb2ae7492';
const TEXT_URL = 'https://api.freepik.com/v1/ai/text-to-video';
const IMAGE_URL = 'https://api.freepik.com/v1/ai/image-to-video';

// Placeholder image (1x1 pixel)
const IMG = "https://placehold.co/600x400.png";

async function testText(slug) {
    const url = `${TEXT_URL}/${slug}`;
    console.log(`\nTesting TEXT ${slug}...`);
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-freepik-api-key': API_KEY },
            body: JSON.stringify({ prompt: "test", duration: "5" })
        });
        console.log(`STATUS: ${res.status}`);
    } catch (e) {
        console.log(`ERR: ${e.message}`);
    }
}

async function testImage(slug) {
    const url = `${IMAGE_URL}/${slug}`;
    console.log(`\nTesting IMAGE ${slug}...`);
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-freepik-api-key': API_KEY },
            body: JSON.stringify({ prompt: "test", image: { url: IMG }, duration: "5" })
        });
        console.log(`STATUS: ${res.status}`);
    } catch (e) {
        console.log(`ERR: ${e.message}`);
    }
}

async function run() {
    await testText('kling-v2-1-std');
    await testText('kling-v2');
    await testText('kling');

    await testImage('kling-v2-1-std');
    await testImage('kling-v2-1-master');
}

run();
