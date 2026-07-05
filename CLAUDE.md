# CLAUDE.md — Portal: consume GET /api/me (fix tenant/service display)

## Scope guardrail
FRONTEND ONLY (Portal repo `010Projects/PagedataLooM.Portal`). Do NOT write or assume backend
code. `/api/me` is a CONFIRMED, DEPLOYED backend endpoint (commit 5554e79, live on dev). We consume
it; we do not change it.

## Why
Today the Portal hardcodes tenant "RS Carriers" onto the `sqas` service in SERVICE_CONFIG and
defaults `activeService` to `'sqas'`, so EVERY signed-in user (including PlatformAdmins with no
tenant) wrongly sees "RS Carriers / SQAS". Replace this with real data from `/api/me`.

## Confirmed /api/me contract (do not deviate)
Standard envelope `{ success, data, error, correlationId }`. `data`:
```typescript
interface MeData {
  tenantId: string
  tenantName: string | null            // null for PlatformAdmin
  isPlatformAdmin: boolean
  role: 'PlatformAdmin' | 'TenantAdmin' | 'TenantUser' | 'ComplianceUser' | 'Viewer' | 'EntityUser'
  email: string
  subscribedServices: ('sqas' | 'accreditation' | 'bbbee')[]   // lowercase, may be []
}
```
Behaviours: PlatformAdmin → `subscribedServices: []`, `tenantName: null`. Tenant users →
populated lowercase services. A NON-admin user may also have `[]` (no services configured) — this
is DIFFERENT from PlatformAdmin and MUST be distinguished by `isPlatformAdmin`, NOT by empty array.

---

## Task 1 — types: add MeData
In `src/types/api.ts`, add the `MeData` interface exactly as above (and a `MeResponse` = the
envelope wrapping it if the codebase types envelopes explicitly). Keep `ComplianceService` =
`'sqas' | 'accreditation' | 'bbbee'`.

## Task 2 — auth store: hold the bootstrap result
In `src/stores/auth-store.ts`, add fields for the `/api/me` result:
- `me: MeData | null` (null = not yet bootstrapped)
- `meStatus: 'idle' | 'loading' | 'ready' | 'error'`
- setters: `setMe(me)`, `setMeStatus(status)`, and `clearMe()` (for account-switch invalidation).

## Task 3 — bootstrap hook: call /api/me ONCE per authenticated session
Create `src/hooks/useMeBootstrap.ts`:
- Runs after authentication (use the existing auth/isAuthenticated signal, same pattern as the old
  useSubscriptionProbe).
- Calls `GET /api/me` via the existing `apiClient` EXACTLY ONCE per session (guard on
  `meStatus === 'idle'`, set 'loading' immediately to prevent re-entry). NEVER call on render, never
  poll.
- On success: `setMe(data)`, `setMeStatus('ready')`, and seed the dashboard store:
  `setSubscribedServices(data.subscribedServices)`; set `activeService` to
  `data.subscribedServices[0] ?? null`.
- On failure (network / 5xx / 403 / malformed envelope / success:false): `setMeStatus('error')`.
  Do NOT sign out, do NOT throw to a blank screen.
- **Account-switch invalidation:** detect MSAL active-account change; on change call `clearMe()` +
  reset `meStatus` to 'idle' so the next render re-bootstraps for the new identity. A stale `me`
  from a previous account is a cross-tenant display bug — this guard is REQUIRED.

## Task 4 — dashboard store: activeService nullable, no hardcoded default
In `src/stores/dashboard-store.ts`:
- Change `activeService: ComplianceService` → `activeService: ComplianceService | null`.
- Change the INITIAL value from `'sqas'` to `null`.
- `setService` unchanged (still sets a concrete service).
Update all readers of `activeService` to handle null (see Task 6).

## Task 5 — REMOVE the old probe + decouple tenant from SERVICE_CONFIG
- Delete `src/hooks/useSubscriptionProbe.ts` and its usage (replaced by useMeBootstrap). Remove its
  import/call in `AppLayout.tsx`.
- In `src/types/api.ts` SERVICE_CONFIG: the `tenant` field is now WRONG (tenant comes from /api/me,
  not per-service). REMOVE the `tenant` property from each SERVICE_CONFIG entry (keep label,
  colors, paths). Fix any references to `SERVICE_CONFIG[x].tenant`.

## Task 6 — AppLayout / AppHeader: render from real data
`src/components/layout/AppLayout.tsx`:
- Call `useMeBootstrap()` (replacing useSubscriptionProbe).
- Read `me`, `meStatus` from auth store and `activeService`, `subscribedServices` from dashboard store.
- **Gate on meStatus:**
  - `loading`/`idle` → a lightweight loading state (not the full dashboard shell).
  - `error` → a RETRYABLE error state (message + Retry button that re-triggers the bootstrap by
    resetting meStatus to 'idle'). Do NOT render the dashboard shell. Do NOT sign out. Copy:
    the session is authenticated but couldn't load your workspace — offer Retry.
  - `ready` → render the shell (below).
- **Breadcrumb tenant:** pass `me.tenantName` (may be null → render no tenant segment / a
  PlatformAdmin label). Do NOT use SERVICE_CONFIG for tenant anymore.
- **Service segment:** from `activeService` (null → no service segment).

`src/components/layout/AppHeader.tsx`:
- Tenant segment renders only when `tenantName` is non-null.
- Add a **service dropdown/selector** populated from `subscribedServices` (the user's real
  services). Selecting one calls `setService`. If `subscribedServices` has 0 or 1 items, render a
  static label or nothing rather than a pointless dropdown (1 item = just show it; 0 = none).

## Task 7 — the three end states (distinguish by isPlatformAdmin, NOT empty array)
When `meStatus === 'ready'`:
- **PlatformAdmin** (`me.isPlatformAdmin === true`): no compliance service tabs. Show a
  PlatformAdmin view/placeholder (e.g. "Platform administration" + note that tenant selection is
  coming) — NOT a compliance dashboard, NOT the empty-services message. tenantName is null → don't
  show a tenant breadcrumb.
- **Non-admin with `subscribedServices: []`**: a named "No compliance services configured for your
  organisation" empty state (show tenantName). NEVER a blank dashboard. This is DISTINCT from
  PlatformAdmin.
- **Tenant user with services**: normal dashboard; service tabs = subscribedServices; activeService
  = first (already seeded); tenant breadcrumb = tenantName.

## Task 8 — MSW handlers (same change, required)
In the shared MSW handlers (`src/test/msw/handlers.ts` — the project's single shared handler array),
add `/api/me` handlers behind the MSW setup, matching the locked envelope, covering:
1. tenant user, multiple services (e.g. ['sqas','accreditation'])
2. tenant user, one service (['sqas'])
3. PlatformAdmin (isPlatformAdmin true, tenantName null, [])
4. non-admin, empty subscriptions (isPlatformAdmin false, tenantName set, [])
5. failure response in the standard envelope (success:false / error) to exercise the error state
Make it possible to select which variant per test (e.g. a helper or override), so tab-rendering and
empty/error states are testable WITHOUT live role-switching.

## Task 9 — tests
Mirror existing test conventions (route tables for RequireAuth-style tests, `toHaveStyle` for
colors, payload-property assertions). Cover:
- bootstrap success seeds subscribedServices + activeService (first service)
- account switch clears me + re-bootstraps (no stale cross-tenant data)
- PlatformAdmin → no service tabs, PlatformAdmin view
- non-admin empty subscriptions → empty state (NOT PlatformAdmin view, NOT blank)
- /api/me failure → retryable error state, shell NOT rendered, not signed out
- service dropdown lists exactly subscribedServices; selecting sets activeService

## Verify
- `npm run test` (vitest run) green; report the test count.
- `npx tsc -b && npx vite build --mode development` builds clean (activeService null-handling
  compiles).
- No remaining references to `SERVICE_CONFIG[...].tenant` or `useSubscriptionProbe`.

## Do NOT commit — report back with: test count, and confirm the five MSW variants + failure/retry
state are covered. (These map to the evidence the PM chat needs: tenant-user tabs, PlatformAdmin
no-tabs, non-admin empty state, MSW variants committed, failure/retry works.)
```