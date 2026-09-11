import {
  ClientType,
  Innertube,
  Platform,
  UniversalCache,
  type Types,
} from "youtubei.js";

Platform.shim.eval = async (data) => {
  return new Function(data.output)();
};

export const SESSION_CLIENTS: Array<{
  session: ClientType;
  client: Types.InnerTubeClient;
}> = [
  { session: ClientType.IOS, client: "IOS" },
  { session: ClientType.VISIONOS, client: "VISIONOS" },
  { session: ClientType.ANDROID, client: "ANDROID" },
  { session: ClientType.TV, client: "TV" },
];

export function createYouTubeSession(session: ClientType) {
  return Innertube.create({
    cache: new UniversalCache(true),
    generate_session_locally: true,
    client_type: session,
  });
}

export function titleFromBasicInfo(info: {
  basic_info?: { title?: string | { toString: () => string } };
}): string {
  const t = info.basic_info?.title;
  if (t == null) return "video";
  return typeof t === "string" ? t : t.toString();
}