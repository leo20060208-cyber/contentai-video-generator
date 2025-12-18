
export class FalClient {
    private apiKey: string;
    private baseUrl = 'https://queue.fal.run/fal-ai/fast-sam-2'; // Or specific specialized SAM2 video endpoint if available, but fast-sam-2 is good baseline

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    // Video Segmentation (Tracking)
    // Supports submitting a video and tracking points
    async segmentVideo(params: {
        video_url: string;
        points: Array<{ x: number, y: number, frame?: number }>;  // Basic point support
        mask_index?: number; // 0, 1, 2 (Coarse to Fine)
    }) {
        // FAL API Schema for SAM 2 Video (Assuming standard schema)
        // Usually requires "video_url" and "points" or "prompts"

        const body = {
            video_url: params.video_url,
            points: params.points.map(p => ({
                position: [p.x, p.y],
                label: 1 // Positive
                // frame_index: p.frame || 0 // Default to first frame
            })),
            // Attempt to force specific mask selection if supported
            // If the model supports choosing which ambiguity layer to track
            mask_index: params.mask_index !== undefined ? params.mask_index : 0
        };

        const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Key ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Fal.ai Error: ${response.status} ${err}`);
        }

        const result = await response.json();

        // Handle Queue/Result
        // If queue, might need polling. Fal usually returns request_id or direct result if fast.
        // Assuming queue behavior for video.
        if (result.request_id && !result.mask_video_url) {
            return this.pollResult(result.request_id);
        }

        return result; // Should contain mask_video_url
    }

    private async pollResult(requestId: string): Promise<any> {
        const statusUrl = `https://queue.fal.run/fal-ai/fast-sam-2/requests/${requestId}`;

        for (let i = 0; i < 30; i++) { // Terminate after 30 checks
            await new Promise(r => setTimeout(r, 2000)); // 2s wait

            const check = await fetch(statusUrl, {
                headers: { 'Authorization': `Key ${this.apiKey}` }
            });

            if (!check.ok) continue;

            const statusJson = await check.json();
            if (statusJson.status === 'COMPLETED') {
                return statusJson; // Contains outputs
            }
            if (statusJson.status === 'FAILED') {
                throw new Error(`Fal.ai Task Failed: ${statusJson.error}`);
            }
        }
        throw new Error("Fal.ai Timeout");
    }
}
