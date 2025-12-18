'use client';

import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import type { VideoProps } from '../schema';

/**
 * Composición para mostrar datos/cifras con animación
 * Ideal para: "Tus ventas subieron un 20%"
 */
export function DataShowcaseComposition({ 
  title, 
  subtitle,
  themeColor, 
  mood,
  dataValue,
  dataLabel,
}: VideoProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Animación del número (contador)
  const numberProgress = spring({
    frame,
    fps,
    config: { damping: 50, stiffness: 100 },
  });

  // Extraer número del dataValue para animarlo
  const numericValue = dataValue ? parseFloat(dataValue.replace(/[^0-9.-]/g, '')) || 0 : 0;
  const prefix = dataValue?.match(/^[^0-9]*/)?.[0] || '';
  const suffix = dataValue?.match(/[^0-9]*$/)?.[0] || '';
  const animatedNumber = Math.round(numericValue * numberProgress);

  // Animaciones de entrada
  const labelOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const valueScale = spring({
    frame: frame - 5,
    fps,
    config: { damping: 80, stiffness: 150 },
  });

  const titleOpacity = interpolate(frame, [30, 50], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [30, 50], [20, 0], { extrapolateRight: 'clamp' });

  // Efecto de salida
  const exitProgress = interpolate(
    frame,
    [durationInFrames - 25, durationInFrames],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Círculo de progreso animado (si el valor es porcentaje)
  const isPercentage = dataValue?.includes('%');
  const circleProgress = isPercentage ? numberProgress * (numericValue / 100) : 0;
  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference * (1 - circleProgress);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 50%, ${themeColor}15 0%, #0a0a0a 70%)`,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        opacity: 1 - exitProgress,
      }}
    >
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {/* Círculo de progreso para porcentajes */}
        {isPercentage && (
          <svg
            width="300"
            height="300"
            style={{
              position: 'absolute',
              transform: 'rotate(-90deg)',
            }}
          >
            {/* Círculo de fondo */}
            <circle
              cx="150"
              cy="150"
              r="120"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="8"
            />
            {/* Círculo de progreso */}
            <circle
              cx="150"
              cy="150"
              r="120"
              fill="none"
              stroke={themeColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{
                filter: `drop-shadow(0 0 20px ${themeColor})`,
              }}
            />
          </svg>
        )}

        {/* Label superior */}
        {dataLabel && (
          <p
            style={{
              fontSize: 28,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.6)',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              margin: 0,
              marginBottom: 20,
              opacity: labelOpacity,
            }}
          >
            {dataLabel}
          </p>
        )}

        {/* Valor principal animado */}
        <div
          style={{
            fontSize: 140,
            fontWeight: 900,
            color: '#fff',
            transform: `scale(${valueScale})`,
            textShadow: `0 0 60px ${themeColor}80`,
            lineHeight: 1,
          }}
        >
          {prefix}{animatedNumber}{suffix}
        </div>

        {/* Título/descripción */}
        {title && (
          <h2
            style={{
              fontSize: 36,
              fontWeight: 600,
              color: themeColor,
              margin: 0,
              marginTop: 30,
              opacity: titleOpacity,
              transform: `translateY(${titleY}px)`,
              textAlign: 'center',
              maxWidth: '70%',
            }}
          >
            {title}
          </h2>
        )}

        {/* Subtítulo */}
        {subtitle && (
          <p
            style={{
              fontSize: 24,
              fontWeight: 400,
              color: 'rgba(255,255,255,0.5)',
              margin: 0,
              marginTop: 15,
              opacity: titleOpacity,
              textAlign: 'center',
            }}
          >
            {subtitle}
          </p>
        )}
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

