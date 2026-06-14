import { createColumnHelper, type RowData } from '@tanstack/react-table'
import type { DocumentRecord } from '@/types/api'
import { getThreadColor, getCategoryLabel } from '@/lib/thread-color'
import {
  deriveDisplayStatus, daysUntilExpiry, type DisplayStatus,
  getStatusStyle, getDaysStyle, formatDays, formatExpiryDate,
} from '@/lib/document-status'

// Mark the column that should flex to fill remaining width. TanStack's getSize()
// always returns a number (default 150), so a width/flex switch needs an explicit flag.
declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    flex?: boolean
  }
}

const col = createColumnHelper<DocumentRecord>()

// Field names match the PascalCase shape in src/types/api.ts (verified, Portal-C).
export const documentColumns = [
  col.accessor('Category', {
    header: 'Category',
    size: 74,
    enableSorting: false,
    cell: ({ getValue }) => {
      const cat = getValue<string>()
      const color = getThreadColor(cat)
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: color, flexShrink: 0, display: 'inline-block',
          }} />
          <span style={{
            fontFamily: '"IBM Plex Sans"', fontSize: 10, color, fontWeight: 500,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {getCategoryLabel(cat)}
          </span>
        </div>
      )
    },
  }),

  col.accessor((d) => d.TypeName ?? d.FileName, {
    id: 'document',
    header: 'Document',
    enableSorting: false,
    meta: { flex: true },
    cell: ({ getValue }) => (
      <span style={{
        fontFamily: '"IBM Plex Sans"', fontSize: 12, color: '#1E293B',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
      }}>
        {getValue<string>()}
      </span>
    ),
  }),

  // Display status is derived from pipeline status + expiry, not the raw Status field
  col.accessor((d) => deriveDisplayStatus(d), {
    id: 'status',
    header: 'Status',
    size: 70,
    enableSorting: false,
    cell: ({ getValue }) => {
      const s = getValue<DisplayStatus>()
      const style = getStatusStyle(s)
      return (
        <span style={{
          fontFamily: '"IBM Plex Sans"', fontSize: 9.5, fontWeight: 600,
          padding: '2px 6px', borderRadius: 3,
          background: style.bg, color: style.text,
        }}>
          {s}
        </span>
      )
    },
  }),

  col.accessor('ExpiryDate', {
    header: 'Expires',
    size: 92,
    enableSorting: false,
    cell: ({ getValue, row }) => {
      const days = daysUntilExpiry(row.original.ExpiryDate)
      return (
        <span style={{
          fontSize: 11, fontFamily: '"IBM Plex Mono", monospace',
          color: days !== null && days <= 30 ? '#92400E' : '#475569',
        }}>
          {formatExpiryDate(getValue<string | null>())}
        </span>
      )
    },
  }),

  // Days-until-expiry is computed from ExpiryDate (no such field on the record).
  // Default sort ascending = overdue/soonest first; no-expiry docs (undefined)
  // sort last in BOTH directions via sortUndefined.
  col.accessor((d) => daysUntilExpiry(d.ExpiryDate) ?? undefined, {
    id: 'days',
    header: 'Days',
    size: 48,
    sortingFn: 'basic',
    sortUndefined: 'last',
    cell: ({ getValue }) => {
      const v = getValue<number | undefined>() ?? null
      return (
        <span style={{ fontSize: 11, fontWeight: 500, ...getDaysStyle(v) }}>
          {formatDays(v)}
        </span>
      )
    },
  }),
]
