import JSZip from "jszip";

export async function zipNamedBlobs(
  entries: { name: string; blob: Blob }[],
): Promise<Blob> {
  const zip = new JSZip();
  const used = new Map<string, number>();

  for (const entry of entries) {
    let name = entry.name;
    const count = used.get(name) ?? 0;
    used.set(name, count + 1);
    if (count > 0) {
      const dot = name.lastIndexOf(".");
      if (dot > 0) {
        name = `${name.slice(0, dot)} (${count})${name.slice(dot)}`;
      } else {
        name = `${name} (${count})`;
      }
    }
    zip.file(name, entry.blob);
  }

  return zip.generateAsync({ type: "blob" });
}
