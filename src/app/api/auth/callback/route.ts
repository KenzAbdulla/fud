/**
 * GET /api/auth/callback?code=...&state=...
 * Handles the OAuth redirect from Swiggy.
 * Exchanges code for access token; stores encrypted token in Supabase.
 */

import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken } from "@/lib/auth/pkce";
import { saveToken } from "@/lib/auth/tokens";
import { getServerClient } from "@/lib/db/supabase";
import type { SwiggyServer } from "@/lib/auth/tokens";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const returnedState = searchParams.get("state");

  const cookieState = req.cookies.get("oauth_state")?.value;
  const server = (req.cookies.get("oauth_server")?.value ?? "food") as SwiggyServer;

  // ─── CSRF check ──────────────────────────────────────────────────────────
  if (!code || !returnedState || returnedState !== cookieState) {
    return NextResponse.redirect(new URL("/?error=oauth_state_mismatch", req.url));
  }

  // ─── Retrieve PKCE verifier ───────────────────────────────────────────────
  const db = getServerClient();
  const { data: pkceRow } = await db
    .from("pkce_state")
    .select("verifier, user_id")
    .eq("state", returnedState)
    .single();

  if (!pkceRow) {
    return NextResponse.redirect(new URL("/?error=pkce_not_found", req.url));
  }

  // Clean up the used PKCE row
  await db.from("pkce_state").delete().eq("state", returnedState);

  // ─── Exchange code for token ──────────────────────────────────────────────
  let tokenResponse;
  try {
    tokenResponse = await exchangeCodeForToken({
      code,
      verifier: pkceRow.verifier as string,
      clientId: process.env.SWIGGY_CLIENT_ID!,
      redirectUri: process.env.SWIGGY_REDIRECT_URI!,
    });
  } catch (err) {
    console.error("[auth/callback] token exchange failed:", err);
    return NextResponse.redirect(new URL("/?error=token_exchange_failed", req.url));
  }

  // ─── Get current user ─────────────────────────────────────────────────────
  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=not_authenticated", req.url));
  }

  // ─── Store encrypted token ────────────────────────────────────────────────
  await saveToken({
    userId: user.id,
    server,
    accessToken: tokenResponse.access_token,
    expiresIn: tokenResponse.expires_in,
  });

  // Redirect back to app with server connected
  const response = NextResponse.redirect(new URL(`/?connected=${server}`, req.url));
  response.cookies.delete("oauth_state");
  response.cookies.delete("oauth_server");
  return response;
}
