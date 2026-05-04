// =============================================================================
// Client-side video compression via ffmpeg.wasm.
// - Single-threaded core (no SharedArrayBuffer / COOP-COEP needed)
// - Loaded from CDN on first use, then cached
// - Output: MP4 (H.264 + AAC, 720p, CRF 28)
// =============================================================================

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const FFMPEG_BASE_URL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";

let _ffmpeg = null;
let _loadingPromise = null;

async function getFFmpeg(onProgress) {
  if (_ffmpeg) return _ffmpeg;
  if (_loadingPromise) return _loadingPromise;

  _loadingPromise = (async () => {
    const ffmpeg = new FFmpeg();
    if (onProgress) ffmpeg.on("log", () => {}); // silence log spam
    if (onProgress) {
      ffmpeg.on("progress", ({ progress }) => {
        onProgress({ phase: "compress", progress: Math.min(Math.max(progress, 0), 1) });
      });
    }
    onProgress?.({ phase: "load_engine", progress: 0 });
    await ffmpeg.load({
      coreURL:   await toBlobURL(`${FFMPEG_BASE_URL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL:   await toBlobURL(`${FFMPEG_BASE_URL}/ffmpeg-core.wasm`, "application/wasm"),
    });
    onProgress?.({ phase: "load_engine", progress: 1 });
    _ffmpeg = ffmpeg;
    _loadingPromise = null;
    return ffmpeg;
  })();

  return _loadingPromise;
}

const INPUT = "input";
const OUTPUT = "output.mp4";

// Compress a video file → MP4 (H.264 + AAC, 720p, CRF 28).
// onProgress receives { phase, progress } events. Returns a Blob.
export async function compressVideo(file, onProgress = () => {}) {
  if (!(file instanceof File) && !(file instanceof Blob)) {
    throw new Error("Argomento deve essere un File");
  }

  const ffmpeg = await getFFmpeg(onProgress);

  // Use a guess at extension based on MIME for the input filename
  const ext = (file.type === "video/webm") ? "webm"
    : (file.type === "video/quicktime") ? "mov"
    : "mp4";
  const inputName = `${INPUT}.${ext}`;

  onProgress({ phase: "read_file", progress: 0 });
  await ffmpeg.writeFile(inputName, await fetchFile(file));
  onProgress({ phase: "read_file", progress: 1 });

  await ffmpeg.exec([
    "-i", inputName,
    "-vf", "scale=-2:720",
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "28",
    "-c:a", "aac",
    "-b:a", "128k",
    "-movflags", "+faststart",
    OUTPUT,
  ]);

  onProgress({ phase: "finalize", progress: 1 });
  const data = await ffmpeg.readFile(OUTPUT);
  // Cleanup workspace (best-effort)
  try { await ffmpeg.deleteFile(inputName); } catch {}
  try { await ffmpeg.deleteFile(OUTPUT); } catch {}

  return new Blob([data.buffer], { type: "video/mp4" });
}
