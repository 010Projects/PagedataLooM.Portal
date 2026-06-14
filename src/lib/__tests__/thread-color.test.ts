import { describe, it, expect } from 'vitest'
import { getThreadColor, getThreadColorDark, getCategoryLabel } from '@/lib/thread-color'
import { threadColors } from '@/tokens/design-tokens'

// The backend's actual category codes (see CATEGORY_CONFIG in thread-color.ts)
// and the thread each must map to
const EXPECTED_MAPPING = {
  FLT: 'operational',
  DRV: 'personnel',
  LDX: 'operational',
  SQS: 'regulatory',
  COM: 'financial',
  ACC: 'operational',
  BEE: 'legal',
} as const

describe('getThreadColor', () => {
  it.each(Object.entries(EXPECTED_MAPPING))(
    'maps %s to the %s thread light color',
    (code, thread) => {
      expect(getThreadColor(code)).toBe(threadColors[thread].light)
    }
  )

  it('returns a valid hex color for all mapped categories', () => {
    for (const code of Object.keys(EXPECTED_MAPPING)) {
      expect(getThreadColor(code)).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it('falls back to regulatory color for unknown category', () => {
    const fallback = getThreadColor('UNKNOWN_CATEGORY')
    expect(fallback).toBe(threadColors.regulatory.light)
  })

  it('handles the exact uppercase codes the backend sends', () => {
    const result = getThreadColor('SQS')
    expect(result).toBeTruthy()
  })
})

describe('getThreadColorDark', () => {
  it.each(Object.entries(EXPECTED_MAPPING))(
    'maps %s to the %s thread dark color',
    (code, thread) => {
      expect(getThreadColorDark(code)).toBe(threadColors[thread].dark)
    }
  )

  it('returns dark variant for known category', () => {
    const light = getThreadColor('SQS')
    const dark  = getThreadColorDark('SQS')
    expect(light).not.toBe(dark)  // dark and light must differ
    expect(dark).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })

  it('falls back to regulatory dark for unknown category', () => {
    expect(getThreadColorDark('NOPE')).toBe(threadColors.regulatory.dark)
  })
})

describe('getCategoryLabel', () => {
  it('returns the human label for a known code', () => {
    expect(getCategoryLabel('SQS')).toBe('SQAS')
    expect(getCategoryLabel('FLT')).toBe('Fleet')
    expect(getCategoryLabel('BEE')).toBe('B-BBEE')
  })

  it('passes through unknown codes unchanged', () => {
    expect(getCategoryLabel('XYZ')).toBe('XYZ')
  })
})
