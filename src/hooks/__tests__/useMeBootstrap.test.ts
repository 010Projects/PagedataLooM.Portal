import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { useMeBootstrap } from '@/hooks/useMeBootstrap'
import { useAuthStore } from '@/stores/auth-store'
import { useDashboardStore } from '@/stores/dashboard-store'
import { server } from '@/test/msw/server'
import { meHandler, ME_FIXTURES } from '@/test/msw/handlers'

vi.mock('@azure/msal-react', () => ({
  useMsal: vi.fn(),
  useIsAuthenticated: vi.fn(),
}))

import { useMsal, useIsAuthenticated } from '@azure/msal-react'

const accountA = { homeAccountId: 'home-account-a', username: 'Bheki@rscarriers.co.za' }
const accountB = { homeAccountId: 'home-account-b', username: 'user@newco.co.za' }

function mockMsal(account: typeof accountA | null = accountA) {
  vi.mocked(useMsal).mockReturnValue({
    instance: {} as never,
    accounts: account ? [account] : [],
    inProgress: 'none',
  } as never)
}

describe('useMeBootstrap', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, me: null, meStatus: 'idle' })
    useDashboardStore.setState({
      activeService: null, activeEntityKey: null, subscribedServices: null,
    })
    vi.mocked(useIsAuthenticated).mockReturnValue(true)
    mockMsal()
  })

  it('seeds subscribedServices and activeService (first service) on success', async () => {
    renderHook(() => useMeBootstrap())

    await waitFor(() => expect(useAuthStore.getState().meStatus).toBe('ready'))
    expect(useAuthStore.getState().me).toEqual(ME_FIXTURES.tenantMultiService)
    expect(useDashboardStore.getState().subscribedServices).toEqual(['sqas', 'accreditation'])
    expect(useDashboardStore.getState().activeService).toBe('sqas')
  })

  it('calls /api/me exactly once per session (no refetch on re-render)', async () => {
    let calls = 0
    server.use(
      http.get('*/api/me', () => {
        calls++
        return HttpResponse.json({
          success: true, data: ME_FIXTURES.tenantSingleService,
          error: null, correlationId: 'test-id',
        })
      })
    )

    const { rerender } = renderHook(() => useMeBootstrap())
    await waitFor(() => expect(useAuthStore.getState().meStatus).toBe('ready'))

    rerender()
    rerender()
    await waitFor(() => expect(useAuthStore.getState().meStatus).toBe('ready'))
    expect(calls).toBe(1)
  })

  it('does not call /api/me when not authenticated', () => {
    vi.mocked(useIsAuthenticated).mockReturnValue(false)
    mockMsal(null)

    renderHook(() => useMeBootstrap())

    expect(useAuthStore.getState().meStatus).toBe('idle')
    expect(useAuthStore.getState().me).toBeNull()
  })

  it('clears me and re-bootstraps for the new identity on account switch', async () => {
    const { rerender } = renderHook(() => useMeBootstrap())
    await waitFor(() => expect(useAuthStore.getState().meStatus).toBe('ready'))
    expect(useAuthStore.getState().me?.tenantName).toBe('RS Carriers')

    // Switch the MSAL active account — the next /api/me is a different identity
    server.use(meHandler('nonAdminNoServices'))
    mockMsal(accountB)
    rerender()

    // Re-bootstraps: no stale cross-tenant data survives the switch
    await waitFor(() =>
      expect(useAuthStore.getState().me?.tenantName).toBe('NewCo Logistics')
    )
    expect(useAuthStore.getState().meStatus).toBe('ready')
    expect(useDashboardStore.getState().subscribedServices).toEqual([])
    expect(useDashboardStore.getState().activeService).toBeNull()
  })

  it('sets meStatus to error on failure without clearing the session', async () => {
    server.use(meHandler('failure'))

    renderHook(() => useMeBootstrap())

    await waitFor(() => expect(useAuthStore.getState().meStatus).toBe('error'))
    expect(useAuthStore.getState().me).toBeNull()
  })

  it('treats a malformed envelope as an error', async () => {
    server.use(
      http.get('*/api/me', () =>
        HttpResponse.json({ success: true, data: { unexpected: 'shape' } })
      )
    )

    renderHook(() => useMeBootstrap())

    await waitFor(() => expect(useAuthStore.getState().meStatus).toBe('error'))
  })
})
