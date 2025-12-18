# Pla d'Implementació: Segmentació Interactiva de Producte (Click-to-Segment)

L'objectiu és substituir l'eliminació automàtica de fons per un sistema on l'usuari clica sobre el producte i la IA el detecta i retalla intel·ligentment (fent servir el model SAM - Segment Anything Model).

## 1. Nova API de Segmentació (`/api/segment-image`)
Crearem un endpoint que connecti amb Replicate (model `facebook/sam` o similar ràpid).
- **Input**:
  - `image`: Imatge original (base64 o URL).
  - `point`: Coordenades (x, y) on ha clicat l'usuari.
- **Output**:
  - `mask`: Màscara binària o imatge amb fons transparent del objecte seleccionat.

## 2. Modificació del Frontend (`app/recreate/[id]/page.tsx`)
### A. Canvi en la Pujada d'Imatges
- **Desactivar** la crida automàtica a `/api/remove-background`.
- Pujar la imatge tal qual i mostrar-la a l'usuari.

### B. Interfície de Selecció
- Convertir la visualització de la imatge en un component interactiu.
- Quan l'usuari passa el ratolí: Crosshair cursor.
- Quan l'usuari clica:
  1. Mostrar spinner de càrrega "Detecting object...".
  2. Enviar coordenades + imatge a la API.
  3. Rebre la imatge processada (només l'objecte, fons transparent) i substituir-la o superposar-la.

### C. Gestió de l'Estat
Necessitarem guardar dos estats per imatge:
1. `originalImage`: Per si l'usuari vol tornar a clicar/rectificar.
2. `processedImage`: La versió retallada que s'enviarà finalment a generar el video.

## 3. Integració amb Generació de Video
- La funció `handleGenerate` ja espera una imatge de producte.
- Li passarem la `processedImage` (l'output del SAM amb transparència).
- Això assegura que el model de video només "veu" el producte que l'usuari ha seleccionat explícitament.

---

## 🛠 Passos Tècnics

1. **Backend**: Crear `app/api/segment-image/route.ts` fent servir Replicate `pysaliency-segment-anything` o similar per velocitat.
2. **Frontend**: Crear component `InteractiveImageSegmenter.tsx` per gestionar els clicks i coordenades.
3. **Integració**: Substituir l'actual grid d'imatges a `/recreate/[id]/page.tsx` pel nou segmentador.

Aquest sistema dóna control total a l'usuari i millora la qualitat del resultat final ja que la IA sap exactament què és el producte.
