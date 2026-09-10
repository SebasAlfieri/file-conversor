import ffmpeg from "fluent-ffmpeg";
import ffprobeStatic from "ffprobe-static";

type ProbeFormat = {
  duration?: number;
  bit_rate?: number;
};

type ProbeStream = {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  avg_frame_rate?: string;
  r_frame_rate?: string;
};

type ProbeData = {
  streams?: ProbeStream[];
  format?: ProbeFormat;
};

export type VideoProbeResult = {
  duration: number;
  width: number;
  height: number;
  fps: number;
  bitrateKbps: number;
  videoCodec: string;
  audioCodec: string | null;
};

ffmpeg.setFfprobePath(ffprobeStatic.path);

function parseFrameRate(rate?: string): number {
  if (!rate) return 0;
  const [num, den] = rate.split("/").map(Number);
  if (!Number.isFinite(num) || !Number.isFinite(den) || num <= 0 || den <= 0) {
    return 0;
  }
  return Math.round(num / den);
}

export function probeVideo(inputPath: string): Promise<VideoProbeResult> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      const metadata = data as unknown as ProbeData;
      const videoStream = metadata.streams?.find(
        (stream) => stream.codec_type === "video",
      );
      const audioStream = metadata.streams?.find(
        (stream) => stream.codec_type === "audio",
      );

      if (!videoStream?.width || !videoStream?.height) {
        reject(
          new Error("El archivo no contiene un stream de video reconocible"),
        );
        return;
      }

      resolve({
        duration: Number(metadata.format?.duration ?? 0),
        width: videoStream.width,
        height: videoStream.height,
        fps: parseFrameRate(
          videoStream.avg_frame_rate ?? videoStream.r_frame_rate,
        ),
        bitrateKbps: Math.round(Number(metadata.format?.bit_rate ?? 0) / 1000),
        videoCodec: videoStream.codec_name ?? "h264",
        audioCodec: audioStream?.codec_name ?? null,
      });
    });
  });
}