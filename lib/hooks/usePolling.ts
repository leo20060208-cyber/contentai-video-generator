import { useEffect, useRef, useCallback } from 'react';

interface UsePollingOptions {
  interval?: number; // ms
  enabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Hook para polling de APIs
 * Ejecuta una función a intervalos regulares
 */
export function usePolling(
  callback: () => Promise<void> | void,
  { interval = 3000, enabled = true, onSuccess, onError }: UsePollingOptions = {}
) {
  const savedCallback = useRef(callback);
  const intervalRef = useRef<NodeJS.Timeout>();

  // Actualizar callback si cambia
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  const startPolling = useCallback(() => {
    const tick = async () => {
      try {
        await savedCallback.current();
        onSuccess?.();
      } catch (error) {
        console.error('Polling error:', error);
        onError?.(error instanceof Error ? error : new Error('Unknown error'));
      }
    };

    // Ejecutar inmediatamente
    tick();

    // Luego ejecutar a intervalos
    intervalRef.current = setInterval(tick, interval);
  }, [interval, onSuccess, onError]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => stopPolling();
  }, [enabled, startPolling, stopPolling]);

  return { startPolling, stopPolling };
}

