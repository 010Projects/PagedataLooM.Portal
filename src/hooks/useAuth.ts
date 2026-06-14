import { useEffect } from 'react'
import { useMsal, useIsAuthenticated } from '@azure/msal-react'
import { InteractionStatus } from '@azure/msal-browser'
import { jwtDecode } from 'jwt-decode'
import { useAuthStore, type PlatformRole } from '@/stores/auth-store'
import { tokenRequest } from '@/lib/msal-config'

interface DecodedToken {
  roles?: PlatformRole[]
  tid?: string
  preferred_username?: string
  name?: string
}

export function useAuth() {
  const { instance, accounts, inProgress } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  const { user, setUser, setAccessToken, clearUser, isTenantAdmin, isPlatformAdmin, isComplianceUser } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated || accounts.length === 0) {
      clearUser()
      return
    }

    const account = accounts[0]

    const hydrateUser = async () => {
      try {
        let tenantId = account.tenantId ?? ''
        let roles: PlatformRole[] = []

        // Attempt silent token acquisition to decode roles
        if (tokenRequest.scopes && tokenRequest.scopes.length > 0) {
          try {
            const tokenResponse = await instance.acquireTokenSilent({
              ...tokenRequest,
              account,
            })
            setAccessToken(tokenResponse.accessToken)

            const decoded = jwtDecode<DecodedToken>(tokenResponse.accessToken)
            tenantId = decoded.tid ?? tenantId
            roles = decoded.roles ?? []
          } catch {
            // Token scope not configured yet — continue with basic account info
          }
        }

        setUser({
          name: account.name ?? account.username,
          email: account.username,
          tenantId,
          roles,
        })
      } catch (error) {
        console.error('Auth hydration failed:', error)
      }
    }

    hydrateUser()
  }, [isAuthenticated, accounts, instance, clearUser, setUser, setAccessToken])

  return {
    user,
    isAuthenticated,
    isLoading: inProgress !== InteractionStatus.None,
    isTenantAdmin,
    isPlatformAdmin,
    isComplianceUser,
    logout: () => {
      clearUser()
      instance.logoutRedirect()
    },
  }
}
