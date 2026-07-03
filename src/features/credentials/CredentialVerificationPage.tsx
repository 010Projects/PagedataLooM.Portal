import { useState } from 'react'
import { useStudentCredentials } from '@/hooks/useStudentCredentials'
import { CredentialCard } from './CredentialCard'

export function CredentialVerificationPage() {
  const [inputValue, setInputValue] = useState('')
  const [studentId,  setStudentId]  = useState<string | null>(null)

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
