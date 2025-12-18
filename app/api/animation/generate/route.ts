import { NextRequest, NextResponse } from 'next/server';
import { generateVideoParams, generateVideoParamsMock } from '@/lib/api/gemini-video-generator';

/**
 * POST /api/animation/generate
 * Genera los parámetros del video usando Gemini
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, aspectRatio } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Usar mock si no hay API key configurada
    const useRealApi = !!process.env.GEMINI_API_KEY;
    
    let videoProps;
    if (useRealApi) {
      videoProps = await generateVideoParams(prompt);
    } else {
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 800));
      videoProps = generateVideoParamsMock(prompt);
    }

    // Override aspect ratio si se especifica
    if (aspectRatio && ['16:9', '9:16', '1:1'].includes(aspectRatio)) {
      videoProps.aspectRatio = aspectRatio as '16:9' | '9:16' | '1:1';
    }

    return NextResponse.json({
      success: true,
      data: {
        videoProps,
        usedRealApi: useRealApi,
      },
    });
  } catch (error) {
    console.error('Animation generate error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate video parameters' },
      { status: 500 }
    );
  }
}

