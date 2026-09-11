"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { DropZone } from "@/components/DropZone/DropZone";
import { VideoOptions } from "@/components/VideoCompressor/VideoOptions";
import { VideoResult } from "@/components/VideoCompressor/VideoResult";
import { VideoPanel } from "@/components/VideoCompressor/VideoPanel";
import { ACCEPT_VIDEO } from "@/lib/constants";
import {
  compressVideoInBrowser,
  containerExtension,
  detectVideoInfo,
  mimeContainerLabel,
  pickVideoMimeType,
} from "@/lib/video/browser";
import {
  capVideoKbps,
  estimatedSizeBytes,
  recommendOutputWidth,
  roundToEven,
  sourceEffectiveBitrateKbps,
  videoKbpsForTarget,
  widthToHeight,
} from "@/lib/video/presets";
import type { VideoProbe, VideoQuality } from "@/types/model";

type CompressedResult = {
  url: string;
  name: string;
  size: number;
};

export function VideoCompressor() {
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<VideoProbe | null>(null);
  const [probing, setProbing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quality, setQuality] = useState<VideoQuality>("recomendado");
  const [width, setWidth] = useState(0);
  const [audioBitrateKbps, setAudioBitrateKbps] = useState(128);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<CompressedResult | null>(null);
  const urlRef = useRef<string | null>(null);

  const revokeUrl = useCallback((url: string | null) => {
    if (url) URL.revokeObjectURL(url);
  }, []);

  useEffect(
    () => () => {
      revokeUrl(urlRef.current);
    },
    [revokeUrl],
  );

  const reset = useCallback(() => {
    setResult((prev) => {
      revokeUrl(prev?.url ?? null);
      return null;
    });
    setFile(null);
    setInfo(null);
    setError(null);
    setBusy(false);
    setProgress(0);
    setWidth(0);
    setQuality("recomendado");
    setAudioBitrateKbps(128);
  }, [revokeUrl]);

  const handleFiles = useCallback(
    async (incoming: FileList | File[]) => {
      if (busy) return;
      const next = Array.from(incoming).find((f) => f.size > 0);
      if (!next) return;
      reset();
      setFile(next);
      setProbing(true);
      setError(null);
      try {
        const data = await detectVideoInfo(next);
        setInfo(data);
        setWidth(recommendOutputWidth(data.width, data.height));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "No se pudo analizar el video",
        );
        setFile(null);
      } finally {
        setProbing(false);
      }
    },
    [busy, reset],
  );

  const aspect =
    info && info.width > 0 && info.height > 0 ? info.width / info.height : 0;
  const height = aspect && width > 0 ? widthToHeight(width, aspect) : 0;
  const sourceKbps = info
    ? sourceEffectiveBitrateKbps(info.size, info.duration) ||
      info.bitrateKbps
    : 0;
  const videoKbps =
    info && height > 0 ? videoKbpsForTarget(height, quality, sourceKbps) : 0;
  const isCapped =
    sourceKbps > 0 && videoKbps >= capVideoKbps(sourceKbps) - 1;
  const estimatedBytes =
    info && videoKbps > 0
      ? estimatedSizeBytes(videoKbps, audioBitrateKbps, info.duration)
      : 0;
  const maxSliderWidth = info ? Math.max(160, roundToEven(info.width)) : 160;
  const mimeType = pickVideoMimeType();
  const codecLabel = mimeContainerLabel(mimeType);

  const handleCompress = useCallback(async () => {
    if (!file || !info || busy || height <= 0) return;
    if (!mimeType) {
      setError("Tu navegador no soporta la compresión de video");
      return;
    }
    setBusy(true);
    setError(null);
    let attemptKbps = videoKbps;
    let blob: Blob | null = null;
    try {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        setProgress(0);
        blob = await compressVideoInBrowser(file, {
          width,
          height,
          videoKbps: attemptKbps,
          audioKbps: audioBitrateKbps,
          fps: info.fps,
          onProgress: setProgress,
        });
        if (blob.size < file.size || attempt === 1) break;
        attemptKbps = Math.max(96, Math.round(attemptKbps * 0.65));
      }
      if (!blob) return;
      const baseName = file.name.replace(/\.[^.]+$/, "");
      const name = `Comprimido-${baseName}-${width}x${height}.${containerExtension(mimeType)}`;
      if (urlRef.current) revokeUrl(urlRef.current);
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      setResult({ url, name, size: blob.size });
    } catch (err) {
      setError(err instanceof Error ? err.message : "La compresión falló");
    } finally {
      setBusy(false);
      setProgress(0);
    }
  }, [
    audioBitrateKbps,
    busy,
    file,
    height,
    info,
    mimeType,
    revokeUrl,
    videoKbps,
    width,
  ]);

  return (
    <div className="flex flex-col gap-5">
      {!file && !probing ? (
        <DropZone
          onFiles={handleFiles}
          disabled={busy}
          accept={ACCEPT_VIDEO}
          title="Arrastra un video aquí"
          description="o toca para elegirlo en tu explorador; se analiza y comprime localmente, sin subirlo a ningún servidor"
        />
      ) : probing ? (
        <VideoPanel>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Analizando video…
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Detectando resolución, duración y fps con el navegador.
          </p>
        </VideoPanel>
      ) : info ? (
        result ? (
          <VideoResult
            result={result}
            originalSize={info.size}
            onReset={reset}
          />
        ) : (
          <VideoOptions
            info={info}
            width={width}
            height={height}
            quality={quality}
            audioBitrateKbps={audioBitrateKbps}
            videoKbps={videoKbps}
            estimatedBytes={estimatedBytes}
            isCapped={isCapped}
            codecLabel={codecLabel}
            progress={progress}
            minSliderWidth={160}
            maxSliderWidth={maxSliderWidth}
            busy={busy}
            error={error}
            onWidthChange={setWidth}
            onQualityChange={setQuality}
            onAudioChange={setAudioBitrateKbps}
            onCompress={() => void handleCompress()}
            onReset={reset}
          />
        )
      ) : (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error ?? "No se pudo cargar el video."}
        </p>
      )}
    </div>
  );
}