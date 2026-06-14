# CLAUDE.md — PagedataLooM.Portal
## Hotfix 01 — Subscription-aware service tabs

---

## What this fixes

Every user currently sees all three service tabs (SQAS, ACCREDITATION, B-BBEE)
regardless of what their tenant subscribes to. Tenants see tabs that return
"No active subscription" — confusing and unprofessional for a precision tool.

**After this fix:** a tenant with one subscription sees one tab.
RS Carriers sees SQAS only. Southern Labs sees Accreditation only.
EmpowerDEX sees B-BBEE only.

---

## Approach

On dashboard load, probe all three audit-readiness endpoints in parallel using
`Promise.allSettled`. Endpoints that return `success: true` are subscribed.
Endpoints that return `NO_SUBSCRIPTION` are not. Store the subscribed list in
Zustand. The sidebar renders only subscribed tabs. The default active service
is set to the first subscribed service.

The probe runs once per session (when `subscribedServices` is null in the store).
React Query caches the results — the sidebar's entity queries reuse them for free.

---

## Files to change

```
src/stores/dashboard-store.ts       add subscribedServices field
src/hooks/useSubscriptionProbe.ts   new — parallel probe hook
src/components/layout/AppLayout.tsx call the probe hook
src/components/layout/AppSidebar.tsx filter tabs to subscribed only
```

No backend changes. No new endpoints. No type changes.

---

## Task 1 — Update dashboard store

In `src/stores/dashboard-store.ts`, add:

```typescript
interface DashboardStore {
  activeService:       ComplianceService
  activeEntityKey:     string | null
  subscribedServices:  ComplianceService[] | null   // null = probe not yet run
  setService:          (service: ComplianceService) => void
  setEntityKey:        (key: string) => void
  clearEntity:         () => void
  setSubscribedServices: (services: ComplianceService[]) => void
}

// In create():
subscribedServices: null,
setSubscribedServices: (services) => set({ subscribedServices: services }),
```

---

## Task 2 — Subscription probe hook

Create `src/hooks/useSubscriptionProbe.ts`:

```typescript
import { useEffect } from 'react'
import { useDashboardStore } from '@/stores'
import { useIsAuthenticated } from '@azure/msal-react'
import apiClient from '@/lib/api-client'
import type { ComplianceService } from '@/types/api'

const PROBE_ENDPOINTS: { service: ComplianceService; path: string }[] = [
  { service: 'sqas',          path: '/api/sqas/audit-readiness'          },
  { service: 'accreditation', path: '/api/accreditation/audit-readiness' },
  { service: 'bbbee',         path: '/api/bbbee/audit-readiness'         },
]

export function useSubscriptionProbe() {
  const isAuthenticated = useIsAuthenticated()
  const { subscribedServices, setSubscribedServices, activeService, setService } =
    useDashboardStore()

  useEffect(() => {
    // Only probe once per session and only when authenticated
    if (!isAuthenticated || subscribedServices !== null) return

    async function probe() {
      const results = await Promise.allSettled(
        PROBE_ENDPOINTS.map(({ path }) => apiClient.get(path))
      )

      const subscribed = PROBE_ENDPOINTS
        .filter((_, i) => {
          const r = results[i]
          // Subscribed = request fulfilled AND backend returned success: true
          return r.status === 'fulfilled' && r.value?.data?.success === true
        })
        .map(({ service }) => service)

      setSubscribedServices(subscribed)

      // If the current active service is not subscribed, switch to the first that is
      if (subscribed.length > 0 && !subscribed.includes(activeService)) {
        setService(subscribed[0])
      }
    }

    probe()
  }, [isAuthenticated, subscribedServices])
}
```

---

## Task 3 — Call the probe in AppLayout

In `src/components/layout/AppLayout.tsx`, add the hook call alongside `useAuth()`:

```typescript
import { useSubscriptionProbe } from '@/hooks/useSubscriptionProbe'

// Inside AppLayout component, after useAuth():
useSubscriptionProbe()
```

The probe runs once on mount after authentication. Results are cached in Zustand
for the session lifetime.

---

## Task 4 — Filter tabs in AppSidebar

In `src/components/layout/AppSidebar.tsx`, replace the service tab rendering
with a subscription-aware version.

Find the section that maps over `SERVICES` to render the tab buttons.
Replace it with:

```typescript
const { subscribedServices } = useDashboardStore()

// While probe is running, show no tabs (brief — parallel API calls)
if (subscribedServices === null) {
  return (
    <aside style={{ /* existing aside styles */ }}>
      <div style={{ padding: '10px', height: '100%', display: 'flex',
        flexDirection: 'column' }}>
        <div style={{ padding: '10px 10px 8px' }}>
          {/* Search box — unchanged */}
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center',
          justifyContent: 'center' }}>
          <p style={{ fontFamily: '"IBM Plex Sans"', fontSize: 11,
            color: '#CBD5E1', margin: 0 }}>
            Loading…
          </p>
        </div>
      </div>
    </aside>
  )
}

// No subscriptions at all
if (subscribedServices.length === 0) {
  return (
    <aside style={{ /* existing aside styles */ }}>
      <div style={{ padding: '1.5rem', fontFamily: '"IBM Plex Sans"' }}>
        <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>
          No active compliance subscriptions.
        </p>
      </div>
    </aside>
  )
}

// Filter SERVICES to only subscribed ones
const visibleServices = SERVICES.filter((s) => subscribedServices.includes(s))
```

Then use `visibleServices` instead of `SERVICES` in the tab button map.

If `visibleServices` has only one entry, the tab still renders (as selected and
visually prominent) so the user knows which service they are on. Do not hide the
tab when only one service exists — hide the **other** tabs, not this one.

---

## Task 5 — Test

Add to `src/stores/__tests__/dashboard-store.test.ts`:

```typescript
describe('subscribedServices', () => {
  it('starts as null (probe not yet run)', () => {
    expect(useDashboardStore.getState().subscribedServices).toBeNull()
  })

  it('setSubscribedServices stores the list', () => {
    useDashboardStore.getState().setSubscribedServices(['sqas'])
    expect(useDashboardStore.getState().subscribedServices).toEqual(['sqas'])
  })

  it('empty array means no subscriptions (not null)', () => {
    useDashboardStore.getState().setSubscribedServices([])
    expect(useDashboardStore.getState().subscribedServices).toEqual([])
    expect(useDashboardStore.getState().subscribedServices).not.toBeNull()
  })
})
```

Run `npm test` — must pass.

---

## Task 6 — Build and deploy

```bash
npm test          # must pass
npm run build     # must be clean
```

```powershell
Use-PageLooMInfra

$deployToken = az staticwebapp secrets list `
  --name swa-pageloom-dev-weu `
  --resource-group rg-pageloom-dev-weu `
  --query "properties.apiKey" -o tsv

cd C:\Users\Bheki\source\repos\PagedataLooM.Portal

swa deploy ./dist `
  --deployment-token $deployToken `
  --env production
```

---

## Verification

Sign in as each account on the production URL and confirm:

| Account | Expected tabs | Must NOT show |
|---|---|---|
| `rscarriers-admin` | SQAS only | ACCREDITATION, B-BBEE |
| `southernlabs-admin` | ACCREDITATION only | SQAS, B-BBEE |
| `empowerdex-admin` | B-BBEE only | SQAS, ACCREDITATION |

---

## Commit message

```
fix: show only subscribed service tabs per tenant
```

---

## Do not

- Do not make the probe call on every render. The `subscribedServices !== null`
  guard in the effect ensures it runs exactly once per session.
- Do not show the loading state for more than a second. If the probe is slow,
  investigate network issues rather than extending the loading UI.
- Do not remove the SERVICES constant — it is still used as the source of truth
  for ordering. Filter it, do not replace it.

---

*Hotfix 01 · Pre-client-go-live · PagedataLooM.Portal*