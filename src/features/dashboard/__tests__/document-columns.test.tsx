import { renderHook } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  type SortingState,
} from '@tanstack/react-table'
import { documentColumns } from '@/features/dashboard/document-columns'
import type { DocumentRecord } from '@/types/api'

function doc(id: string, expiry: string | null): DocumentRecord {
  return {
    documentId: id,
    Category: 'SQS',
    TypeCode: 'SQS-001',
    TypeName: `Doc ${id}`,
    EntityKey: 'RSC-COMP-001',
    FileName: `${id}.pdf`,
    ContentType: 'application/pdf',
    Status: 'Indexed',
    ExpiryDate: expiry,
    UploadedBy: 'test@test.com',
    UploadedAt: '2026-01-01T00:00:00Z',
    LastModifiedAt: '2026-01-01T00:00:00Z',
    downloadUrl: null,
  }
}

function useSortedRows(data: DocumentRecord[], sorting: SortingState) {
  const table = useReactTable({
    data,
    columns: documentColumns,
    state: { sorting },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })
  return table.getRowModel().rows.map((r) => r.original.documentId)
}

describe('document table default sort (days ascending)', () => {
  // Relative to "now" so the test is stable regardless of run date
  const day = 24 * 60 * 60 * 1000
  const inDays = (n: number) => new Date(Date.now() + n * day).toISOString()

  it('orders overdue first, then soonest expiry, with no-expiry last', () => {
    const data = [
      doc('far',     inDays(400)),
      doc('none',    null),
      doc('overdue', inDays(-10)),
      doc('soon',    inDays(5)),
    ]

    const { result } = renderHook(() =>
      useSortedRows(data, [{ id: 'days', desc: false }])
    )

    expect(result.current).toEqual(['overdue', 'soon', 'far', 'none'])
  })

  it('keeps no-expiry rows last even when descending', () => {
    const data = [
      doc('none',    null),
      doc('soon',    inDays(5)),
      doc('far',     inDays(400)),
    ]

    const { result } = renderHook(() =>
      useSortedRows(data, [{ id: 'days', desc: true }])
    )

    // desc inverts the numeric order; nulls stay at the bottom
    expect(result.current.slice(0, 2)).toEqual(['far', 'soon'])
    expect(result.current[result.current.length - 1]).toBe('none')
  })
})
