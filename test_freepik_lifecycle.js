
const fetch = require('node-fetch');

const API_KEY = 'FPSXac3ab50377507aedba82018d37063927';
const BASE_URL = 'https://api.freepik.com/v1/ai';

const MODELS_TO_TEST = [
    'kling-v2',
    'kling-v2-5-pro',
    'minimax'
];

async function testLifecycle(modelSlug) {
    console.log(`\n\n🧪 TESTING MODEL: ${modelSlug}`);

    // 1. CREATE (Image to Video)
    const createUrl = `${BASE_URL}/image-to-video/${modelSlug}`;
    console.log(`[Create] POST ${createUrl}`);

    try {
        const createRes = await fetch(createUrl, {
            method: 'POST',
            headers: {
                'x-freepik-api-key': API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: 'A cinematic shot of a futuristic city',
                image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
                duration: "5"
            })
        });

        if (!createRes.ok) {
            console.error(`❌ Create Failed: ${createRes.status} ${createRes.statusText}`);
            // console.error(await createRes.text());
            return;
        }

        const createData = await createRes.json();
        const taskId = createData.data?.task_id;
        console.log(`✅ Created! Task ID: ${taskId}`);

        if (!taskId) {
            console.error('❌ No task_id in response');
            return;
        }

        // 2. CHECK STATUS (Immediate)
        const statusUrl = `${BASE_URL}/text-to-video/${modelSlug}/${taskId}`;
        console.log(`[Status] GET ${statusUrl}`);

        const statusRes = await fetch(statusUrl, {
            headers: { 'x-freepik-api-key': API_KEY }
        });

        if (statusRes.ok) {
            console.log(`✅ Status Check OK! Code: ${statusRes.status}`);
            const statusData = await statusRes.json();
            console.log('Status:', statusData.data?.status);
        } else {
            console.error(`❌ Status Check Failed: ${statusRes.status} ${statusRes.statusText}`);
            console.error(await statusRes.text());
        }

    } catch (e) {
        console.error('Exception:', e.message);
    }
}

async function run() {
    for (const m of MODELS_TO_TEST) {
        await testLifecycle(m);
        await new Promise(r => setTimeout(r, 1000));
    }
}

run();
