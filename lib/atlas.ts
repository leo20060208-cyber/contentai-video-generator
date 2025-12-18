
export class AtlasClient {
    private apiKey: string;
    private baseUrl = 'https://api.atlascloud.ai/api/v1';

    constructor() {
        this.apiKey = process.env.ATLASCLOUD_API_KEY || '';
        if (!this.apiKey) {
            console.warn('⚠️ [Atlas] ATLASCLOUD_API_KEY not found in environment');
        }
    }

    /**
     * Generates a video using Atlas Cloud API.
     */
    async generateVideo(params: {
        prompt: string;
        image_url?: string;
        model?: string; // e.g. 'kwaivgi/kling-video-o1/reference-to-video'
        duration?: number;
        aspect_ratio?: string;
        negative_prompt?: string;
    }) {
        const endpoint = `${this.baseUrl}/model/generateVideo`;

        // Default model from user snippet
        const model = params.model || 'kwaivgi/kling-video-o1/reference-to-video';

        // Prepare images array
        // The snippet uses an array of images. We'll put our source image as the first one.
        const images: string[] = [];
        if (params.image_url) {
            images.push(this.cleanUrl(params.image_url));
        }

        const body = {
            model: model,
            aspect_ratio: params.aspect_ratio || '16:9',
            duration: params.duration || 5, // snippet used 5
            images: images,
            keep_original_sound: false,
            prompt: params.prompt,
            video: "" // Snippet had empty string
        };

        console.log(`🚀 [Atlas] Generating Video...`);
        console.log(`⚙️ [Atlas] Model: ${model}`);
        console.log(`📦 [Atlas] Payload:`, JSON.stringify(body, null, 2));

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`🛑 [Atlas] API Error (${response.status}):`, errorText);
                throw new Error(`Atlas Cloud API Error: ${errorText}`);
            }

            const result = await response.json();
            console.log(`✅ [Atlas] Response:`, result);

            // Expecting result["data"]["id"]
            if (result.data && result.data.id) {
                return { taskId: result.data.id, status: 'processing' };
            } else {
                throw new Error('Atlas API response missing Task ID');
            }

        } catch (error) {
            console.error(`💥 [Atlas] System Error:`, error);
            throw error;
        }
    }

    /**
     * Polls for the result of a generation task.
     */
    async getTaskStatus(taskId: string) {
        const endpoint = `${this.baseUrl}/model/prediction/${taskId}`;

        try {
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Atlas Cloud Status Error: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            // Expected: result["data"]["status"] ("completed", "succeeded", "failed")
            // result["data"]["outputs"][0] -> video url

            const status = result.data?.status;

            // Map Atlas status to our internal status
            let internalStatus = 'processing';
            let outputUrl = null;

            if (status === 'completed' || status === 'succeeded') {
                internalStatus = 'completed';
                if (result.data.outputs && result.data.outputs.length > 0) {
                    outputUrl = result.data.outputs[0];
                }
            } else if (status === 'failed') {
                internalStatus = 'failed';
            }

            return {
                status: internalStatus,
                url: outputUrl,
                originalStatus: status,
                data: result.data
            };

        } catch (error) {
            console.error(`💥 [Atlas] Status Check Error:`, error);
            throw error;
        }
    }

    private cleanUrl(url: string): string {
        if (url.startsWith('data:')) {
            // Atlas probably needs a public URL too, similar to Freepik.
            // We rely on the route handler to have populated image_url with a Supabase public URL.
            // If we get base64 here, we can't upload it easily inside the client without deps.
            // Assuming the route passed a URL.
        }
        return url;
    }
}
