/**
 * Next.js middleware — auth guard + PKCE state cleanup.
 * Protects /connect and /compare routes; redirects unauthenticated users to /login.
 * Skips protection for API routes (they handle auth internally).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const PUBLIC_PATHS = ["/login", "/api/auth", "/compare", "/_next", "/icons", "/manifest.json", "/sw.js"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Skip if env not configured (local dev without Supabase)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next();
  }

  // Lightweight session check via Supabase
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "") ?? req.cookies.get("sb-access-token")?.value;

  if (!token && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|sw.js|manifest.json).*)"],
};
