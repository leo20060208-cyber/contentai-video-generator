import { createReplicatePrediction } from '@/lib/replicate';
import { Template } from '@/lib/db/videos';

export async function generateVideoToVideo(
    template: Template,
    userProductImage: string
): Promise<{ predictionId: string }> {
    if (!template.before_video_url) {
        throw new Error('Template missing reference video');
    }

    // Use transformation prompt from template
    const prompt = template.hidden_prompt || 'Transform this video with the new product';

    // For video-to-video, we use the reference video and the user's product image
    // The AI will use the first frame of the reference video as style guide
    const prediction = await createReplicatePrediction({
        model: (template.ai_model as any) || 'svd', // eslint-disable-line @typescript-eslint/no-explicit-any
        prompt: prompt,
        image: userProductImage, // User's product as the subject
    });

    return { predictionId: prediction.id };
}
