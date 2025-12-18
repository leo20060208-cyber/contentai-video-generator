// Exportaciones centralizadas de Remotion
export { 
  VideoSchema, 
  defaultVideoProps, 
  ThemeColors, 
  VideoMoods, 
  CompositionTypes,
  LottieAnimations,
  RemotionConfig, 
  AspectRatioConfigs,
  LottieUrls,
} from './schema';

export type { VideoProps } from './schema';
export { VideoComposition } from './VideoComposition';

// Composiciones individuales
export { TitleComposition } from './compositions/TitleComposition';
export { DataShowcaseComposition } from './compositions/DataShowcaseComposition';
export { SocialAdComposition } from './compositions/SocialAdComposition';
export { TravelMapComposition } from './compositions/TravelMapComposition';
export { LottieComposition } from './compositions/LottieComposition';
