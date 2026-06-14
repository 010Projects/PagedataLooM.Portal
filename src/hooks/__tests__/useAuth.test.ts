import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/stores/auth-store'

vi.mock('@azure/msal-react', () => ({
  useMsal: vi.fn(),
  useIsAuthenticated: vi.fn(),
}))
vi.mock('jwt-decode', () => ({
  jwtDecode: vi.fn(),
}))

import { useMsal, useIsAuthenticated } from '@azure/msal-react'
import { jwtDecode } from 'jwt-decode'

const mockAccount = {
  name: 'Bheki M',
  username: 'Bheki@rscarriers.co.za',
  tenantId: 'tenant-from-account',
}

function mockMsal(overrides: Record<string, unknown> = {}) {
  const instance = {
    acquireTokenSilent: vi.fn().mockResolvedValue({ accessToken: 'test-access-token' }),
    logoutRedirect: vi.fn(),
  }
  vi.mocked(useMsal).mockReturnValue({
    instance,
    accounts: [mockAccount],
    inProgress: 'none',
    ...overrides,
  } as any)
  return instance
}

describe('useAuth', () => {
  beforeEach(() => {
    useAuthStore.getState().clearUser()
    vi.mocked(jwtDecode).mockReturnValue({
      roles: ['PlatformAdmin', 'TenantAdmin'],
      tid: 'tenant-from-token',
    } as any)
  })

  it('hydrates the store with roles decoded from the access token', async () => {
    vi.mocked(useIsAuthenticated).mockReturnValue(true)
    const instance = mockMsal()

    const { result } = renderHook(() => useAuth())

    await waitFor(() => expect(result.current.user).not.toBeNull())
    expect(instance.acquireTokenSilent).toHaveBeenCalled()
    expect(result.current.user?.roles).toEqual(['PlatformAdmin', 'TenantAdmin'])
    expect(result.current.user?.tenantId).toBe('tenant-from-token')
    expect(result.current.user?.email).toBe('Bheki@rscarriers.co.za')
    expect(useAuthStore.getState().accessToken).toBe('test-access-token')
  })

  it('falls back to account info when token acquisition fails', async () => {
    vi.mocked(useIsAuthenticated).mockReturnValue(true)
    const instance = mockMsal()
    instance.acquireTokenSilent.mockRejectedValue(new Error('scope not configured'))

    const { result } = renderHook(() => useAuth())

    await waitFor(() => expect(result.current.user).not.toBeNull())
    expect(result.current.user?.roles).toEqual([])
    expect(result.current.user?.tenantId).toBe('tenant-from-account')
  })

  it('clears the store when not authenticated', async () => {
    useAuthStore.getState().setUser({
      name: 'Stale', email: 'stale@test.com', tenantId: 't', roles: ['Viewer'],
    })
    vi.mocked(useIsAuthenticated).mockReturnValue(false)
    mockMsal({ accounts: [] })

    const { result } = renderHook(() => useAuth())

    await waitFor(() => expect(result.current.user).toBeNull())
  })

  it('logout clears the store and triggers the MSAL redirect', async () => {
    vi.mocked(useIsAuthenticated).mockReturnValue(true)
    const instance = mockMsal()

    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.user).not.toBeNull())

    act(() => result.current.logout())

    expect(instance.logoutRedirect).toHaveBeenCalled()
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('reports loading while MSAL interaction is in progress', () => {
    vi.mocked(useIsAuthenticated).mockReturnValue(false)
    mockMsal({ accounts: [], inProgress: 'login' })

    const { result } = renderHook(() => useAuth())
    expect(result.current.isLoading).toBe(true)
  })
})
