import { useQuery } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import type { ApiEnvelope, CredentialRecord } from '@/types/api'

export const credentialQueryKeys = {
  credentials: (studentId: string) => ['credentials', studentId] as const,
}

export function useStudentCredentials(studentId: string | null) {
  return useQuery({
    queryKey: credentialQueryKeys.credentials(studentId ?? ''),
    enabled:  !!studentId?.trim(),
    queryFn:  async () => {
      const { data } = await apiClient.get<ApiEnvelope<CredentialRecord[]>>(
        `/api/students/${encodeURIComponent(studentId!)}/credentials`
      )
      return data
    },
  })
}
