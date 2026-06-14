export const threadColors = {
  legal:      { light: '#312E7A', dark: '#818CF8', label: 'Legal'       },
  regulatory: { light: '#1E40AF', dark: '#60A5FA', label: 'Regulatory'  },
  operational:{ light: '#065F46', dark: '#34D399', label: 'Operational' },
  financial:  { light: '#92400E', dark: '#FCD34D', label: 'Financial'   },
  personnel:  { light: '#7F1D1D', dark: '#FCA5A5', label: 'Personnel'   },
} as const

export type ThreadColorKey = keyof typeof threadColors

export const brandColors = {
  navy:      '#0D1F3C',
  navyDeep:  '#07101F',
  surface:   '#F8FAFC',
  white:     '#FFFFFF',
} as const

export const statusColors = {
  active:   { bg: '#DCFCE7', text: '#15803D', label: 'Active'   },
  expiring: { bg: '#FEF3C7', text: '#B45309', label: 'Expiring' },
  expired:  { bg: '#FEE2E2', text: '#BE123C', label: 'Expired'  },
  missing:  { bg: '#F1F5F9', text: '#334155', label: 'Missing'  },
  info:     { bg: '#EFF6FF', text: '#1E40AF', label: 'Info'     },
} as const

export type DocumentStatus = keyof typeof statusColors

export const threadStripeOrder: ThreadColorKey[] = [
  'legal', 'regulatory', 'operational', 'financial', 'personnel'
]
