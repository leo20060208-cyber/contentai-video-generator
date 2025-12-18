import { Composition } from 'remotion';
import { VideoComposition } from '@/lib/remotion/VideoComposition';
import { defaultVideoProps, RemotionConfig, AspectRatioConfigs } from '@/lib/remotion/schema';

/**
 * Root component para Remotion
 * Define todas las composiciones disponibles
 */
export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Composición 16:9 (Landscape) */}
      <Composition
        id="VideoLandscape"
        component={VideoComposition}
        durationInFrames={150}
        fps={RemotionConfig.fps}
        width={AspectRatioConfigs['16:9'].width}
        height={AspectRatioConfigs['16:9'].height}
        defaultProps={defaultVideoProps}
      />

      {/* Composición 9:16 (Vertical) */}
      <Composition
        id="VideoVertical"
        component={VideoComposition}
        durationInFrames={150}
        fps={RemotionConfig.fps}
        width={AspectRatioConfigs['9:16'].width}
        height={AspectRatioConfigs['9:16'].height}
        defaultProps={defaultVideoProps}
      />

      {/* Composición 1:1 (Square) */}
      <Composition
        id="VideoSquare"
        component={VideoComposition}
        durationInFrames={150}
        fps={RemotionConfig.fps}
        width={AspectRatioConfigs['1:1'].width}
        height={AspectRatioConfigs['1:1'].height}
        defaultProps={defaultVideoProps}
      />
    </>
  );
};

