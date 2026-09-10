import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "youtubei.js",
    "fluent-ffmpeg",
    "ffmpeg-static",
    "ffprobe-static",
  ],
};

export default nextConfig;
