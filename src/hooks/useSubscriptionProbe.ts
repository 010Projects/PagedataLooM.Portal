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
