import { threadColors, threadStripeOrder } from '@/tokens/design-tokens'

interface ThreadStripeProps {
  height?: number
  variant?: 'light' | 'dark'
}

export function ThreadStripe({ height = 3, variant = 'light' }: ThreadStripeProps) {
  return (
    <div style={{ display: 'flex', height, flexShrink: 0 }}>
      {threadStripeOrder.map((key) => (
        <div
          key={key}
          style={{
            flex: 1,
            background: threadColors[key][variant === 'dark' ? 'dark' : 'light'],
          }}
        />
      ))}
    </div>
  )
}
