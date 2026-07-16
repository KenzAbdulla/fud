/**
 * POST /api/recipe/reel
 * Reel extraction pipeline (F-02, F-03, F-06):
 *   1. URL cache check → skip all LLM if hit
 *   2. Attempt to fetch reel bytes from user-pasted URL
 *   3. Groq Whisper transcription
 *   4. LLM recipe extraction (cheap → large-model fallback on confidence < 0.8)
 *   5. Cache result permanently
 *
 * For user-uploaded video: client sends multipart/form-data with file field.
 * GUARDRAILS #7: paste-link/upload ONLY. No server-side Instagram scraping.
 */

import { NextRequest, NextResponse } from "next/server";
import { getRecipe } from "@/lib/recipe/service";
import { transcribeBuffer, fetchReelBytes } from "@/lib/recipe/transcriber";
import { cacheGet } from "@/lib/cache/redis";
import { CACHE_KEYS } from "@/lib/cache/keys";
import type { Recipe } from "@/lib/types";

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";

  let reelUrl: string | undefined;
  let fileBuffer: Buffer | undefined;
  let filename = "reel.mp4";

  // ── Parse input ──────────────────────────────────────────────────────────
  if (contentType.includes("multipart/form-data")) {
    // User-uploaded video (F-03)
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const urlField = form.get("url") as string | null;

    if (urlField) reelUrl = urlField;
    if (file) {
      fileBuffer = Buffer.from(await file.arrayBuffer());
      filename = file.name;
    }
  } else {
    // JSON with reelUrl (F-02)
    const body = await req.json().catch(() => ({})) as { reelUrl?: string; servings?: number };
    reelUrl = body.reelUrl;
  }

  if (!reelUrl && !fileBuffer) {
    return NextResponse.json(
      { error: "Provide a reelUrl or upload a video file" },
      { status: 400 }
    );
  }

  // ── URL cache check (permanent — zero tokens on hit) ─────────────────────
  if (reelUrl) {
    const key = CACHE_KEYS.recipeReel(reelUrl);
    const cached = await cacheGet<Recipe>(key);
    if (cached) {
      return NextResponse.json({ recipe: cached, cacheHit: true, tier: cached.extractedBy });
    }
  }

  // ── Fetch reel bytes if URL provided ─────────────────────────────────────
  if (reelUrl && !fileBuffer) {
    fileBuffer = (await fetchReelBytes(reelUrl)) ?? undefined;

    if (!fileBuffer) {
      // Platform blocked server-side fetch — ask user to upload directly
      return NextResponse.json(
        {
          error: "Could not fetch this reel link automatically. Please download and upload the video instead.",
          requiresUpload: true,
        },
        { status: 422 }
      );
    }
  }

  // ── Transcribe via Groq Whisper ───────────────────────────────────────────
  let transcript: string;
  try {
    transcript = await transcribeBuffer(fileBuffer!, filename);
  } catch (err) {
    return NextResponse.json(
      { error: `Transcription failed: ${String(err)}` },
      { status: 500 }
    );
  } finally {
    // TECH_STACK.md: delete raw media immediately after transcription
    fileBuffer = undefined;
  }

  if (!transcript || transcript.trim().length < 20) {
    return NextResponse.json(
      {
        error: "Could not extract audio from this video. Try a reel where the creator narrates the recipe.",
        transcript,
      },
      { status: 422 }
    );
  }

  // ── LLM extraction ────────────────────────────────────────────────────────
  try {
    const result = await getRecipe({ reelUrl, transcript });
    return NextResponse.json({
      recipe: result.recipe,
      cacheHit: result.cacheHit,
      tier: result.tier,
      confidence: result.recipe.confidence,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Recipe extraction failed: ${String(err)}` },
      { status: 500 }
    );
  }
}

// Allow up to 50MB uploads (video files) — App Router segment config
export const maxDuration = 60; // seconds

