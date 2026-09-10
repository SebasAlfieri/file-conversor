"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { DropZone } from "@/components/DropZone/DropZone";
import { VideoOptions } from "@/components/VideoCompressor/VideoOptions";
import { VideoResult } from "@/components/VideoCompressor/VideoResult";
import { VideoPanel } from "@/components/VideoCompressor/VideoPanel";
import { ACCEPT_VIDEO } from "@/lib/constants";
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

function parseDownloadFilename(header: string | null): string | null {
  if (!header) return null;
  const utfFallback = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utfFallback) return decodeURIComponent(utfFallback[1]);
  const plain = /filename="([^"]+)"/i.exec(header);
  return plain ? plain[1] : null;
}

export function VideoCompressor() {
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<VideoProbe | null>(null);
  const [probing, setProbing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quality, setQuality] = useState<VideoQuality>("recomendado");
  const [width, setWidth] = useState(0);
  const [audioBitrateKbps, setAudioBitrateKbps] = useState(128);
  const [busy, setBusy] = useState(false);
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
        const form = new FormData();
        form.append("file", next);
        const res = await fetch("/api/video/probe", {
          method: "POST",
          body: form,
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          throw new Error(payload?.error ?? `Error ${res.status}`);
        }
        const data = (await res.json()) as VideoProbe;
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

  const handleCompress = useCallback(async () => {
    if (!file || !info || busy || height <= 0) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    form.append("width", String(width));
    form.append("videoBitrateKbps", String(videoKbps));
    form.append("audioBitrateKbps", String(audioBitrateKbps));
    form.append("hasAudio", info.audioCodec ? "1" : "0");
    form.append("durationSeconds", String(info.duration));
    try {
      const res = await fetch("/api/video/compress", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error ?? `Error ${res.status}`);
      }
      const blob = await res.blob();
      const name =
        parseDownloadFilename(res.headers.get("Content-Disposition")) ??
        "video-comprimido.mp4";
      if (urlRef.current) revokeUrl(urlRef.current);
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      setResult({ url, name, size: blob.size });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "La compresión falló",
      );
    } finally {
      setBusy(false);
    }
  }, [
    audioBitrateKbps,
    busy,
    file,
    height,
    info,
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
          description="o toca para elegirlo en tu explorador; detectamos sus propiedades al subirlo"
        />
      ) : probing ? (
        <VideoPanel>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Analizando video…
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Detectando resolución, duración y propiedades.
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