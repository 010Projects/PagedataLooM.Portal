interface WordmarkProps {
  variant?: 'light' | 'dark'
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: { container: '13px',  mono: '11.5px' },
  md: { container: '15.5px', mono: '13.5px' },
  lg: { container: '22px',  mono: '19px'   },
}

export function Wordmark({ variant = 'light', size = 'md' }: WordmarkProps) {
  const color = variant === 'dark' ? '#FFFFFF' : '#0D1F3C'
  const { container, mono } = sizes[size]

  return (
    <span
      style={{
        fontFamily: '"IBM Plex Sans", sans-serif',
        fontSize: container,
        color,
        letterSpacing: '-0.02em',
        lineHeight: 1,
        userSelect: 'none',
      }}
    >
      <span style={{ fontWeight: 600 }}>Page</span>
      <span
        style={{
          fontFamily: '"IBM Plex Mono", monospace',
          fontWeight: 300,
          fontSize: mono,
        }}
      >
        data
      </span>
      <span style={{ fontWeight: 700 }}>LooM</span>
    </span>
  )
}
