import jwt from 'jsonwebtoken';

const KLING_API_BASE = 'https://api.klingai.com/v1';

// Types
export interface KlingConfig {
    accessKey: string;
    secretKey: string;
}

export interface VideoTaskResponse {
    code: number;
    message: string;
    data: {
        task_id: string;
        request_id: string;
    };
}

export interface TaskStatusResponse {
    code: number;
    message: string;
    data: {
        task_id: string;
        task_status: 'submitted' | 'processing' | 'succeed' | 'failed';
        task_status_msg: string;
        created_at: number;
        updated_at: number;
        task_result?: {
            videos: Array<{
                id: string;
                url: string;
                duration: string;
            }>;
            images?: Array<{
                id: string;
                url: string;
            }>;
        };
    };
}

export class KlingClient {
    private accessKey: string;
    private secretKey: string;

    constructor(config: KlingConfig) {
        this.accessKey = config.accessKey;
        this.secretKey = config.secretKey;
    }

    private generateToken(): string {
        const payload = {
            iss: this.accessKey,
            exp: Math.floor(Date.now() / 1000) + 1800, // 30 minutes
            nbf: Math.floor(Date.now() / 1000) - 5 // Valid 5s ago
        };

        return jwt.sign(payload, this.secretKey, {
            algorithm: 'HS256',
            header: {
                typ: 'JWT',
                alg: 'HS256'
            }
        });
    }

    async createTask(params: {
        prompt: string;
        image?: string; // Optional image URL for Image-to-Video
        model?: 'kling-v1' | 'kling-v1-pro'; // Selection
        negative_prompt?: string;
        cfg_scale?: number;
        duration?: number;
        aspect_ratio?: '16:9' | '9:16' | '1:1';
    }): Promise<VideoTaskResponse> {
        const token = this.generateToken();
        const isImageToVideo = !!params.image;

        // Determine endpoint and model
        const endpoint = isImageToVideo
            ? `${KLING_API_BASE}/videos/image2video`
            : `${KLING_API_BASE}/videos/text2video`;

        // Default to Standard if not specified
        const modelName = params.model || 'kling-v1';

        const body: any = {
            model: modelName,
            prompt: params.prompt,
            negative_prompt: params.negative_prompt || '',
            cfg_scale: params.cfg_scale || 0.5,
            duration: params.duration || 5,
            aspect_ratio: params.aspect_ratio || '16:9',
            mode: modelName === 'kling-v1-pro' ? 'pro' : 'std'
        };

        if (isImageToVideo && params.image) {
            // Strip data:image/...;base64, prefix if present
            // Robust cleanup: remove header, newlines, and whitespace
            let base64Image = params.image;
            if (base64Image.includes('base64,')) {
                base64Image = base64Image.split('base64,')[1];
            }
            // Remove any non-base64 characters (newlines, spaces, etc)
            base64Image = base64Image.replace(/[\r\n\s]/g, '');

            console.log(`[KlingClient] Processed image length: ${base64Image.length}`);
            console.log(`[KlingClient] Image start: ${base64Image.substring(0, 50)}...`);

            body.image = base64Image;
            body.image_tail = null; // Optional: end frame
        }

        console.log(`[KlingClient] Requesting ${endpoint} with model ${modelName}`);

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            console.log(`[KlingClient] Response status: ${response.status}`);

            if (!response.ok) {
                const err = await response.text();
                console.error(`[KlingClient] Error body:`, err);
                throw new Error(`Kling API Error: ${response.status} ${err}`);
            }

            return response.json();
        } catch (error) {
            console.error('[KlingClient] Network request failed:', error);
            throw error;
        }
    }

    async getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
        const token = this.generateToken();
        const response = await fetch(`${KLING_API_BASE}/videos/status/${taskId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`Kling Status Error: ${response.status}`);
        }

        return response.json();
    }
}
