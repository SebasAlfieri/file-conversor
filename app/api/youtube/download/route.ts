import { createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough, Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { pipeline } from "node:stream/promises";

import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import type { NextRequest } from "next/server";
import {
  ClientType,
  Innertube,
  Platform,
  UniversalCache,
  type Types,
} from "youtubei.js";

import { attachmentContentDisposition } from "@/lib/youtube/contentDisposition";
import { extractYoutubeVideoId } from "@/lib/youtube/extractYoutubeVideoId";
import { sanitizeYoutubeFilename } from "@/lib/youtube/sanitizeFilename";

export const runtime = "nodejs";

export const maxDuration = 600;

Platform.shim.eval = async (data) => {
  return new Function(data.output)();
};

const SESSION_CLIENTS: Array<{
  session: ClientType;
  client: Types.InnerTubeClient;
}> = [
  { session: ClientType.IOS, client: "IOS" },
  { session: ClientType.VISIONOS, client: "VISIONOS" },
];

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

function requireFfmpeg(ffmpegPathValue: string | null) {
  if (!ffmpegPathValue) {
    return null;
  }
  ffmpeg.setFfmpegPath(ffmpegPathValue);
  return true;
}

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

  if (requireFfmpeg(ffmpegPath) === null) {
    return jsonError(
      "La conversión a MP3 no está disponible en este entorno (falta el binario de ffmpeg).",
      503,
    );
  }

  let lastError: unknown;

  for (const { session, client } of SESSION_CLIENTS) {
    try {
      const yt = await Innertube.create({
        cache: new UniversalCache(true),
        generate_session_locally: true,
        client_type: session,
      });

      const basic = await yt.getBasicInfo(videoId, { client });
      const title = sanitizeYoutubeFilename(titleFromBasicInfo(basic));

      if (format === "mp3") {
        const audioWeb = await yt.download(videoId, {
          type: "audio",
          quality: "best",
          format: "mp4",
          client,
        });

        const audioIn = Readable.fromWeb(
          audioWeb as unknown as NodeReadableStream,
        );
        const out = new PassThrough();

        ffmpeg(audioIn)
          .audioCodec("libmp3lame")
          .audioBitrate(192)
          .format("mp3")
          .on("error", (err: Error) => {
            out.destroy(err);
          })
          .pipe(out, { end: true });

        return new Response(
          Readable.toWeb(out as Readable) as unknown as BodyInit,
          {
            headers: {
              "Content-Type": "audio/mpeg",
              "Content-Disposition": attachmentContentDisposition(
                `${title}.mp3`,
              ),
            },
          },
        );
      }

      const tmpDir = await mkdtemp(join(tmpdir(), "fc-yt-"));
      const videoPath = join(tmpDir, "video.mp4");
      const audioPath = join(tmpDir, "audio.m4a");
      const cleanup = () => rm(tmpDir, { recursive: true, force: true });

      try {
        const [videoWeb, audioWeb] = await Promise.all([
          yt.download(videoId, {
            type: "video",
            quality: "best",
            format: "mp4",
            client,
          }),
          yt.download(videoId, {
            type: "audio",
            quality: "best",
            format: "mp4",
            client,
          }),
        ]);

        await pipeline(
          Readable.fromWeb(videoWeb as unknown as NodeReadableStream),
          createWriteStream(videoPath),
        );
        await pipeline(
          Readable.fromWeb(audioWeb as unknown as NodeReadableStream),
          createWriteStream(audioPath),
        );
      } catch (err) {
        await cleanup();
        throw err;
      }

      const out = new PassThrough();
      out.on("close", () => {
        void cleanup();
      });

      ffmpeg()
        .input(videoPath)
        .input(audioPath)
        .outputOptions(["-c copy", "-movflags frag_keyframe+empty_moov+faststart"])
        .format("mp4")
        .on("error", (err: Error) => {
          out.destroy(err);
        })
        .pipe(out, { end: true });

      return new Response(
        Readable.toWeb(out as Readable) as unknown as BodyInit,
        {
          headers: {
            "Content-Type": "video/mp4",
            "Content-Disposition": attachmentContentDisposition(
              `${title}.mp4`,
            ),
          },
        },
      );
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