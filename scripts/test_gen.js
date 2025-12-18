
const fetch = require('node-fetch');

async function testGen() {
    const url = 'http://localhost:3002/api/video/generate';
    const body = {
        prompt: "A beautiful sunset over the ocean",
        model: "kling-v2",
        duration: 5,
        aspect_ratio: "16:9"
    };

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Body:', text);
    } catch (e) {
        console.error('Error:', e);
    }
}

testGen();
