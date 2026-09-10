"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function VideoPanel({ children }: { children: ReactNode }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-zinc-200/80 bg-white/80 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/50"
    >
      {children}
    </motion.div>
  );
}

export function CardLabel({ children }: { children: ReactNode }) {
  return (
    <dt className="text-xs uppercase tracking-wide text-zinc-400">
      {children}
    </dt>
  );
}