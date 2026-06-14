import { useMsal, useIsAuthenticated } from '@azure/msal-react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginRequest } from '@/lib/msal-config'
import { ThreadRegistryMark, Wordmark, ThreadStripe } from '@/components/brand'

interface ServiceIndicator {
  label: string
  tenant: string
  color: string
}

const COMPLIANCE_SERVICES: ServiceIndicator[] = [
  { label: 'SQAS',          tenant: 'RS Carriers',   color: '#60A5FA' },
  { label: 'Accreditation', tenant: 'Southern Labs',  color: '#34D399' },
  { label: 'B-BBEE',        tenant: 'EmpowerDEX',    color: '#818CF8' },
]

// SVG grid line positions for the loom-grid background
const GRID_VERTICALS   = [36, 72, 108, 144, 180, 216]
const GRID_HORIZONTALS = [36, 72, 108, 144, 180, 216, 252, 288, 324, 360, 396, 432, 468, 504]

export function LoginPage() {
  const { instance } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  const navigate = useNavigate()

  // If already authenticated, skip login
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const handleLogin = () => {
    instance.loginRedirect(loginRequest).catch(console.error)
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      fontFamily: '"IBM Plex Sans", sans-serif',
    }}>

      {/* ── LEFT PANEL ─────────────────────────────────────────── */}
      <div style={{
        width: 252,
        background: '#0D1F3C',
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Loom grid background */}
        <svg
          style={{ position: 'absolute', top: 0, left: 0, width: 252, height: '100%' }}
          viewBox="0 0 252 520"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          {GRID_VERTICALS.map((x) => (
            <line key={`v${x}`} x1={x} y1={0} x2={x} y2={520}
              stroke="white" strokeWidth={0.5} opacity={0.035} />
          ))}
          {GRID_HORIZONTALS.map((y) => (
            <line key={`h${y}`} x1={0} y1={y} x2={252} y2={y}
              stroke="white" strokeWidth={0.5} opacity={0.035} />
          ))}
        </svg>

        {/* Content */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          height: '100%',
          minHeight: '100vh',
          padding: '2.25rem 1.875rem',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}>
          {/* Mark + wordmark + tagline */}
          <div style={{ marginBottom: 'auto' }}>
            <div style={{ marginBottom: 16 }}>
              <ThreadRegistryMark variant="dark" height={76} />
            </div>
            <Wordmark variant="dark" size="md" />
            <p style={{
              fontFamily: '"IBM Plex Sans", sans-serif',
              fontSize: 9.5,
              color: 'rgba(255,255,255,0.35)',
              margin: '6px 0 0',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>
              Page-level intelligence
            </p>
          </div>

          {/* Compliance services */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <div style={{ width: '100%' }}>
              <div style={{
                height: 0.5,
                background: 'rgba(255,255,255,0.08)',
                marginBottom: 16,
              }} />
              <p style={{
                fontFamily: '"IBM Plex Sans", sans-serif',
                fontSize: 9,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.25)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                margin: '0 0 14px',
              }}>
                Active compliance services
              </p>
              {COMPLIANCE_SERVICES.map(({ label, tenant, color }) => (
                <div key={label} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  marginBottom: 11,
                }}>
                  <div style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: color,
                    marginTop: 4,
                    flexShrink: 0,
                  }} />
                  <div>
                    <p style={{
                      fontFamily: '"IBM Plex Sans", sans-serif',
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.82)',
                      margin: '0 0 1px',
                      letterSpacing: '0.01em',
                    }}>
                      {label}
                    </p>
                    <p style={{
                      fontFamily: '"IBM Plex Sans", sans-serif',
                      fontSize: 10,
                      color: 'rgba(255,255,255,0.3)',
                      margin: 0,
                    }}>
                      {tenant}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{
            borderTop: '0.5px solid rgba(255,255,255,0.07)',
            paddingTop: 14,
          }}>
            <p style={{
              fontFamily: '"IBM Plex Sans", sans-serif',
              fontSize: 9,
              color: 'rgba(255,255,255,0.18)',
              margin: 0,
              lineHeight: 1.6,
            }}>
              Secured by Microsoft Entra ID<br />
              Azure West Europe
            </p>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        background: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Thread stripe — brand signature */}
        <ThreadStripe height={3} variant="light" />

        {/* Form content */}
        <div style={{
          flex: 1,
          padding: '2.5rem 2.375rem',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}>
          {/* Centred content */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}>
            <h1 style={{
              fontFamily: '"IBM Plex Sans", sans-serif',
              fontSize: 25,
              fontWeight: 700,
              color: '#0D1F3C',
              margin: '0 0 8px',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
            }}>
              Welcome back.
            </h1>
            <p style={{
              fontFamily: '"IBM Plex Sans", sans-serif',
              fontSize: 13,
              color: '#64748B',
              margin: '0 0 2.25rem',
              lineHeight: 1.65,
            }}>
              Sign in with your organisation account to<br />
              access your compliance dashboard.
            </p>

            {/* Microsoft SSO button */}
            <button
              onClick={handleLogin}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 11,
                width: '100%',
                padding: '13px 16px',
                borderRadius: 5,
                background: '#0D1F3C',
                border: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box',
                marginBottom: '1.375rem',
              }}
            >
              {/* Microsoft logo */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 2,
                width: 16,
                height: 16,
                flexShrink: 0,
              }}>
                <div style={{ background: '#F25022', borderRadius: 1 }} />
                <div style={{ background: '#7FBA00', borderRadius: 1 }} />
                <div style={{ background: '#00A4EF', borderRadius: 1 }} />
                <div style={{ background: '#FFB900', borderRadius: 1 }} />
              </div>
              <span style={{
                fontFamily: '"IBM Plex Sans", sans-serif',
                fontSize: 13.5,
                fontWeight: 600,
                color: '#FFFFFF',
              }}>
                Sign in with Microsoft
              </span>
            </button>

            {/* Divider */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: '1.25rem',
            }}>
              <div style={{ flex: 1, height: 0.5, background: '#E2E8F0' }} />
              <span style={{
                fontFamily: '"IBM Plex Sans", sans-serif',
                fontSize: 10,
                color: '#94A3B8',
              }}>
                Need access?
              </span>
              <div style={{ flex: 1, height: 0.5, background: '#E2E8F0' }} />
            </div>

            {/* Invitation-only notice */}
            <div style={{
              background: '#F8FAFC',
              borderRadius: 5,
              padding: '12px 14px',
              border: '0.5px solid #E2E8F0',
            }}>
              <p style={{
                fontFamily: '"IBM Plex Sans", sans-serif',
                fontSize: 12,
                color: '#475569',
                margin: 0,
                lineHeight: 1.7,
              }}>
                PagedataLooM uses invitation-only access. Contact your{' '}
                <span style={{ color: '#1E40AF', fontWeight: 600 }}>TenantAdmin</span>
                {' '}to request access to your organisation's compliance workspace.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            paddingTop: '1.5rem',
            borderTop: '0.5px solid #E2E8F0',
          }}>
            <p style={{
              fontFamily: '"IBM Plex Sans", sans-serif',
              fontSize: 10,
              color: '#94A3B8',
              margin: 0,
              lineHeight: 1.6,
            }}>
              PagedataLooM · Page-level intelligence platform<br />
              v1.0.0 · Azure West Europe
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
