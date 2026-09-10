"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { DropZone } from "@/components/DropZone/DropZone";
import { OUTPUT_LABELS } from "@/lib/constants";
import { compressImageFile } from "@/lib/compress/compressWithLibrary";
import { convertOneFile } from "@/lib/convert/convertOneFile";
import { triggerDownload } from "@/lib/download/triggerDownload";
import { zipNamedBlobs } from "@/lib/zip/zipResults";
import type { FileJob, ImageMode, OutputTarget } from "@/types/model";

const OUTPUT_OPTIONS: OutputTarget[] = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
];

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

type ImageConverterPanelProps = {
  mode: ImageMode;
};

export function ImageConverterPanel({ mode }: ImageConverterPanelProps) {
  const [jobs, setJobs] = useState<FileJob[]>([]);
  const [target, setTarget] = useState<OutputTarget>("image/webp");
  const [busy, setBusy] = useState(false);
  const jobsRef = useRef<FileJob[]>([]);

  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  const doneJobs = useMemo(
    () =>
      jobs.filter(
        (j) => j.status === "done" && j.resultBlob && j.resultName,
      ),
    [jobs],
  );

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

  const runConvert = useCallback(async () => {
    setBusy(true);
    const queue = jobsRef.current.filter((j) => j.status !== "done");
    for (const job of queue) {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === job.id ? { ...j, status: "processing" } : j,
        ),
      );
      try {
        const { blob, filename } = await convertOneFile(job.file, target);
        setJobs((prev) =>
          prev.map((j) =>
            j.id === job.id
              ? {
                  ...j,
                  status: "done",
                  resultBlob: blob,
                  resultName: filename,
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
              ? { ...j, status: "error", errorMessage: message }
              : j,
          ),
        );
      }
    }
    setBusy(false);
  }, [target]);

  const runCompress = useCallback(async () => {
    setBusy(true);
    const queue = jobsRef.current.filter((j) => j.status !== "done");
    for (const job of queue) {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === job.id ? { ...j, status: "processing" } : j,
        ),
      );
      try {
        const compressed = await compressImageFile(job.file);
        setJobs((prev) =>
          prev.map((j) =>
            j.id === job.id
              ? {
                  ...j,
                  status: "done",
                  resultBlob: compressed,
                  resultName: `comprimido-${compressed.name}`,
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
              ? { ...j, status: "error", errorMessage: message }
              : j,
          ),
        );
      }
    }
    setBusy(false);
  }, []);

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
    <>
      <DropZone onFiles={addFiles} disabled={busy} />

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
            cuando el navegador lo permite. PDF usa JPEG optimizado dentro del
            documento.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200/80 bg-white/80 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50">
          <p className="text-sm text-zinc-700 dark:text-zinc-200">
            Sube uno o varios <strong className="font-medium">PNG</strong> o{" "}
            <strong className="font-medium">JPG</strong> y pulsa procesar: se
            comprimen solos,{" "}
            <strong className="font-medium">sin cambiar píxeles</strong> (mismo
            ancho y alto que el original).
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={mode === "convert" ? runConvert : runCompress}
          disabled={busy || jobs.length === 0}
          aria-label={
            mode === "convert"
              ? "Procesar conversión de archivos"
              : "Procesar compresión de archivos"
          }
        >
          {busy ? "Procesando…" : "Procesar archivos"}
        </button>
        <button
          type="button"
          className="cursor-pointer rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
          onClick={clearAll}
          disabled={busy || jobs.length === 0}
          aria-label="Vaciar lista de archivos"
        >
          Vaciar lista
        </button>
        {doneJobs.length > 1 ? (
          <button
            type="button"
            className="cursor-pointer rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-900 transition hover:bg-teal-100 disabled:opacity-50 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-100 dark:hover:bg-teal-900/60"
            onClick={() => void downloadZip()}
            disabled={busy || doneJobs.length < 2}
            aria-label="Descargar todos los archivos en un ZIP"
          >
            Descargar ZIP
          </button>
        ) : null}
      </div>

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
                        {formatSizeChange(job.file.size, job.resultBlob.size)} ·{" "}
                        <span className="uppercase">{job.status}</span>
                      </>
                    ) : (
                      <>
                        {formatBytes(job.file.size)} ·{" "}
                        <span className="uppercase">{job.status}</span>
                      </>
                    )}
                    {job.errorMessage ? ` · ${job.errorMessage}` : null}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {job.status === "done" && job.resultBlob && job.resultName ? (
                    <button
                      type="button"
                      className="cursor-pointer rounded-xl bg-zinc-900 px-3 py-2 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
                      onClick={() => downloadOne(job)}
                      aria-label={`Descargar ${job.resultName}`}
                    >
                      Descargar
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="cursor-pointer rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
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
  );
}
