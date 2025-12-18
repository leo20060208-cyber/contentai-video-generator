import { GoogleGenerativeAI } from '@google/generative-ai';
import { VideoSchema, defaultVideoProps, type VideoProps } from '@/lib/remotion/schema';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Prompt del sistema para Gemini
 */
const SYSTEM_PROMPT = `Eres un director creativo de videos. Tu trabajo es convertir las ideas del usuario en parámetros técnicos para generar un video animado.

DEBES responder ÚNICAMENTE con un JSON válido, sin explicaciones ni markdown.

El JSON debe tener esta estructura:
{
  "compositionType": "title-only" | "data-showcase" | "social-ad" | "invitation",
  "title": "Texto principal (máx 50 caracteres)",
  "subtitle": "Texto secundario opcional (máx 80 caracteres)",
  "themeColor": "#HEXCOLOR (color principal)",
  "secondaryColor": "#HEXCOLOR (color secundario, opcional)",
  "mood": "happy" | "serious" | "energetic" | "calm" | "dramatic" | "playful",
  "dataValue": "Solo si es data-showcase, ej: '20%', '$1,000'",
  "dataLabel": "Solo si es data-showcase, ej: 'Crecimiento'",
  "durationSeconds": 5 (número entre 3 y 15),
  "aspectRatio": "16:9" | "9:16" | "1:1"
}

REGLAS:
1. Si el usuario menciona números/porcentajes/dinero, usa "data-showcase"
2. Si es para redes sociales o promoción, usa "social-ad"
3. Para felicitaciones/eventos, usa "invitation" o "title-only"
4. Elige colores que combinen con el mood y el mensaje
5. El título debe ser impactante y conciso
6. Para redes sociales verticales (TikTok, Reels), usa "9:16"
7. Para YouTube/presentaciones, usa "16:9"
8. Para Instagram feed, usa "1:1"

EJEMPLOS:
Usuario: "Mis ventas subieron 35% este mes"
Respuesta: {"compositionType":"data-showcase","title":"¡Récord de Ventas!","subtitle":"Este mes superamos las expectativas","themeColor":"#00FF88","mood":"energetic","dataValue":"35%","dataLabel":"Crecimiento","durationSeconds":6,"aspectRatio":"16:9"}

Usuario: "Hazme un anuncio para mi tienda de zapatos con 50% de descuento"
Respuesta: {"compositionType":"social-ad","title":"¡50% OFF!","subtitle":"En toda la colección de zapatos","themeColor":"#FF3366","secondaryColor":"#FFFFFF","mood":"energetic","durationSeconds":5,"aspectRatio":"9:16"}

Usuario: "Felicita a Carlos por su cumpleaños"
Respuesta: {"compositionType":"title-only","title":"¡Feliz Cumpleaños Carlos!","subtitle":"Que todos tus sueños se cumplan","themeColor":"#FFD700","mood":"happy","durationSeconds":5,"aspectRatio":"16:9"}`;

/**
 * Genera los parámetros del video usando Gemini
 */
export async function generateVideoParams(userPrompt: string): Promise<VideoProps> {
  // Si no hay API key, retornar valores por defecto
  if (!GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY not configured, using default props');
    return {
      ...defaultVideoProps,
      title: userPrompt.slice(0, 50),
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent([
      { text: SYSTEM_PROMPT },
      { text: `Usuario: ${userPrompt}` },
    ]);

    const response = result.response.text();
    
    // Limpiar la respuesta (a veces viene con markdown)
    const cleanJson = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(cleanJson);
    
    // Validar con Zod
    const validated = VideoSchema.safeParse(parsed);
    
    if (validated.success) {
      return validated.data;
    } else {
      console.error('Validation errors:', validated.error);
      return {
        ...defaultVideoProps,
        title: userPrompt.slice(0, 50),
      };
    }
  } catch (error) {
    console.error('Gemini generation error:', error);
    return {
      ...defaultVideoProps,
      title: userPrompt.slice(0, 50),
    };
  }
}

/**
 * Mock para desarrollo sin API key
 */
export function generateVideoParamsMock(userPrompt: string): VideoProps {
  const prompt = userPrompt.toLowerCase();
  
  // Detectar tipo de contenido
  if (prompt.includes('%') || prompt.includes('ventas') || prompt.includes('crecimiento')) {
    const match = prompt.match(/(\d+)%/);
    return {
      compositionType: 'data-showcase',
      title: '¡Nuevo Récord!',
      subtitle: 'Superamos las expectativas',
      themeColor: '#00FF88',
      mood: 'energetic',
      dataValue: match ? `${match[1]}%` : '100%',
      dataLabel: 'Crecimiento',
      durationSeconds: 6,
      aspectRatio: '16:9',
    };
  }
  
  if (prompt.includes('oferta') || prompt.includes('descuento') || prompt.includes('promoción')) {
    return {
      compositionType: 'social-ad',
      title: '¡OFERTA ESPECIAL!',
      subtitle: 'Por tiempo limitado',
      themeColor: '#FF3366',
      secondaryColor: '#FFFFFF',
      mood: 'energetic',
      durationSeconds: 5,
      aspectRatio: '9:16',
    };
  }
  
  if (prompt.includes('feliz') || prompt.includes('cumpleaños') || prompt.includes('felicita')) {
    return {
      compositionType: 'title-only',
      title: '¡Felicidades!',
      subtitle: 'Un día muy especial',
      themeColor: '#FFD700',
      mood: 'happy',
      durationSeconds: 5,
      aspectRatio: '16:9',
    };
  }
  
  // Default
  return {
    compositionType: 'title-only',
    title: userPrompt.slice(0, 30) || 'Video Generado',
    subtitle: 'Creado con VideoAI',
    themeColor: '#CCFF00',
    mood: 'energetic',
    durationSeconds: 5,
    aspectRatio: '16:9',
  };
}

