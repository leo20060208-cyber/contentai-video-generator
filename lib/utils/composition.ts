
/**
 * Interface for Bounding Box coordinates
 */
export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Analyzes a mask image (white on black or alpha) to find the bounding box of the non-transparent/white area.
 * Assumes the mask uses standard format (white = active area).
 */
export async function getMaskBoundingBox(maskUrl: string): Promise<BoundingBox | null> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            let minX = canvas.width;
            let minY = canvas.height;
            let maxX = 0;
            let maxY = 0;
            let found = false;

            // Iterate through pixels to find the bounding box of the mask
            // Assuming mask is typically white/grayscale for the area, or alpha
            for (let y = 0; y < canvas.height; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    const i = (y * canvas.width + x) * 4;
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    const a = data[i + 3];

                    // Check for significant brightness or opacity
                    // White mask (255, 255, 255) vs Black (0, 0, 0)
                    // Or Alpha > 0
                    const isMasked = a > 10 && (r > 100 || g > 100 || b > 100);

                    if (isMasked) {
                        found = true;
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }

            if (!found) {
                resolve(null);
                return;
            }

            resolve({
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY
            });
        };
        img.onerror = (err) => reject(err);
        img.src = maskUrl;
    });
}

/**
 * Composites a product image onto a background frame, fitting it within the specified bounding box.
 * Maintains aspect ratio of the product, centering it within the box.
 */
export async function createCompositeFrame(
    backgroundUrl: string,
    productUrl: string,
    bbox: BoundingBox
): Promise<string> {
    const [bgImg, prodImg] = await Promise.all([
        loadImage(backgroundUrl),
        loadImage(productUrl)
    ]);

    const canvas = document.createElement('canvas');
    canvas.width = bgImg.width;
    canvas.height = bgImg.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Context failed');

    // 1. Draw Background
    ctx.drawImage(bgImg, 0, 0);

    // 2. Calculate positioning for product to Fit Content (contain) inside bbox
    const productAspect = prodImg.width / prodImg.height;
    const boxAspect = bbox.width / bbox.height;

    let drawW: number;
    let drawH: number;
    let drawX: number;
    let drawY: number;

    if (productAspect > boxAspect) {
        // Product is wider - fit to width
        drawW = bbox.width;
        drawH = drawW / productAspect;
        drawX = bbox.x;
        drawY = bbox.y + (bbox.height - drawH) / 2; // Center vertically
    } else {
        // Product is taller or same - fit to height
        drawH = bbox.height;
        drawW = drawH * productAspect;
        drawY = bbox.y;
        drawX = bbox.x + (bbox.width - drawW) / 2; // Center horizontally
    }

    // 3. Draw Product
    ctx.drawImage(prodImg, drawX, drawY, drawW, drawH);

    return canvas.toDataURL('image/png', 0.95);
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}
