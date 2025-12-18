'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Wand2,
  Maximize2,
  Sparkles,
  ImageIcon,
  Ratio,
  Play,
  Loader2,
  RotateCcw,
  Download,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { generateVideoProps } from '@/app/actions';
import { defaultVideoProps } from '@/lib/remotion/schema';
import type { VideoProps } from '@/lib/remotion/schema';

// Importar RemotionPreview dinámicamente (sin SSR)
const RemotionPreview = dynamic(
  () => import('@/components/animation/RemotionPreview').then(mod => ({ default: mod.RemotionPreview })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }
);

export default function AnimationStudioPage() {
  // Estado del prompt
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');

  // Estado de generación
  const [videoProps, setVideoProps] = useState<VideoProps | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generar video con Gemini + Remotion
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Escribe un prompt primero');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Llamar al Server Action que usa Gemini
      const result = await generateVideoProps(prompt);

      console.log('Resultado de Gemini:', result);

      // Siempre tenemos data (real o fallback)
      setVideoProps(result.data);

      if (!result.success && result.error) {
        setError(result.error);
      }
    } catch (err) {
      console.error('Error generando:', err);
      setError('Error al conectar con la IA');
      // Usar valores por defecto para que al menos se vea algo
      setVideoProps(defaultVideoProps);
    } finally {
      setIsGenerating(false);
    }
  };

  // Limpiar y empezar de nuevo
  const handleReset = () => {
    setVideoProps(null);
    setError(null);
  };

  // Estilo del contenedor según aspect ratio
  const getAspectRatioStyle = () => {
    switch (aspectRatio) {
      case '16:9': return { aspectRatio: '16/9', maxWidth: '100%' };
      case '9:16': return { aspectRatio: '9/16', maxHeight: '100%' };
      case '1:1': return { aspectRatio: '1/1', maxHeight: '100%' };
      default: return { aspectRatio: '16/9', maxWidth: '100%' };
    }
  };

  return (
    <div className="min-h-screen bg-black pt-24 px-4 pb-4 flex flex-col h-screen overflow-hidden">

      <div className="flex-1 grid grid-cols-12 gap-4 h-full min-h-0">

        {/* LEFT SIDEBAR - INPUTS */}
        <div className="col-span-3 bg-[#0a0a0a] rounded-3xl border border-white/10 flex flex-col overflow-hidden">

          {/* Header */}
          <div className="p-5 border-b border-white/5 flex justify-between items-center">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-primary" />
              Animation Studio
            </h2>
            <div className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-1 rounded border border-primary/20">
              GEMINI + REMOTION
            </div>
          </div>

          {/* Form */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">

            {/* Prompt Input */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-3 h-3" />
                Tu idea
              </label>
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ej: Un video promocional energético para una app de fitness con colores vibrantes..."
                  className="w-full min-h-[150px] bg-[#111] border border-white/10 rounded-xl p-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/50 transition-all resize-none"
                  disabled={isGenerating}
                />
                <div className="absolute bottom-3 right-3">
                  <span className={cn(
                    "text-[10px]",
                    prompt.length > 400 ? "text-yellow-500" : "text-zinc-700"
                  )}>
                    {prompt.length}/500
                  </span>
                </div>
              </div>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                <Ratio className="w-3 h-3" />
                Formato
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: '16:9', label: 'Landscape' },
                  { id: '9:16', label: 'Vertical' },
                  { id: '1:1', label: 'Square' }
                ].map((ratio) => (
                  <button
                    key={ratio.id}
                    onClick={() => setAspectRatio(ratio.id as '16:9' | '9:16' | '1:1')}
                    disabled={isGenerating}
                    className={cn(
                      "py-3 px-2 rounded-lg text-xs font-bold border transition-all flex flex-col items-center gap-1",
                      aspectRatio === ratio.id
                        ? "bg-zinc-100 text-black border-white"
                        : "bg-[#111] text-zinc-500 border-white/5 hover:border-white/20 hover:text-zinc-300",
                      isGenerating && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <span className="text-[10px] opacity-60">{ratio.id}</span>
                    {ratio.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Info de cómo funciona */}
            <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <h4 className="text-xs font-bold text-zinc-400 mb-2">¿Cómo funciona?</h4>
              <ol className="text-xs text-zinc-500 space-y-1">
                <li>1. Escribe tu idea de video</li>
                <li>2. Gemini AI genera los parámetros</li>
                <li>3. Remotion renderiza el preview</li>
              </ol>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <p className="text-xs text-yellow-400">{error}</p>
              </div>
            )}

          </div>

          {/* Actions */}
          <div className="p-5 border-t border-white/5 bg-[#0d0d0d] space-y-3">

            {/* Botón principal */}
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className={cn(
                "w-full py-4 rounded-xl font-black flex items-center justify-center gap-2 transition-all",
                "shadow-[0_0_20px_-5px_rgba(204,255,0,0.3)]",
                !prompt.trim() || isGenerating
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none"
                  : "bg-primary text-black hover:scale-[1.02] active:scale-[0.98]"
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  GENERANDO...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  GENERAR VIDEO
                </>
              )}
            </button>

            {/* Botones secundarios */}
            {videoProps && (
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="flex-1 py-3 rounded-xl font-bold bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Nueva
                </button>
                <button
                  className="flex-1 py-3 rounded-xl font-bold bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-all flex items-center justify-center gap-2 group relative"
                  title="El Player de Remotion tiene controles de descarga integrados"
                >
                  <Download className="w-4 h-4" />
                  Descargar
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black border border-white/10 rounded-lg text-xs text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    <Info className="w-3 h-3 inline mr-1" />
                    Usa los controles del Player
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* CENTER - VIDEO PREVIEW */}
        <div className="col-span-9 bg-[#0a0a0a] rounded-3xl border border-white/10 relative overflow-hidden flex flex-col shadow-2xl">

          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start pointer-events-none z-20">
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10">
                <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">
                  {aspectRatio}
                </span>
              </div>
              {videoProps && (
                <>
                  <div className="px-3 py-1.5 rounded-full bg-primary/20 backdrop-blur-md border border-primary/30">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                      {videoProps.mood}
                    </span>
                  </div>
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white/20"
                    style={{ backgroundColor: videoProps.themeColor }}
                    title={`Color: ${videoProps.themeColor}`}
                  />
                </>
              )}
            </div>
            <div className="pointer-events-auto">
              <button className="p-2 rounded-full bg-black/50 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Canvas */}
          <div className="flex-1 flex items-center justify-center p-8 relative">

            {/* Background grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />

            {/* Video Container */}
            <div
              className={cn(
                "relative bg-[#050505] rounded-xl border border-white/5 overflow-hidden transition-all duration-500 shadow-2xl",
                aspectRatio === '9:16' ? 'h-full w-auto' : 'w-full h-auto'
              )}
              style={getAspectRatioStyle()}
            >

              {isGenerating ? (
                // Estado: Generando
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-zinc-800 rounded-full" />
                    <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-white font-bold mb-1">Generando con Gemini AI</p>
                    <p className="text-zinc-500 text-sm">Analizando tu prompt...</p>
                  </div>
                </div>
              ) : videoProps ? (
                // Estado: Mostrar video de Remotion
                <RemotionPreview
                  videoProps={videoProps}
                  aspectRatio={aspectRatio}
                />
              ) : (
                // Estado: Vacío
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-zinc-900 rounded-2xl border border-white/10 flex items-center justify-center mb-4">
                    <ImageIcon className="w-6 h-6 text-zinc-600" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-400 mb-1">Canvas Listo</h3>
                  <p className="text-zinc-600 text-sm text-center max-w-xs">
                    Escribe un prompt y presiona &quot;Generar Video&quot; para crear tu animación
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom info */}
          {videoProps && (
            <div className="absolute bottom-6 left-6 right-6 flex justify-between items-center">
              <div className="px-4 py-2 rounded-lg bg-black/50 backdrop-blur-md border border-white/10">
                <p className="text-xs text-zinc-400">
                  <span className="text-white font-bold">{videoProps.title}</span>
                  {' · '}
                  <span className="text-primary">{videoProps.subtitle}</span>
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
