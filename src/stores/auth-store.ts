import { create } from 'zustand'
import type { MeData } from '@/types/api'

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

// Bootstrap lifecycle for GET /api/me — 'idle' means not yet attempted
export type MeStatus = 'idle' | 'loading' | 'ready' | 'error'

interface AuthStore {
  user: AuthUser | null
  accessToken: string | null
  me: MeData | null                 // null = not yet bootstrapped
  meStatus: MeStatus
  setUser: (user: AuthUser) => void
  setAccessToken: (token: string) => void
  clearUser: () => void
  setMe: (me: MeData) => void
  setMeStatus: (status: MeStatus) => void
  clearMe: () => void               // account-switch invalidation → re-bootstrap
  hasRole: (role: PlatformRole) => boolean
  isTenantAdmin: () => boolean
  isPlatformAdmin: () => boolean
  isComplianceUser: () => boolean
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  accessToken: null,
  me: null,
  meStatus: 'idle',

  setUser: (user) => set({ user }),
  setAccessToken: (token) => set({ accessToken: token }),
  clearUser: () => set({ user: null, accessToken: null }),
  setMe: (me) => set({ me }),
  setMeStatus: (status) => set({ meStatus: status }),
  clearMe: () => set({ me: null, meStatus: 'idle' }),

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
