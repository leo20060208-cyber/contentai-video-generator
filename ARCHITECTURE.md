# 🎬 Arquitectura del SaaS de Generación de Video con IA

## 📋 Índice
1. [Stack Tecnológico](#stack-tecnológico)
2. [Estructura de Carpetas](#estructura-de-carpetas)
3. [Componentes Clave](#componentes-clave)
4. [Modelo de Datos](#modelo-de-datos)
5. [Estado Global (Zustand)](#estado-global)
6. [Guías de Diseño UI/UX](#guías-de-diseño-uiux)
7. [Flujo de Usuario](#flujo-de-usuario)
8. [Plan de Implementación](#plan-de-implementación)

---

## 🛠 Stack Tecnológico

- **Framework**: Next.js 15 (App Router)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS + Shadcn UI
- **Iconos**: Lucide React
- **Estado Global**: Zustand
- **Animaciones**: Framer Motion
- **APIs de Video**: Runway ML / Luma AI / Kling (via Fal.ai)

---

## 📁 Estructura de Carpetas

```
videosandanimations/
├── app/
│   ├── (marketing)/
│   │   ├── layout.tsx              # Layout para páginas públicas
│   │   └── page.tsx                # Home/Landing page
│   ├── templates/
│   │   ├── layout.tsx
│   │   ├── page.tsx                # Grid de templates
│   │   └── [id]/
│   │       └── page.tsx            # Vista detalle del template
│   ├── animation/
│   │   ├── layout.tsx
│   │   └── page.tsx                # Página de generación libre
│   ├── dashboard/
│   │   └── page.tsx                # Historial de generaciones
│   ├── api/
│   │   ├── templates/
│   │   │   └── route.ts            # GET templates
│   │   ├── generate/
│   │   │   ├── image-to-video/
│   │   │   │   └── route.ts        # POST para templates
│   │   │   └── text-to-video/
│   │   │       └── route.ts        # POST para animation
│   │   └── jobs/
│   │       └── [jobId]/
│   │           └── route.ts        # GET status de job
│   ├── layout.tsx                  # Root layout
│   └── globals.css
│
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx              # Navegación principal
│   │   ├── Footer.tsx
│   │   └── Sidebar.tsx
│   │
│   ├── shared/
│   │   ├── VideoPlayer.tsx         # Player reutilizable
│   │   ├── LoadingSpinner.tsx
│   │   ├── ErrorBoundary.tsx
│   │   └── GenerationStatus.tsx   # Badge de estado (loading/success/error)
│   │
│   ├── home/
│   │   ├── HeroSection.tsx         # Hero con CTA
│   │   ├── ShowcaseGrid.tsx        # Grid mixto de ejemplos
│   │   └── FeatureCard.tsx         # Tarjetas de características
│   │
│   ├── templates/
│   │   ├── TemplateGrid.tsx        # Grid de templates
│   │   ├── TemplateCard.tsx        # Card individual con hover
│   │   ├── TemplateDetail.tsx      # Vista detalle/modal
│   │   ├── ProductUploader.tsx     # Drag & drop de imagen
│   │   ├── CategoryFilter.tsx      # Filtros por categoría
│   │   └── TemplatePreview.tsx     # Preview con controles
│   │
│   ├── animation/
│   │   ├── PromptInput.tsx         # Textarea con sugerencias
│   │   ├── StyleSelector.tsx       # Radio/Pills de estilos
│   │   ├── GenerationPanel.tsx     # Panel completo de generación
│   │   └── PromptSuggestions.tsx   # Ejemplos de prompts
│   │
│   └── ui/                         # Componentes Shadcn
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── select.tsx
│       └── ... (otros componentes Shadcn)
│
├── lib/
│   ├── api/
│   │   ├── video-service.ts        # Abstracción de APIs de video
│   │   ├── templates-service.ts    # CRUD de templates
│   │   └── storage-service.ts      # Upload de imágenes
│   │
│   ├── hooks/
│   │   ├── useVideoGeneration.ts   # Hook para generación
│   │   ├── usePolling.ts           # Polling de estado de jobs
│   │   └── useTemplates.ts         # Fetch de templates
│   │
│   ├── utils/
│   │   ├── cn.ts                   # className utility (shadcn)
│   │   ├── validators.ts           # Validación de inputs
│   │   └── formatters.ts           # Formateo de datos
│   │
│   └── constants/
│       ├── video-styles.ts         # Estilos disponibles
│       └── categories.ts           # Categorías de templates
│
├── store/
│   ├── video-store.ts              # Estado de generaciones
│   ├── template-store.ts           # Estado de templates
│   └── ui-store.ts                 # Estado de UI (modals, etc.)
│
├── types/
│   ├── video.types.ts
│   ├── template.types.ts
│   ├── generation.types.ts
│   └── api.types.ts
│
├── public/
│   ├── templates/                  # Videos de ejemplo
│   └── thumbnails/                 # Miniaturas
│
└── config/
    ├── site.ts                     # Metadata del sitio
    └── navigation.ts               # Rutas y navegación
```

---

## 🧩 Componentes Clave

### 1. Layout & Navegación

#### `Navbar.tsx`
**Responsabilidad**: Navegación principal con logo, links (Home, Templates, Animation) y CTA.
- Sticky en scroll
- Backdrop blur effect
- Indicador de ruta activa
- Botón "Get Started" con gradiente

#### `Footer.tsx`
**Responsabilidad**: Links legales, sociales, newsletter.
- Dark theme coherente
- Grid responsive

---

### 2. Componentes Compartidos

#### `VideoPlayer.tsx`
**Responsabilidad**: Reproductor de video universal con controles personalizados.
- Props: `src`, `thumbnail`, `autoplay`, `muted`, `loop`
- Controles hover
- Loading skeleton
- Error fallback

#### `GenerationStatus.tsx`
**Responsabilidad**: Badge que muestra el estado de una generación.
- Estados: `pending`, `processing`, `completed`, `failed`
- Animación de pulse en "processing"
- Iconos con Lucide

---

### 3. Home (Landing)

#### `HeroSection.tsx`
**Responsabilidad**: Hero con headline, descripción y CTA principal.
- Gradiente animado de fondo
- Video de fondo (opcional)
- Botones primario y secundario

#### `ShowcaseGrid.tsx`
**Responsabilidad**: Grid masonry de ejemplos (templates + animations).
- Autoplay en hover
- Transiciones suaves con Framer Motion
- Labels para diferenciar "Template" vs "Animation"

---

### 4. Templates

#### `TemplateGrid.tsx`
**Responsabilidad**: Grid de templates con filtros y búsqueda.
- Infinite scroll o paginación
- Skeleton loading
- Empty state

#### `TemplateCard.tsx`
**Responsabilidad**: Card individual de template.
- Thumbnail con overlay
- Video autoplay en hover
- Badge de categoría
- Click abre detalle

#### `TemplateDetail.tsx`
**Responsabilidad**: Modal o página con detalle completo del template.
- Video preview grande
- Descripción y tags
- Integra `ProductUploader`
- Botón "Generate with my product"

#### `ProductUploader.tsx`
**Responsabilidad**: Zona de drag & drop para subir imagen del producto.
- Preview de imagen subida
- Validación (tamaño, formato)
- Crop opcional
- Progress bar de upload

---

### 5. Animation

#### `GenerationPanel.tsx`
**Responsabilidad**: Panel completo para generación text-to-video.
- Contiene `PromptInput` y `StyleSelector`
- Botón "Generate" con loading state
- Preview del resultado

#### `PromptInput.tsx`
**Responsabilidad**: Textarea inteligente para el prompt.
- Character count
- Sugerencias al escribir
- Botón de "Surprise me" (random prompt)

#### `StyleSelector.tsx`
**Responsabilidad**: Selector de estilos visuales.
- Radio buttons o cards
- Opciones: Cinematic, 3D, Anime, Realistic
- Preview de cada estilo

#### `PromptSuggestions.tsx`
**Responsabilidad**: Lista de prompts de ejemplo clicables.
- Categories (Action, Nature, Abstract)
- Click inserta en `PromptInput`

---

## 📊 Modelo de Datos

### `types/template.types.ts`

```typescript
export type TemplateCategory = 
  | 'marketing' 
  | 'social-media' 
  | 'product-showcase' 
  | 'explainer' 
  | 'promo';

export interface VideoTemplate {
  id: string;
  title: string;
  description: string;
  category: TemplateCategory;
  thumbnailUrl: string;
  videoUrl: string;
  duration: number; // en segundos
  tags: string[];
  aspectRatio: '16:9' | '9:16' | '1:1';
  createdAt: Date;
  featured?: boolean;
}
```

### `types/generation.types.ts`

```typescript
export type GenerationStatus = 
  | 'idle' 
  | 'uploading' 
  | 'queued' 
  | 'processing' 
  | 'completed' 
  | 'failed';

export type GenerationType = 'image-to-video' | 'text-to-video';

export interface GenerationJob {
  id: string;
  type: GenerationType;
  status: GenerationStatus;
  progress?: number; // 0-100
  
  // Input
  prompt?: string; // para text-to-video
  imageUrl?: string; // para image-to-video
  templateId?: string; // referencia al template usado
  style?: VideoStyle;
  
  // Output
  resultUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  
  // Metadata
  createdAt: Date;
  completedAt?: Date;
  error?: string;
  userId?: string;
}

export interface VideoStyle {
  id: string;
  name: string;
  description: string;
  thumbnailUrl: string;
}
```

### `types/api.types.ts`

```typescript
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface GenerateVideoRequest {
  type: 'image-to-video' | 'text-to-video';
  templateId?: string;
  imageUrl?: string;
  prompt?: string;
  styleId?: string;
  aspectRatio?: string;
}

export interface GenerateVideoResponse {
  jobId: string;
  status: GenerationStatus;
  estimatedTime?: number; // segundos
}

export interface JobStatusResponse {
  jobId: string;
  status: GenerationStatus;
  progress?: number;
  resultUrl?: string;
  error?: string;
}
```

---

## 🗄 Estado Global (Zustand)

### `store/video-store.ts`

```typescript
interface VideoState {
  // Estado de generaciones
  currentJob: GenerationJob | null;
  jobHistory: GenerationJob[];
  
  // UI State
  isGenerating: boolean;
  
  // Actions
  startGeneration: (config: GenerateVideoRequest) => Promise<void>;
  checkJobStatus: (jobId: string) => Promise<void>;
  addToHistory: (job: GenerationJob) => void;
  clearCurrentJob: () => void;
  
  // Polling
  startPolling: (jobId: string) => void;
  stopPolling: () => void;
}
```

### `store/template-store.ts`

```typescript
interface TemplateState {
  templates: VideoTemplate[];
  selectedTemplate: VideoTemplate | null;
  filters: {
    category: TemplateCategory | 'all';
    search: string;
  };
  
  // Actions
  fetchTemplates: () => Promise<void>;
  setSelectedTemplate: (template: VideoTemplate | null) => void;
  setCategory: (category: TemplateCategory | 'all') => void;
  setSearch: (search: string) => void;
  
  // Getters
  getFilteredTemplates: () => VideoTemplate[];
}
```

### `store/ui-store.ts`

```typescript
interface UIState {
  // Modals
  isTemplateDetailOpen: boolean;
  isUploadModalOpen: boolean;
  
  // Notifications
  notifications: Notification[];
  
  // Actions
  openTemplateDetail: () => void;
  closeTemplateDetail: () => void;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
}
```

---

## 🎨 Guías de Diseño UI/UX

### Paleta de Colores

```css
/* Dark Theme Premium */
--background: #0a0a0a;           /* Negro profundo */
--surface: #1a1a1a;              /* Superficie elevada */
--surface-elevated: #2a2a2a;     /* Cards, modals */

--primary: #6366f1;              /* Indigo brillante */
--primary-dark: #4f46e5;
--primary-light: #818cf8;

--accent: #f59e0b;               /* Amber para CTAs */
--success: #10b981;
--error: #ef4444;

--text-primary: #ffffff;
--text-secondary: #a1a1aa;       /* Zinc-400 */
--text-muted: #71717a;           /* Zinc-500 */

--border: #27272a;               /* Zinc-800 */
--border-hover: #3f3f46;         /* Zinc-700 */
```

### Efectos Visuales

#### Glassmorphism
```css
.glass {
  background: rgba(26, 26, 26, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

#### Gradientes

```css
/* Hero Background */
.gradient-hero {
  background: radial-gradient(
    ellipse at top,
    rgba(99, 102, 241, 0.15),
    transparent 50%
  );
}

/* Button Primary */
.gradient-button {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
}

/* Card Hover Border */
.gradient-border {
  border-image: linear-gradient(135deg, #6366f1, #8b5cf6) 1;
}
```

### Espaciado y Tipografía

- **Font**: Inter (Google Fonts)
- **Títulos (H1)**: 3.5rem (56px), font-bold, tracking-tight
- **Subtítulos (H2)**: 2.25rem (36px), font-semibold
- **Body**: 1rem (16px), font-normal
- **Espaciado**: Múltiplos de 4 (8px, 16px, 24px, 32px, 48px)

### Animaciones (Framer Motion)

#### Fade In Up (Cards)
```typescript
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};
```

#### Scale on Hover (Video Cards)
```typescript
const scaleHover = {
  whileHover: { scale: 1.05 },
  transition: { duration: 0.2 }
};
```

#### Stagger Children (Grids)
```typescript
const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};
```

### Principios de UX

1. **Feedback Inmediato**: Toda acción debe tener respuesta visual (loading, success, error).
2. **Progressive Disclosure**: No abrumar. Mostrar opciones avanzadas solo cuando se necesiten.
3. **Error Prevention**: Validar inputs en tiempo real.
4. **Mobile First**: Diseñar primero para móvil, luego escalar.
5. **Skeleton Screens**: Usar skeletons en lugar de spinners para mejor percepción de velocidad.

---

## 🔄 Flujo de Usuario

### Flujo 1: Uso de Template (Image-to-Video)

1. Usuario entra a `/templates`
2. Ve grid de templates con preview en hover
3. Click en template → Abre modal/página de detalle
4. Ve video completo del template
5. Arrastra/selecciona imagen de su producto
6. Click en "Generate with my product"
7. Sistema sube imagen → Envía a API de video (Image-to-Video)
8. Polling de estado cada 3-5 segundos
9. Muestra progress bar/status
10. Al completarse, muestra video generado
11. Opciones: Descargar, Regenerar, Compartir

### Flujo 2: Generación Libre (Text-to-Video)

1. Usuario entra a `/animation`
2. Ve textarea grande con placeholder inspirador
3. Escribe su prompt (ej: "Robot bailando en Marte")
4. (Opcional) Selecciona estilo visual
5. Click en "Generate"
6. Sistema envía a API de video (Text-to-Video)
7. Polling de estado
8. Muestra video generado
9. Opciones: Descargar, Refinar prompt, Compartir

---

## 📅 Plan de Implementación

### Fase 1: Setup y Base (Semana 1)
- [ ] Inicializar Next.js 15 con TypeScript
- [ ] Configurar Tailwind + Shadcn UI
- [ ] Instalar dependencias (Zustand, Framer Motion, Lucide)
- [ ] Crear estructura de carpetas
- [ ] Definir tipos TypeScript
- [ ] Configurar layout raíz y Navbar

### Fase 2: Home & Templates (Semana 2)
- [ ] Desarrollar HeroSection y ShowcaseGrid
- [ ] Crear TemplateGrid y TemplateCard
- [ ] Implementar TemplateDetail
- [ ] Desarrollar ProductUploader (drag & drop)
- [ ] Configurar store de templates

### Fase 3: Animation & Generación (Semana 3)
- [ ] Desarrollar página `/animation`
- [ ] Crear PromptInput con sugerencias
- [ ] Implementar StyleSelector
- [ ] Desarrollar GenerationPanel
- [ ] Configurar store de generaciones

### Fase 4: API & Backend (Semana 4)
- [ ] Crear endpoints API (templates, generate, jobs)
- [ ] Integrar API de video (Runway/Luma/Kling)
- [ ] Implementar sistema de polling
- [ ] Configurar upload de imágenes
- [ ] Testing de flujos completos

### Fase 5: Polish & Optimización (Semana 5)
- [ ] Añadir animaciones con Framer Motion
- [ ] Optimizar rendimiento (lazy loading, code splitting)
- [ ] Implementar error handling robusto
- [ ] Añadir dashboard de historial
- [ ] Testing responsive
- [ ] SEO y metadata

---

## 🚀 Tecnologías de API de Video

### Recomendaciones por Caso de Uso

#### Image-to-Video (Templates)
- **Runway Gen-3**: Mejor control y calidad para product placement
- **Kling AI via Fal.ai**: Más accesible, buena relación calidad/precio
- **Luma AI**: Excelente para objetos 3D

#### Text-to-Video (Animation)
- **Runway Gen-3**: Calidad cinematográfica
- **Pika Labs**: Estilos artísticos
- **Stability AI**: Open source, más control

### Consideraciones Técnicas

1. **Webhooks vs Polling**: Preferir webhooks si la API lo soporta, sino polling cada 5s.
2. **Rate Limiting**: Implementar cola de trabajos para no saturar APIs.
3. **Caching**: Cachear templates y videos generados (CDN).
4. **Timeouts**: Establecer timeouts razonables (60-120s para generación).

---

## 📌 Notas Finales

- **Separación Clara**: Templates (image-to-video) y Animation (text-to-video) están completamente separados en código y lógica.
- **Escalabilidad**: La arquitectura modular permite añadir nuevos tipos de generación fácilmente.
- **Mantenibilidad**: Tipos TypeScript estrictos y componentes pequeños facilitan el debugging.
- **Performance**: Lazy loading de videos, código splitting por rutas, optimización de imágenes.

---

**Creado por**: AI Architect
**Fecha**: Diciembre 2024
**Versión**: 1.0

