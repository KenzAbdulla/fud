-- Craving-to-Plate initial schema
-- Supabase Postgres, Mumbai ap-south-1 (DPDP residency)

-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── App users (linked to Supabase Auth) ────────────────────────────────────
create table if not exists app_users (
  id           uuid primary key references auth.users(id) on delete cascade,
  phone_hash   text unique not null,     -- sha256 hash of phone; never plaintext
  created_at   timestamptz default now()
);

-- ─── Swiggy OAuth tokens (encrypted at rest) ─────────────────────────────────
create table if not exists swiggy_tokens (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references app_users(id) on delete cascade,
  server          text not null check (server in ('food', 'instamart', 'dineout')),
  encrypted_token text not null,          -- AES-256-GCM, never plaintext
  expires_at      timestamptz not null,
  created_at      timestamptz default now(),
  unique (user_id, server)
);

-- Only the owning user can read their tokens
alter table swiggy_tokens enable row level security;
create policy "owner only" on swiggy_tokens
  for all using (auth.uid() = user_id);

-- ─── PKCE state (ephemeral; cleaned up after callback) ───────────────────────
create table if not exists pkce_state (
  state      text primary key,
  verifier   text not null,              -- PKCE verifier (plaintext; ephemeral)
  user_id    uuid references app_users(id) on delete cascade,
  created_at timestamptz default now()
);
-- Auto-purge after 5 minutes
create index on pkce_state (created_at);

-- ─── Comparison cache (for shareable URLs) ───────────────────────────────────
create table if not exists comparisons (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  recipe_id   text not null,
  payload     jsonb not null,           -- Comparison JSON (stripped of PII)
  created_at  timestamptz default now(),
  expires_at  timestamptz
);
create index on comparisons (slug);

-- ─── Audit log (every write call — OPERATIONS.md §Go-Live Checklist) ─────────
create table if not exists write_audit (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references app_users(id) on delete set null,
  tool            text not null,          -- 'place_food_order' | 'checkout' | 'book_table'
  idempotency_key text not null,
  confirmed_at    timestamptz not null,   -- timestamp of user confirmation
  guard_result    text not null,          -- 'allow' (SpendGuard result)
  spend_inr       numeric,
  created_at      timestamptz default now()
);
-- Never expose audit log to client
alter table write_audit enable row level security;
-- Only service role can read/write (no RLS policy = service role only)

-- ─── Spend tracking (daily caps) ─────────────────────────────────────────────
create table if not exists spend_tracking (
  user_id      uuid not null references app_users(id) on delete cascade,
  date_utc     date not null,
  spent_inr    numeric not null default 0,
  primary key (user_id, date_utc)
);
alter table spend_tracking enable row level security;
create policy "owner only" on spend_tracking
  for all using (auth.uid() = user_id);
