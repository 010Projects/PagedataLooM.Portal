import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/api-client'
import { queryKeys } from '@/hooks/useCompliance'
import type { ApiEnvelope, DocumentsResponse, PipelineStatus as PipelineState } from '@/types/api'

interface PipelineStatusProps {
  entityKey: string
  documentId: string
}

// Observed progression (Task 0 discovery): Uploaded → Indexed, or Failed.
// Unknown intermediate statuses are treated as the Processing step.
const STATUS_ORDER: PipelineState[] = ['Uploaded', 'Processing', 'Indexed']

const STATUS_LABELS: Record<PipelineState, string> = {
  Uploaded:   'Queued for processing',
  Processing: 'OCR and classification in progress',
  Indexed:    'Classified and indexed',
  Failed:     'Processing failed',
}

function statusIndex(status: PipelineState): number {
  const idx = STATUS_ORDER.indexOf(status)
  return idx === -1 ? 1 : idx  // unknown non-terminal → Processing step
}

export function PipelineStatus({ entityKey, documentId }: PipelineStatusProps) {
  const [status, setStatus] = useState<PipelineState>('Uploaded')
  const [attempts, setAttempts] = useState(0)
  const queryClient = useQueryClient()
  const MAX_POLLS = 30   // 30 × 3s = 90 second timeout

  const isComplete = status === 'Indexed'
  const isFailed   = status === 'Failed'

  useEffect(() => {
    if (isComplete || isFailed || attempts >= MAX_POLLS) return

    const timer = setTimeout(async () => {
      try {
        // Documents are fetched per entity; find ours by id in the list
        const { data } = await apiClient.get<ApiEnvelope<DocumentsResponse>>(
          `/api/documents/${entityKey}`
        )
        const doc = data.data?.documents.find((d) => d.documentId === documentId)

        if (doc?.Status) {
          setStatus(doc.Status as PipelineState)
          if (doc.Status === 'Indexed' || doc.Status === 'Failed') {
            // Terminal state — refresh the dashboard's document list and stats
            queryClient.invalidateQueries({ queryKey: queryKeys.documents(entityKey) })
            queryClient.invalidateQueries({ queryKey: ['auditReadiness'] })
          }
        }
      } catch {
        // Polling failure — continue trying
      }
      setAttempts((a) => a + 1)
    }, 3000)

    return () => clearTimeout(timer)
  }, [isComplete, isFailed, attempts, entityKey, documentId, queryClient])

  return (
    <div style={{
      background: isComplete ? '#F0FDF4' : isFailed ? '#FFF1F2' : '#EFF6FF',
      border: `0.5px solid ${isComplete ? '#BBF7D0' : isFailed ? '#FECDD3' : '#BFDBFE'}`,
      borderRadius: 6, padding: '12px 14px', marginBottom: '1rem',
    }}>
      <p style={{
        fontFamily: '"IBM Plex Sans"', fontSize: 11, fontWeight: 600,
        color: isComplete ? '#15803D' : isFailed ? '#BE123C' : '#1E40AF',
        margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        {isFailed ? 'Processing failed' : isComplete ? 'Document ready' : 'Processing…'}
      </p>

      {!isFailed && (
        <div style={{ display: 'flex', gap: 4 }}>
          {STATUS_ORDER.map((s, i) => (
            <div key={s} style={{
              flex: 1, height: 3, borderRadius: 1,
              background: i <= statusIndex(status) ? '#1E40AF' : '#E2E8F0',
            }} />
          ))}
        </div>
      )}

      <p style={{
        fontFamily: '"IBM Plex Sans"', fontSize: 11,
        color: '#64748B', margin: '6px 0 0',
      }}>
        {isFailed
          ? 'Contact your TenantAdmin if the issue persists.'
          : STATUS_LABELS[status] ?? STATUS_LABELS.Processing}
      </p>
    </div>
  )
}
