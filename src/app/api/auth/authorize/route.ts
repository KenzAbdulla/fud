/**
 * GET /api/auth/authorize?server=food|instamart|dineout
 * Starts the Swiggy OAuth 2.1 PKCE flow.
 * Stores verifier + state in pkce_state table; redirects user to Swiggy consent UI.
 */

import { NextRequest, NextResponse } from "next/server";
import { buildAuthorizationUrl, generatePkceVerifier, generateCsrfState } from "@/lib/auth/pkce";
import { getServerClient } from "@/lib/db/supabase";

export async function GET(req: NextRequest) {
  const server = req.nextUrl.searchParams.get("server") ?? "food";
  const clientId = process.env.SWIGGY_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json({ error: "SWIGGY_CLIENT_ID not configured" }, { status: 500 });
  }

  const verifier = generatePkceVerifier();
  const state = generateCsrfState();
  const redirectUri = process.env.SWIGGY_REDIRECT_URI!;

  // Persist PKCE state (10-minute TTL handled by cleanup job)
  const db = getServerClient();
  await db.from("pkce_state").insert({ state, verifier });

  const authUrl = buildAuthorizationUrl({ clientId, redirectUri, verifier, state });

  const response = NextResponse.redirect(authUrl);
  // Store state in cookie for CSRF validation on callback
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  response.cookies.set("oauth_server", server, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
