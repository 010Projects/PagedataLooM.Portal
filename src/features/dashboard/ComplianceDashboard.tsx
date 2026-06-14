import { useState } from 'react'
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  flexRender, type SortingState,
} from '@tanstack/react-table'
import { useDashboardStore } from '@/stores'
import { useDocuments, useCompleteness, useEvidencePack } from '@/hooks/useCompliance'
import { SERVICE_CONFIG } from '@/types/api'
import { documentColumns } from './document-columns'
import { UploadPanel } from '@/features/upload/UploadPanel'

export function ComplianceDashboard() {
  const { activeService, activeEntityKey } = useDashboardStore()
  const svc = SERVICE_CONFIG[activeService]
  const [uploadOpen, setUploadOpen] = useState(false)

  const { data: documents, isLoading: docsLoading } = useDocuments(activeEntityKey)
  // Stat cards read from the dedicated B-017 completeness endpoint (no longer
  // derived client-side from audit-readiness)
  const { data: completeness } = useCompleteness(activeEntityKey)
  const packMutation = useEvidencePack(activeService)

  // Default sort: soonest expiry / overdue first, no-expiry last (see daysSortingFn)
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'days', desc: false },
  ])

  const table = useReactTable({
    data: documents ?? [],
    columns: documentColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  // No entity selected — prompt user
  if (!activeEntityKey) {
    return (
      <div style={{
        padding: '2rem', display: 'flex', alignItems: 'center',
        justifyContent: 'center', height: '100%',
        fontFamily: '"IBM Plex Sans", sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 16 }}>
            {['#312E7A','#1E40AF','#065F46','#92400E','#7F1D1D'].map((c) => (
              <div key={c} style={{
                width: 4, height: 32, borderRadius: 1, background: c, opacity: 0.3,
              }} />
            ))}
          </div>
          <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>
            Select an entity to view compliance status
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      padding: '18px 20px',
      fontFamily: '"IBM Plex Sans", sans-serif',
      display: 'flex', flexDirection: 'column', gap: 14, height: '100%',
      boxSizing: 'border-box', overflow: 'auto',
    }}>

      {/* Entity header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <h1 style={{
          fontFamily: '"IBM Plex Sans", sans-serif',
          fontSize: 17, fontWeight: 700, color: '#0D1F3C',
          margin: 0, letterSpacing: '-0.02em', flex: 1,
        }}>
          {activeEntityKey}
        </h1>
        <span style={{
          fontFamily: '"IBM Plex Sans", sans-serif',
          fontSize: 9.5, fontWeight: 600, padding: '2px 7px',
          borderRadius: 3, background: '#EFF6FF', color: svc.threadColorLight,
        }}>
          {svc.label}
        </span>
        <button
          onClick={() => setUploadOpen(true)}
          style={{
            fontFamily: '"IBM Plex Sans", sans-serif',
            fontSize: 11, fontWeight: 500, padding: '6px 12px',
            borderRadius: 4, background: 'transparent', color: '#475569',
            border: '0.5px solid #CBD5E1', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          <UploadIcon /> Upload
        </button>
        <button
          onClick={() => packMutation.mutate({ entityKey: activeEntityKey })}
          disabled={packMutation.isPending}
          style={{
            fontFamily: '"IBM Plex Sans", sans-serif',
            fontSize: 11, fontWeight: 600, padding: '6px 12px',
            borderRadius: 4, background: '#0D1F3C', color: '#FFFFFF',
            border: 'none', cursor: packMutation.isPending ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 5, opacity: packMutation.isPending ? 0.7 : 1,
          }}
        >
          <DownloadIcon />
          {packMutation.isPending ? 'Generating…' : 'Evidence pack'}
        </button>
      </div>

      {/* Evidence pack error — backend returns a JSON envelope (e.g. NO_DOCUMENTS) */}
      {packMutation.isError && (
        <p style={{
          fontSize: 11, color: '#DC2626', margin: 0, flexShrink: 0,
        }}>
          {packMutation.error instanceof Error
            ? packMutation.error.message
            : 'Evidence pack generation failed'}
        </p>
      )}

      {/* Stats row — from the completeness endpoint */}
      {completeness && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 8, flexShrink: 0,
        }}>
          <StatCard label="Required"  value={completeness.documentsRequired}  bg="#F8FAFC"  color="#0D1F3C" />
          <StatCard label="Complete"  value={completeness.documentsPresent}   bg="#F0FDF4"  color="#15803D" labelColor="#16A34A" />
          <StatCard label="Expiring"  value={completeness.documentsExpiring}  bg="#FFFBEB"  color="#B45309" labelColor="#D97706" />
          <StatCard label="Expired"   value={completeness.documentsExpired}   bg="#FFF1F2"  color="#BE123C" labelColor="#E11D48" />
        </div>
      )}

      {/* Document table — TanStack Table, sortable by days-until-expiry */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        {table.getHeaderGroups().map((hg) => (
          <div key={hg.id} style={{
            display: 'flex', alignItems: 'center',
            borderBottom: '0.5px solid #E2E8F0',
            paddingBottom: 6, marginBottom: 2, flexShrink: 0,
          }}>
            {hg.headers.map((h) => {
              const isFlex = h.column.columnDef.meta?.flex === true
              return (
                <div
                  key={h.id}
                  onClick={h.column.getToggleSortingHandler()}
                  style={{
                    width: isFlex ? undefined : h.getSize(),
                    flex: isFlex ? 1 : undefined,
                    flexShrink: 0, cursor: h.column.getCanSort() ? 'pointer' : 'default',
                    userSelect: 'none', display: 'flex', alignItems: 'center', gap: 4,
                    minWidth: isFlex ? 0 : undefined,
                  }}
                >
                  <span style={{
                    fontFamily: '"IBM Plex Sans"', fontSize: 9.5, fontWeight: 600,
                    color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em',
                  }}>
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </span>
                  {h.column.getIsSorted() === 'asc'  && <span style={{ color: '#1E40AF', fontSize: 10 }}>↑</span>}
                  {h.column.getIsSorted() === 'desc' && <span style={{ color: '#1E40AF', fontSize: 10 }}>↓</span>}
                </div>
              )
            })}
          </div>
        ))}

        {/* Loading */}
        {docsLoading && (
          <div style={{ padding: '16px 0' }}>
            <p style={{ fontSize: 12, color: '#CBD5E1', margin: 0 }}>Loading documents…</p>
          </div>
        )}

        {/* Rows */}
        {!docsLoading && (
          <div style={{ flex: 1, overflow: 'auto' }}>
            {table.getRowModel().rows.map((row) => (
              <div key={row.id} style={{
                display: 'flex', alignItems: 'center',
                borderBottom: '0.5px solid #F1F5F9', padding: '7px 0',
              }}>
                {row.getVisibleCells().map((cell) => {
                  const isFlex = cell.column.columnDef.meta?.flex === true
                  return (
                    <div key={cell.id} style={{
                      width: isFlex ? undefined : cell.column.getSize(),
                      flex: isFlex ? 1 : undefined,
                      flexShrink: 0, overflow: 'hidden',
                      minWidth: isFlex ? 0 : undefined,
                    }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  )
                })}
              </div>
            ))}
            {(documents ?? []).length === 0 && (
              <p style={{ fontSize: 12, color: '#CBD5E1', padding: '16px 0', margin: 0,
                fontFamily: '"IBM Plex Sans"' }}>
                No documents found for this entity
              </p>
            )}
          </div>
        )}
      </div>

      {uploadOpen && activeEntityKey && (
        <UploadPanel
          entityKey={activeEntityKey}
          onClose={() => setUploadOpen(false)}
        />
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────

interface StatCardProps {
  label: string; value: number
  bg: string; color: string; labelColor?: string
}

function StatCard({ label, value, bg, color, labelColor }: StatCardProps) {
  return (
    <div style={{ background: bg, borderRadius: 6, padding: '10px 12px' }}>
      <p style={{
        fontFamily: '"IBM Plex Sans"', fontSize: 10, fontWeight: 500,
        color: labelColor ?? '#94A3B8', margin: '0 0 3px',
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        {label}
      </p>
      <p style={{
        fontFamily: '"IBM Plex Sans"', fontSize: 22, fontWeight: 700,
        color, margin: 0, lineHeight: 1,
      }}>
        {value}
      </p>
    </div>
  )
}

function UploadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}
