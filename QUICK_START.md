# 🚀 Quick Start Guide

## Guía Rápida de Implementación

Este documento te guiará paso a paso para empezar a implementar el SaaS de generación de videos.

---

## ⚡ Setup Inicial (15 minutos)

### 1. Crear Proyecto Next.js

```bash
npx create-next-app@latest videosandanimations --typescript --tailwind --app
cd videosandanimations
```

### 2. Instalar Todas las Dependencias

```bash
npm install zustand framer-motion lucide-react clsx tailwind-merge @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-slot @radix-ui/react-toast @tailwindcss/typography tailwindcss-animate class-variance-authority
```

### 3. Copiar Archivos de Arquitectura

Los archivos ya están creados en este repositorio. Cópialos a tu proyecto:

```
✅ types/
✅ store/
✅ lib/
✅ components/
✅ config/
```

### 4. Actualizar tailwind.config.ts

Reemplaza el contenido de `tailwind.config.ts` con el de `tailwind.config.example.ts`.

### 5. Crear .env.local

```bash
# Crea el archivo
touch .env.local
```

Añade:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
# Añade tu API key cuando la tengas
```

---

## 🎯 Implementar Home Page (30 minutos)

### 1. Crear app/layout.tsx

```tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'VideoAI - Generate Stunning Videos with AI',
  description: 'Transform your ideas into professional video content',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Navbar />
        <main className="pt-16">{children}</main>
      </body>
    </html>
  );
}
```

### 2. Crear app/globals.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: #0a0a0a;
    --foreground: #ffffff;
  }
  
  body {
    @apply bg-background text-foreground;
  }
}

/* Scrollbar personalizado */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  @apply bg-surface;
}

::-webkit-scrollbar-thumb {
  @apply bg-zinc-700 rounded-full;
}

::-webkit-scrollbar-thumb:hover {
  @apply bg-zinc-600;
}
```

### 3. Crear app/page.tsx (Hero simple)

```tsx
import Link from 'next/link';
import { Sparkles, Zap, Image } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-hero" />
        
        <div className="container relative mx-auto px-4 py-24 sm:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
              Generate Stunning{' '}
              <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                AI Videos
              </span>
            </h1>
            
            <p className="mt-6 text-lg text-zinc-400 sm:text-xl">
              Transform your ideas into professional video content in seconds.
              Choose from templates or create from scratch with AI.
            </p>
            
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/templates"
                className="rounded-lg bg-gradient-to-r from-primary to-purple-600 px-8 py-4 font-semibold text-white transition-all hover:shadow-lg hover:shadow-primary/50"
              >
                Browse Templates
              </Link>
              <Link
                href="/animation"
                className="rounded-lg border border-border bg-surface px-8 py-4 font-semibold transition-all hover:border-primary/50 hover:bg-surface-elevated"
              >
                Create from Scratch
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-24">
        <div className="grid gap-8 md:grid-cols-3">
          <FeatureCard
            icon={<Image className="h-8 w-8" />}
            title="Templates"
            description="Replicate professional videos with your own product"
          />
          <FeatureCard
            icon={<Zap className="h-8 w-8" />}
            title="Animation"
            description="Generate videos from text prompts with AI"
          />
          <FeatureCard
            icon={<Sparkles className="h-8 w-8" />}
            title="Multiple Styles"
            description="Cinematic, 3D, Anime, and more visual styles"
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-surface p-6 transition-all hover:border-primary/50">
      <div className="mb-4 text-primary">{icon}</div>
      <h3 className="mb-2 text-xl font-semibold">{title}</h3>
      <p className="text-zinc-400">{description}</p>
      
      {/* Hover effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-purple-600/5 opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}
```

### 4. Ejecutar el proyecto

```bash
npm run dev
```

Abre http://localhost:3000 y deberías ver tu landing page con el Navbar premium.

---

## 📋 Próximos Pasos

### Templates Page (1-2 horas)

1. **Crear app/templates/page.tsx**

```tsx
'use client';

import { useTemplates } from '@/lib/hooks/useTemplates';
import { TemplateCard } from '@/components/templates/TemplateCard';

export default function TemplatesPage() {
  const { filteredTemplates, isLoading } = useTemplates();
  
  if (isLoading) {
    return <div className="container py-24">Loading...</div>;
  }
  
  return (
    <div className="container mx-auto px-4 py-24">
      <h1 className="mb-8 text-4xl font-bold">Video Templates</h1>
      
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredTemplates.map((template) => (
          <TemplateCard key={template.id} template={template} />
        ))}
      </div>
    </div>
  );
}
```

2. **Crear datos mock en app/api/templates/route.ts**

```tsx
import { NextResponse } from 'next/server';
import { VideoTemplate } from '@/types/template.types';

const mockTemplates: VideoTemplate[] = [
  {
    id: '1',
    title: 'Product Showcase',
    description: 'Elegant product reveal with smooth transitions',
    category: 'product-showcase',
    thumbnailUrl: '/templates/thumb1.jpg',
    videoUrl: '/templates/video1.mp4',
    duration: 15,
    tags: ['product', 'elegant', 'modern'],
    aspectRatio: '16:9',
    createdAt: new Date(),
    featured: true,
  },
  // Añadir más...
];

export async function GET() {
  return NextResponse.json({ data: mockTemplates });
}
```

### Animation Page (1-2 horas)

1. **Crear app/animation/page.tsx**

```tsx
'use client';

import { useState } from 'react';
import { useVideoGeneration } from '@/lib/hooks/useVideoGeneration';
import { GenerationStatus } from '@/components/shared/GenerationStatus';
import { VIDEO_STYLES } from '@/lib/constants/video-styles';

export default function AnimationPage() {
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('cinematic');
  const { generate, isGenerating, error } = useVideoGeneration();
  
  const handleGenerate = async () => {
    await generate({
      type: 'text-to-video',
      prompt,
      styleId: selectedStyle,
    });
  };
  
  return (
    <div className="container mx-auto px-4 py-24">
      <h1 className="mb-8 text-4xl font-bold">Create Animation</h1>
      
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Prompt Input */}
        <div>
          <label className="mb-2 block text-sm font-medium">Your Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your video..."
            className="w-full rounded-lg border border-border bg-surface p-4 text-white placeholder:text-zinc-500 focus:border-primary focus:outline-none"
            rows={4}
          />
        </div>
        
        {/* Style Selector */}
        <div>
          <label className="mb-2 block text-sm font-medium">Style</label>
          <div className="grid grid-cols-3 gap-3">
            {VIDEO_STYLES.map((style) => (
              <button
                key={style.id}
                onClick={() => setSelectedStyle(style.id)}
                className={`rounded-lg border p-4 text-left transition-all ${
                  selectedStyle === style.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="font-semibold">{style.name}</div>
                <div className="text-xs text-zinc-400">{style.description}</div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt}
          className="w-full rounded-lg bg-gradient-to-r from-primary to-purple-600 px-8 py-4 font-semibold text-white transition-all hover:shadow-lg hover:shadow-primary/50 disabled:opacity-50"
        >
          {isGenerating ? 'Generating...' : 'Generate Video'}
        </button>
        
        {error && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-red-400">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 🔌 Integrar API Real (1-2 horas)

### Opción: Fal.ai (Más fácil de empezar)

1. **Registrarse en Fal.ai**
   - https://fal.ai
   - Obtener API key

2. **Añadir a .env.local**
   ```env
   FAL_AI_API_KEY=tu_key_aqui
   ```

3. **Crear lib/api/video-service.ts**

```typescript
export async function generateTextToVideo(prompt: string, styleId?: string) {
  const response = await fetch('/api/generate/text-to-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, styleId }),
  });
  
  if (!response.ok) throw new Error('Generation failed');
  return response.json();
}
```

4. **Crear app/api/generate/text-to-video/route.ts**

```typescript
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { prompt, styleId } = await request.json();
  
  try {
    const response = await fetch('https://fal.run/fal-ai/kling-video', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${process.env.FAL_AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        // ... config
      }),
    });
    
    const data = await response.json();
    
    return NextResponse.json({
      jobId: data.request_id,
      status: 'queued',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Generation failed' },
      { status: 500 }
    );
  }
}
```

---

## ✅ Checklist de Implementación

- [ ] Setup inicial completo
- [ ] Home page funcional
- [ ] Navbar con navegación
- [ ] Templates page con grid
- [ ] Animation page con form
- [ ] API mock de templates
- [ ] Store de Zustand funcional
- [ ] Integración con API real
- [ ] Polling de jobs
- [ ] Dashboard de historial

---

## 🎨 Tips de Diseño

### Glassmorphism

```tsx
<div className="bg-surface/70 backdrop-blur-xl border border-border/40">
  {/* content */}
</div>
```

### Gradientes

```tsx
<div className="bg-gradient-to-r from-primary to-purple-600">
  {/* content */}
</div>
```

### Animaciones con Framer Motion

```tsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
>
  {/* content */}
</motion.div>
```

---

## 🆘 Troubleshooting

### Error: Cannot find module '@/...'

Asegúrate de tener en `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Tailwind no aplica estilos

1. Verifica que `tailwind.config.ts` tenga los paths correctos
2. Reinicia el servidor: `npm run dev`

### Zustand no persiste

Verifica que estés usando `persist` middleware correctamente y que el navegador permita localStorage.

---

**¡Listo para empezar! 🚀**

