import { ThreadRegistryMark, Wordmark } from '@/components/brand'
import { useAuthStore } from '@/stores/auth-store'
import { useDashboardStore } from '@/stores'
import { useAuth } from '@/hooks/useAuth'
import { SERVICE_CONFIG, type ComplianceService } from '@/types/api'

interface AppHeaderProps {
  // From /api/me — null for PlatformAdmin (no tenant segment rendered)
  tenantName?: string | null
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function AppHeader({ tenantName }: AppHeaderProps) {
  const { user } = useAuthStore()
  const { logout } = useAuth()
  const { activeService, subscribedServices, setService } = useDashboardStore()

  const services = subscribedServices ?? []
  const showBreadcrumb = tenantName != null || services.length > 0

  return (
    <header style={{
      background: '#FFFFFF',
      borderBottom: '0.5px solid #E2E8F0',
      flexShrink: 0,
    }}>
      {/* Thread stripe */}
      <div style={{ height: 2, display: 'flex' }}>
        {['#312E7A','#1E40AF','#065F46','#92400E','#7F1D1D'].map((color) => (
          <div key={color} style={{ flex: 1, background: color }} />
        ))}
      </div>

      {/* Header row */}
      <div style={{
        height: 46,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 12,
      }}>
        <ThreadRegistryMark variant="light" height={24} />
        <Wordmark variant="light" size="sm" />

        {showBreadcrumb && (
          <>
            <div style={{ width: 0.5, height: 18, background: '#E2E8F0' }} />
            {tenantName != null && (
              <span style={{
                fontFamily: '"IBM Plex Sans", sans-serif',
                fontSize: 11.5,
                color: '#94A3B8',
              }}>
                {tenantName}
              </span>
            )}
            {tenantName != null && services.length > 0 && (
              <span style={{ fontSize: 11.5, color: '#94A3B8' }}>/</span>
            )}
            {/* 1 service = static label; 2+ = selector; 0 = nothing */}
            {services.length === 1 && (
              <span style={{
                fontFamily: '"IBM Plex Sans", sans-serif',
                fontSize: 11.5,
                fontWeight: 500,
                color: '#1E40AF',
              }}>
                {SERVICE_CONFIG[services[0]].label}
              </span>
            )}
            {services.length > 1 && (
              <select
                aria-label="Service"
                value={activeService ?? services[0]}
                onChange={(e) => setService(e.target.value as ComplianceService)}
                style={{
                  fontFamily: '"IBM Plex Sans", sans-serif',
                  fontSize: 11.5,
                  fontWeight: 500,
                  color: '#1E40AF',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {services.map((svc) => (
                  <option key={svc} value={svc}>
                    {SERVICE_CONFIG[svc].label}
                  </option>
                ))}
              </select>
            )}
          </>
        )}

        <div style={{ flex: 1 }} />

        {/* Avatar with logout */}
        <button
          onClick={logout}
          title={`Sign out (${user?.email ?? ''})`}
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: '#0D1F3C',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{
            fontFamily: '"IBM Plex Sans", sans-serif',
            fontSize: 10,
            fontWeight: 600,
            color: '#FFFFFF',
          }}>
            {user?.name ? getInitials(user.name) : '?'}
          </span>
        </button>
      </div>
    </header>
  )
}
