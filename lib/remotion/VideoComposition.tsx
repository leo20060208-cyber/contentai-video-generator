'use client';

import type { VideoProps } from './schema';
import { TitleComposition } from './compositions/TitleComposition';
import { DataShowcaseComposition } from './compositions/DataShowcaseComposition';
import { SocialAdComposition } from './compositions/SocialAdComposition';
import { TravelMapComposition } from './compositions/TravelMapComposition';

/**
 * Detecta automáticamente el mejor tipo de composición basado en el contenido
 */
function detectBestComposition(props: VideoProps): string {
  const text = `${props.title} ${props.subtitle || ''}`.toLowerCase();
  
  // Viajes y destinos
  if (text.includes('viaj') || text.includes('vuelo') || text.includes('destino') || 
      text.includes('avion') || text.includes('travel') || text.includes('trip') ||
      text.includes('vacacion') || text.includes('holiday')) {
    return 'travel-map';
  }
  
  // Datos y estadísticas
  if (props.dataValue || text.includes('%') || text.includes('venta') || 
      text.includes('creci') || text.includes('subió') || text.includes('bajó')) {
    return 'data-showcase';
  }
  
  // Anuncios sociales
  if (text.includes('oferta') || text.includes('descuento') || text.includes('promo') ||
      text.includes('off') || text.includes('gratis') || text.includes('free')) {
    return 'social-ad';
  }
  
  // Default
  return props.compositionType || 'title-only';
}

/**
 * Composición principal que elige el tipo correcto automáticamente
 */
export function VideoComposition(props: VideoProps) {
  // Detectar el mejor tipo de composición
  const detectedType = detectBestComposition(props);
  const compositionType = detectedType;

  switch (compositionType) {
    case 'travel-map':
      return <TravelMapComposition {...props} />;
    
    case 'data-showcase':
      return <DataShowcaseComposition {...props} />;
    
    case 'social-ad':
      return <SocialAdComposition {...props} />;
    
    case 'title-only':
    case 'title-with-icon':
    case 'title-with-lottie':
    case 'invitation':
    default:
      return <TitleComposition {...props} />;
  }
}
