/**
 * LLM recipe extractor — cheap model first, large-model fallback.
 * Confidence threshold: 0.8 (PRD §7).
 * Used only on cache MISS. Result is cached permanently.
 *
 * Input: dish name OR transcript text (from Whisper).
 * Output: structured Recipe JSON.
 */

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import type { Ingredient } from "@/lib/types";

const CONFIDENCE_THRESHOLD = 0.8;

const RECIPE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    dish: { type: SchemaType.STRING },
    servings: { type: SchemaType.NUMBER },
    prepTimeMin: { type: SchemaType.NUMBER },
    confidence: { type: SchemaType.NUMBER, description: "0 to 1" },
    ingredients: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          quantity: { type: SchemaType.NUMBER },
          unit: { type: SchemaType.STRING },
          optional: { type: SchemaType.BOOLEAN },
          pantryDefault: { type: SchemaType.BOOLEAN },
        },
        required: ["name", "quantity", "unit", "optional", "pantryDefault"],
      },
    },
    steps: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  },
  required: ["dish", "servings", "prepTimeMin", "confidence", "ingredients", "steps"],
};

const SYSTEM_PROMPT = `You are a culinary expert. Extract a structured recipe from the input.
Rules:
- If the input is a dish name, generate a standard Indian home-cooking recipe.
- If the input is a video transcript, extract the recipe shown.
- Set confidence (0–1): 1.0 for clear recipes, 0.5–0.7 for inferred, <0.5 if unclear.
- Units must be one of: g, kg, ml, l, tsp, tbsp, pc, cup.
- pantryDefault=true for: salt, oil, water, sugar, turmeric, cumin seeds.
- Servings: default 2 unless specified.`;

export interface ExtractedRecipe {
  dish: string;
  servings: number;
  prepTimeMin: number;
  confidence: number;
  ingredients: Ingredient[];
  steps: string[];
}

async function callSmallModel(prompt: string): Promise<ExtractedRecipe> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY not set");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-lite",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RECIPE_SCHEMA as Parameters<typeof model.generateContent>[0] extends { generationConfig?: { responseSchema?: infer S } } ? S : never,
    },
    systemInstruction: SYSTEM_PROMPT,
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return JSON.parse(text) as ExtractedRecipe;
}

async function callLargeModel(prompt: string): Promise<ExtractedRecipe> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY not set");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RECIPE_SCHEMA as Parameters<typeof model.generateContent>[0] extends { generationConfig?: { responseSchema?: infer S } } ? S : never,
    },
    systemInstruction: SYSTEM_PROMPT,
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return JSON.parse(text) as ExtractedRecipe;
}

/**
 * Extract a recipe from a dish name or video transcript.
 * Returns the extraction tier used for cache metrics.
 */
export async function extractRecipe(input: {
  dishName?: string;
  transcript?: string;
}): Promise<{ recipe: ExtractedRecipe; tier: "small_model" | "large_model" }> {
  const prompt = input.transcript
    ? `Video transcript:\n${input.transcript}\n\nExtract the recipe from this video.`
    : `Dish: ${input.dishName}\n\nGenerate a standard home-cooking recipe.`;

  // Try cheap model first
  let result: ExtractedRecipe;
  try {
    result = await callSmallModel(prompt);
    if (result.confidence >= CONFIDENCE_THRESHOLD) {
      return { recipe: result, tier: "small_model" };
    }
  } catch (err) {
    console.warn("[extractor] small model failed:", err);
  }

  // Fallback to large model
  result = await callLargeModel(prompt);
  return { recipe: result, tier: "large_model" };
}
