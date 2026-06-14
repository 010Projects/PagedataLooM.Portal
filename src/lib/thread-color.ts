import { threadColors, type ThreadColorKey } from '@/tokens/design-tokens'

// Backend categories are short codes (verified in Task 0 discovery):
// FLT, DRV, LDX, SQS, COM, ACC, BEE. Map each to a thread color and label.
const CATEGORY_CONFIG: Record<string, { thread: ThreadColorKey; label: string }> = {
  FLT: { thread: 'operational', label: 'Fleet' },
  DRV: { thread: 'personnel',   label: 'Driver' },
  LDX: { thread: 'operational', label: 'Load' },
  SQS: { thread: 'regulatory',  label: 'SQAS' },
  COM: { thread: 'financial',   label: 'Commercial' },
  ACC: { thread: 'operational', label: 'Accreditation' },
  BEE: { thread: 'legal',       label: 'B-BBEE' },
}

export function getThreadColor(category: string): string {
  const key = CATEGORY_CONFIG[category]?.thread ?? 'regulatory'
  return threadColors[key].light
}

export function getThreadColorDark(category: string): string {
  const key = CATEGORY_CONFIG[category]?.thread ?? 'regulatory'
  return threadColors[key].dark
}

export function getCategoryLabel(category: string): string {
  return CATEGORY_CONFIG[category]?.label ?? category
}
