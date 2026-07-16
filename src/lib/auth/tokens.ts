/**
 * Token storage — encrypted Swiggy access tokens in Supabase.
 * One row per user per server (food / instamart / dineout).
 * Tokens expire after 5 days; no refresh tokens in Swiggy MCP v1.0.
 */

import { createClient } from "@supabase/supabase-js";
import { encryptToken, decryptToken } from "./pkce";

export type SwiggyServer = "food" | "instamart" | "dineout";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

export interface StoredToken {
  accessToken: string;
  expiresAt: Date;
  server: SwiggyServer;
}

export async function saveToken(params: {
  userId: string;
  server: SwiggyServer;
  accessToken: string;
  expiresIn: number; // seconds
}): Promise<void> {
  const db = getServiceClient();
  const expiresAt = new Date(Date.now() + params.expiresIn * 1000).toISOString();
  const encrypted = encryptToken(params.accessToken);

  await db.from("swiggy_tokens").upsert(
    {
      user_id: params.userId,
      server: params.server,
      encrypted_token: encrypted,
      expires_at: expiresAt,
    },
    { onConflict: "user_id,server" }
  );
}

export async function getToken(
  userId: string,
  server: SwiggyServer
): Promise<StoredToken | null> {
  const db = getServiceClient();
  const { data, error } = await db
    .from("swiggy_tokens")
    .select("encrypted_token, expires_at, server")
    .eq("user_id", userId)
    .eq("server", server)
    .single();

  if (error || !data) return null;

  const expiresAt = new Date(data.expires_at as string);
  if (expiresAt <= new Date()) return null; // expired

  return {
    accessToken: decryptToken(data.encrypted_token as string),
    expiresAt,
    server,
  };
}

export async function deleteToken(userId: string, server: SwiggyServer): Promise<void> {
  const db = getServiceClient();
  await db
    .from("swiggy_tokens")
    .delete()
    .eq("user_id", userId)
    .eq("server", server);
}

/** Check if token is near expiry (< 1 hour remaining) */
export function isNearExpiry(token: StoredToken): boolean {
  return token.expiresAt.getTime() - Date.now() < 3_600_000;
}
