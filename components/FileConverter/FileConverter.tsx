"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { DropZone } from "@/components/DropZone/DropZone";
import { VideoCompressor } from "@/components/VideoCompressor/VideoCompressor";
import { YouTubeDownloader } from "@/components/YouTubeDownloader/YouTubeDownloader";
import {
  ACCEPT_IMAGE_AND_SVG,
  ACCEPT_PDF,
  OUTPUT_LABELS,
} from "@/lib/constants";
import { compressImageFile } from "@/lib/compress/compressWithLibrary";
import { compressPdfFile } from "@/lib/compress/compressPdf";
import { convertOneFile } from "@/lib/convert/convertOneFile";
import { triggerDownload } from "@/lib/download/triggerDownload";
import { zipNamedBlobs } from "@/lib/zip/zipResults";
import type { AppMode, FileJob, OutputTarget } from "@/types/model";

const OUTPUT_OPTIONS: OutputTarget[] = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
];

type ProcessResult = {
  blob: Blob;
  filename: string;
};

type ProgressCallback = (progress: number) => void;

function clampProgress(progress: number): number {
  return Math.max(0, Math.min(100, Math.round(progress)));
}

function ProgressBar({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  const progress = clampProgress(value);

  return (
    <div className="space-y-1" aria-label={label}>
      <div className="flex items-center justify-between gap-3 text-xs font-medium text-zinc-500 dark:text-zinc-400">
        <span>{label}</span>
        <span>{progress}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <div
          className="h-full rounded-full bg-teal-500 transition-[width] duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function formatSizeChange(original: number, result: number): string {
  if (result >= original) {
    return `${formatBytes(original)} → ${formatBytes(result)}`;
  }
  const pct = Math.round((1 - result / original) * 100);
  return `${formatBytes(original)} → ${formatBytes(result)} (−${pct}%)`;
}

function makeJobs(files: File[]): FileJob[] {
  return files.map((file) => ({
    id: crypto.randomUUID(),
    file,
    status: "pending" as const,
    progress: 0,
  }));
}

export function FileConverter() {
  const [mode, setMode] = useState<AppMode>("compress");
  const [jobs, setJobs] = useState<FileJob[]>([]);
  const [target, setTarget] = useState<OutputTarget>("image/webp");
  const [busy, setBusy] = useState(false);
  const jobsRef = useRef<FileJob[]>([]);

  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  const doneJobs = useMemo(
    () =>
      jobs.filter((j) => j.status === "done" && j.resultBlob && j.resultName),
    [jobs],
  );

  const totalProgress = useMemo(() => {
    if (!jobs.length) return 0;
    const sum = jobs.reduce((acc, job) => acc + job.progress, 0);
    return Math.round(sum / jobs.length);
  }, [jobs]);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const list = Array.from(incoming).filter((f) => f.size > 0);
    if (!list.length) return;
    setJobs((prev) => [...prev, ...makeJobs(list)]);
  }, []);

  const clearAll = useCallback(() => {
    setJobs([]);
  }, []);

  const removeJob = useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  const processPendingJobs = useCallback(
    async (
      processFile: (
        file: File,
        onProgress: ProgressCallback,
      ) => Promise<ProcessResult>,
    ) => {
      setBusy(true);
      const queue = jobsRef.current.filter((j) => j.status !== "done");
      const queueIds = new Set(queue.map((job) => job.id));
      setJobs((prev) =>
        prev.map((job) =>
          queueIds.has(job.id)
            ? {
                ...job,
                progress: 0,
                errorMessage: undefined,
                resultBlob: undefined,
                resultName: undefined,
              }
            : job,
        ),
      );

      for (const job of queue) {
        const updateProgress = (progress: number) => {
          const nextProgress = clampProgress(progress);
          setJobs((prev) =>
            prev.map((j) =>
              j.id === job.id ? { ...j, progress: nextProgress } : j,
            ),
          );
        };

        setJobs((prev) =>
          prev.map((j) =>
            j.id === job.id
              ? { ...j, status: "processing", progress: 1 }
              : j,
          ),
        );
        try {
          const { blob, filename } = await processFile(job.file, updateProgress);
          setJobs((prev) =>
            prev.map((j) =>
              j.id === job.id
                ? {
                    ...j,
                    status: "done",
                    resultBlob: blob,
                    resultName: filename,
                    progress: 100,
                    errorMessage: undefined,
                  }
                : j,
            ),
          );
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Error desconocido";
          setJobs((prev) =>
            prev.map((j) =>
              j.id === job.id
                ? {
                    ...j,
                    status: "error",
                    progress: 100,
                    errorMessage: message,
                  }
                : j,
            ),
          );
        }
      }
      setBusy(false);
    },
    [],
  );

  const runConvert = useCallback(async () => {
    await processPendingJobs(async (file, onProgress) => {
      onProgress(10);
      const result = await convertOneFile(file, target);
      onProgress(95);
      return result;
    });
  }, [processPendingJobs, target]);

  const runCompress = useCallback(async () => {
    await processPendingJobs(async (file, onProgress) => {
      const compressed = await compressImageFile(file, onProgress);
      return {
        blob: compressed,
        filename: `comprimido-${compressed.name}`,
      };
    });
  }, [processPendingJobs]);

  const runCompressPdf = useCallback(async () => {
    await processPendingJobs(async (file, onProgress) => {
      const compressed = await compressPdfFile(file, onProgress);
      return {
        blob: compressed,
        filename: `comprimido-${compressed.name}`,
      };
    });
  }, [processPendingJobs]);

  const downloadOne = useCallback((job: FileJob) => {
    if (!job.resultBlob || !job.resultName) return;
    triggerDownload(job.resultBlob, job.resultName);
  }, []);

  const downloadZip = useCallback(async () => {
    const entries = doneJobs
      .map((j) =>
        j.resultBlob && j.resultName
          ? { name: j.resultName, blob: j.resultBlob }
          : null,
      )
      .filter(Boolean) as { name: string; blob: Blob }[];
    if (!entries.length) return;
    const zipBlob = await zipNamedBlobs(entries);
    triggerDownload(zipBlob, `resultados-${Date.now()}.zip`);
  }, [doneJobs]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 py-12">
      <header className="space-y-3 text-center sm:text-left">
        <p className="text-sm font-medium uppercase tracking-widest text-teal-600 dark:text-teal-300">
          {mode === "youtube"
            ? "YouTube · Proceso en servidor"
            : "Gratis · En tu navegador"}
        </p>
        <h1 className="text-balance text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
          {mode === "youtube"
            ? "Descarga audio o video desde un enlace de YouTube"
            : mode === "compressVideo"
              ? "Comprime videos manteniendo calidad y proporción"
              : "Convierte y comprime imágenes sin subirlas a ningún servidor"}
        </h1>
        <p className="text-pretty text-zinc-600 dark:text-zinc-400">
          {mode === "youtube" ? (
            <>
              Elige MP3 (solo sonido) o MP4 (vídeo con audio). Respeta derechos
              de autor y los términos de YouTube.
            </>
          ) : mode === "compressVideo" ? (
            <>
              Sube tu video y detectamos resolución y propiedades: elige calidad y el ancho
              horizontal —manteniendo siempre la proporción— y mira cuánto pesará
              antes de comprimir. Todo ocurre en tu dispositivo, sin subir el
              video a ningún servidor.
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
          aria-selected={mode === "compress"}
          className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
            mode === "compress"
              ? "bg-teal-600 text-white shadow-sm"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
          }`}
          onClick={() => {
            setMode("compress");
            setJobs([]);
          }}
        >
          Comprimir PNG / JPG
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "convert"}
          className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
            mode === "convert"
              ? "bg-teal-600 text-white shadow-sm"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
          }`}
          onClick={() => {
            setMode("convert");
            setJobs([]);
          }}
        >
          Convertir
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "compressPdf"}
          className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
            mode === "compressPdf"
              ? "bg-teal-600 text-white shadow-sm"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
          }`}
          onClick={() => {
            setMode("compressPdf");
            setJobs([]);
          }}
        >
          Comprimir PDF
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "compressVideo"}
          className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
            mode === "compressVideo"
              ? "bg-teal-600 text-white shadow-sm"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
          }`}
          onClick={() => {
            setMode("compressVideo");
            setJobs([]);
          }}
        >
          Comprimir Video
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "youtube"}
          className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
            mode === "youtube"
              ? "bg-teal-600 text-white shadow-sm"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
          }`}
          onClick={() => {
            setMode("youtube");
            setJobs([]);
          }}
        >
          YouTube downloader
        </button>
      </div>

      {mode === "compressVideo" ? (
        <VideoCompressor />
      ) : mode === "youtube" ? (
        <YouTubeDownloader />
      ) : (
        <>
          <DropZone
            onFiles={addFiles}
            disabled={busy}
            accept={mode === "compressPdf" ? ACCEPT_PDF : ACCEPT_IMAGE_AND_SVG}
            title={
              mode === "compressPdf"
                ? "Arrastra PDF aquí"
                : "Arrastra imágenes aquí"
            }
            description="o toca para elegir archivos en tu explorador (varios a la vez)"
          />

          {mode === "convert" ? (
            <div className="rounded-2xl border border-zinc-200/80 bg-white/80 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50">
              <label className="flex max-w-md flex-col gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-100">
                Formato de salida
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value as OutputTarget)}
                  className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-inner outline-none ring-teal-500/30 focus:ring-2 disabled:cursor-not-allowed dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  disabled={busy}
                >
                  {OUTPUT_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {OUTPUT_LABELS[value]}
                    </option>
                  ))}
                </select>
              </label>
              <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                JPG y WebP se comprimen de forma agresiva; PNG también se reduce
                cuando el navegador lo permite. PDF usa JPEG optimizado dentro
                del documento.
              </p>
            </div>
          ) : mode === "compress" ? (
            <div className="rounded-2xl border border-zinc-200/80 bg-white/80 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50">
              <p className="text-sm text-zinc-700 dark:text-zinc-200">
                Sube uno o varios <strong className="font-medium">PNG</strong> o{" "}
                <strong className="font-medium">JPG</strong> y pulsa procesar: se
                comprimen solos,{" "}
                <strong className="font-medium">sin cambiar píxeles</strong>{" "}
                (mismo ancho y alto que el original).
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-200/80 bg-white/80 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50">
              <p className="text-sm text-zinc-700 dark:text-zinc-200">
                Sube uno o varios <strong className="font-medium">PDF</strong> y
                pulsa procesar: se optimizan en tu navegador para intentar
                reducir el peso del archivo sin subirlo a ningún servidor.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={
                mode === "convert"
                  ? runConvert
                  : mode === "compressPdf"
                    ? runCompressPdf
                    : runCompress
              }
              disabled={busy || jobs.length === 0}
              aria-label={
                mode === "convert"
                  ? "Procesar conversión de archivos"
                  : mode === "compressPdf"
                    ? "Procesar compresión de PDF"
                    : "Procesar compresión de archivos"
              }
            >
              {busy ? "Procesando…" : "Procesar archivos"}
            </button>
            <button
              type="button"
              className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
              onClick={clearAll}
              disabled={busy || jobs.length === 0}
              aria-label="Vaciar lista de archivos"
            >
              Vaciar lista
            </button>
            {doneJobs.length > 1 ? (
              <button
                type="button"
                className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-900 transition hover:bg-teal-100 disabled:opacity-50 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-100 dark:hover:bg-teal-900/60"
                onClick={() => void downloadZip()}
                disabled={busy || doneJobs.length < 2}
                aria-label="Descargar todos los archivos en un ZIP"
              >
                Descargar ZIP
              </button>
            ) : null}
          </div>

          {jobs.length > 0 ? (
            <div className="rounded-2xl border border-zinc-200/80 bg-white/80 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50">
              <ProgressBar value={totalProgress} label="Progreso total" />
            </div>
          ) : null}

          <AnimatePresence initial={false}>
            {jobs.length > 0 ? (
              <motion.ul
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="space-y-3"
                aria-live="polite"
              >
                {jobs.map((job) => (
                  <motion.li
                    key={job.id}
                    layout
                    className="flex flex-col gap-3 rounded-2xl border border-zinc-200/90 bg-white/90 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/70 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {job.file.name}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {job.status === "done" && job.resultBlob ? (
                          <>
                            {formatSizeChange(job.file.size, job.resultBlob.size)}{" "}
                            · <span className="uppercase">{job.status}</span>
                          </>
                        ) : (
                          <>
                            {formatBytes(job.file.size)} ·{" "}
                            <span className="uppercase">{job.status}</span>
                          </>
                        )}
                        {job.errorMessage ? ` · ${job.errorMessage}` : null}
                      </p>
                      <ProgressBar value={job.progress} label="Progreso" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {job.status === "done" && job.resultBlob && job.resultName ? (
                        <button
                          type="button"
                          className="rounded-xl bg-zinc-900 px-3 py-2 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
                          onClick={() => downloadOne(job)}
                          aria-label={`Descargar ${job.resultName}`}
                        >
                          Descargar
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                        onClick={() => removeJob(job.id)}
                        disabled={busy}
                        aria-label={`Quitar ${job.file.name} de la lista`}
                      >
                        Quitar
                      </button>
                    </div>
                  </motion.li>
                ))}
              </motion.ul>
            ) : null}
          </AnimatePresence>

          <p className="text-center text-xs text-zinc-500 dark:text-zinc-500 sm:text-left">
            Los GIF animados se convierten usando el primer fotograma. Todo el
            procesamiento ocurre en tu dispositivo; no almacenamos tus archivos.
          </p>
        </>
      )}
    </div>
  );
}