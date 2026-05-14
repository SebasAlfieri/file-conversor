import imageCompression from "browser-image-compression";

import type { CompressionPreset } from "@/types/model";

const PNG_JPEG = new Set(["image/png", "image/jpeg", "image/jpg"]);

function normalizeMime(file: File): string {
  return file.type.toLowerCase();
}

export function isCompressibleImage(file: File): boolean {
  const mime = normalizeMime(file);
  if (mime === "image/jpeg" || mime === "image/jpg") return true;
  if (mime === "image/png") return true;
  const n = file.name.toLowerCase();
  return n.endsWith(".png") || n.endsWith(".jpg") || n.endsWith(".jpeg");
}

export async function compressImageFile(
  file: File,
  preset: CompressionPreset,
): Promise<File> {
  const mime = normalizeMime(file);
  if (!PNG_JPEG.has(mime) && !isCompressibleImage(file)) {
    throw new Error("Solo se comprimen archivos PNG o JPG.");
  }

  const name = file.name.toLowerCase();
  const asPng = mime === "image/png" || name.endsWith(".png");

  return imageCompression(file, {
    maxSizeMB: preset.maxSizeMB,
    maxWidthOrHeight: preset.maxWidthOrHeight,
    useWebWorker: true,
    initialQuality: preset.initialQuality ?? 0.68,
    maxIteration: preset.maxIteration ?? 20,
    fileType: asPng ? "image/png" : "image/jpeg",
  });
}
