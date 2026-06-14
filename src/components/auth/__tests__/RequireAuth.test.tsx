import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RequireAuth } from '@/components/auth/RequireAuth'

// Mock MSAL hooks — statically imported and mocked directly (v2 amendment)
vi.mock('@azure/msal-react', () => ({
  useIsAuthenticated: vi.fn(),
  useMsal: vi.fn(),
}))

import { useIsAuthenticated, useMsal } from '@azure/msal-react'

// A real route table is required: without a /login route, <Navigate> never
// unmounts and re-fires on every render — an infinite loop that OOMs the
// test worker. The app's Routes swap in LoginPage, so mirror that here.
function renderAtDashboard() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/login" element={<div data-testid="login-page">Login</div>} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <div data-testid="protected-content">Protected</div>
            </RequireAuth>
          }
        />
      </Routes>
    </MemoryRouter>
  )
}

describe('RequireAuth', () => {
  beforeEach(() => {
    // Default: auth flow idle. Individual tests override as needed.
    vi.mocked(useMsal).mockReturnValue({
      inProgress: 'none',
      instance: {} as any,
      accounts: [],
    } as any)
  })

  it('renders children when authenticated', () => {
    vi.mocked(useIsAuthenticated).mockReturnValue(true)

    renderAtDashboard()

    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
  })

  it('redirects to /login when not authenticated', () => {
    vi.mocked(useIsAuthenticated).mockReturnValue(false)

    renderAtDashboard()

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  it('shows loading state while MSAL is in progress', () => {
    vi.mocked(useIsAuthenticated).mockReturnValue(false)
    vi.mocked(useMsal).mockReturnValue({
      inProgress: 'login',
      instance: {} as any,
      accounts: [],
    } as any)

    renderAtDashboard()

    // Should not show protected content during auth in-progress
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    // Should show some loading indicator
    expect(screen.getByText(/authenticating/i)).toBeInTheDocument()
  })
})
