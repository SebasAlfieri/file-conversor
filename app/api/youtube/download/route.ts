import { PassThrough, Readable } from "node:stream";

import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import type { NextRequest } from "next/server";
import { Innertube, UniversalCache, type InnerTubeClient } from "youtubei.js";

import { attachmentContentDisposition } from "@/lib/youtube/contentDisposition";
import { extractYoutubeVideoId } from "@/lib/youtube/extractYoutubeVideoId";
import { sanitizeYoutubeFilename } from "@/lib/youtube/sanitizeFilename";

export const runtime = "nodejs";

export const maxDuration = 600;

type Body = {
  url?: string;
  format?: string;
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function titleFromBasicInfo(info: {
  basic_info?: { title?: string | { toString: () => string } };
}): string {
  const t = info.basic_info?.title;
  if (t == null) return "video";
  return typeof t === "string" ? t : t.toString();
}

type InnertubeCreateOptions = NonNullable<Parameters<typeof Innertube.create>[0]>;

function innerTubeClientFromConfig(
  config: InnertubeCreateOptions,
): InnerTubeClient | undefined {
  return config.client_type;
}

const SESSION_FALLBACKS: InnertubeCreateOptions[] = [
  {
    cache: new UniversalCache(true),
    generate_session_locally: true,
  },
  {
    cache: new UniversalCache(false),
    generate_session_locally: true,
    client_type: "TV_EMBEDDED",
  },
  {
    cache: new UniversalCache(false),
    generate_session_locally: true,
    client_type: "ANDROID",
  },
];

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return jsonError("Cuerpo JSON inválido", 400);
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";
  const format = body.format;

  if (!url) {
    return jsonError("Falta la URL del video", 400);
  }

  if (format !== "mp3" && format !== "mp4") {
    return jsonError('El formato debe ser "mp3" o "mp4"', 400);
  }

  const videoId = extractYoutubeVideoId(url);
  if (!videoId) {
    return jsonError("No se pudo obtener el ID del video desde la URL.", 400);
  }

  let lastError: unknown;

  for (const config of SESSION_FALLBACKS) {
    try {
      const yt = await Innertube.create(config);
      const sessionClient = innerTubeClientFromConfig(config);
      const basic = sessionClient
        ? await yt.getBasicInfo(videoId, { client: sessionClient })
        : await yt.getBasicInfo(videoId);
      const title = sanitizeYoutubeFilename(titleFromBasicInfo(basic));

      const clientOpt = sessionClient ? { client: sessionClient } : {};

      if (format === "mp4") {
        const bodyStream = await yt.download(videoId, {
          type: "video+audio",
          quality: "best",
          format: "mp4",
          ...clientOpt,
        });

        return new Response(bodyStream, {
          headers: {
            "Content-Type": "video/mp4",
            "Content-Disposition": attachmentContentDisposition(`${title}.mp4`),
          },
        });
      }

      if (!ffmpegPath) {
        return jsonError(
          "La conversión a MP3 no está disponible en este entorno (falta el binario de ffmpeg).",
          503,
        );
      }

      ffmpeg.setFfmpegPath(ffmpegPath);

      const audioWeb = await yt.download(videoId, {
        type: "audio",
        quality: "best",
        format: "mp4",
        ...clientOpt,
      });

      const audioIn = Readable.fromWeb(audioWeb);

      const out = new PassThrough();

      ffmpeg(audioIn)
        .audioCodec("libmp3lame")
        .audioBitrate(192)
        .format("mp3")
        .on("error", (err: Error) => {
          out.destroy(err);
        })
        .pipe(out, { end: true });

      return new Response(Readable.toWeb(out as Readable), {
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Disposition": attachmentContentDisposition(`${title}.mp3`),
        },
      });
    } catch (err) {
      lastError = err;
    }
  }

  const detail =
    lastError instanceof Error ? lastError.message : String(lastError);

  return jsonError(
    `No se pudo leer el video (${detail.slice(0, 200)}). Si sigue fallando, YouTube puede estar pidiendo verificación: prueba otro enlace, otra red o más tarde.`,
    502,
  );
}
