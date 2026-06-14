import { Navigate, useLocation } from 'react-router-dom'
import { useIsAuthenticated, useMsal } from '@azure/msal-react'
import { InteractionStatus } from '@azure/msal-browser'

interface RequireAuthProps {
  children: React.ReactNode
}

export function RequireAuth({ children }: RequireAuthProps) {
  const isAuthenticated = useIsAuthenticated()
  const { inProgress } = useMsal()
  const location = useLocation()

  // MSAL is mid-flight (redirect in progress) — don't redirect yet
  if (inProgress !== InteractionStatus.None) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"IBM Plex Sans", sans-serif',
        fontSize: 13,
        color: '#94A3B8',
      }}>
        Authenticating…
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
