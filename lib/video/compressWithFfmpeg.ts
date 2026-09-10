import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

export type CompressVideoArgs = {
  inputPath: string;
  outputPath: string;
  width: number;
  videoBitrateKbps: number;
  audioBitrateKbps: number;
  hasAudio: boolean;
};

export function compressVideoWithFfmpeg({
  inputPath,
  outputPath,
  width,
  videoBitrateKbps,
  audioBitrateKbps,
  hasAudio,
}: CompressVideoArgs): Promise<void> {
  if (!ffmpegPath) {
    return Promise.reject(
      new Error("Falta el binario de ffmpeg en este entorno"),
    );
  }
  ffmpeg.setFfmpegPath(ffmpegPath);

  return new Promise((resolve, reject) => {
    const command = ffmpeg(inputPath)
      .videoCodec("libx264")
      .outputOptions([
        "-preset",
        "slow",
        "-b:v",
        `${videoBitrateKbps}k`,
        "-maxrate",
        `${videoBitrateKbps}k`,
        "-bufsize",
        `${videoBitrateKbps * 2}k`,
        "-vf",
        `scale=${width}:-2`,
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
      ])
      .on("error", reject)
      .on("end", () => resolve());

    if (hasAudio) {
      command.audioCodec("aac").audioBitrate(audioBitrateKbps);
    } else {
      command.noAudio();
    }

    command.output(outputPath).run();
  });
}