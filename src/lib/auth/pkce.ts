/**
 * OAuth 2.1 PKCE helpers (OPERATIONS.md §OAuth 2.1 PKCE Flow)
 *
 * Base: https://mcp.swiggy.com
 * Authorize: GET /auth/authorize
 * Token:     POST /auth/token
 * Logout:    POST /auth/logout
 *
 * Access tokens: 5-day expiry, NO refresh tokens in v1.0.
 */

import crypto from "crypto";

const SWIGGY_BASE = "https://mcp.swiggy.com";

// ─── PKCE challenge generation ────────────────────────────────────────────────

/** Generate a cryptographically random PKCE verifier (32 bytes → base64url) */
export function generatePkceVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/** Derive SHA256 challenge from verifier */
export function derivePkceChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

// ─── Authorization URL ────────────────────────────────────────────────────────

export interface AuthParams {
  clientId: string;
  redirectUri: string;
  verifier: string;
  state: string;
}

export function buildAuthorizationUrl(params: AuthParams): string {
  const challenge = derivePkceChallenge(params.verifier);
  const url = new URL(`${SWIGGY_BASE}/auth/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", params.state);
  url.searchParams.set("scope", "mcp:tools");
  return url.toString();
}

// ─── Token exchange ───────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string;
  expires_in: number;   // 432000 = 5 days
  token_type: string;
}

export async function exchangeCodeForToken(params: {
  code: string;
  verifier: string;
  clientId: string;
  redirectUri: string;
}): Promise<TokenResponse> {
  const res = await fetch(`${SWIGGY_BASE}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      code_verifier: params.verifier,
      client_id: params.clientId,
      redirect_uri: params.redirectUri,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${body}`);
  }

  return res.json() as Promise<TokenResponse>;
}

export async function revokeToken(accessToken: string): Promise<void> {
  await fetch(`${SWIGGY_BASE}/auth/logout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
}

// ─── Token encryption at rest (GUARDRAILS #8) ─────────────────────────────────

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const secret = process.env.TOKEN_ENCRYPTION_SECRET;
  if (!secret) throw new Error("TOKEN_ENCRYPTION_SECRET not set");
  return Buffer.from(secret, "hex").subarray(0, 32);
}

export function encryptToken(token: string): string {
  const iv = crypto.randomBytes(12);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  // iv:tag:ciphertext as base64
  return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(":");
}

export function decryptToken(encoded: string): string {
  const [ivB64, tagB64, cipherB64] = encoded.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ciphertext = Buffer.from(cipherB64, "base64");
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext) + decipher.final("utf8");
}

// ─── State cookie helpers (CSRF) ──────────────────────────────────────────────

export function generateCsrfState(): string {
  return crypto.randomBytes(16).toString("hex");
}
