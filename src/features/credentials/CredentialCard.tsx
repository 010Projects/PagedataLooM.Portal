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
        <DetailRow label="Document type" value={documentTypeName} />
        <DetailRow label="Uploaded"      value={formattedUpload} />
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
