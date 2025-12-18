# 🎬 VideoAI SaaS - AI-Powered Video Generation Platform

> Una plataforma profesional de generación de videos con IA construida con Next.js 15, TypeScript y diseño premium dark mode.

## ✨ Características

- 🎨 **Templates**: Biblioteca de videos profesionales donde los usuarios pueden replicar con su producto (Image-to-Video)
- ✍️ **Animation**: Generación libre de videos desde prompts de texto (Text-to-Video)
- 🎭 **Múltiples Estilos**: Cinemático, Realista, 3D, Anime, Abstract, Retro
- 📱 **Responsive Design**: Experiencia premium en todos los dispositivos
- ⚡ **Performance**: Optimizado con lazy loading, code splitting y SSR
- 🔄 **Real-time Updates**: Sistema de polling para estado de generaciones
- 💾 **Persistencia**: Estado guardado con Zustand + localStorage

---

## 🏗️ Arquitectura

### Stack Tecnológico

```
Framework:    Next.js 15 (App Router)
Lenguaje:     TypeScript
Estilos:      Tailwind CSS + Shadcn UI
Iconos:       Lucide React
Estado:       Zustand
Animaciones:  Framer Motion
```

### Estructura de Carpetas

```
videosandanimations/
├── app/                    # Next.js App Router
│   ├── (marketing)/       # Landing page
│   ├── templates/         # Biblioteca de templates
│   ├── animation/         # Generación libre
│   ├── dashboard/         # Historial
│   └── api/               # API Routes
│
├── components/
│   ├── layout/           # Navbar, Footer
│   ├── shared/           # VideoPlayer, Status
│   ├── templates/        # Componentes de templates
│   └── animation/        # Componentes de animation
│
├── lib/
│   ├── api/             # Servicios de API
│   ├── hooks/           # Custom hooks
│   ├── utils/           # Utilidades
│   └── constants/       # Constantes
│
├── store/               # Zustand stores
│   ├── video-store.ts
│   ├── template-store.ts
│   └── ui-store.ts
│
├── types/               # TypeScript types
│   ├── video.types.ts
│   ├── template.types.ts
│   ├── generation.types.ts
│   └── api.types.ts
│
└── config/              # Configuración
    ├── site.ts
    └── navigation.ts
```

---

## 🚀 Setup e Instalación

### 1. Crear el Proyecto Next.js

```bash
npx create-next-app@latest videosandanimations --typescript --tailwind --app
cd videosandanimations
```

### 2. Instalar Dependencias

```bash
# Dependencias principales
npm install zustand framer-motion lucide-react clsx tailwind-merge

# Shadcn UI (componentes)
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-slot @radix-ui/react-toast

# Dev dependencies
npm install -D @tailwindcss/typography tailwindcss-animate class-variance-authority
```

### 3. Configurar Tailwind CSS

Copia el contenido de `tailwind.config.example.ts` a tu `tailwind.config.ts`.

### 4. Configurar Variables de Entorno

Crea un archivo `.env.local`:

```env
# API de Video (elige una)
RUNWAY_API_KEY=your_key_here
# o
FAL_AI_API_KEY=your_key_here
# o
LUMA_API_KEY=your_key_here

# Base URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Opcional: Almacenamiento de imágenes
AWS_S3_BUCKET=your_bucket
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
```

### 5. Copiar Archivos de Arquitectura

Los archivos ya creados en este repositorio incluyen:

- ✅ Types (`types/`)
- ✅ Stores (`store/`)
- ✅ Constants (`lib/constants/`)
- ✅ Utils (`lib/utils/`)
- ✅ Hooks (`lib/hooks/`)
- ✅ Componentes base (`components/`)
- ✅ Configuración (`config/`)

### 6. Inicializar Shadcn UI (Opcional)

Si quieres usar el CLI de Shadcn para componentes adicionales:

```bash
npx shadcn-ui@latest init
```

Configura con estas opciones:
- ✅ TypeScript
- ✅ Tailwind CSS
- ✅ Style: Default
- ✅ Base color: Slate
- ✅ CSS variables: Yes

---

## 📝 Implementación por Fases

### Fase 1: Setup Base ✅

- [x] Estructura de carpetas
- [x] Tipos TypeScript
- [x] Stores de Zustand
- [x] Utilidades y constantes
- [x] Configuración de Tailwind

### Fase 2: Componentes Base (Próximo)

```bash
# Implementar:
- app/layout.tsx (root layout)
- app/page.tsx (home/landing)
- components/layout/Footer.tsx
```

### Fase 3: Templates

```bash
# Implementar:
- app/templates/page.tsx
- app/templates/[id]/page.tsx
- components/templates/TemplateGrid.tsx
- components/templates/ProductUploader.tsx
```

### Fase 4: Animation

```bash
# Implementar:
- app/animation/page.tsx
- components/animation/PromptInput.tsx
- components/animation/StyleSelector.tsx
```

### Fase 5: API Routes

```bash
# Implementar:
- app/api/templates/route.ts
- app/api/generate/image-to-video/route.ts
- app/api/generate/text-to-video/route.ts
- app/api/jobs/[jobId]/route.ts
```

---

## 🎨 Guía de Diseño

### Paleta de Colores

```css
Background:  #0a0a0a
Surface:     #1a1a1a
Primary:     #6366f1 (Indigo)
Accent:      #f59e0b (Amber)
Success:     #10b981
Error:       #ef4444
```

### Componentes Clave

#### VideoPlayer
Reproductor de video con controles personalizados, autoplay en hover, y states de loading.

```tsx
<VideoPlayer
  src="/video.mp4"
  thumbnail="/thumb.jpg"
  autoplay={false}
  controls={true}
/>
```

#### TemplateCard
Card con preview de video en hover, badges de categoría, y animación con Framer Motion.

```tsx
<TemplateCard template={templateData} />
```

#### GenerationStatus
Badge animado que muestra el estado de una generación con iconos y progreso.

```tsx
<GenerationStatus status="processing" progress={65} />
```

---

## 🔌 Integración con APIs de Video

### Opción 1: Runway ML

```typescript
// lib/api/video-service.ts
async function generateVideoRunway(config: GenerationConfig) {
  const response = await fetch('https://api.runwayml.com/v1/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RUNWAY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: config.prompt,
      model: 'gen-3',
      // ...
    }),
  });
  
  return response.json();
}
```

### Opción 2: Fal.ai (Kling)

```typescript
async function generateVideoFal(config: GenerationConfig) {
  const response = await fetch('https://fal.run/fal-ai/kling-video', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${process.env.FAL_AI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: config.prompt,
      image_url: config.imageUrl,
      // ...
    }),
  });
  
  return response.json();
}
```

---

## 📊 Uso de Stores

### Video Store (Generaciones)

```tsx
import { useVideoStore } from '@/store/video-store';

function Component() {
  const { startGeneration, currentJob, isGenerating } = useVideoStore();
  
  const handleGenerate = async () => {
    await startGeneration({
      type: 'text-to-video',
      prompt: 'A futuristic city at sunset',
      styleId: 'cinematic',
    });
  };
  
  return (
    <div>
      {isGenerating && <p>Generating...</p>}
      {currentJob?.resultUrl && <video src={currentJob.resultUrl} />}
    </div>
  );
}
```

### Template Store

```tsx
import { useTemplates } from '@/lib/hooks/useTemplates';

function TemplatesPage() {
  const {
    filteredTemplates,
    setCategory,
    setSearch,
  } = useTemplates();
  
  return (
    <TemplateGrid templates={filteredTemplates} />
  );
}
```

---

## 🧪 Testing (Próximo)

```bash
# Instalar dependencias de testing
npm install -D @testing-library/react @testing-library/jest-dom jest

# Configurar Jest
# Crear tests para componentes críticos
```

---

## 🚢 Deployment

### Vercel (Recomendado)

```bash
# Conectar con Vercel
vercel

# Configurar variables de entorno en Vercel dashboard
# Deploy
vercel --prod
```

### Docker (Alternativo)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 📚 Recursos

- [Next.js 15 Docs](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [Shadcn UI](https://ui.shadcn.com)
- [Zustand](https://zustand-demo.pmnd.rs)
- [Framer Motion](https://www.framer.com/motion)
- [Runway ML API](https://docs.runwayml.com)
- [Fal.ai](https://fal.ai/models)

---

## 📄 Documentación Adicional

- Ver `ARCHITECTURE.md` para detalles completos de arquitectura
- Ver `types/` para modelos de datos
- Ver `components/` para ejemplos de implementación

---

## 🤝 Contribución

Este es un proyecto en desarrollo. Las contribuciones son bienvenidas siguiendo las guías de diseño establecidas.

---

## 📝 Licencia

MIT

---

**Desarrollado con ❤️ usando Next.js 15 y TypeScript**

