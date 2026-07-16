# Swiggy MCP Operations & Go-Live Reference

**v1.0** — OAuth 2.1 PKCE | 5-day access tokens | Invite-based access

---

## OAuth 2.1 PKCE Flow (Essential)

**Endpoints:** Base `https://mcp.swiggy.com`

| Endpoint | Purpose |
|----------|---------|
| `GET /auth/authorize` | Consent UI (user phone + OTP in browser) |
| `POST /auth/token` | Exchange code for access token |
| `POST /auth/logout` | Revoke session |

**Flow outline:**
1. Generate PKCE verifier (32 random bytes, base64url) + SHA256 challenge
2. Redirect user to `/auth/authorize?response_type=code&client_id=X&redirect_uri=Y&code_challenge=Z&code_challenge_method=S256&state=csrf&scope=mcp:tools`
3. User completes phone + OTP in browser → 302 redirect to your URI with `?code=...&state=...`
4. POST `/auth/token` with code + verifier → receive access_token, expires_in (432000 = 5 days)
5. Call tools with `Authorization: Bearer <access_token>`

**Token lifecycle:**
- Access token: 5 days | Auth code: 120s single-use | User session: 30 days idle
- **NO refresh tokens in v1.0** — re-run full OAuth flow after 5 days
- On 401: call reAuthenticate(); never retry with same token
- Store access_token in secure storage (OS keychain); hash user IDs at rest

**Scopes:** `mcp:tools` (call any tool), `mcp:resources` (read metadata), `mcp:prompts` (server templates). Server-level today; read/write-split planned v1.1+.

---

## Production Access (Invite-Based)

**Apply at:** `/access` form + demo video

**Who can apply:** Developers building real-user agents | Platform operators (voice/ambient) | Skill authors

**What we review:**
- Concrete use case with real end users
- Alignment with Swiggy consumer experience (user confirmation, no surprises)
- Technical readiness (OAuth, 401/429 handling, safe retries)
- Responsible traffic (QPS estimate, rate-limit compliance)
- Security baseline (HTTPS URIs, no plaintext PII)

**What you provide:**
1. Integration name & org
2. Redirect URIs (HTTPS exact-match; `http://localhost` allowed for dev; platform schemes case-by-case)
3. Servers requested (food, instamart, dineout)
4. Expected volume (orders/day, tool calls/day)
5. Use-case paragraph
6. Primary technical contact
7. Demo video (Loom/Drive/YouTube unlisted) showing end-to-end working flow

**Turnaround:** Staging credentials during review; production after 48h+ green staging. Enterprise: 4+ weeks (commercial negotiation).

**What you get:** client_id | staging credentials | production access | engineering contact | builders@swiggy.in Slack

**What you commit to:**
- Ship-to-production checklist complete before first real-user call
- 7-day notice for major traffic events
- Treat session IDs as support identifiers, not business keys
- No credential stuffing, scraping, or catalogue exports
- Security contact kept current

**Revocation triggers:** Security breach | Abuse patterns (scraping, stuffing) | Partner terms violation

---

## Rate Limits (Planned v1.x Developer Tier)

**Current:** Not enforced at MCP layer in v1.0 — abusive traffic shed upstream. No 429 responses today. No `X-RateLimit-*` headers today.

**Planned quotas (guidance):**
| Scope | Limit |
|-------|-------|
| Per user per server | 120 req/min |
| Per user per server (writes) | 30 req/min |
| Per client_id across servers | 50k req/day |
| Burst (10s window) | 2× steady-state |

**Planned response:** 429 + `Retry-After` header + `{"error": {"code": "RATE_LIMITED"}}` (once error registry ships).

**Apply for upgrade:** Mail builders@swiggy.in with client_id, expected QPS (sustained/peak), surface context (voice/chat/batch). Turnaround: typically same business day.

**Best practices now:**
- Batch requests (one get_addresses/session)
- Cache low-churn data (addresses, menus, images)
- Don't poll track_* faster than 10s
- Exponential backoff on 5xx (max 5 retries)
- Separate interactive from background traffic (different client_ids)

---

## SLA & Uptime

**v1 targets (not contractual; final SLA at contract sign):**

| Tier | Monthly SLO | Max downtime |
|------|------------|--------------|
| Prod endpoints | 99.9% | 43 min/month |
| OAuth endpoints | 99.9% | 43 min/month |
| Staging | Best-effort | — |

**Latency targets (edge, excl. client + inference):**
| Tool class | p50 | p95 | p99 |
|-----------|-----|-----|-----|
| Read (search, details) | <200ms | <600ms | <1200ms |
| Write (cart updates) | <400ms | <1000ms | <2000ms |
| Order placement | <800ms | <2000ms | <4000ms |

**Status page:** status.swiggy.com/mcp (shipping v1.1). Until then: email to your engineering contact.

**Incidents:** S0/S1 acknowledged during IST business hours. Regular written updates until resolved. RCA shared post-closure.

**Maintenance:** 72h advance notice to your contact. Avoids 12:00-14:00 IST & 19:00-22:00 IST peak meal hours.

**Measurement:** Successful requests / total requests, **excluding** 4xx, revoked/expired creds, upstream-shed traffic. Rolling calendar month.

**Remediation:** v1 on partnership basis; enterprise contracts include credit schedules.

---

## Data & Compliance (DPDP 2023)

**Fiduciary role:** Swiggy = Data Fiduciary | Your integration = Data Processor

**Key restrictions:**
- Users consent to Swiggy's processing; MCP doesn't expand scope
- Cannot use Swiggy-originated data for analytics, training, ad targeting without **separate explicit consent**
- Data subject requests go through Swiggy app, not to you
- Store session_id for support correlation; don't store full request/response bodies plaintext
- Hash user identifiers at rest unless lawful basis requires plaintext

**Data residency:** Primary: AWS Mumbai (ap-south-1), India. Secondary/failover: AWS Singapore (ap-southeast-1). **No US/EU routing of user data.**

**If your platform processes MCP responses outside India:**
1. Signed Data Processing Agreement with Swiggy required before production
2. Standard Contractual Clauses (SCCs) for cross-border transfers
3. Minimize fields crossing border — summarise locally when possible

**Encryption:** TLS 1.2+ in-transit (HSTS enforced) | AES-256 at rest | Signed JWT tokens with short lifetimes

**Audit logs:** Every tool call keyed by session_id, retained 90 days, available on lawful request.

**What flows:** User identifiers (opaque), tool args (addresses, coupons), tool responses (menu, order status, delivery info). All = PII under DPDP.

**Mandatory data practices:**
1. Don't persist user PII longer than session unless you have separate lawful basis + consent
2. Don't reuse Swiggy data for analytics/ads/training without explicit consent + DPA
3. Log only debug-essential data; session ID for correlation only
4. Honour deletion requests (account deletion → cascade delete your derived data)
5. Hash user identifiers at rest

**Certifications:** SOC 2 Type II, ISO 27001, PCI DSS available on request under NDA.

**Security contact:** security@swiggy.in (not builders) | 90-day responsible-disclosure window.

---

## Versioning (SemVer)

**Current:** v1.0

**Policy:** MAJOR (breaking) = 6-month deprecation window minimum | MINOR (compatible new feature) = ship immediately | PATCH (bug fix) = no schema change

**Breaking changes:** Removing tool | Removing required param | Adding required param | Type change | Field removal

**Non-breaking:** New tool | New optional param | New response field | New scope | Enum widening | New error code (handle unknown as generic failure)

**Deprecation timeline:**
- Day 0: Announcement to your engineering contact + blog + changelog (⚠ flag)
- Day 90: Old behaviour emits deprecation warning in `_meta.swiggy.deprecation` (v1.1+)
- Day 150: Escalated reminder email
- Day 180: Old behaviour removed

**Deprecation metadata (v1.1+):**
```json
{
  "_meta": {
    "swiggy.deprecation": {
      "tool": "old_name",
      "replaced_by": "new_name",
      "remove_after": "2026-10-01"
    }
  }
}
```

**You must:** Subscribe engineering alias to announcements | Wire alerting on `_meta.swiggy.deprecation` field | Plan migrations before 180-day cutoff | Watch changelog for v1 announcements

**Roadmap:** v1.1 adds `/v2/food` URL pinning for parallel major versions. Default always = latest.

---

## Error Classification & Retry

**Error buckets (parse by HTTP status + message prefix until symbolic codes ship):**

| Bucket | Signal | React |
|--------|--------|-------|
| Auth | 401 or JSON-RPC -32001 | Re-run OAuth flow |
| Bad input | 400, message starts `Invalid.../Missing...` | Fix args; no retry |
| Upstream timeout | 504 or message has `timeout` | Exponential backoff, max 5 |
| Upstream error | 502/503 | Exponential backoff, max 5 |
| Domain failure | 200 + success:false | Read message; mostly terminal (out of stock, slot gone, closed) — surface to user, no retry |
| Internal | 500 or JSON-RPC -32603 | Backoff once; escalate via report_error if persists |

**Planned symbolic codes (v1.1+):**
- `UNAUTHENTICATED` (401) | `TOKEN_EXPIRED` (401) | `SESSION_REVOKED` (419) | `INSUFFICIENT_SCOPE` (403) | `RATE_LIMITED` (429) | `VALIDATION_ERROR` (400) | `NOT_FOUND` (404) | `UPSTREAM_TIMEOUT` (504) | `UPSTREAM_ERROR` (502) | `INTERNAL_ERROR` (500)
- Domain: `SLOT_UNAVAILABLE`, `RESTAURANT_NOT_BOOKABLE`, `BOOKING_WINDOW_CLOSED` (Dineout)

**Retry strategy:** Exponential backoff with jitter. Start 500ms, double to 8s, cap 5 retries. For order placement (non-idempotent), check-then-retry: query status after failure before retrying the call.

---

## Go-Live Checklist

Before first real-user traffic, verify:

**Credentials & URIs:**
- Production client_id issued, staging green ≥48h
- Every redirect URI exact-match allowlisted (HTTPS required except localhost)

**Error handling:**
- Retry logic in place (exponential backoff, 401 re-auth, upstream timeout fallback)
- Order-placement paths use check-then-retry, not blind retry
- Cart confirmation UI shows items + total before placing order

**Rate limits:**
- Benchmarked expected QPS; confirmed under ceiling
- Batch requests where possible
- No faster than 10s polling on track_* calls

**Observability:**
- Session ID logged on every call
- Metrics exported (call latency p50/p95/p99, success rate, error distribution)
- Deprecation monitoring on `_meta.swiggy.deprecation` field

**Data handling:**
- Retention/deletion/consent flows align with DPDP compliance doc
- Sensitive data hashed at rest; no plaintext PII in logs
- If processing responses outside India: DPA + SCC in place

**Voice/Chat shaping:**
- Voice agents: prompts shaped for TTS (no rich markdown); handle high-burst QPS patterns
- Chat agents: can use rich cards/formatting

**Support readiness:**
- Internal runbook for "what do we do when Swiggy returns X"
- Incident contact (email/Slack) registered with Swiggy for S0/S1
- All builders@swiggy.in comms subscribed by engineering

**Rollout plan:**
- Traffic ramps 1% → 10% → 50% → 100% over ≥24 hours
- Monitoring active for regression detection

**Escalation:** If production failing after token refresh + endpoint verification + Swiggy outage ruled out, mail builders@swiggy.in with failing session IDs + timestamps.

---

**Last Updated:** 2026-07-04
