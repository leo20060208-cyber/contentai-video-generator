# 🚀 Quick Start - Puerto 3001

## Ejecutar el Proyecto

### 1. Detén el servidor actual (si está corriendo)
Presiona `Ctrl+C` en el terminal donde corre `npm run dev`

### 2. Inicia en puerto 3001
```bash
npm run dev
```

### 3. Abre el navegador
```
http://localhost:3001
```

## ✅ Verificar que funciona

### Frontend
- Landing: http://localhost:3001
- Videos: http://localhost:3001/templates  
- Animation: http://localhost:3001/animation

### Backend (API Routes)
- Templates: http://localhost:3001/api/templates
- Generate: http://localhost:3001/api/generate (POST)
- Jobs: http://localhost:3001/api/jobs/[jobId] (GET)

## 🧪 Probar End-to-End

1. Ve a http://localhost:3001/animation
2. Escribe un prompt: "A futuristic car flying over neon city"
3. Click "GENERATE VIDEO"
4. Espera 8-12 segundos
5. Deberías ver un video de ejemplo

## 📦 TODO está en un solo servidor

```
http://localhost:3001
├── / (frontend)
├── /templates (frontend)
├── /animation (frontend)
└── /api/* (backend - API Routes)
    ├── /api/templates
    ├── /api/generate
    ├── /api/upload
    └── /api/jobs/[id]
```

**NO necesitas otro servidor.** Next.js maneja frontend y backend juntos.

## 🌐 Desplegar a Producción

### Vercel (Recomendado)
```bash
npm i -g vercel
vercel
```

Todo se despliega junto. Tu URL será:
```
https://tu-proyecto.vercel.app
```

Y las APIs estarán en:
```
https://tu-proyecto.vercel.app/api/templates
https://tu-proyecto.vercel.app/api/generate
```

## 🔐 Fase 2: Conectar Google Cloud

Cuando tengas las credenciales:

1. Crea `.env.local`:
```env
GOOGLE_CLOUD_PROJECT_ID=tu-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
```

2. Instala dependencias:
```bash
npm install @google-cloud/vertexai @google-cloud/storage
```

3. Los archivos ya están preparados:
- `lib/api/vertex-client.ts` (código comentado al final)
- `lib/api/prompt-enhancer.ts` (ready para Gemini)

## ❓ FAQ

**Q: ¿Debo tener dos terminales corriendo?**
A: NO. Solo `npm run dev` en puerto 3001.

**Q: ¿Cómo se comunica el frontend con el backend?**
A: El frontend hace `fetch('/api/...')` y Next.js lo maneja automáticamente.

**Q: ¿Funciona igual en producción?**
A: SÍ. Vercel/Railway/etc ejecutan `npm run build && npm start` y todo funciona igual.

**Q: ¿Puedo separar frontend y backend?**
A: Sí, pero NO es recomendado con Next.js. La arquitectura actual es la estándar.

