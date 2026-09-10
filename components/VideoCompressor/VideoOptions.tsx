"use client";

import {
  AUDIO_BITRATE_OPTIONS,
  VIDEO_QUALITY_LABELS,
} from "@/lib/video/presets";
import { CardLabel, VideoPanel } from "@/components/VideoCompressor/VideoPanel";
import { formatBytes, formatDuration, formatMbps } from "@/lib/video/format";
import type { VideoProbe, VideoQuality } from "@/types/model";

type VideoOptionsProps = {
  info: VideoProbe;
  width: number;
  height: number;
  quality: VideoQuality;
  audioBitrateKbps: number;
  videoKbps: number;
  estimatedBytes: number;
  isCapped: boolean;
  minSliderWidth: number;
  maxSliderWidth: number;
  busy: boolean;
  error: string | null;
  onWidthChange: (width: number) => void;
  onQualityChange: (quality: VideoQuality) => void;
  onAudioChange: (bitrateKbps: number) => void;
  onCompress: () => void;
  onReset: () => void;
};

const selectClassName =
  "cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-inner outline-none ring-teal-500/30 focus:ring-2 disabled:cursor-not-allowed dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

export function VideoOptions({
  info,
  width,
  height,
  quality,
  audioBitrateKbps,
  videoKbps,
  estimatedBytes,
  isCapped,
  minSliderWidth,
  maxSliderWidth,
  busy,
  error,
  onWidthChange,
  onQualityChange,
  onAudioChange,
  onCompress,
  onReset,
}: VideoOptionsProps) {
  const reductionPct =
    estimatedBytes > 0 && info.size > 0
      ? Math.max(0, Math.round((1 - estimatedBytes / info.size) * 100))
      : 0;

  return (
    <>
      <VideoPanel>
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              Propiedades detectadas
            </h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm text-zinc-700 dark:text-zinc-200 sm:grid-cols-3">
              <div>
                <CardLabel>Duración</CardLabel>
                <dd>{formatDuration(info.duration)}</dd>
              </div>
              <div>
                <CardLabel>Resolución</CardLabel>
                <dd>
                  {info.width}×{info.height}
                </dd>
              </div>
              <div>
                <CardLabel>FPS</CardLabel>
                <dd>{info.fps || "—"}</dd>
              </div>
              <div>
                <CardLabel>Códec</CardLabel>
                <dd>{info.videoCodec}</dd>
              </div>
              <div>
                <CardLabel>Audio</CardLabel>
                <dd>{info.audioCodec ?? "Sin audio"}</dd>
              </div>
              <div>
                <CardLabel>Tamaño</CardLabel>
                <dd>{formatBytes(info.size)}</dd>
              </div>
            </dl>
          </div>

          <div className="border-t border-zinc-200/80 pt-4 dark:border-zinc-800">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                Opciones de compresión
              </h2>
              <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-medium text-teal-800 dark:bg-teal-900/40 dark:text-teal-200">
                Recomendado óptimo
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-4">
              <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-100">
                Resolución horizontal
                <input
                  type="range"
                  min={minSliderWidth}
                  max={maxSliderWidth}
                  step={16}
                  value={Math.min(width, maxSliderWidth)}
                  onChange={(event) => onWidthChange(Number(event.target.value))}
                  disabled={busy}
                  className="accent-teal-600"
                  aria-label="Resolución horizontal de salida"
                />
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Resultado: {width || "—"}×{height || "—"} px · horizontal{" "}
                  <strong className="font-medium">{width || "—"} px</strong>
                </span>
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-100">
                Calidad de video
                <select
                  value={quality}
                  onChange={(event) =>
                    onQualityChange(event.target.value as VideoQuality)
                  }
                  disabled={busy}
                  className={selectClassName}
                >
                  {(Object.keys(VIDEO_QUALITY_LABELS) as VideoQuality[]).map(
                    (key) => (
                      <option key={key} value={key}>
                        {VIDEO_QUALITY_LABELS[key]}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-100">
                Bitrate de audio
                <select
                  value={audioBitrateKbps}
                  onChange={(event) => onAudioChange(Number(event.target.value))}
                  disabled={busy}
                  className={selectClassName}
                >
                  {AUDIO_BITRATE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option} kbps
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>
      </VideoPanel>

      <VideoPanel>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Peso estimado
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm text-zinc-700 dark:text-zinc-200 sm:grid-cols-4">
          <div>
            <CardLabel>Salida</CardLabel>
            <dd>
              {width}×{height}
            </dd>
          </div>
          <div>
            <CardLabel>Códec</CardLabel>
            <dd>H.264 + AAC</dd>
          </div>
          <div>
            <CardLabel>Bitrate video</CardLabel>
            <dd>{videoKbps ? formatMbps(videoKbps) : "—"}</dd>
          </div>
          <div>
            <CardLabel>Bitrate audio</CardLabel>
            <dd>{audioBitrateKbps} kbps</dd>
          </div>
          <div className="col-span-2">
            <CardLabel>Peso aprox.</CardLabel>
            <dd className="text-lg font-semibold text-teal-600 dark:text-teal-300">
              {estimatedBytes ? formatBytes(estimatedBytes) : "—"}
            </dd>
          </div>
          {info.size > 0 && estimatedBytes > 0 ? (
            <div className="col-span-2">
              <CardLabel>Reducción</CardLabel>
              <dd className="text-lg font-semibold text-teal-600 dark:text-teal-300">
                {reductionPct > 0 ? `−${reductionPct}%` : "Similar"}
              </dd>
            </div>
          ) : null}
        </dl>
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          Estimación basada en la duración y el bitrate elegidos. El peso real
          puede variar un poco.
        </p>
        {isCapped ? (
          <p className="mt-1 text-xs font-medium text-teal-700 dark:text-teal-300">
            Se limita el bitrate al del original para que el resultado siempre
            pese menos.
          </p>
        ) : null}
      </VideoPanel>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onCompress}
          disabled={busy || height <= 0}
          className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Comprimir el video con las opciones elegidas"
        >
          {busy ? "Comprimiendo…" : "Comprimir video"}
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={busy}
          className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          Cambiar video
        </button>
      </div>
    </>
  );
}