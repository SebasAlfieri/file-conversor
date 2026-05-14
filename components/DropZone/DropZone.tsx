"use client";

import { useCallback, useState, type DragEvent } from "react";
import { motion } from "framer-motion";

import { ACCEPT_IMAGE_AND_SVG } from "@/lib/constants";

type DropZoneProps = {
  onFiles: (files: FileList | File[]) => void;
  disabled?: boolean;
};

export function DropZone({ onFiles, disabled }: DropZoneProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled) setDragActive(true);
  }, [disabled]);

  const handleDragLeave = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setDragActive(false);
      if (disabled) return;
      const { files } = event.dataTransfer;
      if (files?.length) onFiles(files);
    },
    [disabled, onFiles],
  );

  return (
    <motion.div
      layout
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      data-active={dragActive ? "true" : "false"}
      className="relative rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 p-10 text-center transition-colors hover:border-teal-400/80 hover:bg-teal-50/40 data-[active=true]:border-teal-500 data-[active=true]:bg-teal-50/60 dark:border-zinc-700 dark:bg-zinc-900/40 dark:hover:border-teal-500/50 dark:hover:bg-teal-950/20 dark:data-[active=true]:border-teal-400 dark:data-[active=true]:bg-teal-950/30"
      whileHover={{ scale: disabled ? 1 : 1.005 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      <input
        id="file-input"
        type="file"
        multiple
        accept={ACCEPT_IMAGE_AND_SVG}
        className="absolute inset-0 z-10 cursor-pointer opacity-0 disabled:cursor-not-allowed"
        disabled={disabled}
        onChange={(event) => {
          const list = event.target.files;
          if (list?.length) onFiles(list);
          event.target.value = "";
        }}
        aria-label="Elegir archivos desde el explorador"
      />
      <div
        className="pointer-events-none flex flex-col items-center gap-3"
        aria-hidden
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/15 text-teal-700 dark:bg-teal-400/15 dark:text-teal-200">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 16V4" />
            <path d="M8 8l4-4 4 4" />
            <path d="M20 16.5v1.1a2.4 2.4 0 0 1-2.4 2.4H6.4A2.4 2.4 0 0 1 4 17.6v-1.1" />
          </svg>
        </div>
        <div>
          <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">
            Arrastra imágenes aquí
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            o toca para elegirlas en tu explorador (varias a la vez)
          </p>
        </div>
      </div>
    </motion.div>
  );
}
