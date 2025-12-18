import { NextResponse } from 'next/server';
import { enhancePromptSimple } from '@/lib/api/prompt-enhancer';
import { generateVideo } from '@/lib/api/vertex-client';
import { getTemplateWithPrompt } from '@/lib/data/template-library';

export const runtime = 'nodejs';

interface GenerateRequest {
  templateId?: string;
  imageUrl?: string;
  userPrompt?: string;
  aspectRatio?: '16:9' | '9:16' | '1:1';
}

/**
 * POST /api/generate
 * Endpoint principal para generar videos
 * 
 * Flujo:
 * 1. Si hay templateId, obtiene el hiddenPrompt
 * 2. Mejora el userPrompt con LLM
 * 3. Combina prompts
 * 4. Envía a Vertex AI
 * 5. Retorna jobId para polling
 */
export async function POST(request: Request) {
  try {
    const body: GenerateRequest = await request.json();
    const { templateId, imageUrl, userPrompt, aspectRatio = '16:9' } = body;

    // Validaciones básicas
    if (!imageUrl && !userPrompt) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Either imageUrl or userPrompt is required' 
        },
        { status: 400 }
      );
    }

    // Paso 1: Si hay template, obtener su prompt oculto
    let hiddenPrompt = '';
    if (templateId) {
      const template = getTemplateWithPrompt(templateId);
      if (template) {
        hiddenPrompt = template.hiddenPrompt;
        console.log(`[Generate] Using template: ${template.title}`);
      } else {
        return NextResponse.json(
          { success: false, error: 'Template not found' },
          { status: 404 }
        );
      }
    }

    // Paso 2: Mejorar el prompt del usuario con LLM
    let enhancedUserPrompt = '';
    if (userPrompt && userPrompt.trim().length > 0) {
      console.log(`[Generate] Enhancing user prompt: "${userPrompt}"`);
      enhancedUserPrompt = await enhancePromptSimple(userPrompt);
      console.log(`[Generate] Enhanced to: "${enhancedUserPrompt}"`);
    }

    // Paso 3: Combinar prompts
    let finalPrompt = '';
    
    if (hiddenPrompt && enhancedUserPrompt) {
      // Template + User Prompt
      finalPrompt = `${hiddenPrompt}. ${enhancedUserPrompt}`;
    } else if (hiddenPrompt) {
      // Solo Template
      finalPrompt = hiddenPrompt;
    } else if (enhancedUserPrompt) {
      // Solo User Prompt
      finalPrompt = enhancedUserPrompt;
    } else {
      // Fallback
      finalPrompt = 'Professional video production with cinematic quality';
    }

    console.log(`[Generate] Final prompt: "${finalPrompt}"`);
    console.log(`[Generate] Image URL: ${imageUrl ? 'provided' : 'none'}`);
    console.log(`[Generate] Aspect ratio: ${aspectRatio}`);

    // Paso 4: Enviar a Vertex AI (mock)
    const result = await generateVideo({
      prompt: finalPrompt,
      imageUrl,
      aspectRatio,
    });

    console.log(`[Generate] Job created: ${result.jobId}`);

    // Paso 5: Retornar jobId para polling
    return NextResponse.json({
      success: true,
      jobId: result.jobId,
      status: result.status,
      estimatedTime: result.estimatedTime,
    });

  } catch (error) {
    console.error('[Generate] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Generation failed' 
      },
      { status: 500 }
    );
  }
}

