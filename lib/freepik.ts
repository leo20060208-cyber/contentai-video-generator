
export class FreepikClient {
    private apiKey: string;
    private baseUrl = 'https://api.freepik.com/v1/ai';

    constructor(apiKey?: string) {
        // Strictly use env var, fallback to empty string (which will fail validation cleanly)
        this.apiKey = process.env.FREEPIK_API_KEY || '';
    }

    private assertConfigured(): void {
        if (!this.apiKey) {
            throw new Error('FREEPIK_API_KEY is not configured.');
        }
    }

    /**
     * Determines the correct endpoint slug for the given model.
     * Special handling for 'kling-elements-pro'.
     */
    private getModelSlug(model: string): string {
        if (model === 'kling-elements-pro') {
            return 'kling-elements-pro'; // Specific new model
        }
        // Fallback for all other kling versions to the v2 master endpoint
        if (model.startsWith('kling')) {
            return 'kling-v2-1-master';
        }
        // Direct mapping for others
        return model;
    }

    /**
     * Generates a video using the Freepik AI API.
     */
    async generateVideo(params: {
        prompt?: string;
        image_url?: string;
        static_mask?: string;
        model: string;
        negative_prompt?: string;
        duration?: number;
        aspect_ratio?: string;
    }) {
        this.assertConfigured();
        const slug = this.getModelSlug(params.model);
        const isImageToVideo = !!params.image_url;

        // Construct Endpoint
        const endpoint = `${this.baseUrl}/${isImageToVideo ? 'image-to-video' : 'text-to-video'}/${slug}`;

        console.log(`🚀 [Freepik] Generating Video...`);
        console.log(`📍 [Freepik] Endpoint: ${endpoint}`);
        console.log(`⚙️ [Freepik] Model: ${params.model} (Slug: ${slug})`);

        // Prepare Payload
        const body: any = {
            prompt: params.prompt || '',
            duration: String(params.duration || 5),
            // Default aspect ratio if not provided
            aspect_ratio: this.mapAspectRatio(params.aspect_ratio)
        };

        // Handle Image Input
        if (params.image_url) {
            const cleanUrl = this.cleanUrl(params.image_url);
            if (slug === 'kling-elements-pro') {
                // Kling Elements Pro strictly requires an array 'images'
                body.images = [cleanUrl];
            } else {
                // Standard endpoints strictly require string 'image'
                body.image = cleanUrl;
            }
        }

        // Handle Mask (Inpainting)
        if (params.static_mask) {
            body.static_mask = this.cleanUrl(params.static_mask);
        }

        // Handle Negative Prompt
        if (params.negative_prompt) {
            body.negative_prompt = params.negative_prompt;
        }

        console.log(`📦 [Freepik] Payload:`, JSON.stringify(body, null, 2));

        // Execute Request
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-freepik-api-key': this.apiKey,
                    'Accept': 'application/json'
                },
                body: JSON.stringify(body)
            });

            // Parse Response
            const responseText = await response.text();
            let result;
            try {
                result = JSON.parse(responseText);
            } catch {
                result = { raw: responseText };
            }

            if (!response.ok) {
                console.error(`🛑 [Freepik] API REQUEST FAILED [${response.status}]`);
                console.error(`🛑 [Freepik] Error Body:`, responseText);

                // Throw a clear error message that surfaces to the UI
                const msg = result.message || result.error || responseText || `API Error ${response.status}`;
                throw new Error(`Freepik API Error: ${msg}`);
            }

            console.log(`✅ [Freepik] Success! Response:`, result);
            return result;

        } catch (error) {
            console.error(`💥 [Freepik] System Error:`, error);
            throw error;
        }
    }

    /**
     * Checks the status of a generation task.
     */
    async getTaskStatus(taskId: string, model: string = 'kling-v2-1-std') {
        this.assertConfigured();
        const slug = this.getModelSlug(model);

        // We must check both endpoints (I2V and T2V) because the API doesn't tell us which one created the task ID often.
        // However, based on our generation logic, we could know. For safety, we check both.
        const types = ['image-to-video', 'text-to-video'];

        for (const type of types) {
            const endpoint = `${this.baseUrl}/${type}/${slug}/${taskId}`;
            try {
                const res = await fetch(endpoint, {
                    headers: { 'x-freepik-api-key': this.apiKey }
                });

                if (res.ok) {
                    const data = await res.json();
                    return data;
                }

                // If it's 404, it might be the other endpoint type, so continue loop.
                if (res.status !== 404) {
                    console.warn(`⚠️ [Freepik] Status check warning (${endpoint}): ${res.status}`);
                }
            } catch (e) {
                // Ignore network hiccups during poll fallback
            }
        }

        throw new Error(`Task ${taskId} not found. Checked image/text endpoints.`);
    }

    // --- Helpers ---

    private cleanUrl(url: string): string {
        // Ensure we send clean public URLs, stripping any base64 prefixes if they snuck in
        if (url.startsWith('data:')) {
            throw new Error('Base64 image passed to FreepikClient. Must be uploaded to storage first.');
        }
        return url;
    }

    private mapAspectRatio(ratio: string | undefined): string {
        const validRatios: Record<string, string> = {
            '16:9': 'widescreen_16_9',
            '9:16': 'social_story_9_16',
            '1:1': 'square_1_1',
            // Allow passing through valid enums directly
            'widescreen_16_9': 'widescreen_16_9',
            'social_story_9_16': 'social_story_9_16',
            'square_1_1': 'square_1_1'
        };
        return validRatios[ratio || ''] || 'widescreen_16_9';
    }
}
