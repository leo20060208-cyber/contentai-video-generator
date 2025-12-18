'use client';

import { useEffect } from 'react';

export function ChunkErrorHandler() {
    useEffect(() => {
        // Global error handler for chunk loading errors
        const handleError = (event: ErrorEvent) => {
            const error = event.error;

            if (
                error?.name === 'ChunkLoadError' ||
                error?.message?.includes('Loading chunk') ||
                error?.message?.includes('ChunkLoadError') ||
                event.message?.includes('ChunkLoadError')
            ) {
                console.warn('Chunk loading error detected, reloading page...');
                event.preventDefault();

                // Show a brief message before reloading
                const shouldReload = confirm(
                    'The application has been updated. Click OK to reload the page.'
                );

                if (shouldReload) {
                    window.location.reload();
                }
            }
        };

        // Handle unhandled promise rejections (common with dynamic imports)
        const handleRejection = (event: PromiseRejectionEvent) => {
            const reason = event.reason;

            if (
                reason?.name === 'ChunkLoadError' ||
                reason?.message?.includes('Loading chunk') ||
                reason?.message?.includes('ChunkLoadError')
            ) {
                console.warn('Chunk loading promise rejection detected, reloading page...');
                event.preventDefault();

                const shouldReload = confirm(
                    'The application has been updated. Click OK to reload the page.'
                );

                if (shouldReload) {
                    window.location.reload();
                }
            }
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleRejection);

        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleRejection);
        };
    }, []);

    return null;
}
