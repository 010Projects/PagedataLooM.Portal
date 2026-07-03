# CLAUDE.md — R6: Credential Verification
## Southern Labs student credential lookup UI

---

## AUTONOMOUS EXECUTION MODE

Run all tasks in sequence without pausing for confirmation.
All work is in `C:\Users\Bheki\source\repos\PagedataLooM.Portal`.
Never guess field names — the API contract below is authoritative.
Follow existing portal patterns exactly: apiClient, TanStack Query, shadcn/ui components.
Write TypeScript throughout — no `any`, no type assertions without justification.

---

## Pre-flight

```bash
cd C:\Users\Bheki\source\repos\PagedataLooM.Portal

# Confirm structure
ls src/features/
ls src/hooks/
ls src/types/api.ts
ls src/lib/api-client.ts

# Baseline test run
npm run test -- --run 2>&1 | tail -20
```

Read the following files before writing any code:
- `src/types/api.ts` — ApiEnvelope and existing domain types
- `src/lib/api-client.ts` — axios instance and interceptors
- `src/hooks/useCompliance.ts` — queryKeys pattern to follow
- `src/features/dashboard/ComplianceDashboard.tsx` — layout and component conventions
- `src/features/upload/PipelineStatus.tsx` — status display pattern

Do not write any code until these files are read.

---

## API contract (authoritative — do not deviate)

### Endpoint
```
GET /api/students/{studentId}/credentials
```
Authentication: JWT bearer (handled by apiClient interceptor).
Tenant scope: caller's tenantId from JWT — SLI tenant only in production.

### Success response — 200
`data` is always an **array**, never a single object. Empty array = student not found.

```typescript
interface CredentialRecord {
  documentId:         string                      // ULID, 26 chars
  studentId:          string                      // echoes route param
  documentTypeName:   string                      // e.g. "Student Completion Record"
  verificationStatus: 'Verified' | 'Expired' | 'Pending'
  expiryDate:         string | null               // "yyyy-MM-dd" date-only, null if no expiry
  uploadedAt:         string                      // ISO 8601 with offset
  fileName:           string                      // original upload filename
}
```

No other fields exist. Do not add `studentName`, `programme`, `nqfLevel`, `certificateNumber`,
or `citedDocuments` — they are not on the record.

### Not-found behaviour
**HTTP 200, `success: true`, `data: []`.** There is no 404 path.
Empty array = "no record found". Key off `data.length === 0`, not HTTP status.

### Error responses
```typescript
// 403 — subscription not active for tenant
{ success: false, data: null,
  error: { code: 'SUBSCRIPTION_INACTIVE', message: '...' }, correlationId: '...' }

// 401 — missing/invalid JWT
{ success: false, data: null,
  error: { code: 'UNAUTHORIZED', message: '...' }, correlationId: '...' }
```

### verificationStatus display logic
| Value | Display |
|-------|---------|
| `Verified` | Green "Credential verified" banner |
| `Expired` | Amber/red "Credential expired" banner |
| `Pending` | Blue "Processing" indicator — pipeline not complete |

---

## Task 1 — Add TypeScript types to `src/types/api.ts`

Add to the existing types file (do not replace existing types):

```typescript
export type CredentialVerificationStatus = 'Verified' | 'Expired' | 'Pending'

export interface CredentialRecord {
  documentId:         string
  studentId:          string
  documentTypeName:   string
  verificationStatus: CredentialVerificationStatus
  expiryDate:         string | null
  uploadedAt:         string
  fileName:           string
}
```

---

## Task 2 — Add query hook `src/hooks/useStudentCredentials.ts`

Follow the queryKeys pattern established in `useCompliance.ts`.

```typescript
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
```

No `refetchInterval` — credential lookup is a one-shot query, not a polling operation.

---

## Task 3 — MSW handlers `src/mocks/handlers/credentials.ts`

Add handlers alongside existing mock handlers. Check `src/mocks/handlers/` for the
existing handler file pattern and import/export convention — match it exactly.

```typescript
import { http, HttpResponse } from 'msw'
import type { ApiEnvelope, CredentialRecord } from '@/types/api'

const BASE = import.meta.env.VITE_API_BASE_URL ?? ''

const verifiedStudent: CredentialRecord = {
  documentId:         '01JWABCDEF1234567890ABCDEF',
  studentId:          'SLI-STU-001',
  documentTypeName:   'Student Completion Record',
  verificationStatus: 'Verified',
  expiryDate:         null,
  uploadedAt:         '2026-01-15T09:00:00.000+02:00',
  fileName:           'completion-certificate-stu001.pdf',
}

const pendingStudent: CredentialRecord = {
  documentId:         '01JWABCDEF1234567890ABCDEG',
  studentId:          'SLI-STU-002',
  documentTypeName:   'Student Completion Record',
  verificationStatus: 'Pending',
  expiryDate:         null,
  uploadedAt:         '2026-06-14T11:30:00.000+02:00',
  fileName:           'completion-certificate-stu002.pdf',
}

const expiredStudent: CredentialRecord = {
  documentId:         '01JWABCDEF1234567890ABCDEH',
  studentId:          'SLI-STU-003',
  documentTypeName:   'Student Completion Record',
  verificationStatus: 'Expired',
  expiryDate:         '2025-12-31',
  uploadedAt:         '2025-01-10T08:00:00.000+02:00',
  fileName:           'completion-certificate-stu003.pdf',
}

function okEnvelope<T>(data: T, correlationId = 'mock-correlation-id'): ApiEnvelope<T> {
  return { success: true, data, error: null, correlationId }
}

export const credentialHandlers = [
  http.get(`${BASE}/api/students/:studentId/credentials`, ({ params }) => {
    const { studentId } = params as { studentId: string }

    if (studentId === 'SLI-STU-001') {
      return HttpResponse.json(okEnvelope([verifiedStudent]))
    }
    if (studentId === 'SLI-STU-002') {
      return HttpResponse.json(okEnvelope([pendingStudent]))
    }
    if (studentId === 'SLI-STU-003') {
      return HttpResponse.json(okEnvelope([expiredStudent]))
    }
    // Not found — 200 with empty array
    return HttpResponse.json(okEnvelope([]))
  }),
]
```

Register `credentialHandlers` in the root handler array — check `src/mocks/handlers/index.ts`
(or equivalent) and add the import and spread there.

---

## Task 4 — Credential card component `src/features/credentials/CredentialCard.tsx`

```typescript
import type { CredentialRecord } from '@/types/api'

interface CredentialCardProps {
  credential: CredentialRecord
}

export function CredentialCard({ credential }: CredentialCardProps) {
  const { verificationStatus, documentTypeName, expiryDate, uploadedAt, fileName } = credential

  const bannerConfig = {
    Verified: { label: 'Credential verified',  bg: '#F0FDF4', border: '#BBF7D0', color: '#15803D' },
    Expired:  { label: 'Credential expired',   bg: '#FFF7ED', border: '#FED7AA', color: '#C2410C' },
    Pending:  { label: 'Processing',           bg: '#EFF6FF', border: '#BFDBFE', color: '#1E40AF' },
  }[verificationStatus]

  const formattedUpload = new Date(uploadedAt).toLocaleDateString('en-ZA', {
    day: '2-digit', month: 'short', year: 'numeric',
  })

  const formattedExpiry = expiryDate
    ? new Date(expiryDate).toLocaleDateString('en-ZA', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : null

  return (
    <div style={{
      border: `1px solid ${bannerConfig.border}`,
      borderRadius: 8,
      overflow: 'hidden',
      fontFamily: '"IBM Plex Sans", sans-serif',
    }}>
      {/* Status banner */}
      <div style={{
        background: bannerConfig.bg,
        borderBottom: `1px solid ${bannerConfig.border}`,
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
          textTransform: 'uppercase', color: bannerConfig.color,
        }}>
          {bannerConfig.label}
        </span>
      </div>

      {/* Detail rows */}
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <DetailRow label="Document type"  value={documentTypeName} />
        <DetailRow label="Uploaded"        value={formattedUpload} />
        {formattedExpiry && (
          <DetailRow
            label="Expires"
            value={formattedExpiry}
            valueStyle={verificationStatus === 'Expired' ? { color: '#C2410C', fontWeight: 600 } : undefined}
          />
        )}
        <DetailRow label="File" value={fileName} />
      </div>
    </div>
  )
}

function DetailRow({
  label, value, valueStyle,
}: {
  label: string
  value: string
  valueStyle?: React.CSSProperties
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
      <span style={{ fontSize: 12, color: '#64748B', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, color: '#0F172A', textAlign: 'right', ...valueStyle }}>{value}</span>
    </div>
  )
}
```

---

## Task 5 — Credential verification page `src/features/credentials/CredentialVerificationPage.tsx`

```typescript
import { useState } from 'react'
import { useStudentCredentials } from '@/hooks/useStudentCredentials'
import { CredentialCard } from './CredentialCard'

export function CredentialVerificationPage() {
  const [inputValue, setInputValue]   = useState('')
  const [studentId,  setStudentId]    = useState<string | null>(null)

  const { data, isLoading, isError } = useStudentCredentials(studentId)

  const credentials = data?.data ?? []
  const searched    = studentId !== null

  function handleSearch() {
    const trimmed = inputValue.trim()
    if (!trimmed) return
    setStudentId(trimmed)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 16px',
      fontFamily: '"IBM Plex Sans", sans-serif' }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>
        Credential Verification
      </h1>
      <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 24px' }}>
        Enter a student number to verify their qualification records.
      </p>

      {/* Search bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input
          type="text"
          placeholder="Student number"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1, height: 38, padding: '0 12px', borderRadius: 6,
            border: '1px solid #CBD5E1', fontSize: 13, fontFamily: 'inherit',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSearch}
          disabled={isLoading || !inputValue.trim()}
          style={{
            height: 38, padding: '0 18px', borderRadius: 6,
            background: '#0F172A', color: '#FFFFFF', border: 'none',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            opacity: (isLoading || !inputValue.trim()) ? 0.5 : 1,
          }}
        >
          {isLoading ? 'Searching…' : 'Search'}
        </button>
      </div>

      {/* Results */}
      {isError && (
        <p style={{ fontSize: 13, color: '#C2410C' }}>
          An error occurred. Please try again.
        </p>
      )}

      {searched && !isLoading && !isError && credentials.length === 0 && (
        <div style={{
          padding: '20px 16px', borderRadius: 8,
          border: '1px solid #E2E8F0', background: '#F8FAFC', textAlign: 'center',
        }}>
          <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
            No credential records found for <strong>{studentId}</strong>.
          </p>
        </div>
      )}

      {credentials.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {credentials.map((c) => (
            <CredentialCard key={c.documentId} credential={c} />
          ))}
        </div>
      )}
    </div>
  )
}
```

---

## Task 6 — Route registration

Read the existing router file to find where routes are declared (likely `src/App.tsx`,
`src/router.tsx`, or `src/routes.tsx`). Read it before editing.

Add the credentials route following the existing pattern. Likely:

```typescript
import { CredentialVerificationPage } from '@/features/credentials/CredentialVerificationPage'

// Inside route definitions:
{ path: '/credentials', element: <CredentialVerificationPage /> }
```

Add a nav link in the sidebar/nav component if one exists, following the existing nav item pattern.
Scope visibility to `ComplianceUser` and `TenantAdmin` roles only — check how existing nav items
gate on role and apply the same pattern. `Viewer` and `EntityUser` must not see this nav item.

---

## Task 7 — Unit tests

Add tests in `src/features/credentials/__tests__/CredentialCard.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
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

test('shows verified banner for Verified status', () => {
  render(<CredentialCard credential={base} />)
  expect(screen.getByText(/credential verified/i)).toBeTruthy()
})

test('shows expired banner for Expired status', () => {
  render(<CredentialCard credential={{ ...base, verificationStatus: 'Expired', expiryDate: '2025-12-31' }} />)
  expect(screen.getByText(/credential expired/i)).toBeTruthy()
})

test('shows processing banner for Pending status', () => {
  render(<CredentialCard credential={{ ...base, verificationStatus: 'Pending' }} />)
  expect(screen.getByText(/processing/i)).toBeTruthy()
})

test('renders expiry date when present', () => {
  render(<CredentialCard credential={{ ...base, expiryDate: '2027-06-15' }} />)
  expect(screen.getByText(/expires/i)).toBeTruthy()
})

test('omits expiry row when expiryDate is null', () => {
  render(<CredentialCard credential={{ ...base, expiryDate: null }} />)
  expect(screen.queryByText(/expires/i)).toBeNull()
})
```

---

## Verification

```bash
# Type check
npx tsc --noEmit

# Tests — all must pass
npm run test -- --run 2>&1 | tail -20

# Dev server smoke test
npm run dev
# Manually navigate to /credentials in browser
# Search SLI-STU-001 → Verified card
# Search SLI-STU-002 → Pending card
# Search SLI-STU-003 → Expired card
# Search UNKNOWN-999 → "No credential records found"
```

Report back: tsc output, test results (pass count), and confirmation that all four
MSW states rendered correctly in the browser.