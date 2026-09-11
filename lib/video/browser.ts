import { roundToEven } from "@/lib/video/presets";
import type { VideoProbe } from "@/types/model";

export type VideoCompressOptions = {
  width: number;
  height: number;
  videoKbps: number;
  audioKbps: number;
  fps: number;
  onProgress: (percent: number) => void;
};

const MIME_CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/webm",
];

export function pickVideoMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  return (
    MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) ?? ""
  );
}

export function mimeContainerLabel(mimeType: string): string {
  if (!mimeType) return "—";
  if (mimeType.includes("vp9")) return "VP9 + Opus (WebM)";
  if (mimeType.includes("vp8")) return "VP8 + Opus (WebM)";
  if (mimeType.includes("mp4")) return "H.264 + AAC (MP4)";
  return mimeType.split(";")[0];
}

export function containerExtension(mimeType: string): string {
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("webm")) return "webm";
  return "mp4";
}

function waitForEvent(
  target: EventTarget,
  event: string,
  timeoutMs: number,
): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      target.removeEventListener(event, done);
      resolve(false);
    }, timeoutMs);
    const done = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(true);
    };
    target.addEventListener(event, done);
  });
}

function measureFps(video: HTMLVideoElement): Promise<number> {
  const el = video as HTMLVideoElement & {
    requestVideoFrameCallback?: (
      callback: (now: number, metadata: unknown) => void,
    ) => number;
  };
  return new Promise((resolve) => {
    if (typeof el.requestVideoFrameCallback !== "function") {
      resolve(30);
      return;
    }
    let frames = 0;
    let firstTs: number | null = null;
    let lastTs = 0;
    let resolved = false;
    let timer = 0;

    const finish = (fps: number) => {
      if (resolved) return;
      resolved = true;
      window.clearTimeout(timer);
      resolve(Math.max(1, fps));
    };
    const detectedFps = () => {
      if (firstTs === null || lastTs <= firstTs) return 30;
      const spanMs = lastTs - firstTs;
      return Math.round((frames / spanMs) * 1000);
    };

    timer = window.setTimeout(() => finish(detectedFps()), 1500);
    const stopOnEnd = () => finish(detectedFps());

    const tick = (now: number) => {
      if (resolved) return;
      frames += 1;
      if (firstTs === null) firstTs = now;
      lastTs = now;
      if (frames >= 24 || now - firstTs >= 1000) {
        finish(detectedFps());
        return;
      }
      el.requestVideoFrameCallback?.(tick);
    };

    video.addEventListener("ended", stopOnEnd, { once: true });
    el.requestVideoFrameCallback(tick);
  });
}

function fileExtension(name: string): string {
  const ext = name.split(".").pop();
  return ext && ext !== name ? ext : "";
}

export async function detectVideoInfo(file: File): Promise<VideoProbe> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.src = url;
  try {
    const metaOk = await waitForEvent(video, "loadedmetadata", 10000);
    if (!metaOk) {
      throw new Error(
        "Tu navegador no pudo leer este video (puede que el códec no esté soportado)",
      );
    }

    const started = waitForEvent(video, "playing", 8000);
    video.play().catch(() => {});
    const playing = await started;

    let duration = video.duration;
    let fps = 0;
    if (playing) {
      if (!Number.isFinite(duration) || duration <= 0) {
        duration = video.currentTime || 0;
      }
      fps = await measureFps(video);
      video.pause();
    }

    const usableDuration =
      Number.isFinite(duration) && duration > 0 ? duration : 0;
    return {
      name: file.name,
      size: file.size,
      duration: Math.round(usableDuration * 100) / 100,
      width: video.videoWidth,
      height: video.videoHeight,
      fps,
      bitrateKbps:
        usableDuration > 0
          ? Math.round((file.size * 8) / usableDuration / 1000)
          : 0,
      videoCodec: fileExtension(file.name).toUpperCase() || "—",
      audioCodec: null,
    };
  } finally {
    video.pause();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

export async function compressVideoInBrowser(
  file: File,
  options: VideoCompressOptions,
): Promise<Blob> {
  const { width, height, videoKbps, audioKbps, fps, onProgress } = options;
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.playsInline = true;
  video.src = url;

  const audioContext = new AudioContext();
  const sourceNode = audioContext.createMediaElementSource(video);
  const audioDestination = audioContext.createMediaStreamDestination();
  sourceNode.connect(audioDestination);
  if (audioContext.state === "suspended") void audioContext.resume();

  try {
    const canPlay = await waitForEvent(video, "canplay", 15000);
    if (!canPlay) {
      throw new Error(
        "El navegador no pudo leer este video (puede que el códec no esté soportado)",
      );
    }

    const playing = waitForEvent(video, "playing", 10000);
    video.play().catch(() => {});
    if (!(await playing)) {
      video.muted = true;
      const retry = waitForEvent(video, "playing", 10000);
      video.play().catch(() => {});
      if (!(await retry)) {
        throw new Error("No se pudo reproducir el video para comprimirlo");
      }
    }

    const intrinsicWidth = video.videoWidth;
    const intrinsicHeight = video.videoHeight;
    const canvasWidth = Math.max(2, Math.round(width));
    const canvasHeight = Math.max(
      2,
      height > 0
        ? Math.round(height)
        : roundToEven(
            (canvasWidth * Math.max(1, intrinsicHeight)) /
              Math.max(1, intrinsicWidth),
          ),
    );
    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Tu navegador no soporta el procesamiento de video");
    }

    const frameRate = fps > 0 ? Math.min(fps, 60) : 30;
    const stream = canvas.captureStream(frameRate);
    for (const track of audioDestination.stream.getAudioTracks()) {
      stream.addTrack(track);
    }

    const optionsForRecorder: MediaRecorderOptions = {
      videoBitsPerSecond: videoKbps * 1000,
      audioBitsPerSecond: audioKbps * 1000,
    };
    const mimeType = pickVideoMimeType();
    const recorder = mimeType
      ? new MediaRecorder(stream, { ...optionsForRecorder, mimeType })
      : new MediaRecorder(stream, optionsForRecorder);

    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) chunks.push(event.data);
    };
    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });

    const paintFrame = () => {
      const scale = Math.min(
        canvasWidth / Math.max(1, intrinsicWidth),
        canvasHeight / Math.max(1, intrinsicHeight),
      );
      const drawWidth = Math.round(intrinsicWidth * scale);
      const drawHeight = Math.round(intrinsicHeight * scale);
      context.fillStyle = "#000";
      context.fillRect(0, 0, canvasWidth, canvasHeight);
      context.drawImage(
        video,
        Math.round((canvasWidth - drawWidth) / 2),
        Math.round((canvasHeight - drawHeight) / 2),
        drawWidth,
        drawHeight,
      );
    };

    let rafId = 0;
    const drawLoop = () => {
      paintFrame();
      const duration = video.duration;
      if (duration > 0) {
        onProgress(
          Math.min(99, Math.round((video.currentTime / duration) * 100)),
        );
      }
      rafId = requestAnimationFrame(drawLoop);
    };

    paintFrame();
    rafId = requestAnimationFrame(drawLoop);
    recorder.start(1000);

    const durationMs =
      Number.isFinite(video.duration) && video.duration > 0
        ? video.duration * 1000
        : 0;
    const safetyMs = durationMs > 0 ? durationMs + 2000 : 4 * 60 * 60 * 1000;
    const stopTimer = window.setTimeout(() => {
      if (recorder.state !== "inactive") recorder.stop();
    }, safetyMs);
    const stopOnEnd = () => {
      if (recorder.state !== "inactive") recorder.stop();
    };
    video.addEventListener("ended", stopOnEnd);

    await stopped;
    window.clearTimeout(stopTimer);
    video.removeEventListener("ended", stopOnEnd);
    cancelAnimationFrame(rafId);
    onProgress(100);
    return new Blob(chunks, {
      type: mimeType || recorder.mimeType || "video/webm",
    });
  } finally {
    video.pause();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
    audioContext.close().catch(() => {});
  }
}