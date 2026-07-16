# Tech stack

Council-decided, opinionated. Bias: boring, well-documented tech that AI coding agents write flawlessly; one deployable unit; near-zero fixed monthly cost; India latency + DPDP residency.

## The stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 14+ (App Router) + TypeScript** | Frontend + backend routes (OAuth callbacks, MCP orchestration) in one deployable; deepest AI-agent training coverage = fewest hallucinated APIs |
| Styling | **Tailwind CSS + shadcn/ui** | Accessible card/bottom-sheet/dialog primitives out of the box; see DESIGN_RULES.md for tokens |
| State | **Zustand** (client UI) + **TanStack Query** (all server state) | Query gives caching/retry semantics free; no Redux, no tRPC/GraphQL — plain typed fetch + server actions |
| Hosting | **Vercel, Mumbai region (`bom1`), Node serverless functions** | Standard Node runtime — MCP SDK + OAuth libs work unmodified. NOT Cloudflare Workers (V8-isolate fights streamable-HTTP MCP + partial Node compat) |
| Database | **Supabase Postgres (ap-south-1 Mumbai)** | DPDP residency for tokens/users/caches; RLS for encrypted token storage; generous free tier |
| Hot cache | **Upstash Redis (Mumbai/Singapore, pay-per-request)** | Idempotency keys, reel-URL→recipe, ingredient→SKU caches; scales to zero |
| MCP client | **`@modelcontextprotocol/sdk` (official TS SDK), streamable HTTP** | Canonical implementation Swiggy targets. Wrap in a thin orchestration layer for retries/idempotency — never fork the SDK |
| App auth | **Supabase Auth, phone OTP** | India users expect mobile-number login; already in stack, zero extra service |
| Transcription | **Groq Whisper-large-v3 API** | Cheapest/fastest Whisper-class for reel audio |
| LLM — recipe extraction | **Gemini 2.5 Flash / GPT-4o-mini tier** | Structured JSON from long transcripts; permanent reel-URL cache = pay once per unique reel |
| LLM — SKU matching | **Cheapest tier (Flash-Lite / 4o-mini)** | Short-context classification; per-city permanent cache |
| PWA | **Serwist** (maintained next-pwa successor) | Simple service worker + manifest; avoid raw Workbox config |
| CI/deploy | **GitHub + Vercel git integration** | Preview deploys free; one GitHub Action for lint/typecheck gate only |

## Media handling (reels)

User-uploaded video/pasted link content only (see GUARDRAILS.md #7) → transient storage in Supabase Storage (Mumbai) → Groq transcription → **delete raw media immediately**, keep transcript + hash for caching.

## DPDP / region notes

- All persistent data in Mumbai (Supabase) — satisfies residency.
- LLM calls: prefer APAC endpoints (Gemini has them; OpenAI doesn't guarantee India/APAC routing). **Open compliance gap — document in privacy policy.** Mitigation: only transcripts and ingredient text reach the LLM, never user PII or Swiggy tokens.

## Explicit rejections

- **SvelteKit** — bundle-size win not worth losing AI-agent fluency and ecosystem depth
- **Cloudflare Workers** — runtime constraints vs MCP SDK/OAuth outweigh DPDP optics
- **Railway/Fly** — no mature India region; solo infra management for no benefit
- **Turso** — thinner India story than Supabase for OAuth/relational workloads
- **Separate backend repo/service** — maintenance tax; Next.js routes cover it

## Cost profile

$0–20/month fixed (Vercel Hobby→Pro as needed, Supabase free tier, Upstash per-request) + LLM per-call. Cached dishes cost ~zero (see ARCHITECTURE.md token-economy rules).
