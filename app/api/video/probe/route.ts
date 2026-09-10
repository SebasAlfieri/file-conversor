import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";

import type { NextRequest } from "next/server";

import { probeVideo } from "@/lib/video/ffprobe";
import type { VideoProbe } from "@/types/model";

export const runtime = "nodejs";

export const maxDuration = 60;

function safeExtension(filename: string): string {
  const ext = extname(filename).toLowerCase();
  return /^\.[a-z0-9]{1,5}$/.test(ext) ? ext : "";
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

  const tmpDir = await mkdtemp(join(tmpdir(), "fc-video-probe-"));
  const inputPath = join(tmpDir, `input${safeExtension(entry.name)}`);

  try {
    await writeFile(inputPath, Buffer.from(await entry.arrayBuffer()));
    const probe = await probeVideo(inputPath);
    const data: VideoProbe = {
      name: entry.name,
      size: entry.size,
      ...probe,
    };
    return Response.json(data);
  } catch (err) {
    const detail = err instanceof Error ? err.message : "error desconocido";
    return Response.json(
      {
        error: `No se pudo leer el video (${detail.slice(0, 160)}). Asegúrate de que sea un archivo de video válido.`,
      },
      { status: 422 },
    );
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}