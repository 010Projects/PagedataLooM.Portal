import { useEffect, useRef } from 'react'
import { useMsal, useIsAuthenticated } from '@azure/msal-react'
import apiClient from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'
import { useDashboardStore } from '@/stores/dashboard-store'
import type { MeResponse } from '@/types/api'

// Bootstraps the session from GET /api/me exactly once per authenticated
// session (guarded on meStatus === 'idle'). Replaces useSubscriptionProbe —
// tenant identity and subscribed services now come from the backend, not
// from probing per-service endpoints.
export function useMeBootstrap() {
  const isAuthenticated = useIsAuthenticated()
  const { accounts } = useMsal()
  const { meStatus, setMe, setMeStatus, clearMe } = useAuthStore()
  const { setSubscribedServices } = useDashboardStore()

  // Identity of the account the current `me` was fetched for. A stale `me`
  // after an account switch is a cross-tenant display bug — invalidate it.
  const account = accounts[0]
  const accountId = account?.homeAccountId ?? account?.username ?? null
  const bootstrappedFor = useRef<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated || accountId === null) return
    if (bootstrappedFor.current !== null && bootstrappedFor.current !== accountId) {
      // Active account changed — drop the previous identity's data and let
      // the fetch effect re-bootstrap on the next render (meStatus → 'idle')
      clearMe()
    }
    bootstrappedFor.current = accountId
  }, [isAuthenticated, accountId, clearMe])

  useEffect(() => {
    if (!isAuthenticated || meStatus !== 'idle') return
    // Set 'loading' synchronously to prevent re-entry before the request lands
    setMeStatus('loading')

    async function bootstrap() {
      try {
        const { data: envelope } = await apiClient.get<MeResponse>('/api/me')
        const me = envelope?.data
        if (
          envelope?.success !== true ||
          !me ||
          typeof me.isPlatformAdmin !== 'boolean' ||
          !Array.isArray(me.subscribedServices)
        ) {
          setMeStatus('error')
          return
        }

        setMe(me)
        // Seed the dashboard: real services, first one active (null when none)
        setSubscribedServices(me.subscribedServices)
        useDashboardStore.setState({
          activeService: me.subscribedServices[0] ?? null,
          activeEntityKey: null,
        })
        setMeStatus('ready')
      } catch {
        // Network / 5xx / 403 — surface a retryable error, never sign out
        setMeStatus('error')
      }
    }

    bootstrap()
  }, [isAuthenticated, meStatus, setMe, setMeStatus, setSubscribedServices])
}
