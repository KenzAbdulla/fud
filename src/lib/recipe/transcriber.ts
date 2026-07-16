/**
 * Video/audio transcription via Groq Whisper-large-v3 (TECH_STACK.md).
 * Accepts a Buffer of video/audio bytes.
 *
 * Media handling (GUARDRAILS #7, TECH_STACK.md):
 *   - User-provided paste-link or upload ONLY — no server-side Instagram scraping
 *   - Raw media deleted immediately after transcription
 *   - Only transcript + URL hash retained for caching
 */

import Groq from "groq-sdk";

export async function transcribeBuffer(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set");

  const groq = new Groq({ apiKey });

  // Groq SDK expects a File-like object; cast buffer to Blob to satisfy TS
  const blob = new Blob([new Uint8Array(buffer)], { type: "video/mp4" });
  const file = new File([blob], filename, { type: "video/mp4" });

  const transcription = await groq.audio.transcriptions.create({
    file,
    model: "whisper-large-v3",
    response_format: "text",
    language: "en",
  });

  return typeof transcription === "string" ? transcription : (transcription as { text: string }).text;
}

/**
 * Fetch user-pasted reel link content and return raw bytes.
 * Only processes user-provided URLs — no automated crawling.
 *
 * Note: Many social platforms block server-side fetching.
 * If fetch fails, the client should be prompted to upload the video file directly.
 */
export async function fetchReelBytes(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      headers: {
        // Minimal user-agent; we don't spoof or bypass bot detection
        "User-Agent": "CravingToPlate/0.1 (+https://cravingtoplate.app)",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "";
    const isMedia =
      contentType.startsWith("video/") ||
      contentType.startsWith("audio/") ||
      contentType.includes("octet-stream");

    if (!isMedia) return null;

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}
