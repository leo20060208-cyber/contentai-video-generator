/**
 * Validadores para inputs del usuario
 */

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_PROMPT_LENGTH = 500;
export const MIN_PROMPT_LENGTH = 10;

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Valida un archivo de imagen
 */
export function validateImage(file: File): ValidationResult {
  // Validar tipo
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.',
    };
  }
  
  // Validar tamaño
  if (file.size > MAX_IMAGE_SIZE) {
    return {
      isValid: false,
      error: `File too large. Maximum size is ${MAX_IMAGE_SIZE / 1024 / 1024}MB.`,
    };
  }
  
  return { isValid: true };
}

/**
 * Valida un prompt de texto
 */
export function validatePrompt(prompt: string): ValidationResult {
  const trimmed = prompt.trim();
  
  if (trimmed.length < MIN_PROMPT_LENGTH) {
    return {
      isValid: false,
      error: `Prompt too short. Minimum ${MIN_PROMPT_LENGTH} characters.`,
    };
  }
  
  if (trimmed.length > MAX_PROMPT_LENGTH) {
    return {
      isValid: false,
      error: `Prompt too long. Maximum ${MAX_PROMPT_LENGTH} characters.`,
    };
  }
  
  return { isValid: true };
}

/**
 * Valida una URL
 */
export function validateUrl(url: string): ValidationResult {
  try {
    new URL(url);
    return { isValid: true };
  } catch {
    return {
      isValid: false,
      error: 'Invalid URL format.',
    };
  }
}

/**
 * Sanitiza un string para evitar XSS
 */
export function sanitizeString(str: string): string {
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

