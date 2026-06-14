import { Outlet } from 'react-router-dom'
import { AppHeader } from './AppHeader'
import { AppSidebar } from './AppSidebar'
import { useAuth } from '@/hooks/useAuth'
import { useSubscriptionProbe } from '@/hooks/useSubscriptionProbe'
import { useDashboardStore } from '@/stores'
import { SERVICE_CONFIG } from '@/types/api'

export function AppLayout() {
  // Hydrate user store on layout mount
  useAuth()
  // Probe subscriptions once per session after authentication
  useSubscriptionProbe()

  const { activeService } = useDashboardStore()
  const svc = SERVICE_CONFIG[activeService]

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
    }}>
      <AppHeader breadcrumb={{ tenant: svc.tenant, service: svc.label }} />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <AppSidebar />
        <main style={{
          flex: 1,
          overflow: 'auto',
          background: '#FFFFFF',
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
