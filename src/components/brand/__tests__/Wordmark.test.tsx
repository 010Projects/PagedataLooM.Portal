import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Wordmark } from '@/components/brand/Wordmark'

describe('Wordmark', () => {
  it('renders all three name segments', () => {
    const { getByText } = render(<Wordmark />)
    expect(getByText('Page')).toBeTruthy()
    expect(getByText('data')).toBeTruthy()
    expect(getByText('LooM')).toBeTruthy()
  })

  // Color assertions use toHaveStyle — jsdom normalizes hex colors in the
  // style attribute to rgb(), so string-matching '#FFFFFF' would fail
  it('renders white text on dark variant', () => {
    const { container } = render(<Wordmark variant="dark" />)
    const span = container.querySelector('span')
    expect(span).toHaveStyle({ color: '#FFFFFF' })
  })

  it('renders navy text on light variant', () => {
    const { container } = render(<Wordmark variant="light" />)
    const span = container.querySelector('span')
    expect(span).toHaveStyle({ color: '#0D1F3C' })
  })

  it('"data" segment uses IBM Plex Mono', () => {
    const { getByText } = render(<Wordmark />)
    const dataSpan = getByText('data')
    expect(dataSpan.getAttribute('style')).toContain('IBM Plex Mono')
  })

  it('"Page" uses weight 600 and "LooM" uses weight 700', () => {
    const { getByText } = render(<Wordmark />)
    expect(getByText('Page').getAttribute('style')).toContain('600')
    expect(getByText('LooM').getAttribute('style')).toContain('700')
  })
})
