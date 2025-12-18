
const fetch = require('node-fetch');

const API_KEY = 'FPSX438b3b416256f6f1f065771fb2ae7492';
const BASE_URL = 'https://api.freepik.com/v1/ai/text-to-video';

const body = {
    prompt: "Twirling in front of a mirror",
    duration: "5",
    aspect_ratio: "widescreen_16_9"
};

async function testModel(slug) {
    const url = `${BASE_URL}/${slug}`;
    console.log(`Testing ${url}...`);
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-freepik-api-key': API_KEY
            },
            body: JSON.stringify(body)
        });

        console.log(`Status for ${slug}: ${res.status} ${res.statusText}`);
        const text = await res.text();
        console.log(`Response for ${slug}: ${text.substring(0, 50)}...`);
    } catch (e) {
        console.log(`Error testing ${slug}:`, e.message);
    }
}

async function run() {
    // await testModel('kling-v2');
    await testModel('kling-v2-1-std');
    await testModel('kling-v2-1-master');
    await testModel('kling-video-v2');
    await testModel('kling-v2-standard');
    await testModel('kling-v2.5-standard');
    await testModel('minimax');
}

run();
