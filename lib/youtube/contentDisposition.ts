export function attachmentContentDisposition(filename: string): string {
  const asciiSafe = filename.replace(/[^\x20-\x7E]+/g, "_");
  return `attachment; filename="${asciiSafe.replace(/"/g, "_")}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
