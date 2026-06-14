import type { CSSProperties } from 'react'
import { statusColors } from '@/tokens/design-tokens'
import type { DocumentRecord } from '@/types/api'

// The backend reports pipeline state (Uploaded/Indexed/Failed) on documents;
// compliance state (Active/Expiring/Expired) is derived from the expiry date.
export type DisplayStatus = 'Active' | 'Expiring' | 'Expired' | 'Missing' | 'Processing' | 'Failed'

export function daysUntilExpiry(dateString: string | null): number | null {
  if (!dateString) return null
  const expiry = new Date(dateString)
  if (isNaN(expiry.getTime())) return null
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.floor((expiry.getTime() - Date.now()) / msPerDay)
}

export function deriveDisplayStatus(doc: DocumentRecord): DisplayStatus {
  if (doc.Status === 'Failed') return 'Failed'
  if (doc.Status !== 'Indexed') return 'Processing'
  const days = daysUntilExpiry(doc.ExpiryDate)
  if (days !== null && days < 0) return 'Expired'
  if (days !== null && days <= 30) return 'Expiring'
  return 'Active'
}

export function getStatusStyle(status: DisplayStatus) {
  switch (status) {
    case 'Active':      return statusColors.active
    case 'Expiring':    return statusColors.expiring
    case 'Expired':     return statusColors.expired
    case 'Failed':      return statusColors.expired
    case 'Missing':     return statusColors.missing
    case 'Processing':  return statusColors.info
    default:            return statusColors.missing
  }
}

export function getDaysStyle(days: number | null): CSSProperties {
  if (days === null) return { color: '#94A3B8' }
  if (days < 0)     return { color: '#DC2626', fontWeight: 700 }
  if (days <= 14)   return { color: '#D97706', fontWeight: 700 }
  if (days <= 30)   return { color: '#D97706', fontWeight: 500 }
  return { color: '#64748B', fontWeight: 400 }
}

export function formatDays(days: number | null): string {
  if (days === null) return '—'
  if (days < 0)     return `−${Math.abs(days)}`
  return `${days}`
}

export function formatExpiryDate(dateString: string | null): string {
  if (!dateString) return '—'
  try {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  } catch { return dateString }
}
