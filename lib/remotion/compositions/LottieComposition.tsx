'use client';

import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img } from 'remotion';
import { Lottie } from '@remotion/lottie';
import { useEffect, useState } from 'react';
import type { VideoProps } from '../schema';

// URLs de animaciones Lottie gratuitas de LottieFiles
const LOTTIE_ANIMATIONS: Record<string, string> = {
  // Viajes y mapas
  'airplane': 'https://lottie.host/embed/d6a3c8e5-5c5e-4b5a-9c5e-5c5e4b5a9c5e/airplane.json',
  'travel': 'https://assets2.lottiefiles.com/packages/lf20_UJNc2t.json',
  'world-map': 'https://assets9.lottiefiles.com/packages/lf20_svy4ivvy.json',
  'location-pin': 'https://assets3.lottiefiles.com/packages/lf20_UBiAADPga8.json',
  
  // Celebración
  'confetti': 'https://assets4.lottiefiles.com/packages/lf20_u4yrau.json',
  'celebration': 'https://assets1.lottiefiles.com/packages/lf20_lg6lh8ly.json',
  'fireworks': 'https://assets9.lottiefiles.com/packages/lf20_xlmz9xwm.json',
  'party': 'https://assets2.lottiefiles.com/packages/lf20_aZTdD5.json',
  
  // Negocios y datos
  'chart-up': 'https://assets8.lottiefiles.com/packages/lf20_kxsd2ytq.json',
  'success': 'https://assets4.lottiefiles.com/packages/lf20_jbrw3hcz.json',
  'rocket': 'https://assets9.lottiefiles.com/packages/lf20_l13zwzlq.json',
  'money': 'https://assets2.lottiefiles.com/packages/lf20_06a6pf9i.json',
  
  // Tecnología
  'loading': 'https://assets1.lottiefiles.com/packages/lf20_p8bfn5to.json',
  'check': 'https://assets9.lottiefiles.com/packages/lf20_jbrw3hcz.json',
  
  // Social
  'like': 'https://assets1.lottiefiles.com/packages/lf20_slDcnv.json',
  'heart': 'https://assets4.lottiefiles.com/packages/lf20_gkgqj2yq.json',
  'star': 'https://assets9.lottiefiles.com/packages/lf20_bq485nmk.json',
};

// Mapeo de keywords a animaciones
function detectAnimation(prompt: string): string {
  const p = prompt.toLowerCase();
  
  if (p.includes('viaj') || p.includes('avion') || p.includes('vuelo') || p.includes('destino') || p.includes('travel')) {
    return 'travel';
  }
  if (p.includes('mapa') || p.includes('ubicacion') || p.includes('lugar') || p.includes('location')) {
    return 'location-pin';
  }
  if (p.includes('celebr') || p.includes('fiesta') || p.includes('party')) {
    return 'celebration';
  }
  if (p.includes('confeti') || p.includes('confetti')) {
    return 'confetti';
  }
  if (p.includes('fuego') || p.includes('firework')) {
    return 'fireworks';
  }
  if (p.includes('venta') || p.includes('creci') || p.includes('subió') || p.includes('chart') || p.includes('%')) {
    return 'chart-up';
  }
  if (p.includes('éxito') || p.includes('success') || p.includes('logr')) {
    return 'success';
  }
  if (p.includes('cohete') || p.includes('rocket') || p.includes('lanzamiento')) {
    return 'rocket';
  }
  if (p.includes('dinero') || p.includes('money') || p.includes('$') || p.includes('€')) {
    return 'money';
  }
  if (p.includes('like') || p.includes('me gusta')) {
    return 'like';
  }
  if (p.includes('amor') || p.includes('love') || p.includes('corazón') || p.includes('heart')) {
    return 'heart';
  }
  if (p.includes('estrella') || p.includes('star') || p.includes('rating')) {
    return 'star';
  }
  
  // Default
  return 'celebration';
}

interface LottieAnimationData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  loaded: boolean;
}

/**
 * Composición con animación Lottie + Texto
 */
export function LottieComposition({ 
  title, 
  subtitle,
  themeColor, 
  mood,
}: VideoProps & { userPrompt?: string }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  
  // Detectar qué animación usar basado en el título/subtitle
  const animationType = detectAnimation(`${title} ${subtitle || ''}`);
  const lottieUrl = LOTTIE_ANIMATIONS[animationType] || LOTTIE_ANIMATIONS['celebration'];
  
  // Estado para la animación Lottie
  const [lottieData, setLottieData] = useState<LottieAnimationData>({ data: null, loaded: false });
  
  // Cargar animación Lottie
  useEffect(() => {
    fetch(lottieUrl)
      .then(res => res.json())
      .then(data => setLottieData({ data, loaded: true }))
      .catch(err => {
        console.error('Error loading Lottie:', err);
        setLottieData({ data: null, loaded: false });
      });
  }, [lottieUrl]);

  // Animaciones
  const lottieScale = spring({
    frame,
    fps,
    config: { damping: 50, stiffness: 100 },
  });

  const titleOpacity = interpolate(frame, [30, 50], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [30, 50], [30, 0], { extrapolateRight: 'clamp' });

  const subtitleOpacity = interpolate(frame, [45, 65], [0, 1], { extrapolateRight: 'clamp' });

  // Efecto de salida
  const exitProgress = interpolate(
    frame,
    [durationInFrames - 25, durationInFrames],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 30%, ${themeColor}25 0%, #0a0a0a 70%)`,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        opacity: 1 - exitProgress,
      }}
    >
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
        }}
      >
        {/* Animación Lottie */}
        <div
          style={{
            width: 300,
            height: 300,
            transform: `scale(${lottieScale})`,
            marginBottom: 20,
          }}
        >
          {lottieData.loaded && lottieData.data ? (
            <Lottie
              animationData={lottieData.data}
              style={{ width: '100%', height: '100%' }}
            />
          ) : (
            // Fallback mientras carga
            <div 
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 80,
              }}
            >
              {animationType === 'travel' && '✈️'}
              {animationType === 'celebration' && '🎉'}
              {animationType === 'chart-up' && '📈'}
              {animationType === 'rocket' && '🚀'}
              {animationType === 'heart' && '❤️'}
              {animationType === 'star' && '⭐'}
              {!['travel', 'celebration', 'chart-up', 'rocket', 'heart', 'star'].includes(animationType) && '✨'}
            </div>
          )}
        </div>

        {/* Título */}
        <h1
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: '#fff',
            textAlign: 'center',
            margin: 0,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            textShadow: `0 0 40px ${themeColor}60`,
            maxWidth: '80%',
            lineHeight: 1.2,
          }}
        >
          {title}
        </h1>

        {/* Subtítulo */}
        {subtitle && (
          <p
            style={{
              fontSize: 28,
              fontWeight: 500,
              color: themeColor,
              textAlign: 'center',
              margin: 0,
              marginTop: 16,
              opacity: subtitleOpacity,
              letterSpacing: '0.05em',
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

