'use client';

import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import type { VideoProps } from '../schema';

/**
 * Composición básica: Título + Subtítulo con animaciones
 */
export function TitleComposition({ title, subtitle, themeColor, mood }: VideoProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Animaciones de entrada
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const titleY = spring({
    frame,
    fps,
    config: { damping: 100, stiffness: 200 },
  });

  const subtitleOpacity = interpolate(frame, [15, 35], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const subtitleY = spring({
    frame: frame - 10,
    fps,
    config: { damping: 100, stiffness: 200 },
  });

  // Efecto de salida
  const exitProgress = interpolate(
    frame,
    [durationInFrames - 30, durationInFrames],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const exitOpacity = 1 - exitProgress;
  const exitScale = 1 - exitProgress * 0.1;

  // Estilos basados en el mood
  const getMoodStyles = () => {
    switch (mood) {
      case 'happy':
        return {
          background: `linear-gradient(135deg, ${themeColor}20 0%, #000 100%)`,
          titleShadow: `0 0 60px ${themeColor}80`,
        };
      case 'serious':
        return {
          background: `linear-gradient(180deg, #0a0a0a 0%, #000 100%)`,
          titleShadow: `0 4px 20px rgba(0,0,0,0.8)`,
        };
      case 'energetic':
        return {
          background: `radial-gradient(circle at 50% 50%, ${themeColor}30 0%, #000 70%)`,
          titleShadow: `0 0 80px ${themeColor}`,
        };
      case 'calm':
        return {
          background: `linear-gradient(135deg, #0a1628 0%, #000 100%)`,
          titleShadow: `0 2px 40px ${themeColor}40`,
        };
      case 'dramatic':
        return {
          background: `linear-gradient(180deg, #1a0a0a 0%, #000 50%, ${themeColor}10 100%)`,
          titleShadow: `0 0 100px ${themeColor}`,
        };
      case 'playful':
        return {
          background: `conic-gradient(from 180deg, ${themeColor}20, #000, ${themeColor}10)`,
          titleShadow: `0 0 40px ${themeColor}60`,
        };
      default:
        return {
          background: '#000',
          titleShadow: 'none',
        };
    }
  };

  const moodStyles = getMoodStyles();

  return (
    <AbsoluteFill
      style={{
        background: moodStyles.background,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          opacity: exitOpacity,
          transform: `scale(${exitScale})`,
        }}
      >
        {/* Título */}
        <h1
          style={{
            fontSize: 120,
            fontWeight: 900,
            color: '#fff',
            textAlign: 'center',
            margin: 0,
            opacity: titleOpacity,
            transform: `translateY(${(1 - titleY) * 50}px)`,
            textShadow: moodStyles.titleShadow,
            letterSpacing: '-0.02em',
            maxWidth: '80%',
            lineHeight: 1.1,
          }}
        >
          {title}
        </h1>

        {/* Subtítulo */}
        {subtitle && (
          <p
            style={{
              fontSize: 40,
              fontWeight: 500,
              color: themeColor,
              textAlign: 'center',
              margin: 0,
              marginTop: 24,
              opacity: subtitleOpacity,
              transform: `translateY(${(1 - subtitleY) * 30}px)`,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            {subtitle}
          </p>
        )}

        {/* Línea decorativa */}
        <div
          style={{
            width: interpolate(frame, [30, 50], [0, 200], { extrapolateRight: 'clamp' }),
            height: 4,
            backgroundColor: themeColor,
            marginTop: 40,
            borderRadius: 2,
            opacity: subtitleOpacity,
          }}
        />
      </AbsoluteFill>

      {/* Watermark */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          right: 40,
          fontSize: 14,
          color: 'rgba(255,255,255,0.3)',
          fontWeight: 600,
          letterSpacing: '0.1em',
        }}
      >
        VIDEOAI
      </div>
    </AbsoluteFill>
  );
}

