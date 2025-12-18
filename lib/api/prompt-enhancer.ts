/**
 * LLM Prompt Enhancer (Mock)
 * Mejora prompts básicos del usuario añadiendo términos técnicos profesionales
 */

export interface PromptEnhancementResult {
  originalPrompt: string;
  enhancedPrompt: string;
  addedTerms: string[];
}

const ENHANCEMENT_TERMS = {
  quality: ['4K resolution', '8K', 'high definition', 'ultra HD'],
  lighting: ['cinematic lighting', 'professional studio lighting', 'dramatic lighting', 'soft natural light'],
  camera: ['smooth camera movement', 'slow motion', 'dynamic angles', 'shallow depth of field'],
  style: ['photorealistic', 'commercial grade', 'professional', 'cinematic'],
  production: ['color grading', 'film grain', 'bokeh effect', 'detailed textures'],
};

/**
 * Mock LLM que mejora prompts de usuario
 * En producción, esto llamaría a Gemini o GPT-4
 */
export async function enhancePrompt(
  userPrompt: string,
  context?: {
    isProductVideo?: boolean;
    aspectRatio?: string;
    templateStyle?: string;
  }
): Promise<PromptEnhancementResult> {
  // Simular delay de API
  await new Promise(resolve => setTimeout(resolve, 500));

  if (!userPrompt || userPrompt.trim().length === 0) {
    return {
      originalPrompt: '',
      enhancedPrompt: 'Professional video production with cinematic quality, 4K resolution',
      addedTerms: ['cinematic quality', '4K resolution'],
    };
  }

  const addedTerms: string[] = [];
  let enhanced = userPrompt.trim();

  // Añadir calidad si no está especificada
  if (!enhanced.toLowerCase().includes('4k') && !enhanced.toLowerCase().includes('hd')) {
    const qualityTerm = ENHANCEMENT_TERMS.quality[Math.floor(Math.random() * ENHANCEMENT_TERMS.quality.length)];
    enhanced += `, ${qualityTerm}`;
    addedTerms.push(qualityTerm);
  }

  // Añadir iluminación
  if (!enhanced.toLowerCase().includes('light')) {
    const lightingTerm = ENHANCEMENT_TERMS.lighting[Math.floor(Math.random() * ENHANCEMENT_TERMS.lighting.length)];
    enhanced += `, ${lightingTerm}`;
    addedTerms.push(lightingTerm);
  }

  // Añadir estilo cinematográfico
  if (!enhanced.toLowerCase().includes('cinematic') && !enhanced.toLowerCase().includes('professional')) {
    const styleTerm = ENHANCEMENT_TERMS.style[Math.floor(Math.random() * ENHANCEMENT_TERMS.style.length)];
    enhanced += `, ${styleTerm}`;
    addedTerms.push(styleTerm);
  }

  // Si es video de producto, añadir términos específicos
  if (context?.isProductVideo) {
    if (!enhanced.toLowerCase().includes('showcase') && !enhanced.toLowerCase().includes('reveal')) {
      enhanced += ', product showcase';
      addedTerms.push('product showcase');
    }
  }

  // Añadir movimiento de cámara
  if (!enhanced.toLowerCase().includes('camera') && !enhanced.toLowerCase().includes('motion')) {
    const cameraTerm = ENHANCEMENT_TERMS.camera[Math.floor(Math.random() * ENHANCEMENT_TERMS.camera.length)];
    enhanced += `, ${cameraTerm}`;
    addedTerms.push(cameraTerm);
  }

  return {
    originalPrompt: userPrompt,
    enhancedPrompt: enhanced,
    addedTerms,
  };
}

/**
 * Versión simplificada que solo retorna el prompt mejorado
 */
export async function enhancePromptSimple(userPrompt: string): Promise<string> {
  const result = await enhancePrompt(userPrompt);
  return result.enhancedPrompt;
}

