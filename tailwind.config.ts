import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      colors: {
        brand: {
          navy:       '#0D1F3C',
          'navy-deep': '#07101F',
          surface:    '#F8FAFC',
        },
        thread: {
          legal:               '#312E7A',
          regulatory:          '#1E40AF',
          operational:         '#065F46',
          financial:           '#92400E',
          personnel:           '#7F1D1D',
          'legal-dark':        '#818CF8',
          'regulatory-dark':   '#60A5FA',
          'operational-dark':  '#34D399',
          'financial-dark':    '#FCD34D',
          'personnel-dark':    '#FCA5A5',
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      fontSize: {
        'display': ['40px', { lineHeight: '1.05', fontWeight: '700' }],
        'h1':      ['28px', { lineHeight: '1.15', fontWeight: '700' }],
        'h2':      ['20px', { lineHeight: '1.25', fontWeight: '600' }],
        'h3':      ['16px', { lineHeight: '1.35', fontWeight: '600' }],
        'body-l':  ['15px', { lineHeight: '1.65' }],
        'body':    ['13px', { lineHeight: '1.65' }],
        'label':   ['11px', { lineHeight: '1.4',  fontWeight: '600' }],
        'caption': ['11px', { lineHeight: '1.4' }],
      },
      borderRadius: {
        sm:  '4px',
        md:  '6px',
        lg:  '8px',
        xl:  '12px',
      },
    },
  },
  plugins: [tailwindcssAnimate],
}

export default config
