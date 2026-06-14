import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import apiClient from '@/lib/api-client'
import type {
  ApiEnvelope,
  AuditReadinessResponse,
  CompletenessResponse,
  DocumentsResponse,
  DocumentRecord,
  ComplianceService,
  EvidencePackRequest,
  DocumentUploadRequest,
  UploadResponse,
  NotificationConfig,
  NotificationConfigUpdate,
} from '@/types/api'
import { SERVICE_CONFIG } from '@/types/api'

// Error carrying the backend's envelope error code (e.g. SUBSCRIPTION_INACTIVE, NO_DOCUMENTS)
export class ApiRequestError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'ApiRequestError'
    this.code = code
  }
}

// Unwrap the { success, data, error } envelope; surface envelope errors with their code
function unwrap<T>(envelope: ApiEnvelope<T>): T {
  if (!envelope.success || envelope.data === null) {
    throw new ApiRequestError(
      envelope.error?.code ?? 'UNKNOWN',
      envelope.error?.message ?? 'Request failed'
    )
  }
  return envelope.data
}

// Axios errors for 4xx still carry the JSON envelope — convert to ApiRequestError
function toApiError(e: unknown): unknown {
  if (isAxiosError(e) && e.response?.data?.error) {
    const err = e.response.data.error
    return new ApiRequestError(err.code ?? 'UNKNOWN', err.message ?? e.message)
  }
  return e
}

// Don't retry envelope errors (subscription inactive, validation) — they won't recover
function retryUnlessApiError(failureCount: number, error: unknown): boolean {
  return !(error instanceof ApiRequestError) && failureCount < 2
}

// ── Query keys ────────────────────────────────────────────────────────────
export const queryKeys = {
  auditReadiness: (service: ComplianceService) => ['auditReadiness', service] as const,
  documents:      (entityKey: string)          => ['documents', entityKey] as const,
}

// ── Audit readiness ───────────────────────────────────────────────────────
export function useAuditReadiness(service: ComplianceService) {
  return useQuery({
    queryKey: queryKeys.auditReadiness(service),
    queryFn: async () => {
      try {
        const path = SERVICE_CONFIG[service].auditReadinessPath
        const { data } = await apiClient.get<ApiEnvelope<AuditReadinessResponse>>(path)
        return unwrap(data)
      } catch (e) {
        throw toApiError(e)
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: retryUnlessApiError,
  })
}

// ── Documents for entity ─────────────────────────────────────────────────
export function useDocuments(entityKey: string | null) {
  return useQuery({
    queryKey: queryKeys.documents(entityKey ?? ''),
    queryFn: async (): Promise<DocumentRecord[]> => {
      try {
        const { data } = await apiClient.get<ApiEnvelope<DocumentsResponse>>(
          `/api/documents/${entityKey}`
        )
        return unwrap(data).documents
      } catch (e) {
        throw toApiError(e)
      }
    },
    enabled: !!entityKey,
    retry: retryUnlessApiError,
  })
}

// ── Completeness (B-017) ──────────────────────────────────────────────────
// Replaces Portal-C's client-side derivation from audit-readiness.
export function useCompleteness(entityKey: string | null) {
  return useQuery({
    queryKey: ['completeness', entityKey],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<ApiEnvelope<CompletenessResponse>>(
          `/api/compliance/completeness/${entityKey}`
        )
        return unwrap(data)
      } catch (e) {
        throw toApiError(e)
      }
    },
    enabled: !!entityKey,
    retry: retryUnlessApiError,
  })
}

// ── Notification config (Journey 3) ───────────────────────────────────────
export function useNotificationConfig(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: ['notificationConfig', tenantId],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<ApiEnvelope<NotificationConfig>>(
          `/api/mgmt/tenants/${tenantId}/notification-config`
        )
        return unwrap(data)
      } catch (e) {
        throw toApiError(e)
      }
    },
    enabled: !!tenantId,
    staleTime: 2 * 60 * 1000,
    retry: retryUnlessApiError,
  })
}

export function useUpdateNotificationConfig(tenantId: string | null | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (update: NotificationConfigUpdate) => {
      try {
        const { data } = await apiClient.put<ApiEnvelope<NotificationConfig>>(
          `/api/mgmt/tenants/${tenantId}/notification-config`,
          update
        )
        return unwrap(data)
      } catch (e) {
        throw toApiError(e)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationConfig', tenantId] })
    },
  })
}

// ── Evidence pack ─────────────────────────────────────────────────────────
export function useEvidencePack(service: ComplianceService) {
  return useMutation({
    mutationFn: async (request: EvidencePackRequest) => {
      const path = SERVICE_CONFIG[service].evidencePackPath
      let response
      try {
        response = await apiClient.post(path, request, { responseType: 'blob' })
      } catch (e) {
        // Error bodies come back as blobs too — parse the JSON envelope for the message
        if (isAxiosError(e) && e.response?.data instanceof Blob) {
          const envelope = JSON.parse(await e.response.data.text()) as ApiEnvelope<unknown>
          throw new ApiRequestError(
            envelope.error?.code ?? 'UNKNOWN',
            envelope.error?.message ?? 'Evidence pack generation failed'
          )
        }
        throw e
      }

      // Defensive: a JSON body on 200 is an envelope, not a file
      const contentType = String(response.headers['content-type'] ?? '')
      if (contentType.includes('application/json')) {
        const envelope = JSON.parse(await (response.data as Blob).text()) as ApiEnvelope<unknown>
        unwrap(envelope)
        return
      }

      // Trigger browser download
      const contentDisposition = response.headers['content-disposition'] ?? ''
      const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
      const fileName = fileNameMatch?.[1]?.replace(/['"]/g, '') ?? `evidence-pack-${request.entityKey}.zip`

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    },
  })
}

// ── Document upload ───────────────────────────────────────────────────────
export function useDocumentUpload() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ entityKey, category, file }: DocumentUploadRequest) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('entityKey', entityKey)
      formData.append('category', category)

      try {
        const { data } = await apiClient.post<ApiEnvelope<UploadResponse>>(
          '/api/documents/upload',
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        )
        return unwrap(data)
      } catch (e) {
        throw toApiError(e)
      }
    },
    onSuccess: (_data, variables) => {
      // Invalidate so the document list and readiness stats refresh after upload
      queryClient.invalidateQueries({
        queryKey: queryKeys.documents(variables.entityKey),
      })
      queryClient.invalidateQueries({
        queryKey: ['auditReadiness'],
      })
    },
  })
}
