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
        width?: number;
        height?: number;
    }) {
        const modelPath = params.model || 'google/nano-banana/edit';
        const endpoint = `${this.baseUrl}/${modelPath}`;

        const body: any = {
            images: params.images.map(url => this.cleanUrl(url)),
            prompt: params.prompt,
            output_format: 'png',
            enable_base64_output: false,
            enable_sync_mode: false
        };

        if (params.width && params.height) {
            body.image_size = { width: params.width, height: params.height };
            // Some models fallback
            body.width = params.width;
            body.height = params.height;
        }

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

            // Common patterns
            if (result.output && result.output.url) outputUrl = result.output.url;
            else if (result.data?.output?.url) outputUrl = result.data.output.url;
            else if (result.url) outputUrl = result.url; // Top level url
            else if (result.data?.url) outputUrl = result.data.url; // Data level url

            // Check array
            else if (result.output && Array.isArray(result.output)) outputUrl = result.output[0];
            else if (result.data?.output && Array.isArray(result.data.output)) outputUrl = result.data.output[0];
            // Check simple string
            else if (typeof result.output === 'string') outputUrl = result.output;

            // Nano Banana specific: sometimes returns { image: "base64" } or { image: "url" }
            else if (result.image) outputUrl = result.image;
            else if (result.data?.image) outputUrl = result.data.image;

            if (outputUrl) {
                return { url: outputUrl, status: 'completed' };
            } else if (result.id || result.request_id || result.data?.id) {
                // If async fallback
                return { taskId: result.id || result.request_id || result.data?.id, status: 'processing' };
            } else {
                console.error('🛑 Unknown Wavespeed Response Format:', JSON.stringify(result, null, 2));
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
        image_url?: string;
        images?: string[];
        video_url?: string;
        target_mask?: string;
        model?: string;
        duration?: number;
        aspect_ratio?: string;
        negative_prompt?: string;
        customPayload?: any; // Allow full control for complex models like Sora
    }) {
        // Determine correct endpoint
        let modelPath = 'kwaivgi/kling-v1.6-i2v-standard';

        if (params.model) {
            // Trust the model path passed if it looks like a valid path or known alias
            if (params.model.includes('/') || params.model === 'kling-pro') {
                modelPath = params.model;
            }

            // Map known aliases
            if (params.model === 'kling-pro') modelPath = 'kwaivgi/kling-v1.6-i2v-pro';
        }

        let endpoint = `${this.baseUrl}/${modelPath}`;

        // Build Payload
        let body: Record<string, unknown> = {};

        // If custom payload provided (e.g. for Sora), use it primarily
        if (params.customPayload) {
            body = { ...params.customPayload };
            // Ensure prompt is set if not in custom payload
            if (!body.prompt && params.prompt) body.prompt = params.prompt;
        } else {
            // Standard/Kling Logic construction
            body.prompt = params.prompt;

            // 1. Reference to Video
            if (modelPath === 'kwaivgi/kling-video-o1/reference-to-video') {
                // ... (existing logic) ...
                body.duration = params.duration || 5;
                body.aspect_ratio = params.aspect_ratio || '16:9';
                body.keep_original_sound = false;

                if (params.images && params.images.length > 0) {
                    body.images = params.images.map(url => this.cleanUrl(url));
                } else if (params.image_url) {
                    body.images = [this.cleanUrl(params.image_url)];
                } else {
                    body.images = [];
                }
                body.video = "";
            }
            // 2. Video Edit
            else if (modelPath === 'kwaivgi/kling-video-o1/video-edit') {
                // ... (existing logic) ...
                body.keep_original_sound = true;
                if (params.video_url) body.video = this.cleanUrl(params.video_url);
                if (params.images) body.images = params.images.map(url => this.cleanUrl(url));
                else if (params.image_url) body.images = [this.cleanUrl(params.image_url)];
                else body.images = [];

                if (params.target_mask) body.target_mask = this.cleanUrl(params.target_mask);
            }
            // 3. Standard I2V
            else {
                // ... (existing logic) ...
                body.duration = params.duration || 5;
                body.aspect_ratio = params.aspect_ratio || '16:9';
                body.guidance_scale = 0.5;
                if (params.image_url) body.image = this.cleanUrl(params.image_url);
                if (params.target_mask) body.target_mask = this.cleanUrl(params.target_mask);
                if (params.negative_prompt) body.negative_prompt = params.negative_prompt;
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

            // ... (rest of error handling is same) ...
            if (!response.ok) {
                const errorText = await response.text();
                try {
                    console.error(`🛑 [Wavespeed] API Error (${response.status}):`, JSON.parse(errorText));
                } catch {
                    console.error(`🛑 [Wavespeed] API Error (${response.status}):`, errorText);
                }
                throw new Error(`Wavespeed API Error: ${errorText}`);
            }

            const result = await response.json();
            console.log(`✅ [Wavespeed] Response:`, result);

            const taskId = result.data?.id || result.request_id || result.id;
            if (taskId) {
                return { taskId: taskId, status: 'processing' };
            } else {
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
                console.error(`❌ [Wavespeed] Video generation failed`);
            } else {
                console.log(`⏳ [Wavespeed] Still processing... Status: ${status}`);
            }

            return {
                status: internalStatus,
                url: outputUrl,
                originalStatus: status,
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
