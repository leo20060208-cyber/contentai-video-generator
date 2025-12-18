import { createReplicatePrediction } from '@/lib/replicate';
import { Template } from '@/lib/db/videos';

export async function generateFromTemplate(
    template: Template,
    userProductImage: string
): Promise<{ predictionId: string }> {
    if (!template.template_video_url) {
        throw new Error('Template missing template video');
    }

    // Use product insertion prompt
    const prompt = template.hidden_prompt || 'Insert the product into this video template';

    // For template video method, we composite the user's product into the template
    // This requires a model with inpainting/compositing capabilities
    const prediction = await createReplicatePrediction({
        model: (template.ai_model as any) || 'kling-pro', // eslint-disable-line @typescript-eslint/no-explicit-any
        prompt: prompt,
        image: userProductImage,
        // Note: In a real implementation, we'd pass the template_video_url
        // to the model as a base video for compositing
    });

    return { predictionId: prediction.id };
}
