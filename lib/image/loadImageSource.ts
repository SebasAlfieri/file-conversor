function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo cargar la imagen"));
    };
    img.src = url;
  });
}

export async function loadDrawableSource(
  file: File,
): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file);
  } catch {
    return loadImageElement(file);
  }
}

export function getSourceSize(
  source: ImageBitmap | HTMLImageElement,
): { width: number; height: number } {
  return { width: source.width, height: source.height };
}

export function releaseSource(source: ImageBitmap | HTMLImageElement): void {
  if ("close" in source && typeof source.close === "function") {
    source.close();
  }
}
