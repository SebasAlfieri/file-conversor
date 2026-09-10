"use client";

import { useState } from "react";

import { ImageConverterPanel } from "@/components/ImageConverterPanel/ImageConverterPanel";
import { YouTubeDownloader } from "@/components/YouTubeDownloader/YouTubeDownloader";
import type { AppMode, ImageMode } from "@/types/model";

export function FileConverter() {
  const [mode, setMode] = useState<AppMode>("convert");
  const imageMode: ImageMode =
    mode === "compress" ? "compress" : "convert";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 py-12">
      <header className="space-y-3 text-center sm:text-left">
        <p className="text-sm font-medium uppercase tracking-widest text-teal-600 dark:text-teal-300">
          {mode === "youtube"
            ? "YouTube · Proceso en servidor"
            : "Gratis · En tu navegador"}
        </p>
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
          {mode === "youtube"
            ? "Descarga audio o video desde un enlace de YouTube"
            : "Convierte y comprime imágenes sin subirlas a ningún servidor"}
        </h1>
        <p className="text-pretty text-zinc-600 dark:text-zinc-400">
          {mode === "youtube" ? (
            <>
              Elige MP3 (solo sonido) o MP4 (vídeo con audio). Respeta derechos
              de autor y los términos de YouTube.
            </>
          ) : (
            <>
              Elige formato de salida: la optimización es automática (similar
              a TinyPNG: busca un archivo más liviano manteniendo buena
              apariencia). Varios archivos a la vez; con varios resultados
              puedes bajar un ZIP.
            </>
          )}
        </p>
      </header>

      <div
        className="flex flex-wrap gap-2 rounded-2xl border border-zinc-200/80 bg-white/70 p-1 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/60"
        role="tablist"
        aria-label="Modo de trabajo"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "convert"}
          className={`min-w-[7rem] flex-1 cursor-pointer rounded-xl px-3 py-2 text-sm font-medium transition ${
            mode === "convert"
              ? "bg-teal-600 text-white shadow-sm"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
          }`}
          onClick={() => setMode("convert")}
        >
          Convertir
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "compress"}
          className={`min-w-[7rem] flex-1 cursor-pointer rounded-xl px-3 py-2 text-sm font-medium transition ${
            mode === "compress"
              ? "bg-teal-600 text-white shadow-sm"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
          }`}
          onClick={() => setMode("compress")}
        >
          Comprimir
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "youtube"}
          className={`min-w-[7rem] flex-1 cursor-pointer rounded-xl px-3 py-2 text-sm font-medium transition ${
            mode === "youtube"
              ? "bg-teal-600 text-white shadow-sm"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
          }`}
          onClick={() => setMode("youtube")}
        >
YouTube downloader
        </button>
      </div>

      {mode === "youtube" ? (
        <YouTubeDownloader />
      ) : (
      <ImageConverterPanel key={imageMode} mode={imageMode} />
      )}
    </div>
  );
}
