
const fetch = require('node-fetch'); // Ensure node-fetch is available or use native fetch in node 18+

const API_KEY = 'FPSXac3ab50377507aedba82018d37063927';
const TASK_ID = '4fd07ff9-57c3-4b24-b678-cd768a28eafe';
const BASE_URL = 'https://api.freepik.com/v1/ai';

const slug = 'kling-v2-1-std';

const endpoints = [
    `${BASE_URL}/image-to-video/${slug}/${TASK_ID}`,
    `${BASE_URL}/text-to-video/${slug}/${TASK_ID}`,
    `${BASE_URL}/image-to-video/${TASK_ID}`, // No slug
    `${BASE_URL}/tasks/${TASK_ID}`, // Generic
    `${BASE_URL}/image-to-video/kling-v1/${TASK_ID}`, // Legacy slug
    `${BASE_URL}/image-to-video/kling-v2/${TASK_ID}`, // Alternative
    `${BASE_URL}/image-to-video/kling-standard/${TASK_ID}`, // Another alternative
];

async function testEndpoints() {
    console.log(`Testing Task ID: ${TASK_ID}`);

    for (const url of endpoints) {
        try {
            console.log(`Checking: ${url}`);
            const res = await fetch(url, {
                headers: { 'x-freepik-api-key': API_KEY }
            });

            console.log(`Status: ${res.status} ${res.statusText}`);
            if (res.ok) {
                const data = await res.json();
                console.log('SUCCESS! Data:', JSON.stringify(data, null, 2));
                return;
            } else {
                const txt = await res.text();
                // console.log('Error Body:', txt);
            }
        } catch (e) {
            console.error('Exception:', e.message);
        }
        console.log('---');
    }
}

testEndpoints();
