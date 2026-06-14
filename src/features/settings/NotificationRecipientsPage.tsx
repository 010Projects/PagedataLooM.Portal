import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores'
import {
  useNotificationConfig,
  useUpdateNotificationConfig,
} from '@/hooks/useCompliance'
import type { NotificationConfig } from '@/types/api'

const MAX_RECIPIENTS = 10

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export function NotificationRecipientsPage() {
  const { user, isTenantAdmin, isPlatformAdmin } = useAuthStore()
  const tenantId  = user?.tenantId ?? null

  const { data: config, isLoading } = useNotificationConfig(tenantId)
  const updateMutation = useUpdateNotificationConfig(tenantId)

  const [recipients, setRecipients] = useState<string[]>([])
  const [newEmail, setNewEmail]     = useState('')
  const [emailError, setEmailError] = useState('')
  const [isDirty, setIsDirty]       = useState(false)
  const [showEmptyWarning, setShowEmptyWarning] = useState(false)
  const [syncedConfig, setSyncedConfig] = useState<NotificationConfig | undefined>(undefined)

  // Sync the editable list from the loaded config during render (React's
  // "adjust state when input changes" pattern — no effect). react-query keeps a
  // stable data reference, so this re-runs only on the initial load and refetches.
  if (config !== syncedConfig) {
    setSyncedConfig(config)
    setRecipients(config?.alertRecipients ?? [])
    setIsDirty(false)
  }

  // The auth store hydrates asynchronously (useAuth in AppLayout). On a cold
  // load / refresh of this route, user is briefly null — wait rather than
  // redirect, otherwise a direct hit always bounces before roles arrive.
  if (user === null) {
    return (
      <div style={{ fontFamily: '"IBM Plex Sans", sans-serif', padding: '24px',
        fontSize: 13, color: '#94A3B8' }}>
        Loading…
      </div>
    )
  }

  // Gate: TenantAdmin or PlatformAdmin only. All hooks run above this so the
  // hook order stays stable; redirect declaratively rather than during render.
  const canAccess = isTenantAdmin() || isPlatformAdmin()
  if (!canAccess) {
    return <Navigate to="/dashboard" replace />
  }

  const handleAdd = () => {
    const email = newEmail.trim().toLowerCase()
    if (!isValidEmail(email)) {
      setEmailError('Enter a valid email address')
      return
    }
    if (recipients.includes(email)) {
      setEmailError('This address is already in the list')
      return
    }
    if (recipients.length >= MAX_RECIPIENTS) {
      setEmailError(`Maximum ${MAX_RECIPIENTS} recipients allowed`)
      return
    }
    setRecipients([...recipients, email])
    setNewEmail('')
    setEmailError('')
    setIsDirty(true)
  }

  const handleRemove = (email: string) => {
    setRecipients(recipients.filter((r) => r !== email))
    setIsDirty(true)
  }

  const handleSave = () => {
    if (recipients.length === 0) {
      setShowEmptyWarning(true)
      return
    }
    doSave()
  }

  const doSave = () => {
    setShowEmptyWarning(false)
    updateMutation.mutate({ alertRecipients: recipients })
    setIsDirty(false)
  }

  return (
    <div style={{ fontFamily: '"IBM Plex Sans", sans-serif',
      maxWidth: 560, padding: '24px' }}>

      <p style={{ fontSize: 11, color: '#94A3B8', letterSpacing: '0.07em',
        textTransform: 'uppercase', fontWeight: 600, margin: '0 0 6px' }}>
        Settings
      </p>
      <h1 style={{ fontFamily: '"IBM Plex Sans"', fontSize: 20, fontWeight: 700,
        color: '#0D1F3C', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
        Notification recipients
      </h1>
      <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 28px', lineHeight: 1.6 }}>
        These addresses receive expiry alerts for{' '}
        <strong style={{ color: '#0D1F3C' }}>{tenantId}</strong>.
      </p>

      {isLoading ? (
        <p style={{ fontSize: 13, color: '#94A3B8' }}>Loading…</p>
      ) : (
        <>
          {/* Recipient list */}
          <div style={{ marginBottom: 20 }}>
            {recipients.length === 0 ? (
              <p style={{ fontSize: 12, color: '#CBD5E1', fontStyle: 'italic',
                padding: '12px 0', margin: 0 }}>
                No recipients configured — expiry alerts are disabled.
              </p>
            ) : (
              recipients.map((email) => (
                <div key={email} style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 12px',
                  borderBottom: '0.5px solid #F1F5F9',
                }}>
                  <span style={{ fontSize: 13, color: '#1E293B' }}>{email}</span>
                  <button
                    onClick={() => handleRemove(email)}
                    aria-label={`Remove ${email}`}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#CBD5E1', fontSize: 16, lineHeight: 1, padding: '2px 4px',
                    }}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add recipient */}
          {recipients.length < MAX_RECIPIENTS && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="email"
                  placeholder="Add email address"
                  value={newEmail}
                  onChange={(e) => { setNewEmail(e.target.value); setEmailError('') }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  style={{
                    flex: 1, padding: '8px 10px', fontSize: 13,
                    border: `0.5px solid ${emailError ? '#EF4444' : '#CBD5E1'}`,
                    borderRadius: 4, fontFamily: '"IBM Plex Sans"',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={handleAdd}
                  style={{
                    padding: '8px 16px', borderRadius: 4, border: 'none',
                    background: '#0D1F3C', color: '#FFFFFF',
                    fontSize: 12, fontWeight: 600,
                    fontFamily: '"IBM Plex Sans"', cursor: 'pointer',
                  }}
                >
                  Add
                </button>
              </div>
              {emailError && (
                <p style={{ fontSize: 11, color: '#EF4444', margin: '4px 0 0' }}>
                  {emailError}
                </p>
              )}
            </div>
          )}

          {/* Empty warning */}
          {showEmptyWarning && (
            <div style={{
              background: '#FEF3C7', border: '0.5px solid #FDE68A',
              borderRadius: 5, padding: '12px 14px', marginBottom: 16,
            }}>
              <p style={{ fontSize: 12, color: '#78350F', margin: '0 0 10px' }}>
                Saving with no recipients will disable expiry alerts for this tenant.
                Are you sure?
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setShowEmptyWarning(false)}
                  style={{
                    padding: '5px 12px', borderRadius: 4,
                    border: '0.5px solid #CBD5E1', background: 'transparent',
                    fontSize: 11, cursor: 'pointer', fontFamily: '"IBM Plex Sans"',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={doSave}
                  style={{
                    padding: '5px 12px', borderRadius: 4, border: 'none',
                    background: '#92400E', color: '#FFFFFF',
                    fontSize: 11, fontWeight: 600,
                    fontFamily: '"IBM Plex Sans"', cursor: 'pointer',
                  }}
                >
                  Save anyway
                </button>
              </div>
            </div>
          )}

          {/* Server error */}
          {updateMutation.isError && (
            <div style={{
              background: '#FEE2E2', borderRadius: 5, padding: '10px 14px',
              marginBottom: 16, border: '0.5px solid #FECACA',
            }}>
              <p style={{ fontSize: 12, color: '#7F1D1D', margin: 0 }}>
                {updateMutation.error instanceof Error
                  ? updateMutation.error.message
                  : 'Save failed — please try again.'}
              </p>
            </div>
          )}

          {/* Success */}
          {updateMutation.isSuccess && !isDirty && (
            <div style={{
              background: '#F0FDF4', borderRadius: 5, padding: '10px 14px',
              marginBottom: 16, border: '0.5px solid #BBF7D0',
            }}>
              <p style={{ fontSize: 12, color: '#15803D', margin: 0,
                fontWeight: 500 }}>
                Recipients saved.
              </p>
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!isDirty || updateMutation.isPending}
            style={{
              padding: '9px 20px', borderRadius: 4, border: 'none',
              background: isDirty && !updateMutation.isPending
                ? '#0D1F3C' : '#E2E8F0',
              color: isDirty && !updateMutation.isPending
                ? '#FFFFFF' : '#94A3B8',
              fontSize: 12, fontWeight: 600,
              fontFamily: '"IBM Plex Sans"',
              cursor: isDirty ? 'pointer' : 'default',
            }}
          >
            {updateMutation.isPending ? 'Saving…' : 'Save recipients'}
          </button>

          {isDirty && (
            <span style={{ fontSize: 11, color: '#F59E0B',
              marginLeft: 12, fontWeight: 500 }}>
              Unsaved changes
            </span>
          )}
        </>
      )}
    </div>
  )
}
