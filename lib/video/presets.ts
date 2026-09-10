import type { VideoQuality } from "@/types/model";

const LADDER_HEIGHTS = [144, 240, 360, 480, 720, 1080, 1440, 2160] as const;

const RECOMMENDED_VIDEO_KBPS: Record<number, number> = {
  144: 400,
  240: 700,
  360: 1200,
  480: 2500,
  720: 5000,
  1080: 8000,
  1440: 16000,
  2160: 35000,
};

export const VIDEO_QUALITY_LABELS: Record<VideoQuality, string> = {
  bajo: "Bajo",
  medio: "Medio",
  recomendado: "Recomendado",
  alto: "Alto",
};

export const VIDEO_QUALITY_MULTIPLIERS: Record<VideoQuality, number> = {
  bajo: 0.6,
  medio: 0.8,
  recomendado: 1,
  alto: 1.3,
};

export const AUDIO_BITRATE_OPTIONS = [96, 128, 192] as const;

const MAX_RECOMMENDED_HEIGHT = 1080;

const SIZE_CAP_FACTOR = 0.8;

export function roundToEven(value: number): number {
  return Math.round(value / 2) * 2;
}

export function recommendOutputHeight(sourceHeight: number): number {
  const heights = LADDER_HEIGHTS.filter(
    (h) => h <= sourceHeight && h <= MAX_RECOMMENDED_HEIGHT,
  );
  if (heights.length > 0) return heights[heights.length - 1];
  return LADDER_HEIGHTS[0];
}

export function recommendOutputWidth(
  sourceWidth: number,
  sourceHeight: number,
): number {
  const targetHeight = recommendOutputHeight(sourceHeight);
  return roundToEven((sourceWidth * targetHeight) / sourceHeight);
}

export function widthToHeight(width: number, aspect: number): number {
  return roundToEven(width / aspect);
}

export function ladderBitrateKbps(targetHeight: number): number {
  const height = LADDER_HEIGHTS.find((h) => h >= targetHeight);
  return RECOMMENDED_VIDEO_KBPS[height ?? 1080];
}

export function sourceEffectiveBitrateKbps(
  sizeBytes: number,
  durationSeconds: number,
): number {
  if (sizeBytes <= 0 || durationSeconds <= 0) return 0;
  return Math.round((sizeBytes * 8) / durationSeconds / 1000);
}

export function capVideoKbps(sourceBitrateKbps: number): number {
  return Math.max(32, Math.round(sourceBitrateKbps * SIZE_CAP_FACTOR));
}

export function videoKbpsForTarget(
  targetHeight: number,
  quality: VideoQuality,
  sourceBitrateKbps: number,
): number {
  const requested = Math.round(
    ladderBitrateKbps(targetHeight) * VIDEO_QUALITY_MULTIPLIERS[quality],
  );
  if (sourceBitrateKbps <= 0) return requested;
  return Math.min(requested, capVideoKbps(sourceBitrateKbps));
}

export function estimatedSizeBytes(
  videoKbps: number,
  audioKbps: number,
  durationSeconds: number,
): number {
  return Math.round(((videoKbps + audioKbps) * 1000 * durationSeconds) / 8);
}