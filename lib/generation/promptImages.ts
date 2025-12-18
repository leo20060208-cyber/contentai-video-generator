import { createReplicatePrediction } from '@/lib/replicate';
import { Template } from '@/lib/db/videos';

export async function generateWithPromptImages(
    template: Template,
    userProductImage: string
): Promise<{ predictionId: string }> {
    if (!template.reference_images || !template.keyframe_prompts) {
        throw new Error('Template missing reference images or keyframe prompts');
    }

    // Build comprehensive prompt combining keyframes
    const fullPrompt = `
${template.keyframe_prompts.start}

At the middle of the video: ${template.keyframe_prompts.middle}

At the end of the video: ${template.keyframe_prompts.end}

${template.product_swap_prompt || ''}

Product to feature: [User's product from image]
`.trim();

    // Use the first reference image as the starting frame
    const prediction = await createReplicatePrediction({
        model: (template.ai_model as any) || 'minimax', // eslint-disable-line @typescript-eslint/no-explicit-any
        prompt: fullPrompt,
        image: userProductImage, // User's product will be the hero
    });

    return { predictionId: prediction.id };
}
