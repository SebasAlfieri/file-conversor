import type { RasterMime } from "@/types/model";

import { getSourceSize, releaseSource } from "@/lib/image/loadImageSource";

type Drawable = ImageBitmap | HTMLImageElement;

export async function drawableToRasterBlob(
  source: Drawable,
  mime: RasterMime,
  quality: number,
): Promise<Blob> {
  const { width, height } = getSourceSize(source);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D no disponible");
  }

  if (mime === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }

  ctx.drawImage(source, 0, 0);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, mime, mime === "image/png" ? undefined : quality);
  });

  if (!blob) {
    throw new Error("El navegador no pudo generar el formato elegido");
  }

  return blob;
}

export async function fileToRasterBlob(
  source: Drawable,
  mime: RasterMime,
  quality: number,
): Promise<Blob> {
  try {
    return await drawableToRasterBlob(source, mime, quality);
  } finally {
    releaseSource(source);
  }
}
