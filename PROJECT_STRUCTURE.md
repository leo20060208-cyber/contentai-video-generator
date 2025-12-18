# 🗂️ Estructura Visual del Proyecto

Visualización completa de la estructura de archivos y carpetas.

---

## 📁 Árbol de Directorios Completo

```
videosandanimations/
│
├── 📄 .cursorrules                      # Reglas de IA/Cursor
├── 📄 .env.local                        # Variables de entorno (no commitear)
├── 📄 .gitignore                        # Git ignore
├── 📄 next.config.js                    # Config de Next.js
├── 📄 package.json                      # Dependencias
├── 📄 tsconfig.json                     # Config de TypeScript
├── 📄 tailwind.config.ts                # Config de Tailwind
├── 📄 postcss.config.js                 # Config de PostCSS
│
├── 📚 Documentación/
│   ├── 📄 README.md                     # Overview principal
│   ├── 📄 ARCHITECTURE.md               # Arquitectura completa
│   ├── 📄 QUICK_START.md                # Guía de inicio rápido
│   ├── 📄 IMPLEMENTATION_CHECKLIST.md   # Checklist de tareas
│   ├── 📄 COMPONENT_EXAMPLES.md         # Ejemplos de componentes
│   ├── 📄 API_INTEGRATION.md            # Guía de APIs
│   ├── 📄 DATA_FLOW.md                  # Diagramas de flujo
│   ├── 📄 INDEX.md                      # Índice maestro
│   └── 📄 PROJECT_STRUCTURE.md          # Este archivo
│
├── 📁 app/                              # Next.js App Router
│   ├── 📄 layout.tsx                    # ✅ Root layout
│   ├── 📄 page.tsx                      # ✅ Home page
│   ├── 📄 globals.css                   # ✅ Estilos globales
│   │
│   ├── 📁 (marketing)/                  # ⬜ Grupo de rutas (opcional)
│   │   ├── 📄 layout.tsx                # Layout para landing
│   │   └── 📄 page.tsx                  # Home alternativo
│   │
│   ├── 📁 templates/                    # 🎬 Sección Templates
│   │   ├── 📄 layout.tsx                # ⬜ Layout específico
│   │   ├── 📄 page.tsx                  # ⬜ Grid de templates
│   │   ├── 📄 loading.tsx               # ⬜ Loading state
│   │   │
│   │   └── 📁 [id]/                     # 🔍 Detalle dinámico
│   │       ├── 📄 page.tsx              # ⬜ Vista del template
│   │       └── 📄 loading.tsx           # ⬜ Loading state
│   │
│   ├── 📁 animation/                    # ✨ Sección Animation
│   │   ├── 📄 layout.tsx                # ⬜ Layout específico
│   │   ├── 📄 page.tsx                  # ⬜ Generación libre
│   │   └── 📄 loading.tsx               # ⬜ Loading state
│   │
│   ├── 📁 dashboard/                    # 📊 Dashboard de usuario
│   │   └── 📄 page.tsx                  # ⬜ Historial de videos
│   │
│   └── 📁 api/                          # 🔌 API Routes
│       ├── 📁 templates/
│       │   └── 📄 route.ts              # ⬜ GET /api/templates
│       │
│       ├── 📁 upload/
│       │   └── 📄 route.ts              # ⬜ POST /api/upload
│       │
│       ├── 📁 generate/
│       │   ├── 📁 text-to-video/
│       │   │   └── 📄 route.ts          # ⬜ POST generación texto
│       │   │
│       │   └── 📁 image-to-video/
│       │       └── 📄 route.ts          # ⬜ POST generación imagen
│       │
│       └── 📁 jobs/
│           └── 📁 [jobId]/
│               └── 📄 route.ts          # ⬜ GET status de job
│
├── 📁 components/                       # 🧩 Componentes React
│   │
│   ├── 📁 layout/                       # Navegación y estructura
│   │   ├── 📄 Navbar.tsx                # ✅ Navegación principal
│   │   ├── 📄 Footer.tsx                # ⬜ Footer
│   │   └── 📄 Sidebar.tsx               # ⬜ Sidebar (opcional)
│   │
│   ├── 📁 shared/                       # Componentes compartidos
│   │   ├── 📄 VideoPlayer.tsx           # ✅ Reproductor de video
│   │   ├── 📄 GenerationStatus.tsx      # ✅ Badge de estado
│   │   ├── 📄 LoadingSpinner.tsx        # ⬜ Spinner
│   │   ├── 📄 ErrorBoundary.tsx         # ⬜ Error boundary
│   │   └── 📄 NotificationSystem.tsx    # ⬜ Toast notifications
│   │
│   ├── 📁 home/                         # Componentes de landing
│   │   ├── 📄 HeroSection.tsx           # ⬜ Hero principal
│   │   ├── 📄 ShowcaseGrid.tsx          # ⬜ Grid de ejemplos
│   │   └── 📄 FeatureCard.tsx           # ⬜ Cards de features
│   │
│   ├── 📁 templates/                    # 🎬 Componentes Templates
│   │   ├── 📄 TemplateGrid.tsx          # ⬜ Grid de templates
│   │   ├── 📄 TemplateCard.tsx          # ✅ Card individual
│   │   ├── 📄 TemplateDetail.tsx        # ⬜ Vista detalle
│   │   ├── 📄 ProductUploader.tsx       # ⬜ Upload de imagen
│   │   ├── 📄 CategoryFilter.tsx        # ⬜ Filtros
│   │   └── 📄 TemplatePreview.tsx       # ⬜ Preview modal
│   │
│   ├── 📁 animation/                    # ✨ Componentes Animation
│   │   ├── 📄 PromptInput.tsx           # ⬜ Input de prompt
│   │   ├── 📄 StyleSelector.tsx         # ⬜ Selector de estilos
│   │   ├── 📄 GenerationPanel.tsx       # ⬜ Panel completo
│   │   └── 📄 PromptSuggestions.tsx     # ⬜ Sugerencias
│   │
│   └── 📁 ui/                           # 🎨 Shadcn UI Components
│       ├── 📄 button.tsx                # Botón base
│       ├── 📄 card.tsx                  # Card base
│       ├── 📄 dialog.tsx                # Modal
│       ├── 📄 input.tsx                 # Input base
│       ├── 📄 select.tsx                # Select base
│       ├── 📄 toast.tsx                 # Toast
│       └── ...                          # Más componentes
│
├── 📁 lib/                              # 🛠️ Utilidades y servicios
│   │
│   ├── 📁 api/                          # Servicios de API
│   │   ├── 📄 video-service.ts          # ⬜ Abstracción de video API
│   │   ├── 📄 fal-service.ts            # ⬜ Fal.ai específico
│   │   ├── 📄 templates-service.ts      # ⬜ CRUD de templates
│   │   └── 📄 storage-service.ts        # ⬜ Upload de imágenes
│   │
│   ├── 📁 hooks/                        # Custom hooks
│   │   ├── 📄 useVideoGeneration.ts     # ✅ Hook de generación
│   │   ├── 📄 useTemplates.ts           # ✅ Hook de templates
│   │   └── 📄 usePolling.ts             # ✅ Hook de polling
│   │
│   ├── 📁 utils/                        # Utilidades
│   │   ├── 📄 cn.ts                     # ✅ className merge
│   │   ├── 📄 validators.ts             # ✅ Validadores
│   │   └── 📄 formatters.ts             # ✅ Formateadores
│   │
│   └── 📁 constants/                    # Constantes
│       ├── 📄 video-styles.ts           # ✅ Estilos de video
│       └── 📄 categories.ts             # ✅ Categorías
│
├── 📁 store/                            # 🗄️ Zustand Stores
│   ├── 📄 video-store.ts                # ✅ Estado de generaciones
│   ├── 📄 template-store.ts             # ✅ Estado de templates
│   └── 📄 ui-store.ts                   # ✅ Estado de UI
│
├── 📁 types/                            # 📝 TypeScript Types
│   ├── 📄 template.types.ts             # ✅ Tipos de templates
│   ├── 📄 generation.types.ts           # ✅ Tipos de generación
│   ├── 📄 api.types.ts                  # ✅ Tipos de API
│   └── 📄 ui.types.ts                   # ✅ Tipos de UI
│
├── 📁 config/                           # ⚙️ Configuración
│   ├── 📄 site.ts                       # ✅ Metadata del sitio
│   └── 📄 navigation.ts                 # ✅ Rutas y navegación
│
└── 📁 public/                           # 🌐 Archivos públicos
    ├── 📁 templates/                    # Videos de ejemplo
    │   ├── 🎬 video1.mp4
    │   ├── 🎬 video2.mp4
    │   └── ...
    │
    ├── 📁 thumbnails/                   # Miniaturas
    │   ├── 🖼️ thumb1.jpg
    │   ├── 🖼️ thumb2.jpg
    │   └── ...
    │
    └── 📁 styles/                       # Imágenes de estilos
        ├── 🖼️ cinematic.jpg
        ├── 🖼️ anime.jpg
        └── ...
```

---

## 📊 Estado de Implementación

Leyenda:
- ✅ = Completado
- ⬜ = Por implementar
- 🔄 = En progreso

### Progreso por Categoría

```
📚 Documentación:        100% ✅✅✅✅✅✅✅✅
📝 Types:                100% ✅✅✅✅
🗄️  Stores:               100% ✅✅✅
🛠️  Utils:                100% ✅✅✅
⚙️  Config:               100% ✅✅

🧩 Components (Shared):   60% ✅✅✅⬜⬜
🧩 Components (Layout):   33% ✅⬜⬜
🧩 Components (Templates): 25% ✅⬜⬜⬜
🧩 Components (Animation): 0%  ⬜⬜⬜⬜

📱 Pages:                 20% ✅⬜⬜⬜⬜
🔌 API Routes:            0%  ⬜⬜⬜⬜⬜

Total del Proyecto:       42% ▓▓▓▓▓▓▓▓░░░░░░░░░░░░
```

---

## 🎯 Dependencias entre Módulos

```
┌─────────────────────────────────────────────────────────────┐
│                         PAGES (app/)                        │
│                                                             │
│  Dependen de: Components, Stores, Hooks                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      COMPONENTS                             │
│                                                             │
│  Dependen de: Stores, Hooks, Utils, Types                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                        STORES                               │
│                                                             │
│  Dependen de: Types, API Services                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                        HOOKS                                │
│                                                             │
│  Dependen de: Stores, Utils, Types                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                     API SERVICES                            │
│                                                             │
│  Dependen de: Types, Utils                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   TYPES & UTILS                             │
│                                                             │
│  Sin dependencias (base del proyecto)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔗 Flujo de Imports

### Ejemplo: Página de Animation

```typescript
// app/animation/page.tsx
import { PromptInput } from '@/components/animation/PromptInput'
import { StyleSelector } from '@/components/animation/StyleSelector'
import { useVideoGeneration } from '@/lib/hooks/useVideoGeneration'
import { VIDEO_STYLES } from '@/lib/constants/video-styles'
   │
   ├─▶ components/animation/PromptInput.tsx
   │      └─▶ lib/utils/validators.ts
   │      └─▶ lib/constants/video-styles.ts
   │
   ├─▶ components/animation/StyleSelector.tsx
   │      └─▶ lib/utils/cn.ts
   │      └─▶ types/generation.types.ts
   │
   ├─▶ lib/hooks/useVideoGeneration.ts
   │      └─▶ store/video-store.ts
   │      └─▶ store/ui-store.ts
   │      └─▶ lib/utils/validators.ts
   │      └─▶ types/generation.types.ts
   │
   └─▶ lib/constants/video-styles.ts
          └─▶ types/generation.types.ts
```

---

## 📦 Tamaños Estimados

```
📚 Documentación:         ~50 KB
📝 Types:                 ~8 KB
🗄️  Stores:                ~15 KB
🛠️  Utils:                 ~10 KB
⚙️  Config:                ~3 KB

🧩 Components (Total):     ~80 KB (cuando esté completo)
📱 Pages:                  ~30 KB (cuando esté completo)
🔌 API Routes:             ~20 KB (cuando esté completo)

📦 node_modules:           ~350 MB
🎬 Templates/Assets:       Variable (depende de videos)

Total del código fuente:   ~200 KB
```

---

## 🚀 Orden Sugerido de Implementación

```
1. Foundation (✅ COMPLETADO)
   ├─ Types
   ├─ Stores
   ├─ Utils
   └─ Config

2. Base Components (60% completado)
   ├─ Shared components
   ├─ Layout (Navbar, Footer)
   └─ UI components (Shadcn)

3. Home Page (40% completado)
   ├─ Layout
   ├─ Hero section
   └─ Features

4. Templates Section (25% completado)
   ├─ Components
   ├─ Pages
   └─ API routes

5. Animation Section (0% completado)
   ├─ Components
   ├─ Pages
   └─ API routes

6. API Integration (0% completado)
   ├─ Upload service
   ├─ Video generation
   └─ Job polling

7. Dashboard (0% completado)
   ├─ History page
   └─ Components

8. Polish & Deploy (0% completado)
   ├─ Animaciones
   ├─ Optimizaciones
   └─ Deploy a Vercel
```

---

## 🎨 Componentes UI (Shadcn)

Lista de componentes Shadcn que necesitarás instalar:

```bash
# Esenciales
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add toast

# Opcionales
npx shadcn-ui@latest add select
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add progress
npx shadcn-ui@latest add skeleton
```

---

## 📐 Dimensiones y Límites

```
Archivos:
├─ Max líneas por componente:        ~300 líneas
├─ Max líneas por función:           ~50 líneas
├─ Max parámetros por función:       5 parámetros
└─ Max nivel de anidación:           4 niveles

Datos:
├─ Max tamaño de imagen:             10 MB
├─ Max longitud de prompt:           500 caracteres
├─ Min longitud de prompt:           10 caracteres
├─ Templates en historial:           50 jobs
└─ Duración de video:                5-10 segundos

Performance:
├─ Target FCP:                       < 1.5s
├─ Target TTI:                       < 3s
├─ Lighthouse score:                 > 90
└─ Bundle size (JS):                 < 200 KB
```

---

## 🔍 Búsqueda Rápida de Archivos

### "¿Dónde está...?"

| Buscas | Archivo |
|--------|---------|
| Tipos de templates | `types/template.types.ts` |
| Tipos de generación | `types/generation.types.ts` |
| Store de videos | `store/video-store.ts` |
| Store de templates | `store/template-store.ts` |
| Hook de generación | `lib/hooks/useVideoGeneration.ts` |
| Validadores | `lib/utils/validators.ts` |
| Estilos de video | `lib/constants/video-styles.ts` |
| Navbar | `components/layout/Navbar.tsx` |
| Video player | `components/shared/VideoPlayer.tsx` |
| Template card | `components/templates/TemplateCard.tsx` |
| Config del sitio | `config/site.ts` |
| Rutas de navegación | `config/navigation.ts` |
| Colores de Tailwind | `tailwind.config.ts` |

---

**Estructura completa del proyecto visualizada! 🗂️**

