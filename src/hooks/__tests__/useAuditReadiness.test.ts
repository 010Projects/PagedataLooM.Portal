import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import React from 'react'
import { useAuditReadiness, useDocuments, ApiRequestError } from '@/hooks/useCompliance'
import { server } from '@/test/msw/server'
import { http, HttpResponse } from 'msw'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useAuditReadiness', () => {
  it('returns unwrapped data on success', async () => {
    const { result } = renderHook(
      () => useAuditReadiness('sqas'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    // Envelope is unwrapped — data is the payload, with PascalCase fields
    expect(result.current.data?.TenantId).toBe('rsc_prod_001')
    expect(result.current.data?.Requirements.length).toBeGreaterThan(0)
  })

  it('returns error state on API failure', async () => {
    server.use(
      http.get('*/api/sqas/audit-readiness', () =>
        HttpResponse.json(
          { success: false, data: null,
            error: { code: 'SERVER_ERROR', message: 'Internal error' },
            correlationId: 'test' },
          { status: 500 }
        )
      )
    )

    const { result } = renderHook(
      () => useAuditReadiness('sqas'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
  })

  it('surfaces the backend error code for inactive subscriptions', async () => {
    const { result } = renderHook(
      () => useAuditReadiness('accreditation'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(ApiRequestError)
    expect((result.current.error as ApiRequestError).code).toBe('SUBSCRIPTION_INACTIVE')
  })

  it('refetches when the service changes', async () => {
    const { result, rerender } = renderHook(
      ({ service }: { service: 'sqas' | 'accreditation' }) =>
        useAuditReadiness(service),
      { wrapper: createWrapper(), initialProps: { service: 'sqas' as 'sqas' | 'accreditation' } }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Switch to accreditation — handler returns the no-subscription error
    rerender({ service: 'accreditation' })
    await waitFor(() =>
      expect(result.current.isLoading || result.current.isError).toBeTruthy()
    )
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useDocuments', () => {
  it('unwraps the envelope and returns the documents array', async () => {
    const { result } = renderHook(
      () => useDocuments('RSC-COMP-001'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data?.[0].TypeCode).toBe('SQS-001')
  })

  it('does not fetch when entityKey is null', () => {
    const { result } = renderHook(
      () => useDocuments(null),
      { wrapper: createWrapper() }
    )
    expect(result.current.fetchStatus).toBe('idle')
  })
})
