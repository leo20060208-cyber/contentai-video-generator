'use client';

import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import type { VideoProps } from '../schema';

/**
 * Composición para anuncios de redes sociales
 * Estilo: Fondo de color + texto grande + call to action
 */
export function SocialAdComposition({ 
  title, 
  subtitle,
  themeColor,
  secondaryColor,
  mood,
}: VideoProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const secondary = secondaryColor || '#FFFFFF';

  // Animación del fondo (expansión desde el centro)
  const bgScale = spring({
    frame,
    fps,
    config: { damping: 50, stiffness: 80 },
  });

  // Animación del título (slide + fade)
  const titleProgress = spring({
    frame: frame - 10,
    fps,
    config: { damping: 80, stiffness: 150 },
  });

  const titleX = interpolate(titleProgress, [0, 1], [-100, 0]);
  const titleOpacity = interpolate(titleProgress, [0, 0.5, 1], [0, 0.5, 1]);

  // Animación del subtítulo
  const subtitleProgress = spring({
    frame: frame - 25,
    fps,
    config: { damping: 80, stiffness: 150 },
  });

  // Animación del badge/CTA
  const ctaProgress = spring({
    frame: frame - 40,
    fps,
    config: { damping: 60, stiffness: 200 },
  });

  // Efecto de pulso en el CTA
  const pulseScale = 1 + Math.sin(frame * 0.15) * 0.03;

  // Efecto de salida
  const exitProgress = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill
      style={{
        background: '#0a0a0a',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        opacity: 1 - exitProgress,
        overflow: 'hidden',
      }}
    >
      {/* Fondo de color animado */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '200%',
          height: '200%',
          background: `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}CC 50%, ${themeColor}99 100%)`,
          transform: `translate(-50%, -50%) scale(${bgScale})`,
          borderRadius: '50%',
        }}
      />

      {/* Patrón decorativo */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `radial-gradient(circle at 20% 80%, ${secondary}15 0%, transparent 50%),
                           radial-gradient(circle at 80% 20%, ${secondary}10 0%, transparent 40%)`,
        }}
      />

      {/* Contenido */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          padding: 60,
        }}
      >
        {/* Título principal */}
        <h1
          style={{
            fontSize: 100,
            fontWeight: 900,
            color: secondary,
            textAlign: 'center',
            margin: 0,
            opacity: titleOpacity,
            transform: `translateX(${titleX}px)`,
            textShadow: '0 4px 30px rgba(0,0,0,0.3)',
            lineHeight: 1.1,
            maxWidth: '90%',
          }}
        >
          {title}
        </h1>

        {/* Subtítulo */}
        {subtitle && (
          <p
            style={{
              fontSize: 36,
              fontWeight: 500,
              color: secondary,
              textAlign: 'center',
              margin: 0,
              marginTop: 30,
              opacity: subtitleProgress,
              transform: `translateY(${(1 - subtitleProgress) * 20}px)`,
            }}
          >
            {subtitle}
          </p>
        )}

        {/* Badge/CTA */}
        <div
          style={{
            marginTop: 50,
            padding: '16px 40px',
            background: secondary,
            color: themeColor,
            fontSize: 24,
            fontWeight: 700,
            borderRadius: 50,
            opacity: ctaProgress,
            transform: `scale(${ctaProgress * pulseScale})`,
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          ¡Ver Más!
        </div>
      </AbsoluteFill>

      {/* Watermark */}
      <div
        style={{
          position: 'absolute',
          bottom: 30,
          right: 30,
          fontSize: 12,
          color: `${secondary}50`,
          fontWeight: 600,
          letterSpacing: '0.1em',
        }}
      >
        VIDEOAI
      </div>
    </AbsoluteFill>
  );
}

