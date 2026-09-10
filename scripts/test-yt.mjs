import { Innertube, UniversalCache } from "youtubei.js";

const VIDEOS = [
  "dQw4w9WgXcQ", // Rick Astley
  "jNQXAC9IVRw", // Me at the zoo
  "9bZkp7q19f0", // Gangnam Style
  "60ItHLz5WEA", // Call Me Maybe (VEVO)
  "M7lc1UVf-VE", // Rewind 2018
  "L_jWHffIx5E", // Bad Apple
  "EE-xtCF3T94", // d4vd - Romantic Homicide
  "kJQP7kiw5Fk", // Despacito
];

const clients = ["IOS", "WEB", "TV_EMBEDDED"];

for (const id of VIDEOS) {
  console.log(`\n=== ${id} ===`);
  for (const client of clients) {
    try {
      const yt = await Innertube.create({
        cache: new UniversalCache(false),
        generate_session_locally: true,
        client_type: client,
      });
      const basic = await yt.getBasicInfo(id, { client });
      const st = basic.playability_status?.status ?? "?";
      const title = basic.basic_info?.title?.toString()?.slice(0, 30) ?? "";
      const hasStream = !!basic.streaming_data;
      const prog = basic.streaming_data?.formats?.length ?? 0;
      const adap = basic.streaming_data?.adaptive_formats?.length ?? 0;
      const withUrl =
        (basic.streaming_data?.formats ?? []).filter((f) => f.url).length +
        (basic.streaming_data?.adaptive_formats ?? []).filter((f) => f.url).length;
      console.log(
        `${client}: play=${st} stream=${hasStream} prog=${prog} adap=${adap} urls=${withUrl} "${title}"`,
      );
    } catch (err) {
      console.log(`${client}: FAIL ${(err?.message ?? String(err)).slice(0, 90)}`);
    }
  }
}