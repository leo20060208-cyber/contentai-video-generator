'use client';

import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import type { VideoProps } from '../schema';

/**
 * Composición de viaje con avión animado sobre un mapa estilizado
 */
export function TravelMapComposition({ 
  title, 
  subtitle,
  themeColor, 
}: VideoProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Animación del avión (de izquierda a derecha con curva)
  const flightProgress = interpolate(
    frame,
    [0, durationInFrames * 0.7],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );

  // Posición X del avión
  const planeX = interpolate(flightProgress, [0, 1], [-10, 110]);
  
  // Posición Y del avión (curva parabólica)
  const planeY = 50 - Math.sin(flightProgress * Math.PI) * 30;
  
  // Rotación del avión según la dirección
  const planeRotation = interpolate(
    flightProgress,
    [0, 0.5, 1],
    [-15, 0, 15]
  );

  // Escala del avión (más pequeño en el medio = más lejos)
  const planeScale = 1 - Math.sin(flightProgress * Math.PI) * 0.3;

  // Trail del avión (línea punteada)
  const trailLength = flightProgress * 100;

  // Animación del título
  const titleOpacity = interpolate(frame, [durationInFrames * 0.5, durationInFrames * 0.65], [0, 1], { extrapolateRight: 'clamp' });
  const titleScale = spring({
    frame: frame - durationInFrames * 0.5,
    fps,
    config: { damping: 50, stiffness: 100 },
  });

  // Puntos de origen y destino
  const originOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  const destOpacity = interpolate(frame, [durationInFrames * 0.6, durationInFrames * 0.7], [0, 1], { extrapolateRight: 'clamp' });

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
        background: `linear-gradient(180deg, #0a1628 0%, #1a0a28 100%)`,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        opacity: 1 - exitProgress,
        overflow: 'hidden',
      }}
    >
      {/* Fondo de estrellas/puntos */}
      <div style={{ position: 'absolute', inset: 0 }}>
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${(i * 17) % 100}%`,
              top: `${(i * 23) % 100}%`,
              width: 2,
              height: 2,
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.3)',
              opacity: 0.3 + Math.sin(frame * 0.1 + i) * 0.2,
            }}
          />
        ))}
      </div>

      {/* Grid del mapa estilizado */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(${themeColor}10 1px, transparent 1px),
            linear-gradient(90deg, ${themeColor}10 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          opacity: 0.5,
        }}
      />

      {/* Punto de origen */}
      <div
        style={{
          position: 'absolute',
          left: '10%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: originOpacity,
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            backgroundColor: themeColor,
            boxShadow: `0 0 20px ${themeColor}, 0 0 40px ${themeColor}50`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 30,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 14,
            color: 'rgba(255,255,255,0.7)',
            whiteSpace: 'nowrap',
          }}
        >
          ORIGEN
        </div>
      </div>

      {/* Punto de destino */}
      <div
        style={{
          position: 'absolute',
          right: '10%',
          top: '50%',
          transform: 'translate(50%, -50%)',
          opacity: destOpacity,
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            backgroundColor: '#fff',
            boxShadow: `0 0 20px #fff, 0 0 40px ${themeColor}`,
            animation: destOpacity > 0.5 ? 'pulse 1s infinite' : 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 35,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 14,
            color: 'rgba(255,255,255,0.9)',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
          }}
        >
          DESTINO
        </div>
      </div>

      {/* Trail del avión */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      >
        <defs>
          <linearGradient id="trailGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={themeColor} stopOpacity="0" />
            <stop offset="100%" stopColor={themeColor} stopOpacity="1" />
          </linearGradient>
        </defs>
        <path
          d={`M ${1920 * 0.1} ${1080 * 0.5} Q ${1920 * 0.5} ${1080 * 0.2} ${1920 * 0.9} ${1080 * 0.5}`}
          fill="none"
          stroke="url(#trailGradient)"
          strokeWidth="3"
          strokeDasharray="10 5"
          strokeDashoffset={1000 - trailLength * 10}
          opacity={0.8}
        />
      </svg>

      {/* Avión */}
      <div
        style={{
          position: 'absolute',
          left: `${planeX}%`,
          top: `${planeY}%`,
          transform: `translate(-50%, -50%) rotate(${planeRotation}deg) scale(${planeScale})`,
          fontSize: 60,
          filter: `drop-shadow(0 0 20px ${themeColor})`,
          transition: 'transform 0.1s ease-out',
        }}
      >
        ✈️
      </div>

      {/* Título y subtítulo */}
      <div
        style={{
          position: 'absolute',
          bottom: '15%',
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: titleOpacity,
          transform: `scale(${Math.max(0, titleScale)})`,
        }}
      >
        <h1
          style={{
            fontSize: 64,
            fontWeight: 900,
            color: '#fff',
            margin: 0,
            textShadow: `0 0 40px ${themeColor}80`,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              fontSize: 28,
              fontWeight: 500,
              color: themeColor,
              margin: 0,
              marginTop: 12,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Watermark */}
      <div
        style={{
          position: 'absolute',
          bottom: 30,
          right: 30,
          fontSize: 12,
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

