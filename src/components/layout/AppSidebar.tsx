import { useMemo, type CSSProperties } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useDashboardStore, useAuthStore } from '@/stores'
import { useAuditReadiness, ApiRequestError } from '@/hooks/useCompliance'
import { SERVICE_CONFIG, type ComplianceService } from '@/types/api'

const SERVICES: ComplianceService[] = ['sqas', 'accreditation', 'bbbee']

// Shared aside chrome — reused by the loading / empty / loaded states
const asideStyle: CSSProperties = {
  width: 196,
  background: '#F8FAFC',
  borderRight: '0.5px solid #E2E8F0',
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}

interface SidebarEntity {
  entityKey: string
  expiring: number
  expired: number
}

export function AppSidebar() {
  const { activeService, activeEntityKey, subscribedServices, setService, setEntityKey } = useDashboardStore()
  const { isTenantAdmin, isPlatformAdmin, isComplianceUser } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const isSettings = location.pathname.startsWith('/settings')
  const isCredentials = location.pathname.startsWith('/credentials')
  const { data, isLoading, isError, error } = useAuditReadiness(activeService)

  // The backend has no entity-list endpoint — derive distinct entities from
  // the requirements that reference them (verified shape, Task 0 discovery)
  const entities = useMemo<SidebarEntity[]>(() => {
    if (!data) return []
    const map = new Map<string, SidebarEntity>()
    for (const req of data.Requirements) {
      if (!req.EntityKey) continue
      const entity = map.get(req.EntityKey) ?? { entityKey: req.EntityKey, expiring: 0, expired: 0 }
      if (req.Status === 'Expiring') entity.expiring++
      if (req.Status === 'Expired') entity.expired++
      map.set(req.EntityKey, entity)
    }
    return [...map.values()]
  }, [data])

  const subscriptionInactive =
    error instanceof ApiRequestError && error.code === 'SUBSCRIPTION_INACTIVE'

  // While the probe is running, show the search box and a brief loading note
  if (subscribedServices === null) {
    return (
      <aside style={asideStyle}>
        <SearchBox />
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <p style={{ fontFamily: '"IBM Plex Sans"', fontSize: 11, color: '#CBD5E1', margin: 0 }}>
            Loading…
          </p>
        </div>
      </aside>
    )
  }

  // No subscriptions at all
  if (subscribedServices.length === 0) {
    return (
      <aside style={asideStyle}>
        <div style={{ padding: '1.5rem', fontFamily: '"IBM Plex Sans"' }}>
          <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>
            No active compliance subscriptions.
          </p>
        </div>
      </aside>
    )
  }

  // Show only subscribed tabs — SERVICES stays the source of truth for ordering.
  // A single subscribed service still renders its tab (selected & prominent).
  const visibleServices = SERVICES.filter((s) => subscribedServices.includes(s))

  return (
    <aside style={asideStyle}>

      {/* Search */}
      <SearchBox />

      {/* Service selector */}
      <div style={{
        display: 'flex', gap: 2, padding: '0 10px 8px', flexShrink: 0,
      }}>
        {visibleServices.map((svc) => {
          const cfg = SERVICE_CONFIG[svc]
          const isActive = svc === activeService
          return (
            <button
              key={svc}
              onClick={() => setService(svc)}
              style={{
                flex: 1, padding: '4px 0', fontSize: 9, fontWeight: 600,
                fontFamily: '"IBM Plex Sans"',
                borderRadius: 3, border: 'none', cursor: 'pointer',
                letterSpacing: '0.04em', textTransform: 'uppercase',
                background: isActive ? cfg.threadColorLight : 'transparent',
                color: isActive ? '#FFFFFF' : '#94A3B8',
              }}
            >
              {cfg.label}
            </button>
          )
        })}
      </div>

      {/* Entity list */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {isLoading && (
          <div style={{ padding: '12px 14px' }}>
            <p style={{ fontSize: 11, color: '#CBD5E1', fontFamily: '"IBM Plex Sans"', margin: 0 }}>
              Loading…
            </p>
          </div>
        )}

        {isError && (
          <div style={{ padding: '12px 14px' }}>
            <p style={{
              fontSize: 11, fontFamily: '"IBM Plex Sans"', margin: 0,
              color: subscriptionInactive ? '#94A3B8' : '#EF4444',
              lineHeight: 1.5,
            }}>
              {subscriptionInactive
                ? 'No active subscription for this service'
                : 'Could not load entities'}
            </p>
          </div>
        )}

        {data && (
          <>
            <div style={{ padding: '6px 12px 4px' }}>
              <p style={{
                fontSize: 9, fontWeight: 600, margin: 0, letterSpacing: '0.08em',
                textTransform: 'uppercase', fontFamily: '"IBM Plex Sans"',
                color: SERVICE_CONFIG[activeService].threadColorLight,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <span style={{
                  width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                  background: SERVICE_CONFIG[activeService].threadColorLight,
                  display: 'inline-block',
                }} />
                {SERVICE_CONFIG[activeService].label} · {SERVICE_CONFIG[activeService].tenant}
              </p>
            </div>

            {entities.map((entity) => {
              const isSelected = entity.entityKey === activeEntityKey
              return (
                <div
                  key={entity.entityKey}
                  onClick={() => setEntityKey(entity.entityKey)}
                  style={{
                    padding: '6px 10px 6px 14px',
                    borderLeft: `2px solid ${isSelected
                      ? SERVICE_CONFIG[activeService].threadColorLight
                      : 'transparent'}`,
                    background: isSelected ? '#EFF6FF' : 'transparent',
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    gap: 7,
                  }}
                >
                  <span style={{
                    fontFamily: '"IBM Plex Sans"',
                    fontSize: 11.5,
                    fontWeight: isSelected ? 500 : 400,
                    color: isSelected ? '#1E293B' : '#475569',
                    flex: 1, overflow: 'hidden', textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {entity.entityKey}
                  </span>
                  {(entity.expired > 0 || entity.expiring > 0) && (
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                      background: entity.expired > 0 ? '#EF4444' : '#F59E0B',
                    }} />
                  )}
                </div>
              )
            })}

            {entities.length === 0 && (
              <div style={{ padding: '12px 14px' }}>
                <p style={{ fontSize: 11, color: '#CBD5E1', fontFamily: '"IBM Plex Sans"', margin: 0 }}>
                  No entities found
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Credentials — ComplianceUser / TenantAdmin only (R6).
          Viewer and EntityUser must not see this. */}
      {(isComplianceUser() || isTenantAdmin()) && (
        <div style={{ borderTop: '0.5px solid #E2E8F0', padding: '8px 10px', flexShrink: 0 }}>
          <button
            onClick={() => navigate('/credentials')}
            style={{
              width: '100%', padding: '6px 10px 6px 14px',
              borderTop: 'none', borderRight: 'none', borderBottom: 'none',
              borderLeft: `2px solid ${isCredentials ? '#1E40AF' : 'transparent'}`,
              background: isCredentials ? '#EFF6FF' : 'transparent',
              cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 7,
              fontFamily: '"IBM Plex Sans"', fontSize: 11.5,
              color: isCredentials ? '#1E40AF' : '#64748B',
              fontWeight: isCredentials ? 500 : 400,
              borderRadius: 0,
            }}
          >
            <CredentialIcon />
            Credentials
          </button>
        </div>
      )}

      {/* Settings — TenantAdmin / PlatformAdmin only (Journey 3) */}
      {(isTenantAdmin() || isPlatformAdmin()) && (
        <div style={{ borderTop: '0.5px solid #E2E8F0', padding: '8px 10px', flexShrink: 0 }}>
          <button
            onClick={() => navigate('/settings/notifications')}
            style={{
              width: '100%', padding: '6px 10px 6px 14px',
              // Longhand sides only — mixing `border` shorthand with `borderLeft`
              // on a re-rendering element triggers a React style-conflict warning
              borderTop: 'none', borderRight: 'none', borderBottom: 'none',
              borderLeft: `2px solid ${isSettings ? '#1E40AF' : 'transparent'}`,
              background: isSettings ? '#EFF6FF' : 'transparent',
              cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 7,
              fontFamily: '"IBM Plex Sans"', fontSize: 11.5,
              color: isSettings ? '#1E40AF' : '#64748B',
              fontWeight: isSettings ? 500 : 400,
              borderRadius: 0,
            }}
          >
            <SettingsIcon />
            Settings
          </button>
        </div>
      )}
    </aside>
  )
}

function SearchBox() {
  return (
    <div style={{ padding: '10px 10px 8px', flexShrink: 0 }}>
      <div style={{
        border: '0.5px solid #E2E8F0', borderRadius: 4,
        padding: '6px 10px', display: 'flex', alignItems: 'center',
        gap: 6, background: '#FFFFFF',
      }}>
        <SearchIcon />
        <span style={{ fontFamily: '"IBM Plex Sans"', fontSize: 11, color: '#CBD5E1' }}>
          Search entities…
        </span>
      </div>
    </div>
  )
}

function SettingsIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

function CredentialIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  )
}
