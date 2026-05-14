/** Extrae el ID de 11 caracteres de enlaces comunes de YouTube. */
export function extractYoutubeVideoId(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const withScheme = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const u = new URL(withScheme);
    const host = u.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0]?.split("?")[0];
      return id && isLikelyVideoId(id) ? id : null;
    }

    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com"
    ) {
      const fromQuery = u.searchParams.get("v");
      if (fromQuery && isLikelyVideoId(fromQuery)) return fromQuery;

      const shorts = u.pathname.match(/^\/shorts\/([^/?#]+)/);
      if (shorts?.[1] && isLikelyVideoId(shorts[1])) return shorts[1];

      const embed = u.pathname.match(/^\/embed\/([^/?#]+)/);
      if (embed?.[1] && isLikelyVideoId(embed[1])) return embed[1];

      const live = u.pathname.match(/^\/live\/([^/?#]+)/);
      if (live?.[1] && isLikelyVideoId(live[1])) return live[1];
    }
  } catch {
    return null;
  }

  return null;
}

function isLikelyVideoId(id: string): boolean {
  return /^[\w-]{11}$/.test(id);
}
