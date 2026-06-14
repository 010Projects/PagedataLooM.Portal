import { describe, it, expect } from 'vitest'
import {
  getDaysStyle, formatDays, formatExpiryDate,
  daysUntilExpiry, deriveDisplayStatus, getStatusStyle,
} from '@/lib/document-status'
import { statusColors } from '@/tokens/design-tokens'
import type { DocumentRecord } from '@/types/api'

describe('getDaysStyle', () => {
  it('applies red bold for overdue (negative days)', () => {
    const s = getDaysStyle(-1)
    expect(s.color).toBe('#DC2626')
    expect(s.fontWeight).toBe(700)
  })

  it('applies red bold for overdue (-14 days)', () => {
    const s = getDaysStyle(-14)
    expect(s.color).toBe('#DC2626')
    expect(s.fontWeight).toBe(700)
  })

  it('applies amber bold for ≤14 days', () => {
    const s = getDaysStyle(14)
    expect(s.color).toBe('#D97706')
    expect(s.fontWeight).toBe(700)
  })

  it('applies amber bold for 1 day', () => {
    const s = getDaysStyle(1)
    expect(s.color).toBe('#D97706')
    expect(s.fontWeight).toBe(700)
  })

  it('applies amber normal weight for ≤30 days', () => {
    const s = getDaysStyle(30)
    expect(s.color).toBe('#D97706')
    expect(s.fontWeight).toBe(500)
  })

  it('applies amber normal for 15 days', () => {
    const s = getDaysStyle(15)
    expect(s.color).toBe('#D97706')
    expect(s.fontWeight).toBe(500)
  })

  it('applies muted for >30 days', () => {
    const s = getDaysStyle(31)
    expect(s.color).toBe('#64748B')
  })

  it('applies muted for 365 days', () => {
    const s = getDaysStyle(365)
    expect(s.color).toBe('#64748B')
  })

  it('returns muted style for null', () => {
    const s = getDaysStyle(null)
    expect(s.color).toBe('#94A3B8')
  })

  it('handles zero days (expires today)', () => {
    const s = getDaysStyle(0)
    // 0 days is ≤14 — amber bold
    expect(s.color).toBe('#D97706')
    expect(s.fontWeight).toBe(700)
  })
})

describe('formatDays', () => {
  it('shows minus sign prefix for overdue', () => {
    expect(formatDays(-14)).toBe('−14')
  })

  it('shows em dash for null', () => {
    expect(formatDays(null)).toBe('—')
  })

  it('shows number for positive', () => {
    expect(formatDays(87)).toBe('87')
  })

  it('shows zero as "0"', () => {
    expect(formatDays(0)).toBe('0')
  })

  it('uses proper minus sign (−), not hyphen (-)', () => {
    expect(formatDays(-1)).toContain('−')
    expect(formatDays(-1)).not.toContain('-')
  })
})

describe('formatExpiryDate', () => {
  it('formats a valid ISO date', () => {
    const result = formatExpiryDate('2025-03-15')
    expect(result).toMatch(/15/)
    expect(result).toMatch(/Mar/)
    expect(result).toMatch(/2025/)
  })

  it('returns em dash for null', () => {
    expect(formatExpiryDate(null)).toBe('—')
  })

  it('handles invalid date string without throwing', () => {
    expect(() => formatExpiryDate('not-a-date')).not.toThrow()
  })
})

describe('daysUntilExpiry', () => {
  it('returns null for null date', () => {
    expect(daysUntilExpiry(null)).toBeNull()
  })

  it('returns null for an invalid date string', () => {
    expect(daysUntilExpiry('not-a-date')).toBeNull()
  })

  it('returns a negative number for a past date', () => {
    expect(daysUntilExpiry('2020-01-01')!).toBeLessThan(0)
  })

  it('returns a positive number for a future date', () => {
    const future = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    expect(daysUntilExpiry(future)!).toBeGreaterThan(0)
  })
})

// Pipeline state from the backend (Uploaded/Indexed/Failed) maps to the
// compliance status shown in the document table
describe('deriveDisplayStatus', () => {
  const baseDoc = (overrides: Partial<DocumentRecord>): DocumentRecord => ({
    documentId: 'doc-1',
    Category: 'SQS',
    TypeCode: 'SQS-001',
    TypeName: 'Safety Management Plan',
    EntityKey: 'RSC-COMP-001',
    FileName: 'test.pdf',
    ContentType: 'application/pdf',
    Status: 'Indexed',
    ExpiryDate: null,
    UploadedBy: 'test@test.com',
    UploadedAt: '2026-01-01T00:00:00Z',
    LastModifiedAt: '2026-01-01T00:00:00Z',
    downloadUrl: null,
    ...overrides,
  })

  it('maps Failed pipeline status to Failed', () => {
    expect(deriveDisplayStatus(baseDoc({ Status: 'Failed' }))).toBe('Failed')
  })

  it('maps non-terminal pipeline status to Processing', () => {
    expect(deriveDisplayStatus(baseDoc({ Status: 'Uploaded' }))).toBe('Processing')
  })

  it('maps Indexed with past expiry to Expired', () => {
    expect(deriveDisplayStatus(baseDoc({ ExpiryDate: '2020-01-01' }))).toBe('Expired')
  })

  it('maps Indexed expiring within 30 days to Expiring', () => {
    const soon = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
    expect(deriveDisplayStatus(baseDoc({ ExpiryDate: soon }))).toBe('Expiring')
  })

  it('maps Indexed with distant expiry to Active', () => {
    const far = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    expect(deriveDisplayStatus(baseDoc({ ExpiryDate: far }))).toBe('Active')
  })

  it('maps Indexed with no expiry to Active', () => {
    expect(deriveDisplayStatus(baseDoc({}))).toBe('Active')
  })
})

describe('getStatusStyle', () => {
  it('maps each display status to its token colors', () => {
    expect(getStatusStyle('Active')).toBe(statusColors.active)
    expect(getStatusStyle('Expiring')).toBe(statusColors.expiring)
    expect(getStatusStyle('Expired')).toBe(statusColors.expired)
    expect(getStatusStyle('Failed')).toBe(statusColors.expired)
    expect(getStatusStyle('Missing')).toBe(statusColors.missing)
    expect(getStatusStyle('Processing')).toBe(statusColors.info)
  })
})
