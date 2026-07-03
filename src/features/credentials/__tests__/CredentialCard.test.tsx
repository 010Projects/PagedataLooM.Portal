import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CredentialCard } from '../CredentialCard'
import type { CredentialRecord } from '@/types/api'

const base: CredentialRecord = {
  documentId:         '01JWABCDEF1234567890ABCDEF',
  studentId:          'SLI-STU-001',
  documentTypeName:   'Student Completion Record',
  verificationStatus: 'Verified',
  expiryDate:         null,
  uploadedAt:         '2026-01-15T09:00:00.000+02:00',
  fileName:           'cert.pdf',
}

describe('CredentialCard', () => {
  it('shows verified banner for Verified status', () => {
    render(<CredentialCard credential={base} />)
    expect(screen.getByText(/credential verified/i)).toBeTruthy()
  })

  it('shows expired banner for Expired status', () => {
    render(<CredentialCard credential={{ ...base, verificationStatus: 'Expired', expiryDate: '2025-12-31' }} />)
    expect(screen.getByText(/credential expired/i)).toBeTruthy()
  })

  it('shows processing banner for Pending status', () => {
    render(<CredentialCard credential={{ ...base, verificationStatus: 'Pending' }} />)
    expect(screen.getByText(/processing/i)).toBeTruthy()
  })

  it('renders expiry date when present', () => {
    render(<CredentialCard credential={{ ...base, expiryDate: '2027-06-15' }} />)
    expect(screen.getByText(/expires/i)).toBeTruthy()
  })

  it('omits expiry row when expiryDate is null', () => {
    render(<CredentialCard credential={{ ...base, expiryDate: null }} />)
    expect(screen.queryByText(/expires/i)).toBeNull()
  })
})
