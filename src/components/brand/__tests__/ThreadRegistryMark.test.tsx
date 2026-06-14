import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ThreadRegistryMark } from '@/components/brand/ThreadRegistryMark'

// These brand tests intentionally assert visual specifics (beam fill, arch
// heights). The approved Thread Registry mark IS those specifics — locking
// them down is the point. They break on any deliberate brand revision;
// that is expected and desired.
describe('ThreadRegistryMark', () => {
  it('renders an SVG element', () => {
    const { container } = render(<ThreadRegistryMark />)
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('renders all 5 thread rects', () => {
    const { container } = render(<ThreadRegistryMark />)
    // 1 beam rect + 5 thread rects = 6 rects total
    const rects = container.querySelectorAll('rect')
    expect(rects.length).toBe(6)
  })

  it('renders at specified height', () => {
    const { container } = render(<ThreadRegistryMark height={48} />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('height')).toBe('48')
  })

  it('uses white beam on dark variant', () => {
    const { container } = render(<ThreadRegistryMark variant="dark" />)
    const beam = container.querySelector('rect:first-child')
    expect(beam?.getAttribute('fill')).toBe('#FFFFFF')
  })

  it('uses navy beam on light variant', () => {
    const { container } = render(<ThreadRegistryMark variant="light" />)
    const beam = container.querySelector('rect:first-child')
    expect(beam?.getAttribute('fill')).toBe('#0D1F3C')
  })

  it('has an accessible aria-label', () => {
    const { container } = render(<ThreadRegistryMark />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('aria-label')).toBeTruthy()
  })

  it('arch profile: centre thread is tallest', () => {
    const { container } = render(<ThreadRegistryMark />)
    const rects = Array.from(container.querySelectorAll('rect')).slice(1) // skip beam
    const heights = rects.map((r) => Number(r.getAttribute('height')))
    // Arch: [46, 56, 64, 56, 46] — centre is tallest
    expect(heights[2]).toBeGreaterThan(heights[0])
    expect(heights[2]).toBeGreaterThan(heights[4])
    expect(heights[0]).toBe(heights[4]) // symmetric
    expect(heights[1]).toBe(heights[3]) // symmetric
  })
})
