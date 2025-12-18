# 🧩 Componentes Adicionales - Guía de Implementación

Componentes adicionales que puedes implementar para completar el SaaS.

---

## 📤 ProductUploader Component

Componente para drag & drop de imágenes en Templates.

```tsx
// components/templates/ProductUploader.tsx
'use client';

import { useState, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useUIStore } from '@/store/ui-store';
import { validateImage } from '@/lib/utils/validators';
import { cn } from '@/lib/utils/cn';

interface ProductUploaderProps {
  onUploadComplete: (imageUrl: string) => void;
  className?: string;
}

export function ProductUploader({ onUploadComplete, className }: ProductUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const addNotification = useUIStore((state) => state.addNotification);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    const validation = validateImage(file);
    if (!validation.isValid) {
      addNotification({
        type: 'error',
        title: 'Invalid file',
        message: validation.error,
      });
      return;
    }

    // Preview local
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Upload al servidor
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      onUploadComplete(data.imageUrl);

      addNotification({
        type: 'success',
        title: 'Image uploaded',
        message: 'Your product image is ready',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Upload failed',
        message: 'Please try again',
      });
    } finally {
      setIsUploading(false);
    }
  }, [onUploadComplete, addNotification]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fakeEvent = {
        preventDefault: () => {},
        dataTransfer: { files: [file] },
      } as any;
      handleDrop(fakeEvent);
    }
  }, [handleDrop]);

  const clearPreview = () => {
    setPreview(null);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {!preview ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-all',
            isDragging
              ? 'border-primary bg-primary/10'
              : 'border-border hover:border-primary/50'
          )}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="absolute inset-0 cursor-pointer opacity-0"
          />

          <Upload className="mb-4 h-12 w-12 text-zinc-400" />
          <p className="mb-2 text-lg font-semibold">Drop your product image here</p>
          <p className="text-sm text-zinc-400">or click to browse</p>
          <p className="mt-4 text-xs text-zinc-500">PNG, JPG or WebP (max 10MB)</p>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-xl border border-border">
          {isUploading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          )}

          <img
            src={preview}
            alt="Preview"
            className="h-64 w-full object-contain bg-surface"
          />

          <button
            onClick={clearPreview}
            className="absolute right-2 top-2 rounded-full bg-black/50 p-2 backdrop-blur-sm transition-all hover:bg-black/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## ✨ PromptInput Component

Textarea inteligente con sugerencias y character count.

```tsx
// components/animation/PromptInput.tsx
'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { MAX_PROMPT_LENGTH } from '@/lib/utils/validators';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const EXAMPLE_PROMPTS = [
  'A futuristic city at sunset with flying cars',
  'A robot dancing in a neon-lit club',
  'Ocean waves crashing on a beach at golden hour',
  'A coffee cup with steam rising, cinematic lighting',
];

export function PromptInput({ value, onChange, placeholder, className }: PromptInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const characterCount = value.length;
  const isNearLimit = characterCount > MAX_PROMPT_LENGTH * 0.8;
  const isOverLimit = characterCount > MAX_PROMPT_LENGTH;

  const handleSurprise = () => {
    const random = EXAMPLE_PROMPTS[Math.floor(Math.random() * EXAMPLE_PROMPTS.length)];
    onChange(random);
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Describe your video</label>
        <button
          onClick={handleSurprise}
          className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
        >
          <Sparkles className="h-4 w-4" />
          Surprise me
        </button>
      </div>

      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder || 'A cinematic shot of...'}
          className={cn(
            'w-full rounded-xl border bg-surface p-4 text-white placeholder:text-zinc-500 focus:outline-none transition-all resize-none',
            isFocused ? 'border-primary' : 'border-border',
            isOverLimit && 'border-red-500'
          )}
          rows={5}
        />

        {/* Character count */}
        <div
          className={cn(
            'absolute bottom-3 right-3 text-xs',
            isOverLimit ? 'text-red-400' : isNearLimit ? 'text-yellow-400' : 'text-zinc-500'
          )}
        >
          {characterCount} / {MAX_PROMPT_LENGTH}
        </div>
      </div>

      {/* Example prompts */}
      {!value && (
        <div className="space-y-2">
          <p className="text-xs text-zinc-500">Try these examples:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.slice(0, 3).map((example) => (
              <button
                key={example}
                onClick={() => onChange(example)}
                className="rounded-lg bg-surface-elevated px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:text-white hover:bg-surface"
              >
                {example.slice(0, 40)}...
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 🎨 StyleSelector Component

Selector visual de estilos.

```tsx
// components/animation/StyleSelector.tsx
'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { VIDEO_STYLES } from '@/lib/constants/video-styles';
import { cn } from '@/lib/utils/cn';

interface StyleSelectorProps {
  selectedStyle: string;
  onSelectStyle: (styleId: string) => void;
  className?: string;
}

export function StyleSelector({ selectedStyle, onSelectStyle, className }: StyleSelectorProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <label className="text-sm font-medium">Choose a style</label>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {VIDEO_STYLES.map((style) => {
          const isSelected = selectedStyle === style.id;

          return (
            <motion.button
              key={style.id}
              onClick={() => onSelectStyle(style.id)}
              className={cn(
                'group relative overflow-hidden rounded-xl border-2 p-4 text-left transition-all',
                isSelected
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Thumbnail background */}
              <div className="absolute inset-0 opacity-10">
                <div className="h-full w-full bg-gradient-to-br from-primary to-purple-600" />
              </div>

              <div className="relative">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white">{style.name}</h3>
                  {isSelected && (
                    <div className="rounded-full bg-primary p-1">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>
                <p className="mt-2 text-sm text-zinc-400">{style.description}</p>
              </div>

              {/* Hover gradient */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-primary/5 to-purple-600/5 opacity-0 transition-opacity group-hover:opacity-100"
                initial={false}
              />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
```

---

## 🎬 TemplateGrid Component

Grid responsive con loading states.

```tsx
// components/templates/TemplateGrid.tsx
'use client';

import { motion } from 'framer-motion';
import { TemplateCard } from './TemplateCard';
import { VideoTemplate } from '@/types/template.types';

interface TemplateGridProps {
  templates: VideoTemplate[];
  isLoading?: boolean;
}

export function TemplateGrid({ templates, isLoading }: TemplateGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <TemplateCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-xl text-zinc-400">No templates found</p>
        <p className="mt-2 text-sm text-zinc-500">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <motion.div
      className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      variants={{
        show: {
          transition: {
            staggerChildren: 0.1,
          },
        },
      }}
      initial="hidden"
      animate="show"
    >
      {templates.map((template) => (
        <TemplateCard key={template.id} template={template} />
      ))}
    </motion.div>
  );
}

function TemplateCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-elevated">
      <div className="aspect-video animate-pulse bg-zinc-800" />
      <div className="space-y-3 p-4">
        <div className="h-5 w-3/4 animate-pulse rounded bg-zinc-800" />
        <div className="h-4 w-full animate-pulse rounded bg-zinc-800" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-800" />
      </div>
    </div>
  );
}
```

---

## 🔔 NotificationSystem Component

Sistema de notificaciones tipo toast.

```tsx
// components/shared/NotificationSystem.tsx
'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react';
import { useUIStore } from '@/store/ui-store';
import { cn } from '@/lib/utils/cn';

const iconMap = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const colorMap = {
  success: 'text-green-400 bg-green-400/10 border-green-400/50',
  error: 'text-red-400 bg-red-400/10 border-red-400/50',
  warning: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/50',
  info: 'text-blue-400 bg-blue-400/10 border-blue-400/50',
};

export function NotificationSystem() {
  const { notifications, removeNotification } = useUIStore();

  return (
    <div className="pointer-events-none fixed right-4 top-20 z-50 flex flex-col gap-3">
      <AnimatePresence>
        {notifications.map((notification) => {
          const Icon = iconMap[notification.type];

          return (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 100, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.8 }}
              className={cn(
                'pointer-events-auto max-w-md rounded-xl border p-4 backdrop-blur-xl',
                colorMap[notification.type]
              )}
            >
              <div className="flex items-start gap-3">
                <Icon className="h-5 w-5 flex-shrink-0" />

                <div className="flex-1">
                  <h4 className="font-semibold">{notification.title}</h4>
                  {notification.message && (
                    <p className="mt-1 text-sm opacity-80">{notification.message}</p>
                  )}
                </div>

                <button
                  onClick={() => removeNotification(notification.id)}
                  className="rounded-lg p-1 transition-colors hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
```

Añade esto al `app/layout.tsx`:

```tsx
import { NotificationSystem } from '@/components/shared/NotificationSystem';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Navbar />
        {children}
        <NotificationSystem /> {/* ← Añadir aquí */}
      </body>
    </html>
  );
}
```

---

## 📊 Dashboard Component (Historial)

Dashboard para ver videos generados.

```tsx
// app/dashboard/page.tsx
'use client';

import { useVideoStore } from '@/store/video-store';
import { GenerationStatus } from '@/components/shared/GenerationStatus';
import { VideoPlayer } from '@/components/shared/VideoPlayer';
import { formatRelativeTime } from '@/lib/utils/formatters';
import { Download, Trash2 } from 'lucide-react';

export default function DashboardPage() {
  const { jobHistory, removeFromHistory } = useVideoStore();

  if (jobHistory.length === 0) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <h1 className="mb-4 text-4xl font-bold">Your Dashboard</h1>
        <p className="text-zinc-400">No videos generated yet</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-24">
      <h1 className="mb-8 text-4xl font-bold">Your Videos</h1>

      <div className="space-y-4">
        {jobHistory.map((job) => (
          <div
            key={job.id}
            className="overflow-hidden rounded-xl border border-border bg-surface-elevated"
          >
            <div className="flex gap-6 p-6">
              {/* Video preview */}
              {job.resultUrl ? (
                <div className="w-64 flex-shrink-0">
                  <VideoPlayer
                    src={job.resultUrl}
                    thumbnail={job.thumbnailUrl}
                    controls
                  />
                </div>
              ) : (
                <div className="w-64 flex-shrink-0">
                  <div className="flex aspect-video items-center justify-center rounded-xl bg-surface">
                    <GenerationStatus status={job.status} progress={job.progress} />
                  </div>
                </div>
              )}

              {/* Info */}
              <div className="flex-1 space-y-3">
                <div>
                  <GenerationStatus status={job.status} />
                  <h3 className="mt-2 text-lg font-semibold">
                    {job.type === 'text-to-video' ? 'Animation' : 'Template Video'}
                  </h3>
                  {job.prompt && (
                    <p className="mt-1 text-sm text-zinc-400 line-clamp-2">{job.prompt}</p>
                  )}
                </div>

                <p className="text-xs text-zinc-500">
                  {formatRelativeTime(job.createdAt)}
                </p>

                {/* Actions */}
                {job.resultUrl && (
                  <div className="flex gap-2">
                    <a
                      href={job.resultUrl}
                      download
                      className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium transition-colors hover:bg-primary-dark"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </a>
                    <button
                      onClick={() => removeFromHistory(job.id)}
                      className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:border-red-500/50 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 🎯 Footer Component

```tsx
// components/layout/Footer.tsx
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { footerNav } from '@/config/navigation';

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface/50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-purple-600">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold">VideoAI</span>
            </Link>
            <p className="mt-3 text-sm text-zinc-400">
              Generate stunning videos with AI
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="mb-3 font-semibold">Product</h3>
            <ul className="space-y-2">
              {footerNav.product.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-zinc-400 transition-colors hover:text-white"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 font-semibold">Company</h3>
            <ul className="space-y-2">
              {footerNav.company.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-zinc-400 transition-colors hover:text-white"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 font-semibold">Legal</h3>
            <ul className="space-y-2">
              {footerNav.legal.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-zinc-400 transition-colors hover:text-white"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-8 text-center text-sm text-zinc-500">
          © {new Date().getFullYear()} VideoAI. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
```

---

**Con estos componentes tendrás una aplicación completamente funcional! 🚀**

