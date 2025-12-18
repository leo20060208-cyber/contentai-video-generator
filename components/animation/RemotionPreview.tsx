'use client';

import { Player } from '@remotion/player';
import { VideoComposition } from '@/lib/remotion/VideoComposition';
import { RemotionConfig, AspectRatioConfigs, defaultVideoProps } from '@/lib/remotion/schema';
import type { VideoProps } from '@/lib/remotion/schema';

interface RemotionPreviewProps {
  videoProps: VideoProps | null;
  aspectRatio: '16:9' | '9:16' | '1:1';
  isGenerating?: boolean;
}

/**
 * Componente que renderiza el Player de Remotion con las props del video
 */
export function RemotionPreview({ 
  videoProps, 
  aspectRatio,
  isGenerating = false 
}: RemotionPreviewProps) {
  const props = videoProps || defaultVideoProps;
  const dimensions = AspectRatioConfigs[aspectRatio];
  
  // Calcular duración en frames basado en durationSeconds
  const durationSeconds = props.durationSeconds || 5;
  const durationInFrames = durationSeconds * RemotionConfig.fps;

  return (
    <div className="w-full h-full flex items-center justify-center">
      <Player
        component={VideoComposition}
        inputProps={props}
        durationInFrames={durationInFrames}
        fps={RemotionConfig.fps}
        compositionWidth={dimensions.width}
        compositionHeight={dimensions.height}
        style={{
          width: '100%',
          height: '100%',
          maxWidth: aspectRatio === '9:16' ? '400px' : '100%',
        }}
        controls
        loop
        autoPlay={!isGenerating}
      />
    </div>
  );
}
