# Testing Guide - Backend Mock Implementation

## ✅ Implementación Completada

Se ha implementado el backend mock completo siguiendo el plan en `backend-video-generation.plan.md`.

### 📦 Archivos Creados

#### Servicios Mock
- ✅ `lib/api/prompt-enhancer.ts` - LLM mock que mejora prompts
- ✅ `lib/api/vertex-client.ts` - Cliente mock de Vertex AI Veo 3
- ✅ `lib/api/job-manager.ts` - Sistema en memoria para trackear jobs

#### Sistema de Templates
- ✅ `lib/data/template-library.ts` - Librería de 6 templates con prompts ocultos
- ✅ Actualizado `lib/data/mock-templates.ts` para usar la librería central

#### API Routes
- ✅ `app/api/upload/route.ts` - Upload de imágenes (convierte a data URL)
- ✅ `app/api/generate/route.ts` - Endpoint principal de generación
- ✅ `app/api/jobs/[jobId]/route.ts` - Polling de estado de jobs
- ✅ `app/api/templates/route.ts` - Lista de templates públicos
- ✅ `app/api/templates/[id]/route.ts` - Template individual

#### Frontend Integration
- ✅ Actualizado `store/video-store.ts` para usar nueva API
- ✅ Conectado `app/animation/page.tsx` con backend
- ✅ Conectado `app/templates/[id]/page.tsx` con backend

## 🧪 Cómo Probar

### 1. Verificar que el servidor esté corriendo

```bash
npm run dev
```

El servidor debería estar en `http://localhost:3000`

### 2. Flujo de Testing: Animation Studio (Text-to-Video)

1. **Ir a Animation Studio:**
   - Navega a `http://localhost:3000/animation`

2. **Probar generación solo con Prompt:**
   - Escribe un prompt en el campo de texto (ej: "A futuristic car flying over a neon city")
   - (Opcional) Click en "MAGIC ENHANCE" para mejorar el prompt
   - Selecciona un aspect ratio (16:9, 9:16, o 1:1)
   - Click en "GENERATE VIDEO"

3. **Observar el flujo:**
   - ✅ El botón debería cambiar a "PROCESSING..."
   - ✅ El canvas central debería mostrar un spinner con progreso
   - ✅ Después de 8-12 segundos, debería mostrar un video de ejemplo
   - ✅ El job debería aparecer en el historial de la derecha

4. **Probar generación con Imagen + Prompt:**
   - Click en "Drop Image Here" y sube una imagen
   - Espera a que termine el upload
   - Escribe un prompt
   - Click en "GENERATE VIDEO"
   - Observa el mismo flujo

### 3. Flujo de Testing: Templates (Image-to-Video)

1. **Ir a Templates:**
   - Navega a `http://localhost:3000/templates`

2. **Seleccionar un template:**
   - Click en cualquier template del grid (ej: "Luxury Product Reveal")

3. **Upload de producto:**
   - En la página de detalle, sube una imagen de un producto
   - Espera a que termine el upload (verás "Uploading..." en el botón)

4. **Generar video:**
   - Click en "Generate with My Product"
   - Serás redirigido a `/animation` donde verás el progreso
   - Después de 8-12 segundos, verás el video generado

### 4. Verificar Polling

Abre las DevTools (F12) → Network tab:
- ✅ Deberías ver requests a `/api/jobs/[jobId]` cada 3 segundos
- ✅ El polling debería detenerse cuando status = 'completed'

### 5. Verificar Console Logs

Revisa la consola del servidor (terminal donde corre `npm run dev`):
- ✅ `[Generate] Using template: ...`
- ✅ `[Generate] Enhancing user prompt: ...`
- ✅ `[Generate] Final prompt: ...`
- ✅ `[Jobs] Status check for job_xxx: processing (50%)`
- ✅ `[Jobs] Status check for job_xxx: completed (100%)`

## 📊 Casos de Prueba

### ✅ Caso 1: Animation - Solo Prompt
- **Input:** Prompt de texto
- **Expected:** Video generado después de 8-12s

### ✅ Caso 2: Animation - Imagen + Prompt
- **Input:** Imagen + Prompt
- **Expected:** Upload exitoso + video generado

### ✅ Caso 3: Template - Product Image
- **Input:** Template ID + Imagen de producto
- **Expected:** Video con estilo del template

### ✅ Caso 4: Magic Enhance
- **Input:** Prompt corto (ej: "car flying")
- **Action:** Click en MAGIC ENHANCE
- **Expected:** Prompt expandido con términos técnicos

### ✅ Caso 5: Aspect Ratio Dinámico
- **Input:** Cambiar entre 16:9, 9:16, 1:1
- **Expected:** El canvas cambia de tamaño dinámicamente

### ✅ Caso 6: History
- **Action:** Generar múltiples videos
- **Expected:** Todos aparecen en el historial de la derecha

## 🐛 Troubleshooting

### El video no se genera
1. Revisa la consola del navegador (F12)
2. Revisa la consola del servidor
3. Verifica que el polling esté funcionando (Network tab)

### Upload falla
1. Verifica que la imagen sea < 10MB
2. Verifica que sea un formato válido (PNG, JPG, WebP)

### Polling no se detiene
1. Revisa que el job manager esté actualizando correctamente
2. Verifica que el store esté llamando a `stopPolling()` cuando status = 'completed'

## 🎯 Estado del Mock

**Actual:**
- ✅ Todos los flujos funcionan end-to-end
- ✅ Prompt enhancement (mock)
- ✅ Video generation (mock con video de ejemplo)
- ✅ Upload de imágenes (data URLs)
- ✅ Polling con progreso incremental
- ✅ Templates con prompts ocultos
- ⚠️ Videos de resultado son de ejemplo (BigBuckBunny)
- ⚠️ Storage temporal (se pierde al reiniciar)

**Siguiente Fase (cuando conectes GCP):**
1. Reemplazar `lib/api/prompt-enhancer.ts` con llamada a Gemini API
2. Reemplazar `lib/api/vertex-client.ts` con cliente real de Vertex AI
3. Cambiar `/api/upload` para usar Google Cloud Storage
4. Añadir credenciales de GCP en `.env.local`

## 📝 Variables de Entorno (para Fase 2)

Cuando estés listo para conectar GCP, crea `.env.local`:

```env
GOOGLE_CLOUD_PROJECT_ID=tu-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
GCS_BUCKET_NAME=tu-bucket-videos
```

## ✨ Resumen

Todo el flujo está implementado y funcional con mocks:
1. ✅ Usuario sube imagen o escribe prompt
2. ✅ Sistema mejora el prompt (mock)
3. ✅ Generación simulada con progreso (8-12s)
4. ✅ Polling automático cada 3s
5. ✅ Video de ejemplo se muestra al completar
6. ✅ Job se guarda en historial

**🎉 ¡Listo para probar!** Sigue los pasos de arriba para validar cada flujo.

