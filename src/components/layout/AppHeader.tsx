import { ThreadRegistryMark, Wordmark } from '@/components/brand'
import { useAuthStore } from '@/stores/auth-store'
import { useAuth } from '@/hooks/useAuth'

interface AppHeaderProps {
  breadcrumb?: { tenant?: string; service?: string }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function AppHeader({ breadcrumb }: AppHeaderProps) {
  const { user } = useAuthStore()
  const { logout } = useAuth()

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

        {breadcrumb && (
          <>
            <div style={{ width: 0.5, height: 18, background: '#E2E8F0' }} />
            {breadcrumb.tenant && (
              <span style={{
                fontFamily: '"IBM Plex Sans", sans-serif',
                fontSize: 11.5,
                color: '#94A3B8',
              }}>
                {breadcrumb.tenant}
              </span>
            )}
            {breadcrumb.service && (
              <>
                <span style={{ fontSize: 11.5, color: '#94A3B8' }}>/</span>
                <span style={{
                  fontFamily: '"IBM Plex Sans", sans-serif',
                  fontSize: 11.5,
                  fontWeight: 500,
                  color: '#1E40AF',
                }}>
                  {breadcrumb.service}
                </span>
              </>
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
