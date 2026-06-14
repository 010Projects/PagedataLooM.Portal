import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect } from 'vitest'
import React from 'react'
import { useDocumentUpload } from '@/hooks/useCompliance'
import { server } from '@/test/msw/server'
import { http, HttpResponse } from 'msw'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: 0 } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useDocumentUpload', () => {
  it('posts multipart form data to the upload endpoint and unwraps the response', async () => {
    let capturedContentType: string | null = null
    let capturedForm: FormData | null = null

    server.use(
      http.post('*/api/documents/upload', async ({ request }) => {
        capturedContentType = request.headers.get('content-type')
        capturedForm = await request.formData()
        return HttpResponse.json(
          {
            success: true,
            data: { documentId: 'doc-test-123', orchestrationId: 'orch-1', status: 'Uploaded' },
            error: null,
            correlationId: 'test',
          },
          { status: 202 }
        )
      })
    )

    const { result } = renderHook(() => useDocumentUpload(), {
      wrapper: createWrapper(),
    })

    const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' })

    await act(async () => {
      const response = await result.current.mutateAsync({
        entityKey: 'RSC-COMP-001',
        category: 'SQS',
        file: testFile,
      })
      expect(response.documentId).toBe('doc-test-123')
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(capturedContentType).toContain('multipart/form-data')
    expect(capturedForm!.get('entityKey')).toBe('RSC-COMP-001')
    expect(capturedForm!.get('category')).toBe('SQS')
    // Node's fetch interception yields undici's File, not jsdom's global —
    // instanceof File fails across realms, so assert the payload instead
    const sent = capturedForm!.get('file') as File
    expect(sent.type).toBe('application/pdf')
    expect(sent.size).toBeGreaterThan(0)
  })

  it('sets isError when upload fails', async () => {
    server.use(
      http.post('*/api/documents/upload', () =>
        HttpResponse.json(
          { success: false, data: null,
            error: { code: 'UPLOAD_FAILED', message: 'Failed' },
            correlationId: 'test' },
          { status: 400 }
        )
      )
    )

    const { result } = renderHook(() => useDocumentUpload(), {
      wrapper: createWrapper(),
    })

    const testFile = new File(['test'], 'test.pdf', { type: 'application/pdf' })

    await act(async () => {
      try {
        await result.current.mutateAsync({
          entityKey: 'RSC-COMP-001',
          category: 'SQS',
          file: testFile,
        })
      } catch { /* expected */ }
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
