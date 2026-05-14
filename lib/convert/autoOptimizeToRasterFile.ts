import imageCompression from "browser-image-compression";

import type { RasterMime } from "@/types/model";

import { getSourceSize, loadDrawableSource, releaseSource } from "@/lib/image/loadImageSource";

function bytesToMb(bytes: number): number {
  return bytes / (1024 * 1024);
}

const FILE_TYPE: Record<
  RasterMime,
  "image/webp" | "image/jpeg" | "image/png"
> = {
  "image/webp": "image/webp",
  "image/jpeg": "image/jpeg",
  "image/png": "image/png",
};

async function readMaxSide(file: File): Promise<number> {
  const src = await loadDrawableSource(file);
  try {
    const { width, height } = getSourceSize(src);
    return Math.max(width, height, 1);
  } finally {
    releaseSource(src);
  }
}

/**
 * Optimiza y convierte al formato indicado sin pedir calidad manual:
 * apunta a un tamaño claramente menor al original (estilo TinyPNG).
 */
export async function autoOptimizeToRasterFile(
  file: File,
  target: RasterMime,
): Promise<File> {
  const inputMb = bytesToMb(file.size);
  const maxSide = await readMaxSide(file);
  const fileType = FILE_TYPE[target];

  const compress = (maxSizeMB: number, initialQuality: number) =>
    imageCompression(file, {
      maxSizeMB,
      maxWidthOrHeight: maxSide,
      useWebWorker: true,
      fileType,
      initialQuality,
      maxIteration: 20,
      alwaysKeepResolution: true,
    });

  const pass1 = Math.max(0.008, inputMb * 0.42);
  let out = await compress(pass1, 0.82);

  const stillBig =
    out.size >= file.size * 0.88 &&
    (target === "image/webp" || target === "image/jpeg");

  if (stillBig) {
    const pass2 = Math.max(0.006, inputMb * 0.28);
    out = await compress(pass2, 0.68);
  }

  const stillBig2 =
    out.size >= file.size * 0.85 &&
    (target === "image/webp" || target === "image/jpeg");

  if (stillBig2) {
    const pass3 = Math.max(0.005, inputMb * 0.18);
    out = await compress(pass3, 0.58);
  }

  return out;
}

/** JPEG optimizado para incrustar en PDF (más liviano que PNG). */
export async function autoOptimizeForPdfEmbed(file: File): Promise<File> {
  const inputMb = bytesToMb(file.size);
  const maxSide = await readMaxSide(file);
  const maxSizeMB = Math.max(0.012, inputMb * 0.38);

  return imageCompression(file, {
    maxSizeMB,
    maxWidthOrHeight: maxSide,
    useWebWorker: true,
    fileType: "image/jpeg",
    initialQuality: 0.78,
    maxIteration: 20,
    alwaysKeepResolution: true,
  });
}
