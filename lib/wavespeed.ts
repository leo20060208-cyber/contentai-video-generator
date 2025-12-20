export class WavespeedClient {
    private apiKey: string;
    private baseUrl = 'https://api.wavespeed.ai/api/v3';

    constructor() {
        this.apiKey = process.env.WAVESPEED_API_KEY || '';
        if (!this.apiKey) {
            console.warn('⚠️ [Wavespeed] WAVESPEED_API_KEY not found in environment');
        }
    }

    /**
     * Edits an image using Nano Banana or similar.
     */
    async editImage(params: {
        images: string[];
        prompt: string;
        model?: string;
    }) {
        const modelPath = params.model || 'google/nano-banana/edit';
        const endpoint = `${this.baseUrl}/${modelPath}`;

        const body = {
            images: params.images.map(url => this.cleanUrl(url)),
            prompt: params.prompt,
            output_format: 'png',
            enable_base64_output: false, // Prefer URL
            enable_sync_mode: true       // Wait for result immediately if possible (docs say valid for API)
        };

        console.log(`🎨 [Wavespeed] Editing Image...`);
        console.log(`⚙️ [Wavespeed] Model: ${modelPath}`);
        console.log(`🔗 [Wavespeed] Endpoint: ${endpoint}`);

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
                throw new Error(`Wavespeed Edit Error: ${errorText}`);
            }

            const result = await response.json();
            console.log(`✅ [Wavespeed] Edit Response:`, result);

            // Check for direct output (sync mode) or task ID
            // Nano Banana Sync output usually looks like: { data: { output: { ... } } } or similar
            // Base on docs: "If enable_sync_mode... get result directly"

            // Try to extract URL from various possible locations
            let outputUrl: string | undefined;
            if (result.output && result.output.url) outputUrl = result.output.url;
            if (result.data?.output?.url) outputUrl = result.data.output.url;
            // Check array
            if (result.output && Array.isArray(result.output)) outputUrl = result.output[0];
            if (result.data?.output && Array.isArray(result.data.output)) outputUrl = result.data.output[0];
            // Check simple string
            if (typeof result.output === 'string') outputUrl = result.output;

            if (outputUrl) {
                return { url: outputUrl, status: 'completed' };
            } else if (result.id || result.request_id) {
                // If async fallback
                return { taskId: result.id || result.request_id, status: 'processing' };
            } else {
                throw new Error('No output URL or Task ID in response');
            }

        } catch (error) {
            console.error(`💥 [Wavespeed] Edit Error:`, error);
            throw error;
        }
    }

    /**
     * Generates a video using Wavespeed API v3.
     * Uses Kling v1.6 I2V (Image-to-Video) models.
     */
    async generateVideo(params: {
        prompt: string;
        image_url?: string; // For Standard I2V
        images?: string[];  // For Reference-to-Video
        video_url?: string; // For Video-Edit
        model?: string;
        duration?: number;
        aspect_ratio?: string;
        negative_prompt?: string;
    }) {
        // Determine the correct model endpoint
        let modelPath = 'kwaivgi/kling-v1.6-i2v-standard';

        // Check for Specific Models
        if (params.model === 'kwaivgi/kling-video-o1/reference-to-video') {
            modelPath = 'kwaivgi/kling-video-o1/reference-to-video';
        } else if (params.model === 'kwaivgi/kling-video-o1/video-edit') {
            modelPath = 'kwaivgi/kling-video-o1/video-edit';
        } else {
            // Default / Aliases
            if (params.model === 'kling-pro' || params.model === 'kling-v1-pro') {
                modelPath = 'kwaivgi/kling-v1.6-i2v-pro';
            }
        }

        const endpoint = `${this.baseUrl}/${modelPath}`;

        // Build Request Body based on Model Type
        const body: Record<string, unknown> = {
            prompt: params.prompt,
        };

        // 1. Reference to Video
        if (modelPath === 'kwaivgi/kling-video-o1/reference-to-video') {
            body.duration = params.duration || 5;
            body.aspect_ratio = params.aspect_ratio || '16:9';
            body.keep_original_sound = false;

            // Prefer 'images' array, fallback to 'image_url' wrapped in array
            if (params.images && params.images.length > 0) {
                body.images = params.images.map(url => this.cleanUrl(url));
            } else if (params.image_url) {
                body.images = [this.cleanUrl(params.image_url)];
            } else {
                body.images = []; // Empty array might fail but it's what we have
            }
            body.video = ""; // API docs example shows empty string video sometimes? Or omit? Docs say: "video": "" in example. Leaving it empty or omitted should be fine, but example included it.
        }
        // 2. Video Edit
        else if (modelPath === 'kwaivgi/kling-video-o1/video-edit') {
            body.keep_original_sound = true;
            // Some providers still validate these fields even for video-edit.
            body.duration = params.duration || 5;
            body.aspect_ratio = params.aspect_ratio || '16:9';
            if (params.video_url) {
                body.video = this.cleanUrl(params.video_url);
            }
            if (params.images && params.images.length > 0) {
                body.images = params.images.map(url => this.cleanUrl(url));
            } else if (params.image_url) {
                body.images = [this.cleanUrl(params.image_url)];
            } else {
                body.images = [];
            }
            // Note: Duration for Video Edit is usually derived from input or limited to 3-10s.
        }
        // 3. Standard I2V (kling-v1.6)
        else {
            body.duration = params.duration || 5;
            body.aspect_ratio = params.aspect_ratio || '16:9';
            body.guidance_scale = 0.5;

            if (params.image_url) {
                body.image = this.cleanUrl(params.image_url);
            }
            if (params.negative_prompt) {
                body.negative_prompt = params.negative_prompt;
            }
        }

        console.log(`🚀 [Wavespeed] Generating Video...`);
        console.log(`⚙️ [Wavespeed] Model: ${modelPath}`);
        console.log(`🔗 [Wavespeed] Endpoint: ${endpoint}`);
        console.log(`📦 [Wavespeed] Payload:`, JSON.stringify(body, null, 2));

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
                // Attempt to parse JSON error if possible
                try {
                    const jsonError = JSON.parse(errorText);
                    console.error(`🛑 [Wavespeed] API Error (${response.status}):`, jsonError);
                } catch {
                    console.error(`🛑 [Wavespeed] API Error (${response.status}):`, errorText);
                }
                throw new Error(`Wavespeed API Error: ${errorText}`);
            }

            const result = await response.json();
            console.log(`✅ [Wavespeed] Response:`, result);

            // V3 API returns request_id instead of data.id
            const taskId = result.data?.id || result.request_id || result.id;
            if (taskId) {
                return { taskId: taskId, status: 'processing' };
            } else {
                console.error('🛑 [Wavespeed] Full response:', JSON.stringify(result, null, 2));
                throw new Error('Wavespeed API response missing Task ID');
            }

        } catch (error) {
            console.error(`💥 [Wavespeed] System Error:`, error);
            throw error;
        }
    }

    /**
     * Polls for the result of a generation task.
     * V3 API uses: /predictions/{requestId}/result
     */
    async getTaskStatus(taskId: string) {
        // V3 API endpoint format
        const endpoint = `${this.baseUrl}/predictions/${taskId}/result`;

        console.log(`🔍 [Wavespeed] Checking status for task: ${taskId}`);
        console.log(`🔗 [Wavespeed] Status endpoint: ${endpoint}`);

        try {
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`🛑 [Wavespeed] Status Error (${response.status}):`, errorText);
                throw new Error(`Wavespeed Status Error: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            console.log(`📊 [Wavespeed] Status response:`, JSON.stringify(result, null, 2));

            // V3 API response structure
            const status = result.data?.status || result.status;

            // Map Wavespeed status to our internal status
            // V3 statuses: 'created', 'processing', 'completed', 'failed'
            let internalStatus = 'processing';
            let outputUrl = null;
            let errorMessage: string | null = null;

            if (status === 'completed' || status === 'succeeded') {
                internalStatus = 'completed';
                // V3 API may return outputs in different places
                const outputs = result.data?.outputs || result.outputs || [];
                if (outputs.length > 0) {
                    outputUrl = outputs[0];
                } else if (result.data?.output) {
                    outputUrl = result.data.output;
                } else if (result.output) {
                    outputUrl = result.output;
                }
                console.log(`✅ [Wavespeed] Video completed! URL: ${outputUrl}`);
            } else if (status === 'failed') {
                internalStatus = 'failed';
                // Try to extract an actionable error message from provider payload
                const candidates: unknown[] = [
                    result.data?.error,
                    result.data?.message,
                    result.data?.detail,
                    result.data?.details,
                    result.error,
                    result.message
                ];
                const found = candidates.find(v => typeof v === 'string' && v.trim().length > 0) as string | undefined;
                errorMessage = found || 'Wavespeed reported status=failed';
                console.error(`❌ [Wavespeed] Video generation failed: ${errorMessage}`);
            } else {
                console.log(`⏳ [Wavespeed] Still processing... Status: ${status}`);
            }

            return {
                status: internalStatus,
                url: outputUrl,
                originalStatus: status,
                errorMessage,
                data: result.data || result
            };

        } catch (error) {
            console.error(`💥 [Wavespeed] Status Check Error:`, error);
            throw error;
        }
    }

    private cleanUrl(url: string): string {
        return url;
    }
}
