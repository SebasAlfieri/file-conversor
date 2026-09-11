import type { NextRequest } from "next/server";

import { extractYoutubeVideoId } from "@/lib/youtube/extractYoutubeVideoId";
import {
  createYouTubeSession,
  SESSION_CLIENTS,
  titleFromBasicInfo,
} from "@/lib/youtube/session";
import type { YoutubeVideoPreview } from "@/types/model";

export const runtime = "nodejs";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: { url?: string };
  try {
    body = (await req.json()) as { url?: string };
  } catch {
    return Response.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";
  const videoId = extractYoutubeVideoId(url);

  if (!videoId) {
    return Response.json(
      { error: "Ese enlace de YouTube no parece válido." },
      { status: 400 },
    );
  }

  let lastError: unknown;

  for (const { session, client } of SESSION_CLIENTS) {
    try {
      const yt = await createYouTubeSession(session);
      const basic = await yt.getBasicInfo(videoId, { client });
      const length = basic.basic_info.duration;

      const preview: YoutubeVideoPreview = {
        videoId,
        title: titleFromBasicInfo(basic),
        duration: typeof length === "number" && length > 0 ? length : null,
      };

      return Response.json(preview);
    } catch (err) {
      lastError = err;
    }
  }

  const detail =
    lastError instanceof Error ? lastError.message : String(lastError);

  return Response.json(
    {
      error: `No se pudo obtener la vista previa sin iniciar sesión (${detail.slice(0, 200)}). El video quizá no está disponible en tu región.`,
    },
    { status: 502 },
  );
}