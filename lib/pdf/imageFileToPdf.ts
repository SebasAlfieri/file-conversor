import { PDFDocument } from "pdf-lib";

import { autoOptimizeForPdfEmbed } from "@/lib/convert/autoOptimizeToRasterFile";
import { loadDrawableSource, releaseSource } from "@/lib/image/loadImageSource";
import { drawableToRasterBlob } from "@/lib/image/rasterToBlob";

export async function imageFileToPdf(file: File): Promise<Blob> {
  let jpgBytes: Uint8Array;

  try {
    const jpegFile = await autoOptimizeForPdfEmbed(file);
    jpgBytes = new Uint8Array(await jpegFile.arrayBuffer());
  } catch {
    const drawable = await loadDrawableSource(file);
    try {
      const jpegBlob = await drawableToRasterBlob(drawable, "image/jpeg", 0.76);
      jpgBytes = new Uint8Array(await jpegBlob.arrayBuffer());
    } finally {
      releaseSource(drawable);
    }
  }

  const pdfDoc = await PDFDocument.create();
  const jpgImage = await pdfDoc.embedJpg(jpgBytes);
  const page = pdfDoc.addPage([jpgImage.width, jpgImage.height]);
  page.drawImage(jpgImage, {
    x: 0,
    y: 0,
    width: jpgImage.width,
    height: jpgImage.height,
  });

  const pdfBytes = await pdfDoc.save();

  return new Blob([pdfBytes.buffer as ArrayBuffer], {
    type: "application/pdf",
  });
}
