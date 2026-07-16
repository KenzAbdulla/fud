/**
 * POST /api/recipe
 * Recipe Service endpoint (F-07 — separable API contract).
 * Body: { dish?: string; reelUrl?: string; servings?: number }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRecipe } from "@/lib/recipe/service";

const schema = z.object({
  dish: z.string().min(1).optional(),
  reelUrl: z.string().url().optional(),
  servings: z.number().int().min(1).max(20).optional(),
}).refine((d) => d.dish || d.reelUrl, {
  message: "Provide dish name or reel URL",
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { dish, reelUrl, servings } = parsed.data;

  try {
    const result = await getRecipe({
      dishName: dish,
      reelUrl,
      servings,
    });
    return NextResponse.json({
      recipe: result.recipe,
      cacheHit: result.cacheHit,
      tier: result.tier,
    });
  } catch (err) {
    console.error("[/api/recipe]", err);
    return NextResponse.json(
      { error: "Recipe extraction failed" },
      { status: 500 }
    );
  }
}
