import { VideoStyle } from '@/types/generation.types';

export const VIDEO_STYLES: VideoStyle[] = [
  {
    id: 'cinematic',
    name: 'Cinematic',
    description: 'Hollywood-style production with dramatic lighting and camera movements',
    thumbnailUrl: '/styles/cinematic.jpg',
    prompt: 'cinematic, dramatic lighting, film grain, shallow depth of field',
  },
  {
    id: 'realistic',
    name: 'Realistic',
    description: 'Photorealistic rendering with natural lighting',
    thumbnailUrl: '/styles/realistic.jpg',
    prompt: 'photorealistic, natural lighting, 4k, high detail',
  },
  {
    id: '3d-render',
    name: '3D Render',
    description: 'Clean 3D rendering with smooth surfaces and professional lighting',
    thumbnailUrl: '/styles/3d-render.jpg',
    prompt: '3d render, octane render, clean surfaces, studio lighting',
  },
  {
    id: 'anime',
    name: 'Anime',
    description: 'Japanese animation style with vibrant colors',
    thumbnailUrl: '/styles/anime.jpg',
    prompt: 'anime style, vibrant colors, cell shading, studio ghibli',
  },
  {
    id: 'abstract',
    name: 'Abstract',
    description: 'Artistic and experimental visual style',
    thumbnailUrl: '/styles/abstract.jpg',
    prompt: 'abstract art, surreal, artistic, experimental',
  },
  {
    id: 'retro',
    name: 'Retro',
    description: 'Vintage aesthetic with film grain and nostalgic feel',
    thumbnailUrl: '/styles/retro.jpg',
    prompt: 'retro, vintage, 80s aesthetic, vhs, film grain',
  },
];

export const getStyleById = (id: string): VideoStyle | undefined => {
  return VIDEO_STYLES.find(style => style.id === id);
};

export const getStylePrompt = (styleId?: string): string => {
  if (!styleId) return '';
  const style = getStyleById(styleId);
  return style?.prompt || '';
};

