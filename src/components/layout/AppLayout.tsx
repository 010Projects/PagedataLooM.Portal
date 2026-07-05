import { Outlet } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AppHeader } from './AppHeader'
import { AppSidebar } from './AppSidebar'
import { useAuth } from '@/hooks/useAuth'
import { useMeBootstrap } from '@/hooks/useMeBootstrap'
import { useAuthStore } from '@/stores/auth-store'
import { useDashboardStore } from '@/stores'

export function AppLayout() {
  // Hydrate user store on layout mount
  useAuth()
  // Bootstrap tenant/services from /api/me once per authenticated session
  useMeBootstrap()

  const { me, meStatus, setMeStatus } = useAuthStore()
  const { subscribedServices } = useDashboardStore()

  // Not bootstrapped yet — lightweight state, not the dashboard shell
  if (meStatus === 'idle' || meStatus === 'loading') {
    return (
      <CenteredScreen>
        <ThreadStripes />
        <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>
          Loading your workspace…
        </p>
      </CenteredScreen>
    )
  }

  // Bootstrap failed — session is authenticated but the workspace couldn't
  // load. Retryable; never sign the user out, never render the shell.
  if (meStatus === 'error') {
    return (
      <CenteredScreen>
        <ThreadStripes />
        <p style={{ fontSize: 14, fontWeight: 600, color: '#0D1F3C', margin: '0 0 6px' }}>
          Couldn't load your workspace
        </p>
        <p style={{ fontSize: 12, color: '#94A3B8', margin: '0 0 16px', lineHeight: 1.5 }}>
          You're signed in, but we couldn't load your organisation and services.
        </p>
        <button
          onClick={() => setMeStatus('idle')}
          style={{
            fontFamily: '"IBM Plex Sans", sans-serif',
            fontSize: 12, fontWeight: 600, padding: '7px 18px',
            borderRadius: 4, background: '#0D1F3C', color: '#FFFFFF',
            border: 'none', cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </CenteredScreen>
    )
  }

  // ready — three end states, distinguished by isPlatformAdmin, NOT by
  // an empty subscribedServices array
  const tenantName = me?.tenantName ?? null

  if (me?.isPlatformAdmin) {
    return (
      <Shell tenantName={null}>
        <main style={mainStyle}>
          <CenteredNote>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#0D1F3C', margin: '0 0 6px' }}>
              Platform administration
            </p>
            <p style={{ fontSize: 12, color: '#94A3B8', margin: 0, lineHeight: 1.5 }}>
              You're signed in as a platform administrator. Tenant selection is coming soon.
            </p>
          </CenteredNote>
        </main>
      </Shell>
    )
  }

  if ((subscribedServices ?? []).length === 0) {
    return (
      <Shell tenantName={tenantName}>
        <main style={mainStyle}>
          <CenteredNote>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#0D1F3C', margin: '0 0 6px' }}>
              No compliance services configured for your organisation
            </p>
            <p style={{ fontSize: 12, color: '#94A3B8', margin: 0, lineHeight: 1.5 }}>
              {tenantName ?? 'Your organisation'} has no active compliance services yet.
              Contact your administrator to get set up.
            </p>
          </CenteredNote>
        </main>
      </Shell>
    )
  }

  // Tenant user with services — the normal dashboard shell
  return (
    <Shell tenantName={tenantName}>
      <AppSidebar />
      <main style={mainStyle}>
        <Outlet />
      </main>
    </Shell>
  )
}

// ── Layout chrome ─────────────────────────────────────────────────────────

const mainStyle = {
  flex: 1,
  overflow: 'auto',
  background: '#FFFFFF',
} as const

function Shell({ tenantName, children }: { tenantName: string | null; children: ReactNode }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
    }}>
      <AppHeader tenantName={tenantName} />
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}

function CenteredScreen({ children }: { children: ReactNode }) {
  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#FFFFFF', fontFamily: '"IBM Plex Sans", sans-serif',
      textAlign: 'center', padding: '0 24px',
    }}>
      {children}
    </div>
  )
}

function CenteredNote({ children }: { children: ReactNode }) {
  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: '"IBM Plex Sans", sans-serif',
      textAlign: 'center', padding: '0 24px',
    }}>
      <ThreadStripes />
      {children}
    </div>
  )
}

function ThreadStripes() {
  return (
    <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 16 }}>
      {['#312E7A', '#1E40AF', '#065F46', '#92400E', '#7F1D1D'].map((c) => (
        <div key={c} style={{
          width: 4, height: 32, borderRadius: 1, background: c, opacity: 0.3,
        }} />
      ))}
    </div>
  )
}
