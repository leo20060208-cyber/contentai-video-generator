export type GenerationMethod = 'prompt_images' | 'video_to_video' | 'template_video';

export type AIModel =
  | 'svd'
  | 'animate-diff'
  | 'minimax'
  | 'hunyuan'
  | 'wan21'
  | 'luma'
  | 'flux-schnell'
  | 'sdxl'
  | 'nano-banana'
  | 'kling-standard'
  | 'kling-pro'
  | 'wavespeed-kling-o1';

export interface GenerationConfig {
  method: GenerationMethod;
  model: AIModel;
  estimatedCost: number;
}

export interface ReferenceImages {
  start: string;
  middle: string;
  end: string;
}

export interface KeyframePrompts {
  start: string;
  middle: string;
  end: string;
}

export interface PromptImagesConfig extends GenerationConfig {
  method: 'prompt_images';
  referenceImages: ReferenceImages;
  keyframePrompts: KeyframePrompts;
  productSwapPrompt: string;
}

export interface VideoToVideoConfig extends GenerationConfig {
  method: 'video_to_video';
  referenceVideoUrl: string;
  transformationPrompt: string;
}

export interface TemplateVideoConfig extends GenerationConfig {
  method: 'template_video';
  templateVideoUrl: string;
  productInsertionPrompt: string;
}

export type TemplateGenerationConfig =
  | PromptImagesConfig
  | VideoToVideoConfig
  | TemplateVideoConfig;

// Model information for UI display
export interface ModelInfo {
  id: AIModel;
  name: string;
  description: string;
  costPerSecond: number; // in credits
  supportedMethods: GenerationMethod[];
  maxDuration: number; // in seconds
  aspectRatios: string[];
}

export const AVAILABLE_MODELS: ModelInfo[] = [
  {
    id: 'minimax',
    name: 'Minimax Video-01',
    description: 'High quality video generation with first frame support',
    costPerSecond: 0.5,
    supportedMethods: ['prompt_images', 'video_to_video'],
    maxDuration: 6,
    aspectRatios: ['16:9', '9:16', '1:1']
  },
  {
    id: 'svd',
    name: 'Stable Video Diffusion',
    description: 'Image-to-video generation',
    costPerSecond: 0.3,
    supportedMethods: ['video_to_video'],
    maxDuration: 4,
    aspectRatios: ['16:9', '9:16', '1:1']
  },
  {
    id: 'hunyuan',
    name: 'Hunyuan Video',
    description: 'Text-to-video and image-to-video',
    costPerSecond: 0.6,
    supportedMethods: ['prompt_images', 'video_to_video'],
    maxDuration: 5,
    aspectRatios: ['16:9', '9:16', '1:1']
  },
  {
    id: 'wan21',
    name: 'Wan 2.1',
    description: 'Advanced video generation',
    costPerSecond: 0.7,
    supportedMethods: ['prompt_images', 'video_to_video'],
    maxDuration: 5,
    aspectRatios: ['16:9', '9:16']
  },
  {
    id: 'luma',
    name: 'Luma Ray',
    description: 'Photorealistic video generation',
    costPerSecond: 0.8,
    supportedMethods: ['prompt_images', 'video_to_video'],
    maxDuration: 5,
    aspectRatios: ['16:9', '9:16', '1:1']
  },
  {
    id: 'animate-diff',
    name: 'AnimateDiff',
    description: 'Animation-style video generation',
    costPerSecond: 0.4,
    supportedMethods: ['prompt_images'],
    maxDuration: 8,
    aspectRatios: ['16:9', '9:16', '1:1']
  },
  {
    id: 'sdxl',
    name: 'SDXL (Image Generation)',
    description: 'High quality image generation for frames',
    costPerSecond: 0.1,
    supportedMethods: ['prompt_images'],
    maxDuration: 10,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3']
  },
  {
    id: 'nano-banana',
    name: 'Google Imagen 3',
    description: 'Google\'s latest image generation',
    costPerSecond: 0.2,
    supportedMethods: ['prompt_images', 'template_video'],
    maxDuration: 10,
    aspectRatios: ['16:9', '9:16', '1:1']
  },
  {
    id: 'kling-standard',
    name: 'Kling AI Standard',
    description: 'Fast video generation',
    costPerSecond: 0.4,
    supportedMethods: ['prompt_images', 'video_to_video'],
    maxDuration: 5,
    aspectRatios: ['16:9', '9:16', '1:1']
  },
  {
    id: 'kling-pro',
    name: 'Kling AI Pro',
    description: 'Premium quality video generation',
    costPerSecond: 0.9,
    supportedMethods: ['prompt_images', 'video_to_video', 'template_video'],
    maxDuration: 10,
    aspectRatios: ['16:9', '9:16', '1:1']
  },
  {
    id: 'kwaivgi/kling-video-o1/video-edit',
    name: 'Kling Video Edit',
    description: 'Edit existing video (User Prompt + Product Ref)',
    costPerSecond: 0.6, // Approx 30 credits for 5s
    supportedMethods: ['video_to_video', 'template_video'],
    maxDuration: 10,
    aspectRatios: ['16:9', '9:16', '1:1']
  },
  {
    id: 'kwaivgi/kling-video-o1/reference-to-video',
    name: 'Kling Multi-Ref',
    description: 'New video from multiple product angles',
    costPerSecond: 0.5, // Approx 25 credits
    supportedMethods: ['prompt_images'],
    maxDuration: 10,
    aspectRatios: ['16:9', '9:16', '1:1']
  },
  {
    id: 'wavespeed-kling-o1',
    name: 'Kling Original',
    description: 'Smart Composition + Refinement (Nano Banana)',
    costPerSecond: 0.8,
    supportedMethods: ['prompt_images', 'video_to_video', 'template_video'],
    maxDuration: 10,
    aspectRatios: ['16:9', '9:16', '1:1']
  }
];

export function getModelInfo(modelId: AIModel): ModelInfo | undefined {
  return AVAILABLE_MODELS.find(m => m.id === modelId);
}

export function getModelsForMethod(method: GenerationMethod): ModelInfo[] {
  return AVAILABLE_MODELS.filter(m => m.supportedMethods.includes(method));
}

export function estimateCost(modelId: AIModel, durationSeconds: number): number {
  const model = getModelInfo(modelId);
  if (!model) return 0;
  return model.costPerSecond * durationSeconds;
}
