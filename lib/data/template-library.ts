/**
 * Template Library con Prompts Ocultos
 * Los videos están en public/templates/videos/
 * Los prompts ocultos solo se usan en el backend
 */

import { VideoTemplate, type TemplateCategory } from '@/types/template.types';
import templatesData from './templates.json';

export interface TemplateWithPrompt extends VideoTemplate {
  hiddenPrompt: string;
}

/**
 * Procesa los templates del JSON y genera las URLs
 */
function processTemplates(): TemplateWithPrompt[] {
  return templatesData.templates.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    category: t.category as TemplateCategory,
    tags: t.tags,
    duration: t.duration,
    aspectRatio: t.aspectRatio as '16:9' | '9:16' | '1:1',
    hiddenPrompt: t.hiddenPrompt,
    // Video desde public/templates/videos/
    videoUrl: `/templates/videos/${t.videoFile}`,
    thumbnailUrl: `/templates/videos/${t.videoFile}`,
    createdAt: new Date(),
    featured: false,
  }));
}

const TEMPLATE_LIBRARY: TemplateWithPrompt[] = processTemplates();

/**
 * Obtener template completo (CON hidden prompt) - SOLO BACKEND
 */
export function getTemplateWithPrompt(id: string): TemplateWithPrompt | null {
  return TEMPLATE_LIBRARY.find(t => t.id === id) || null;
}

/**
 * Obtener template SIN hidden prompt - Para API pública
 */
export function getTemplateById(id: string): VideoTemplate | null {
  const template = TEMPLATE_LIBRARY.find(t => t.id === id);
  if (!template) return null;
  
  const { hiddenPrompt, ...publicTemplate } = template;
  return publicTemplate;
}

/**
 * Obtener todos los templates SIN hidden prompts - Para frontend
 */
export function getAllTemplates(): VideoTemplate[] {
  return TEMPLATE_LIBRARY.map(({ hiddenPrompt, ...publicTemplate }) => publicTemplate);
}

/**
 * Obtener templates por categoría
 */
export function getTemplatesByCategory(category: string): VideoTemplate[] {
  return getAllTemplates().filter(t => t.category === category);
}

/**
 * Obtener templates destacados
 */
export function getFeaturedTemplates(): VideoTemplate[] {
  return getAllTemplates().filter(t => t.featured);
}

/**
 * Categorías disponibles
 */
export const TEMPLATE_CATEGORIES = templatesData._categories;
