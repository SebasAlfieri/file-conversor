export type AppMode = "convert" | "compress";

export type RasterMime = "image/png" | "image/jpeg" | "image/webp";

export type OutputTarget = RasterMime | "application/pdf";

export type JobStatus = "pending" | "processing" | "done" | "error";

export type FileJob = {
  id: string;
  file: File;
  status: JobStatus;
  errorMessage?: string;
  resultBlob?: Blob;
  resultName?: string;
};

export type CompressionPreset = {
  maxSizeMB: number;
  maxWidthOrHeight: number;
  initialQuality?: number;
  maxIteration?: number;
};
