# 🔌 Guía de Integración con APIs de Video

Guía completa para integrar APIs de generación de video con IA.

---

## 📋 Opciones de APIs Recomendadas

### 1. Fal.ai (⭐ Más Fácil)

**Ventajas:**
- Fácil de integrar
- Múltiples modelos (Kling, Luma, etc.)
- Buena documentación
- Precios razonables

**Desventajas:**
- Menor control sobre el resultado
- Tiempos de generación variables

**Pricing:** ~$0.50-1.00 por video

### 2. Runway Gen-3 (⭐ Mejor Calidad)

**Ventajas:**
- Calidad cinematográfica
- Control preciso
- Resultados consistentes

**Desventajas:**
- Más caro
- API compleja
- Requiere approval

**Pricing:** ~$2-5 por video

### 3. Luma AI (⭐ Mejor para 3D)

**Ventajas:**
- Excelente para objetos 3D
- Buenos movimientos de cámara
- Relativamente rápido

**Desventajas:**
- API en beta
- Limitada disponibilidad

**Pricing:** ~$1-2 por video

---

## 🚀 Setup: Fal.ai (Recomendado para empezar)

### Paso 1: Registro y API Key

1. Ve a https://fal.ai
2. Regístrate con GitHub o Email
3. Ve a Settings → API Keys
4. Crea una nueva key
5. Copia la key a `.env.local`:

```env
FAL_AI_API_KEY=tu_key_aqui_xxxxx
```

### Paso 2: Instalar SDK (Opcional)

```bash
npm install @fal-ai/serverless-client
```

### Paso 3: Crear Service

```typescript
// lib/api/fal-service.ts
import * as fal from '@fal-ai/serverless-client';

// Configurar con la API key
fal.config({
  credentials: process.env.FAL_AI_API_KEY,
});

export interface FalTextToVideoParams {
  prompt: string;
  duration?: number; // segundos (5 o 10)
  aspectRatio?: '16:9' | '9:16' | '1:1';
}

export interface FalImageToVideoParams {
  imageUrl: string;
  prompt?: string;
  duration?: number;
}

/**
 * Genera video desde texto con Kling
 */
export async function generateTextToVideo(params: FalTextToVideoParams) {
  try {
    const result = await fal.subscribe('fal-ai/kling-video/v1/standard/text-to-video', {
      input: {
        prompt: params.prompt,
        duration: params.duration || 5,
        aspect_ratio: params.aspectRatio || '16:9',
      },
      logs: true,
      onQueueUpdate: (update) => {
        console.log('Queue update:', update);
      },
    });

    return {
      success: true,
      videoUrl: result.video.url,
      thumbnailUrl: result.video.thumbnail,
    };
  } catch (error) {
    console.error('Fal.ai error:', error);
    throw error;
  }
}

/**
 * Genera video desde imagen con Kling
 */
export async function generateImageToVideo(params: FalImageToVideoParams) {
  try {
    const result = await fal.subscribe('fal-ai/kling-video/v1/standard/image-to-video', {
      input: {
        image_url: params.imageUrl,
        prompt: params.prompt,
        duration: params.duration || 5,
      },
      logs: true,
      onQueueUpdate: (update) => {
        console.log('Queue update:', update);
      },
    });

    return {
      success: true,
      videoUrl: result.video.url,
      thumbnailUrl: result.video.thumbnail,
    };
  } catch (error) {
    console.error('Fal.ai error:', error);
    throw error;
  }
}
```

### Paso 4: API Routes

#### Text-to-Video Endpoint

```typescript
// app/api/generate/text-to-video/route.ts
import { NextResponse } from 'next/server';
import { generateTextToVideo } from '@/lib/api/fal-service';

export async function POST(request: Request) {
  try {
    const { prompt, styleId, aspectRatio } = await request.json();

    // Validación
    if (!prompt || prompt.length < 10) {
      return NextResponse.json(
        { error: 'Prompt is required and must be at least 10 characters' },
        { status: 400 }
      );
    }

    // Generar video (esto puede tomar 1-3 minutos)
    const result = await generateTextToVideo({
      prompt,
      aspectRatio: aspectRatio || '16:9',
      duration: 5,
    });

    return NextResponse.json({
      success: true,
      videoUrl: result.videoUrl,
      thumbnailUrl: result.thumbnailUrl,
    });
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate video' },
      { status: 500 }
    );
  }
}
```

#### Image-to-Video Endpoint

```typescript
// app/api/generate/image-to-video/route.ts
import { NextResponse } from 'next/server';
import { generateImageToVideo } from '@/lib/api/fal-service';

export async function POST(request: Request) {
  try {
    const { imageUrl, templateId } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    const result = await generateImageToVideo({
      imageUrl,
      prompt: 'product showcase with smooth camera movement',
      duration: 5,
    });

    return NextResponse.json({
      success: true,
      videoUrl: result.videoUrl,
      thumbnailUrl: result.thumbnailUrl,
    });
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate video' },
      { status: 500 }
    );
  }
}
```

---

## 📤 Upload de Imágenes

### Opción 1: Vercel Blob Storage (Más Fácil)

```bash
npm install @vercel/blob
```

```typescript
// app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Upload a Vercel Blob
    const blob = await put(file.name, file, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return NextResponse.json({
      success: true,
      imageUrl: blob.url,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

export const runtime = 'edge';
```

### Opción 2: AWS S3

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

```typescript
// lib/api/s3-service.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function uploadToS3(file: File, key: string) {
  const buffer = Buffer.from(await file.arrayBuffer());

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: file.type,
  });

  await s3Client.send(command);

  return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}
```

---

## 🔄 Sistema de Jobs con Polling

Para generaciones que toman tiempo, usa un sistema de jobs.

### Base de Datos (Opcional)

Si quieres persistir jobs, usa Vercel Postgres o similar:

```sql
CREATE TABLE generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255),
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  prompt TEXT,
  image_url TEXT,
  result_url TEXT,
  thumbnail_url TEXT,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

### Endpoint de Status

```typescript
// app/api/jobs/[jobId]/route.ts
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { jobId: string } }
) {
  try {
    const jobId = params.jobId;

    // Buscar en DB o cache
    const job = await getJobFromDB(jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      resultUrl: job.result_url,
      error: job.error,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get job status' }, { status: 500 });
  }
}
```

---

## 🎨 Aplicar Estilos a Prompts

```typescript
// lib/utils/prompt-enhancer.ts
import { getStyleById } from '@/lib/constants/video-styles';

export function enhancePrompt(basePrompt: string, styleId?: string): string {
  let enhanced = basePrompt;

  if (styleId) {
    const style = getStyleById(styleId);
    if (style?.prompt) {
      enhanced = `${basePrompt}, ${style.prompt}`;
    }
  }

  // Añadir mejoras generales
  enhanced = `${enhanced}, high quality, professional`;

  return enhanced;
}
```

Usar en generación:

```typescript
const enhancedPrompt = enhancePrompt(userPrompt, selectedStyle);
await generateTextToVideo({ prompt: enhancedPrompt });
```

---

## ⚡ Optimizaciones

### 1. Caching de Templates

```typescript
// lib/api/cache.ts
const CACHE_DURATION = 60 * 60 * 1000; // 1 hora

const cache = new Map<string, { data: any; timestamp: number }>();

export function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (!cached) return null;

  const isExpired = Date.now() - cached.timestamp > CACHE_DURATION;
  if (isExpired) {
    cache.delete(key);
    return null;
  }

  return cached.data;
}

export function setCache(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
}
```

### 2. Rate Limiting

```typescript
// lib/api/rate-limiter.ts
const rateLimit = new Map<string, number[]>();

export function checkRateLimit(userId: string, maxRequests = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const userRequests = rateLimit.get(userId) || [];

  // Filtrar requests dentro de la ventana
  const recentRequests = userRequests.filter((time) => now - time < windowMs);

  if (recentRequests.length >= maxRequests) {
    return false; // Rate limit excedido
  }

  recentRequests.push(now);
  rateLimit.set(userId, recentRequests);
  return true;
}
```

### 3. Webhooks en lugar de Polling (Avanzado)

Si la API soporta webhooks:

```typescript
// app/api/webhooks/fal/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const signature = request.headers.get('x-fal-signature');
  
  // Verificar signature
  // ...

  const { jobId, status, resultUrl } = await request.json();

  // Actualizar en DB
  await updateJob(jobId, { status, resultUrl });

  // Opcional: Enviar notificación al cliente via WebSocket
  // ...

  return NextResponse.json({ received: true });
}
```

---

## 🧪 Testing

### Mock de API para desarrollo

```typescript
// lib/api/mock-service.ts
export async function generateTextToVideoMock(params: any) {
  // Simular delay
  await new Promise((resolve) => setTimeout(resolve, 3000));

  return {
    success: true,
    videoUrl: 'https://example.com/sample-video.mp4',
    thumbnailUrl: 'https://example.com/sample-thumb.jpg',
  };
}
```

Usar en development:

```typescript
const isDev = process.env.NODE_ENV === 'development';

const result = isDev
  ? await generateTextToVideoMock(params)
  : await generateTextToVideo(params);
```

---

## 📊 Monitoreo y Logs

```typescript
// lib/api/logger.ts
export function logGeneration(data: {
  userId?: string;
  type: string;
  duration: number;
  success: boolean;
  error?: string;
}) {
  console.log('[VIDEO GENERATION]', {
    ...data,
    timestamp: new Date().toISOString(),
  });

  // Opcional: Enviar a servicio de analytics
  // analytics.track('video_generated', data);
}
```

---

**Con esta guía tendrás una integración completa y robusta con APIs de video! 🎬**

