import type { OutputTarget, RasterMime } from "@/types/model";

import { autoOptimizeToRasterFile } from "@/lib/convert/autoOptimizeToRasterFile";
import { SUPPORTED_IMAGE_INPUT } from "@/lib/constants";
import { loadDrawableSource } from "@/lib/image/loadImageSource";
import { fileToRasterBlob } from "@/lib/image/rasterToBlob";
import { imageFileToPdf } from "@/lib/pdf/imageFileToPdf";

function stripExtension(name: string): string {
  const i = name.lastIndexOf(".");
  if (i <= 0) return name;
  return name.slice(0, i);
}

function extForMime(mime: OutputTarget): string {
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  return ".pdf";
}

function normalizeMime(file: File): string {
  if (file.type) return file.type.toLowerCase();
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".bmp")) return "image/bmp";
  if (lower.endsWith(".avif")) return "image/avif";
  if (lower.endsWith(".ico")) return "image/x-icon";
  return "";
}

export async function convertOneFile(
  file: File,
  target: OutputTarget,
): Promise<{ blob: Blob; filename: string }> {
  const mime = normalizeMime(file);
  const isSvg =
    mime === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
  const supported =
    SUPPORTED_IMAGE_INPUT.has(mime) || isSvg || mime.startsWith("image/");

  if (!supported) {
    throw new Error(
      "Formato no soportado. Usa imágenes (PNG, JPG, WebP, GIF, SVG, AVIF, etc.).",
    );
  }

  const base = stripExtension(file.name);

  if (target === "application/pdf") {
    const blob = await imageFileToPdf(file);
    return { blob, filename: `${base}.pdf` };
  }

  try {
    const optimized = await autoOptimizeToRasterFile(file, target as RasterMime);
    return {
      blob: optimized,
      filename: `${base}${extForMime(target)}`,
    };
  } catch {
    const drawable = await loadDrawableSource(file);
    const fallbackQuality = target === "image/png" ? 1 : 0.72;
    const blob = await fileToRasterBlob(
      drawable,
      target as RasterMime,
      fallbackQuality,
    );
    return { blob, filename: `${base}${extForMime(target)}` };
  }
}
