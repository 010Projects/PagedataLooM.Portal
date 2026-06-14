import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '@/stores/auth-store'

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().clearUser()
  })

  it('starts with no user', () => {
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('setUser stores the user', () => {
    useAuthStore.getState().setUser({
      name: 'Bheki M',
      email: 'Bheki@rscarriers.co.za',
      tenantId: 'c0509dbe-3d08-4df5-8339-f03214dbe954',
      roles: ['PlatformAdmin'],
    })
    expect(useAuthStore.getState().user?.email).toBe('Bheki@rscarriers.co.za')
  })

  it('clearUser removes user', () => {
    useAuthStore.getState().setUser({
      name: 'Test', email: 'test@test.com',
      tenantId: 'tenant-1', roles: ['Viewer'],
    })
    useAuthStore.getState().clearUser()
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('clearUser also clears the access token', () => {
    useAuthStore.getState().setAccessToken('tok-123')
    useAuthStore.getState().clearUser()
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  describe('hasRole', () => {
    it('returns true for assigned role', () => {
      useAuthStore.getState().setUser({
        name: 'A', email: 'a@b.com', tenantId: 't',
        roles: ['TenantAdmin'],
      })
      expect(useAuthStore.getState().hasRole('TenantAdmin')).toBe(true)
    })

    it('returns false for unassigned role', () => {
      useAuthStore.getState().setUser({
        name: 'A', email: 'a@b.com', tenantId: 't',
        roles: ['Viewer'],
      })
      expect(useAuthStore.getState().hasRole('TenantAdmin')).toBe(false)
    })

    it('treats TenantUser as ComplianceUser (legacy equivalence)', () => {
      useAuthStore.getState().setUser({
        name: 'A', email: 'a@b.com', tenantId: 't',
        roles: ['TenantUser'],
      })
      expect(useAuthStore.getState().hasRole('ComplianceUser')).toBe(true)
    })

    it('does not treat ComplianceUser as TenantUser (one-way equivalence)', () => {
      useAuthStore.getState().setUser({
        name: 'A', email: 'a@b.com', tenantId: 't',
        roles: ['ComplianceUser'],
      })
      expect(useAuthStore.getState().hasRole('TenantUser')).toBe(false)
    })

    it('returns false when no user is set', () => {
      expect(useAuthStore.getState().hasRole('Viewer')).toBe(false)
    })
  })

  describe('isTenantAdmin', () => {
    it('returns true for TenantAdmin role', () => {
      useAuthStore.getState().setUser({
        name: 'A', email: 'a@b.com', tenantId: 't',
        roles: ['TenantAdmin'],
      })
      expect(useAuthStore.getState().isTenantAdmin()).toBe(true)
    })

    it('returns false for ComplianceUser', () => {
      useAuthStore.getState().setUser({
        name: 'A', email: 'a@b.com', tenantId: 't',
        roles: ['ComplianceUser'],
      })
      expect(useAuthStore.getState().isTenantAdmin()).toBe(false)
    })
  })

  describe('isComplianceUser', () => {
    it('returns true for ComplianceUser and for legacy TenantUser', () => {
      useAuthStore.getState().setUser({
        name: 'A', email: 'a@b.com', tenantId: 't',
        roles: ['TenantUser'],
      })
      expect(useAuthStore.getState().isComplianceUser()).toBe(true)
    })
  })

  it('PlatformAdmin role is correctly resolved', () => {
    useAuthStore.getState().setUser({
      name: 'A', email: 'a@b.com', tenantId: 't',
      roles: ['PlatformAdmin', 'TenantAdmin'],
    })
    expect(useAuthStore.getState().isPlatformAdmin()).toBe(true)
    expect(useAuthStore.getState().isTenantAdmin()).toBe(true)
  })
})
