/** Nombre seguro para cabecera Content-Disposition y sistema de archivos. */
export function sanitizeYoutubeFilename(title: string): string {
  const trimmed = title.replace(/[/\\?%*:|"<>]/g, "").trim();
  const base = trimmed.length > 0 ? trimmed.slice(0, 120) : "video";
  return base;
}
