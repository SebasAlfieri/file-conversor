import { createReadStream } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { Readable } from "node:stream";
import type { Readable as NodeReadable } from "node:stream";

import type { NextRequest } from "next/server";

import { compressVideoWithFfmpeg } from "@/lib/video/compressWithFfmpeg";
import { attachmentContentDisposition } from "@/lib/youtube/contentDisposition";
import { sanitizeYoutubeFilename } from "@/lib/youtube/sanitizeFilename";

export const runtime = "nodejs";

export const maxDuration = 300;

function safeExtension(filename: string): string {
  const ext = extname(filename).toLowerCase();
  return /^\.[a-z0-9]{1,5}$/.test(ext) ? ext : ".mp4";
}

function numberField(form: FormData, key: string): number | null {
  const value = form.get(key);
  if (typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json(
      { error: "Cuerpo multipart inválido" },
      { status: 400 },
    );
  }

  const entry = form.get("file");
  if (!(entry instanceof File) || entry.size === 0) {
    return Response.json(
      { error: "Falta el archivo de video" },
      { status: 400 },
    );
  }

  const width = numberField(form, "width");
  const videoBitrateKbps = numberField(form, "videoBitrateKbps");
  const audioBitrateKbps = numberField(form, "audioBitrateKbps") ?? 128;
  const hasAudio = form.get("hasAudio") === "1";
  const durationSeconds = numberField(form, "durationSeconds");

  if (
    width === null ||
    videoBitrateKbps === null ||
    !Number.isInteger(width) ||
    width < 1 ||
    width > 10000 ||
    !Number.isInteger(videoBitrateKbps) ||
    videoBitrateKbps < 100 ||
    videoBitrateKbps > 100000
  ) {
    return Response.json(
      {
        error: "Parámetros de compresión inválidos (width, videoBitrateKbps)",
      },
      { status: 400 },
    );
  }

  let finalVideoKbps = videoBitrateKbps;
  if (durationSeconds !== null && durationSeconds > 0) {
    const sourceKbps = Math.round(
      (entry.size * 8) / durationSeconds / 1000,
    );
    if (sourceKbps > 0) {
      const cap = Math.max(32, Math.round(sourceKbps * 0.8));
      finalVideoKbps = Math.min(finalVideoKbps, cap);
    }
  }

  const tmpDir = await mkdtemp(join(tmpdir(), "fc-video-compress-"));
  const inputPath = join(tmpDir, `input${safeExtension(entry.name)}`);
  const outputPath = join(tmpDir, "output.mp4");
  const cleanup = () => rm(tmpDir, { recursive: true, force: true });

  try {
    await writeFile(inputPath, Buffer.from(await entry.arrayBuffer()));
    await compressVideoWithFfmpeg({
      inputPath,
      outputPath,
      width,
      videoBitrateKbps: finalVideoKbps,
      audioBitrateKbps,
      hasAudio,
    });
  } catch (err) {
    await cleanup();
    const detail = err instanceof Error ? err.message : "error desconocido";
    return Response.json(
      {
        error: `La compresión falló (${detail.slice(0, 160)}). Intenta con opciones más altas.`,
      },
      { status: 422 },
    );
  }

  const base = entry.name.replace(/\.[^.]+$/, "");
  const filename = `${sanitizeYoutubeFilename(base)}-comprimido.mp4`;
  const stream = createReadStream(outputPath);
  stream.on("close", () => {
    void cleanup();
  });

  return new Response(
    Readable.toWeb(stream as NodeReadable) as unknown as BodyInit,
    {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": attachmentContentDisposition(filename),
      },
    },
  );
}