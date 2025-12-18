'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Film, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface VideoUploaderProps {
  onUploadComplete: (videoUrl: string) => void;
  currentVideoUrl?: string;
}

export function VideoUploader({ onUploadComplete, currentVideoUrl }: VideoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(currentVideoUrl || null);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const uploadFile = async (file: File) => {
    setError(null);
    setIsUploading(true);

    try {
      // Validar tipo
      if (!file.type.startsWith('video/')) {
        throw new Error('El archivo debe ser un video');
      }

      // Validar tamaño (100MB)
      if (file.size > 100 * 1024 * 1024) {
        throw new Error('El video es muy grande. Máximo 100MB');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al subir el video');
      }

      setUploadedUrl(data.videoUrl);
      onUploadComplete(data.videoUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      uploadFile(file);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  }, []);

  const clearVideo = () => {
    setUploadedUrl(null);
    setError(null);
    onUploadComplete('');
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-zinc-300">
        Video
      </label>

      <AnimatePresence mode="wait">
        {uploadedUrl ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800"
          >
            <video
              src={uploadedUrl}
              controls
              className="w-full max-h-[300px] object-contain"
            />
            <button
              onClick={clearVideo}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/70 hover:bg-red-500/80 transition-colors"
              type="button"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/30">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-xs font-medium text-green-400">Video subido</span>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="uploader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'relative border-2 border-dashed rounded-xl p-8 transition-all duration-300 cursor-pointer',
              isDragging
                ? 'border-orange-500 bg-orange-500/10'
                : 'border-zinc-700 hover:border-zinc-500 bg-zinc-900/50',
              isUploading && 'pointer-events-none opacity-70'
            )}
          >
            <input
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isUploading}
            />

            <div className="flex flex-col items-center justify-center text-center">
              {isUploading ? (
                <>
                  <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
                  <p className="text-zinc-300 font-medium">Subiendo video...</p>
                </>
              ) : (
                <>
                  <div className={cn(
                    'w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors',
                    isDragging ? 'bg-orange-500/20' : 'bg-zinc-800'
                  )}>
                    {isDragging ? (
                      <Film className="w-8 h-8 text-orange-500" />
                    ) : (
                      <Upload className="w-8 h-8 text-zinc-400" />
                    )}
                  </div>
                  <p className="text-zinc-300 font-medium mb-1">
                    {isDragging ? 'Suelta el video aquí' : 'Arrastra un video o haz click'}
                  </p>
                  <p className="text-zinc-500 text-sm">
                    MP4, MOV, WebM • Máximo 100MB
                  </p>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-400 text-sm"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}

