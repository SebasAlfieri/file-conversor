"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";

import { filenameFromContentDisposition } from "@/lib/download/filenameFromContentDisposition";
import { triggerDownload } from "@/lib/download/triggerDownload";
import type { YoutubeDownloadFormat } from "@/types/model";

export function YouTubeDownloader() {
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<YoutubeDownloadFormat>("mp4");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Pega primero el enlace del video.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/youtube/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed, format }),
      });

      if (!res.ok) {
        let message = `Error ${res.status}`;
        try {
          const data = (await res.json()) as { error?: string };
          if (data.error) message = data.error;
        } catch {
          const text = await res.text();
          if (text) message = text.slice(0, 200);
        }
        setError(message);
        return;
      }

      const blob = await res.blob();
      const fromHeader = filenameFromContentDisposition(
        res.headers.get("content-disposition"),
      );
      const fallback =
        format === "mp3" ? "audio-youtube.mp3" : "video-youtube.mp4";
      triggerDownload(blob, fromHeader ?? fallback);
    } catch {
      setError("No se pudo completar la descarga. Revisa la conexión.");
    } finally {
      setLoading(false);
    }
  }, [format, url]);

  return (
    <motion.div
      layout
      className="space-y-5 rounded-2xl border border-zinc-200/80 bg-white/80 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50"
    >
      <label className="flex flex-col gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-100">
        Enlace de YouTube
        <input
          type="url"
          inputMode="url"
          placeholder="https://www.youtube.com/watch?v=…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
          className="cursor-text rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-teal-500/30 focus:ring-2 disabled:cursor-not-allowed dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          autoComplete="off"
          spellCheck={false}
        />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
          Qué descargar
        </legend>
        <div className="flex flex-wrap gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
            <input
              type="radio"
              name="yt-format"
              checked={format === "mp4"}
              onChange={() => setFormat("mp4")}
              disabled={loading}
              className="cursor-pointer accent-teal-600 disabled:cursor-not-allowed"
            />
            Video MP4 (imagen + sonido)
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
            <input
              type="radio"
              name="yt-format"
              checked={format === "mp3"}
              onChange={() => setFormat("mp3")}
              disabled={loading}
              className="cursor-pointer accent-teal-600 disabled:cursor-not-allowed"
            />
            Solo audio MP3
          </label>
        </div>
      </fieldset>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        className="inline-flex w-full cursor-pointer items-center justify-center rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        onClick={() => void download()}
        disabled={loading || !url.trim()}
        aria-label="Descargar desde YouTube"
      >
        {loading ? "Preparando descarga…" : "Descargar"}
      </button>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Solo para uso personal y contenido del que tengas derechos. YouTube
        cambia a menudo su sistema: si un enlace falla, prueba otro o más tarde.
        El MP4 usa el mejor formato con vídeo y audio juntos; el MP3 se genera
        en el servidor con ffmpeg.
      </p>
    </motion.div>
  );
}
