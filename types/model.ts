export type AppMode = "convert" | "compress" | "compressPdf" | "youtube";

export type ImageMode = "convert" | "compress";

export type RasterMime = "image/png" | "image/jpeg" | "image/webp";

export type OutputTarget = RasterMime | "application/pdf";

export type JobStatus = "pending" | "processing" | "done" | "error";

export type FileJob = {
  id: string;
  file: File;
  status: JobStatus;
  progress: number;
  errorMessage?: string;
  resultBlob?: Blob;
  resultName?: string;
};

export type YoutubeDownloadFormat = "mp3" | "mp4";
