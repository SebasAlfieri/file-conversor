export const ACCEPT_IMAGE_AND_SVG =
  "image/*,.svg,image/svg+xml" as const;

export const SUPPORTED_IMAGE_INPUT = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/svg+xml",
  "image/avif",
  "image/x-icon",
]);

export const OUTPUT_LABELS: Record<string, string> = {
  "image/png": "PNG",
  "image/jpeg": "JPG",
  "image/webp": "WebP",
  "application/pdf": "PDF",
};
