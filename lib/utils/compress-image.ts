/**
 * Client-side image compression using Canvas API.
 * Reduces large screenshots to ≤ MAX_OUTPUT_SIZE while preserving
 * reasonable visual quality via iterative quality reduction.
 */

const MAX_OUTPUT_SIZE = 45 * 1024 * 1024;
const MAX_DIMENSION = 2048; // Cap width/height to control pixel budget
const INITIAL_QUALITY = 0.85;
const QUALITY_STEP = 0.1;
const MIN_QUALITY = 0.4;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("فشل في تحميل الصورة"));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("فشل في ضغط الصورة"));
      },
      type,
      quality
    );
  });
}

/**
 * Compress an image File if it exceeds MAX_OUTPUT_SIZE.
 * Returns the original file if already small enough, or a new compressed File.
 */
export async function compressImage(file: File): Promise<File> {
  // Skip non-image or already-small files
  if (!file.type.startsWith("image/") || file.size <= MAX_OUTPUT_SIZE) {
    return file;
  }

  const img = await loadImage(file);

  // Calculate scaled dimensions while preserving aspect ratio
  let { width, height } = img;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("فشل في إنشاء Canvas");
  ctx.drawImage(img, 0, 0, width, height);

  // Always output JPEG for compression efficiency (PNG screenshots → JPEG is a big win)
  const outputType = "image/jpeg";
  let quality = INITIAL_QUALITY;
  let blob = await canvasToBlob(canvas, outputType, quality);

  // Iteratively reduce quality until size is acceptable
  while (blob.size > MAX_OUTPUT_SIZE && quality > MIN_QUALITY) {
    quality -= QUALITY_STEP;
    blob = await canvasToBlob(canvas, outputType, quality);
  }

  // Build a new File from the compressed blob, preserving the original name
  const ext = "jpg";
  const name = file.name.replace(/\.[^.]+$/, `.${ext}`);
  return new File([blob], name, { type: outputType, lastModified: Date.now() });
}
