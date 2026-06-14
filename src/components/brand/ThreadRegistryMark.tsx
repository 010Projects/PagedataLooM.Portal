import { brandColors, threadColors } from '@/tokens/design-tokens'

interface ThreadRegistryMarkProps {
  variant?: 'light' | 'dark'
  height?: number
}

const VIEWBOX_W = 56
const VIEWBOX_H = 76

export function ThreadRegistryMark({
  variant = 'light',
  height = 56,
}: ThreadRegistryMarkProps) {
  const width = (height / VIEWBOX_H) * VIEWBOX_W
  const beamFill = variant === 'dark' ? '#FFFFFF' : brandColors.navy

  const threads = [
    { x: 0,  h: 46, key: 'legal'       },
    { x: 12, h: 56, key: 'regulatory'  },
    { x: 24, h: 64, key: 'operational' },
    { x: 36, h: 56, key: 'financial'   },
    { x: 48, h: 46, key: 'personnel'   },
  ] as const

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
      aria-label="PagedataLooM Thread Registry mark"
      role="img"
    >
      <rect x={0} y={0} width={56} height={6} rx={2} fill={beamFill} />
      {threads.map(({ x, h, key }) => (
        <rect
          key={key}
          x={x}
          y={8}
          width={8}
          height={h}
          rx={0}
          fill={threadColors[key][variant === 'dark' ? 'dark' : 'light']}
        />
      ))}
    </svg>
  )
}
