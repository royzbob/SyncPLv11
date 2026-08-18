/**
 * High-performance client-side image compression utility
 * Downscales images to max 1280px dimension and converts to efficient WebP/JPEG Base64 data URL
 * Keeps payload lightweight (~40KB - 80KB) for real-time Firestore synchronization
 */

export interface CompressionResult {
  dataUrl: string;
  originalSizeKb: number;
  compressedSizeKb: number;
  width: number;
  height: number;
}

export async function compressImage(
  file: File | Blob,
  maxDimension = 1280,
  quality = 0.78
): Promise<CompressionResult> {
  const originalSizeKb = Math.round(file.size / 1024);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio downscaling
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Unable to create canvas context"));
          return;
        }

        // Draw and compress image
        ctx.drawImage(img, 0, 0, width, height);

        // Try WebP first with JPEG fallback
        let dataUrl = "";
        try {
          dataUrl = canvas.toDataURL("image/webp", quality);
          if (!dataUrl.startsWith("data:image/webp")) {
            dataUrl = canvas.toDataURL("image/jpeg", quality);
          }
        } catch {
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }

        // Calculate size in KB
        const head = "data:image/webp;base64,";
        const base64Len = dataUrl.length - (dataUrl.indexOf(",") + 1);
        const compressedSizeKb = Math.round((base64Len * 3) / 4 / 1024);

        resolve({
          dataUrl,
          originalSizeKb,
          compressedSizeKb,
          width,
          height,
        });
      };
      img.onerror = () => reject(new Error("Failed to load image file"));
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}
