"use client";

import { VideoPanel } from "@/components/VideoCompressor/VideoPanel";
import { formatBytes } from "@/lib/video/format";

type CompressedResult = {
  url: string;
  name: string;
  size: number;
};

type VideoResultProps = {
  result: CompressedResult;
  originalSize: number;
  onReset: () => void;
};

export function VideoResult({
  result,
  originalSize,
  onReset,
}: VideoResultProps) {
  return (
    <VideoPanel>
      <video
        src={result.url}
        controls
        className="max-h-80 w-full rounded-xl bg-black"
      />
      <div className="mt-4 flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-300">
        <p>
          Original:{" "}
          <strong className="font-medium">{formatBytes(originalSize)}</strong>{" "}
          · Comprimido:{" "}
          <strong className="font-medium">{formatBytes(result.size)}</strong>
        </p>
        <p className="text-xs uppercase tracking-wide text-zinc-400">
          {result.name}
        </p>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a
          href={result.url}
          download={result.name}
          className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500"
        >
          Descargar video
        </a>
        <button
          type="button"
          className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
          onClick={onReset}
        >
          Procesar otro video
        </button>
      </div>
    </VideoPanel>
  );
}