export function filenameFromContentDisposition(
  header: string | null,
): string | null {
  if (!header) return null;
  const utf8 = /filename\*=UTF-8''([^;\n]+)/i.exec(header)?.[1];
  if (utf8) {
    try {
      return decodeURIComponent(utf8);
    } catch {
      return null;
    }
  }
  const quoted = /filename="((?:\\.|[^"\\])*)"/i.exec(header)?.[1];
  if (quoted) return quoted.replace(/\\"/g, '"');
  const plain = /filename=([^;\n]+)/i.exec(header)?.[1]?.trim();
  return plain?.replace(/^"|"$/g, "") ?? null;
}
