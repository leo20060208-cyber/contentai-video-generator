import { z } from 'zod';

/**
 * Colores de tema disponibles para los videos
 */
export const ThemeColors = [
  '#FF5733', // Naranja vibrante
  '#33FF57', // Verde neón
  '#3357FF', // Azul eléctrico
  '#F3FF33', // Amarillo brillante
  '#FF33F3', // Magenta
  '#33FFF3', // Cyan
  '#CCFF00', // Primary (lime)
  '#FFFFFF', // Blanco
  '#000000', // Negro
] as const;

/**
 * Estados de ánimo para el video
 */
export const VideoMoods = ['happy', 'serious', 'energetic', 'calm', 'dramatic', 'playful'] as const;

/**
 * Tipos de animación Lottie disponibles
 */
export const LottieAnimations = [
  'confetti',
  'rocket',
  'celebration',
  'checkmark',
  'loading',
  'arrow',
  'star',
  'heart',
  'fire',
  'none',
] as const;

/**
 * Tipos de composición/template
 */
export const CompositionTypes = [
  'title-only',      // Solo título y subtítulo
  'title-with-icon', // Título con icono Lucide
  'title-with-lottie', // Título con animación Lottie
  'data-showcase',   // Para mostrar datos/cifras
  'social-ad',       // Formato de anuncio social
  'invitation',      // Invitación/evento
  'travel-map',      // Avión viajando sobre mapa
  'celebration',     // Celebración con confeti
] as const;

/**
 * Esquema Zod para las propiedades del video generadas por IA
 */
export const VideoSchema = z.object({
  /** Tipo de composición */
  compositionType: z.enum(CompositionTypes).default('title-only'),
  
  /** Título principal del video (máx 30 caracteres) */
  title: z.string().max(50, 'El título no puede exceder 50 caracteres'),
  
  /** Subtítulo o descripción corta (máx 80 caracteres) */
  subtitle: z.string().max(80, 'El subtítulo no puede exceder 80 caracteres').optional(),
  
  /** Color principal del tema (hex) */
  themeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color debe ser hex válido').default('#CCFF00'),
  
  /** Color secundario (hex) */
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  
  /** Estado de ánimo/tono del video */
  mood: z.enum(VideoMoods).default('energetic'),
  
  /** Animación Lottie a usar */
  lottieAnimation: z.enum(LottieAnimations).optional(),
  
  /** Nombre del icono Lucide (si aplica) */
  iconName: z.string().optional(),
  
  /** Datos numéricos para data-showcase */
  dataValue: z.string().optional(), // "20%", "$1,000", etc.
  dataLabel: z.string().optional(), // "Crecimiento", "Ventas", etc.
  
  /** Duración en segundos */
  durationSeconds: z.number().min(3).max(30).default(5),
  
  /** Aspect ratio */
  aspectRatio: z.enum(['16:9', '9:16', '1:1']).default('16:9'),
});

/**
 * Tipo TypeScript inferido del esquema
 */
export type VideoProps = z.infer<typeof VideoSchema>;

/**
 * Props por defecto (fallback) cuando la IA falla
 */
export const defaultVideoProps: VideoProps = {
  compositionType: 'title-only',
  title: 'Video Generado',
  subtitle: 'Creado con IA',
  themeColor: '#CCFF00',
  mood: 'energetic',
  durationSeconds: 5,
  aspectRatio: '16:9',
};

/**
 * Configuración base para Remotion
 */
export const RemotionConfig = {
  fps: 30,
} as const;

/**
 * Configuración para diferentes aspect ratios
 */
export const AspectRatioConfigs = {
  '16:9': { width: 1920, height: 1080 },
  '9:16': { width: 1080, height: 1920 },
  '1:1': { width: 1080, height: 1080 },
} as const;

/**
 * URLs de animaciones Lottie (usando LottieFiles CDN)
 */
export const LottieUrls: Record<string, string> = {
  confetti: 'https://lottie.host/4db68bbd-31f6-4cd8-84eb-189de081159a/IGmMCqhzpt.lottie',
  rocket: 'https://lottie.host/f6a6bc49-888a-4b4a-8ec4-f8f7c9b7c5c5/cLzGdpZHJI.lottie',
  celebration: 'https://lottie.host/b5ef1a2c-2e2d-4c3c-9b5a-3e8c7c5d8f9a/celebrationAnim.lottie',
  checkmark: 'https://lottie.host/7c6e4a3b-8d5f-4e2c-9a1b-2c3d4e5f6a7b/checkmarkAnim.lottie',
  loading: 'https://lottie.host/1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d/loadingAnim.lottie',
  arrow: 'https://lottie.host/2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e/arrowAnim.lottie',
  star: 'https://lottie.host/3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f/starAnim.lottie',
  heart: 'https://lottie.host/4d5e6f7a-8b9c-0d1e-2f3a-4b5c6d7e8f9a/heartAnim.lottie',
  fire: 'https://lottie.host/5e6f7a8b-9c0d-1e2f-3a4b-5c6d7e8f9a0b/fireAnim.lottie',
};
