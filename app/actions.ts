'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { VideoSchema, defaultVideoProps, CompositionTypes, VideoMoods } from '@/lib/remotion/schema';
import type { VideoProps } from '@/lib/remotion/schema';

// Inicializar cliente de Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * System prompt para Gemini - le indica cómo generar el JSON
 */
const SYSTEM_PROMPT = `Eres un director creativo de videos. Tu trabajo es convertir ideas del usuario en parámetros técnicos para generar un video animado.

DEBES responder ÚNICAMENTE con un objeto JSON válido, sin explicaciones ni markdown.

ESQUEMA JSON:
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
6. Para TikTok/Reels, usa "9:16". Para YouTube, usa "16:9". Para Instagram feed, usa "1:1"

EJEMPLOS:
Usuario: "Mis ventas subieron 35% este mes"
{"compositionType":"data-showcase","title":"¡Récord de Ventas!","subtitle":"Este mes superamos las expectativas","themeColor":"#00FF88","mood":"energetic","dataValue":"35%","dataLabel":"Crecimiento","durationSeconds":6,"aspectRatio":"16:9"}

Usuario: "Hazme un anuncio para mi tienda de zapatos con 50% de descuento"
{"compositionType":"social-ad","title":"¡50% OFF!","subtitle":"En toda la colección","themeColor":"#FF3366","secondaryColor":"#FFFFFF","mood":"energetic","durationSeconds":5,"aspectRatio":"9:16"}`;

/**
 * Limpia la respuesta de Gemini eliminando posibles bloques de código
 */
function cleanGeminiResponse(text: string): string {
  let cleaned = text.trim();
  
  // Eliminar bloques de código markdown
  cleaned = cleaned.replace(/```json\s*/gi, '');
  cleaned = cleaned.replace(/```\s*/g, '');
  
  // Eliminar posibles saltos de línea al inicio/final
  cleaned = cleaned.trim();
  
  // Intentar extraer JSON si hay texto adicional
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  
  return cleaned;
}

/**
 * Genera las propiedades del video usando Gemini AI
 */
export async function generateVideoProps(userPrompt: string): Promise<{
  success: boolean;
  data: VideoProps;
  error?: string;
}> {
  // Validar que hay API key
  if (!process.env.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY no está configurada, usando mock');
    return generateVideoPropsLocal(userPrompt);
  }

  // Validar prompt
  if (!userPrompt || userPrompt.trim().length === 0) {
    return {
      success: false,
      data: defaultVideoProps,
      error: 'El prompt está vacío',
    };
  }

  try {
    // Inicializar modelo - usar models/gemini-1.5-flash o gemini-1.0-pro
    const model = genAI.getGenerativeModel({ 
      model: 'models/gemini-1.5-flash-latest',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 512,
      },
    });

    // Construir el prompt completo
    const fullPrompt = `${SYSTEM_PROMPT}

PROMPT DEL USUARIO:
"${userPrompt}"

Genera el JSON:`;

    // Llamar a Gemini
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    console.log('Respuesta raw de Gemini:', text);

    // Limpiar respuesta
    const cleanedText = cleanGeminiResponse(text);
    console.log('Respuesta limpia:', cleanedText);

    // Parsear JSON
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Error parseando JSON:', parseError);
      return generateVideoPropsLocal(userPrompt);
    }

    // Validar con Zod
    const validation = VideoSchema.safeParse(parsedJson);

    if (!validation.success) {
      console.error('Validación Zod falló:', validation.error.issues);
      
      // Intentar usar valores parciales con fallback
      const partialData = parsedJson as Partial<VideoProps>;
      return {
        success: true,
        data: {
          ...defaultVideoProps,
          compositionType: CompositionTypes.includes(partialData.compositionType as typeof CompositionTypes[number])
            ? partialData.compositionType as typeof CompositionTypes[number]
            : 'title-only',
          title: partialData.title?.slice(0, 50) || defaultVideoProps.title,
          subtitle: partialData.subtitle?.slice(0, 80) || defaultVideoProps.subtitle,
          themeColor: partialData.themeColor || defaultVideoProps.themeColor,
          mood: VideoMoods.includes(partialData.mood as typeof VideoMoods[number])
            ? partialData.mood as typeof VideoMoods[number]
            : defaultVideoProps.mood,
          dataValue: partialData.dataValue,
          dataLabel: partialData.dataLabel,
          durationSeconds: partialData.durationSeconds || 5,
          aspectRatio: partialData.aspectRatio || '16:9',
        },
        error: 'Algunos valores fueron ajustados',
      };
    }

    // Éxito total
    return {
      success: true,
      data: validation.data,
    };

  } catch (error) {
    console.error('Error en generateVideoProps:', error);
    return generateVideoPropsLocal(userPrompt);
  }
}

/**
 * Versión local/mock para cuando no hay API key o falla
 */
export async function generateVideoPropsLocal(userPrompt: string): Promise<{
  success: boolean;
  data: VideoProps;
}> {
  // Simular delay de red
  await new Promise(resolve => setTimeout(resolve, 500));

  const prompt = userPrompt.toLowerCase();
  
  // Detectar tipo de contenido
  if (prompt.includes('%') || prompt.includes('ventas') || prompt.includes('crecimiento') || prompt.includes('subió')) {
    const match = prompt.match(/(\d+)%/);
    return {
      success: true,
      data: {
        compositionType: 'data-showcase',
        title: '¡Nuevo Récord!',
        subtitle: 'Superamos las expectativas',
        themeColor: '#00FF88',
        mood: 'energetic',
        dataValue: match ? `${match[1]}%` : '100%',
        dataLabel: 'Crecimiento',
        durationSeconds: 6,
        aspectRatio: '16:9',
      },
    };
  }
  
  if (prompt.includes('oferta') || prompt.includes('descuento') || prompt.includes('promoción') || prompt.includes('off')) {
    return {
      success: true,
      data: {
        compositionType: 'social-ad',
        title: '¡OFERTA ESPECIAL!',
        subtitle: 'Por tiempo limitado',
        themeColor: '#FF3366',
        secondaryColor: '#FFFFFF',
        mood: 'energetic',
        durationSeconds: 5,
        aspectRatio: '9:16',
      },
    };
  }
  
  if (prompt.includes('feliz') || prompt.includes('cumpleaños') || prompt.includes('felicita') || prompt.includes('boda')) {
    return {
      success: true,
      data: {
        compositionType: 'title-only',
        title: '¡Felicidades!',
        subtitle: 'Un día muy especial',
        themeColor: '#FFD700',
        mood: 'happy',
        durationSeconds: 5,
        aspectRatio: '16:9',
      },
    };
  }
  
  // Default basado en mood detectado
  let mood: VideoProps['mood'] = 'energetic';
  if (prompt.includes('calm') || prompt.includes('relax') || prompt.includes('tranquil')) mood = 'calm';
  if (prompt.includes('serious') || prompt.includes('professional') || prompt.includes('serio')) mood = 'serious';
  if (prompt.includes('happy') || prompt.includes('fun') || prompt.includes('divertido')) mood = 'happy';
  if (prompt.includes('dramatic') || prompt.includes('epic') || prompt.includes('épico')) mood = 'dramatic';

  let themeColor = '#CCFF00';
  if (prompt.includes('blue') || prompt.includes('azul') || prompt.includes('ocean')) themeColor = '#3357FF';
  if (prompt.includes('red') || prompt.includes('rojo') || prompt.includes('fire')) themeColor = '#FF5733';
  if (prompt.includes('green') || prompt.includes('verde') || prompt.includes('nature')) themeColor = '#33FF57';
  if (prompt.includes('purple') || prompt.includes('morado')) themeColor = '#FF33F3';

  return {
    success: true,
    data: {
      compositionType: 'title-only',
      title: userPrompt.slice(0, 50) || 'Video Generado',
      subtitle: 'Creado con VideoAI',
      themeColor,
      mood,
      durationSeconds: 5,
      aspectRatio: '16:9',
    },
  };
}
