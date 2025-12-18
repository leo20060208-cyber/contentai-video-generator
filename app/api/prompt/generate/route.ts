import { NextResponse } from 'next/server';
import { VertexAI } from '@google-cloud/vertexai';
import path from 'path';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { analysis, productName } = body;

    if (!analysis || !productName) {
      return NextResponse.json({ error: 'Missing analysis or productName' }, { status: 400 });
    }

    const projectId = process.env.GOOGLE_PROJECT_ID || 'circular-hash-480519-e4';
    const location = process.env.GOOGLE_LOCATION || 'europe-southwest1';
    const credentialsPath = path.join(process.cwd(), 'service-account.json');
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;

    const vertexAI = new VertexAI({ project: projectId, location });
    const model = vertexAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
      generationConfig: {
        temperature: 0.7, // Slightly higher for creativity in recommendations
        responseMimeType: 'application/json'
      }
    });

    const prompt = `
# ROL DEL SISTEMA
Actúa como un Director Técnico de Video IA experto en Ingeniería de Prompts para modelos generativos (Wan 2.5, Hunyuan, Minimax).

# TU TAREA
Recibirás:
1. "INPUT_ANALYSIS": Descripción visual del video viral de TikTok (iluminación, movimiento, encuadre).
2. "PRODUCT_NAME": El producto del usuario (ej: Lata de refresco energética).

Debes generar un JSON estructurado para alimentar nuestra API de Replicate que comparará dos modos de generación.

# MODO A: ESTRATEGIA "FIRST FRAME" (Arquitectura Compuesta)
Necesitamos un prompt para generar una IMAGEN estática (First Frame) que integre el producto en el escenario viral, y luego un prompt de movimiento.
- El prompt de imagen debe ser fotorealista y definir la posición exacta.
- El prompt de video debe describir SOLO el movimiento de cámara.

# MODO B: ESTRATEGIA "DIRECTA" (Raw Image-to-Video)
Necesitamos un prompt descriptivo completo para que el modelo de video (Wan/Hunyuan) haga todo el trabajo partiendo solo de la foto del producto aislada. Debe describir la escena Y la acción a la vez.

# INPUTS
INPUT_ANALYSIS: """${analysis}"""
PRODUCT_NAME: "${productName}"

# SALIDA JSON OBLIGATORIA
Responde SOLO con este bloque JSON:

{
  "video_analysis_summary": "Resumen corto en español del video viral para el usuario (ej: Chica bailando en playa)",
  "mode_a_architect": {
    "step_1_flux_prompt": "Professional product photography of [PRODUCT_NAME] placed in [ESCENARIO DEL VIRAL]. [ILUMINACIÓN DETALLADA]. The product is centered on a surface. 8k resolution, photorealistic, depth of field.",
    "step_2_video_motion_prompt": "[MOVIMIENTO DE CÁMARA DETALLADO]. (Ej: Slow zoom in, slight pan right). Cinematic lighting, high quality, 4k. The object remains static, only camera moves.",
    "recommendation_text": "Este modo garantiza que tu producto se vea perfecto. Ideal para anuncios serios.",
    "suggested_model": "kling-v1-pro"
  },
  "mode_b_direct": {
    "full_video_prompt": "A viral tiktok video featuring [PRODUCT_NAME] in [ESCENARIO DEL VIRAL]. The camera [MOVIMIENTO DEL VIRAL]. Dynamic lighting, trending style, 4k. Make the product look embedded in the scene naturally.",
    "recommendation_text": "Este modo da más libertad a la IA. Ideal para replicar bailes o movimientos complejos donde el 'vibe' importa más que el logo perfecto.",
    "suggested_model": "svd"
  },
  "technical_settings": {
    "motion_bucket_id": 127,
    "fps": 24,
    "guidance_scale": 6.5
  }
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) throw new Error('No response from Gemini');

    return NextResponse.json(JSON.parse(text));

  } catch (error) {
    console.error('Prompt generation error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
