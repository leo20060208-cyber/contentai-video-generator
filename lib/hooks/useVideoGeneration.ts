import { useState, useCallback } from 'react';
import { useVideoStore } from '@/store/video-store';
import { useUIStore } from '@/store/ui-store';
import { GenerationConfig } from '@/types/generation.types';
import { validateImage, validatePrompt } from '@/lib/utils/validators';

interface UseVideoGenerationResult {
  isGenerating: boolean;
  error: string | null;
  generate: (config: GenerationConfig) => Promise<void>;
  reset: () => void;
}

export function useVideoGeneration(): UseVideoGenerationResult {
  const [error, setError] = useState<string | null>(null);
  const startGeneration = useVideoStore((state) => state.startGeneration);
  const isGenerating = useVideoStore((state) => state.isGenerating);
  const addNotification = useUIStore((state) => state.addNotification);

  const generate = useCallback(
    async (config: GenerationConfig) => {
      setError(null);

      try {
        // Validaciones
        if (config.type === 'text-to-video' && config.prompt) {
          const validation = validatePrompt(config.prompt);
          if (!validation.isValid) {
            throw new Error(validation.error);
          }
        }

        // Iniciar generación
        await startGeneration(config);

        // Notificación de éxito
        addNotification({
          type: 'success',
          title: 'Generation started',
          message: 'Your video is being generated. This may take a few minutes.',
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);

        // Notificación de error
        addNotification({
          type: 'error',
          title: 'Generation failed',
          message: errorMessage,
        });

        throw err;
      }
    },
    [startGeneration, addNotification]
  );

  const reset = useCallback(() => {
    setError(null);
  }, []);

  return {
    isGenerating,
    error,
    generate,
    reset,
  };
}

