import imageCompression from "browser-image-compression";

import { getSourceSize, loadDrawableSource, releaseSource } from "@/lib/image/loadImageSource";

const PNG_JPEG = new Set(["image/png", "image/jpeg", "image/jpg"]);

function normalizeMime(file: File): string {
  return file.type.toLowerCase();
}

async function readMaxSide(file: File): Promise<number> {
  const src = await loadDrawableSource(file);
  try {
    return Math.max(getSourceSize(src).width, getSourceSize(src).height, 1);
  } finally {
    releaseSource(src);
  }
}

export function isCompressibleImage(file: File): boolean {
  const mime = normalizeMime(file);
  if (mime === "image/jpeg" || mime === "image/jpg") return true;
  if (mime === "image/png") return true;
  const n = file.name.toLowerCase();
  return n.endsWith(".png") || n.endsWith(".jpg") || n.endsWith(".jpeg");
}

/**
 * Comprime PNG/JPG de forma automática, sin redimensionar (misma resolución en px).
 */
export async function compressImageFile(file: File): Promise<File> {
  const mime = normalizeMime(file);
  if (!PNG_JPEG.has(mime) && !isCompressibleImage(file)) {
    throw new Error("Solo se comprimen archivos PNG o JPG.");
  }

  const name = file.name.toLowerCase();
  const asPng = mime === "image/png" || name.endsWith(".png");
  const inputMb = file.size / (1024 * 1024);
  const maxSide = await readMaxSide(file);

  const run = (sizeFactor: number, initialQuality: number) =>
    imageCompression(file, {
      maxSizeMB: Math.max(0.006, inputMb * sizeFactor),
      maxWidthOrHeight: maxSide,
      useWebWorker: true,
      initialQuality,
      maxIteration: 22,
      alwaysKeepResolution: true,
      fileType: asPng ? "image/png" : "image/jpeg",
    });

  let out = await run(0.4, 0.72);

  if (out.size >= file.size * 0.92 && !asPng) {
    out = await run(0.26, 0.6);
  }

  if (out.size >= file.size * 0.94 && asPng) {
    out = await run(0.3, 0.64);
  }

  return out;
}
