import { create } from 'zustand'

export type PlatformRole =
  | 'PlatformAdmin'
  | 'TenantAdmin'
  | 'ComplianceUser'
  | 'Viewer'
  | 'EntityUser'
  | 'TenantUser'

export interface AuthUser {
  name: string
  email: string
  tenantId: string
  roles: PlatformRole[]
}

interface AuthStore {
  user: AuthUser | null
  accessToken: string | null
  setUser: (user: AuthUser) => void
  setAccessToken: (token: string) => void
  clearUser: () => void
  hasRole: (role: PlatformRole) => boolean
  isTenantAdmin: () => boolean
  isPlatformAdmin: () => boolean
  isComplianceUser: () => boolean
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  accessToken: null,

  setUser: (user) => set({ user }),
  setAccessToken: (token) => set({ accessToken: token }),
  clearUser: () => set({ user: null, accessToken: null }),

  hasRole: (role) => {
    const { user } = get()
    if (!user) return false
    // TenantUser is legacy fallback for ComplianceUser
    if (role === 'ComplianceUser') {
      return user.roles.includes('ComplianceUser') || user.roles.includes('TenantUser')
    }
    return user.roles.includes(role)
  },

  isTenantAdmin: () => get().hasRole('TenantAdmin'),
  isPlatformAdmin: () => get().hasRole('PlatformAdmin'),
  isComplianceUser: () => get().hasRole('ComplianceUser'),
}))
