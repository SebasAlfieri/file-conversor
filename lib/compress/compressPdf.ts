import imageCompression from "browser-image-compression";
import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFRawStream,
  PDFRef,
} from "pdf-lib";

import {
  getSourceSize,
  loadDrawableSource,
  releaseSource,
} from "@/lib/image/loadImageSource";

const PDF_MIME = "application/pdf";
const JPEG_MIME = "image/jpeg";
const DCT_DECODE = PDFName.of("DCTDecode");
const IMAGE = PDFName.of("Image");
const METADATA = PDFName.of("Metadata");

type CompressedImage = {
  bytes: Uint8Array;
  width: number;
  height: number;
};

type ProgressCallback = (progress: number) => void;

function isPdfFile(file: File): boolean {
  return file.type === PDF_MIME || file.name.toLowerCase().endsWith(".pdf");
}

function copyToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function hasDctDecodeFilter(stream: PDFRawStream): boolean {
  const filter = stream.dict.lookup(PDFName.of("Filter"));

  if (filter instanceof PDFName) {
    return filter === DCT_DECODE;
  }

  if (filter instanceof PDFArray) {
    for (let i = 0; i < filter.size(); i += 1) {
      if (filter.lookup(i) === DCT_DECODE) return true;
    }
  }

  return false;
}

function isJpegImageStream(stream: PDFRawStream): boolean {
  return (
    stream.dict.lookup(PDFName.of("Subtype")) === IMAGE &&
    hasDctDecodeFilter(stream)
  );
}

function removeMetadata(pdfDoc: PDFDocument): void {
  for (const [, object] of pdfDoc.context.enumerateIndirectObjects()) {
    const dict = object instanceof PDFRawStream ? object.dict : object;

    if (!(dict instanceof PDFDict) || !dict.has(METADATA)) {
      continue;
    }

    const metadataRef = dict.get(METADATA);
    if (metadataRef instanceof PDFRef) {
      pdfDoc.context.delete(metadataRef);
    }

    dict.delete(METADATA);
  }
}

async function getImageDimensions(file: File): Promise<{
  width: number;
  height: number;
}> {
  const source = await loadDrawableSource(file);
  try {
    return getSourceSize(source);
  } finally {
    releaseSource(source);
  }
}

async function compressJpegStream(
  bytes: Uint8Array,
  onProgress?: ProgressCallback,
): Promise<CompressedImage> {
  const sourceFile = new File([copyToArrayBuffer(bytes)], "pdf-image.jpg", {
    type: JPEG_MIME,
  });
  const originalDimensions = await getImageDimensions(sourceFile);
  const maxSide = Math.max(originalDimensions.width, originalDimensions.height);
  const inputMb = Math.max(sourceFile.size / (1024 * 1024), 0.01);

  const attempts = [
    { sizeFactor: 0.84, quality: 0.82 },
    { sizeFactor: 0.76, quality: 0.76 },
    { sizeFactor: 0.68, quality: 0.7 },
    { sizeFactor: 0.6, quality: 0.66 },
  ];

  let compressedFile: File | null = null;

  for (const [attemptIndex, attempt] of attempts.entries()) {
    const candidate = await imageCompression(sourceFile, {
      maxSizeMB: Math.max(inputMb * attempt.sizeFactor, 0.03),
      maxWidthOrHeight: maxSide,
      useWebWorker: true,
      initialQuality: attempt.quality,
      maxIteration: 12,
      alwaysKeepResolution: true,
      fileType: JPEG_MIME,
      onProgress: (progress) => {
        const attemptProgress = (attemptIndex + progress / 100) / attempts.length;
        onProgress?.(Math.round(attemptProgress * 100));
      },
    });

    const candidateDimensions = await getImageDimensions(candidate);
    const keptResolution =
      candidateDimensions.width === originalDimensions.width &&
      candidateDimensions.height === originalDimensions.height;

    if (
      keptResolution &&
      candidate.size < sourceFile.size * 0.98 &&
      (!compressedFile || candidate.size < compressedFile.size)
    ) {
      compressedFile = candidate;
    }
  }

  if (!compressedFile) {
    throw new Error("La imagen ya estaba optimizada o no mantuvo resolución.");
  }

  const compressedBuffer = await compressedFile.arrayBuffer();

  return {
    bytes: new Uint8Array(compressedBuffer),
    width: originalDimensions.width,
    height: originalDimensions.height,
  };
}

export async function compressPdfFile(
  file: File,
  onProgress?: ProgressCallback,
): Promise<File> {
  if (!isPdfFile(file)) {
    throw new Error("Solo se comprimen archivos PDF.");
  }

  onProgress?.(2);
  const sourceBytes = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(sourceBytes, {
    ignoreEncryption: true,
    updateMetadata: false,
  });
  onProgress?.(8);

  let compressedImages = 0;
  const imageStreams = pdfDoc.context
    .enumerateIndirectObjects()
    .filter(
      (entry): entry is [PDFRef, PDFRawStream] =>
        entry[1] instanceof PDFRawStream && isJpegImageStream(entry[1]),
    );

  for (const [index, [ref, object]] of imageStreams.entries()) {
    try {
      const compressed = await compressJpegStream(
        object.getContents(),
        (progress) => {
          const imageProgress = (index + progress / 100) / imageStreams.length;
          onProgress?.(Math.round(8 + imageProgress * 82));
        },
      );
      object.dict.set(PDFName.of("ColorSpace"), PDFName.of("DeviceRGB"));
      object.dict.set(PDFName.of("BitsPerComponent"), PDFNumber.of(8));
      object.dict.set(PDFName.of("Width"), PDFNumber.of(compressed.width));
      object.dict.set(PDFName.of("Height"), PDFNumber.of(compressed.height));
      object.dict.delete(PDFName.of("DecodeParms"));
      pdfDoc.context.assign(ref, PDFRawStream.of(object.dict, compressed.bytes));
      compressedImages += 1;
    } catch {
      // Some embedded JPEGs use encodings the browser cannot decode.
    }
  }

  if (compressedImages === 0) {
    throw new Error("No se encontraron imágenes JPEG comprimibles en este PDF.");
  }

  removeMetadata(pdfDoc);
  onProgress?.(92);

  pdfDoc.setTitle("");
  pdfDoc.setAuthor("");
  pdfDoc.setSubject("");
  pdfDoc.setKeywords([]);
  pdfDoc.setProducer("");
  pdfDoc.setCreator("");

  const optimizedBytes = await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick: 50,
  });
  onProgress?.(98);

  const optimizedCopy = new Uint8Array(optimizedBytes.byteLength);
  optimizedCopy.set(optimizedBytes);
  const optimizedBlob = new Blob([optimizedCopy.buffer], { type: PDF_MIME });

  if (optimizedBlob.size >= file.size) {
    throw new Error("No se logró reducir el peso de este PDF.");
  }

  return new File([optimizedBlob], file.name, {
    type: PDF_MIME,
    lastModified: Date.now(),
  });
}
