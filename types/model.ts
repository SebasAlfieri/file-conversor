export type AppMode =
  | "convert"
  | "compress"
  | "compressPdf"
  | "compressVideo"
  | "youtube";

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

export type YoutubeVideoPreview = {
  videoId: string;
  title: string;
  duration: number | null;
};

export type VideoQuality = "bajo" | "medio" | "recomendado" | "alto";

export type VideoProbe = {
  name: string;
  size: number;
  duration: number;
  width: number;
  height: number;
  fps: number;
  bitrateKbps: number;
  videoCodec: string;
  audioCodec: string | null;
};
