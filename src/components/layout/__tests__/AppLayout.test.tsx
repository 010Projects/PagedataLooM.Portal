import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAuthStore } from '@/stores/auth-store'
import { useDashboardStore } from '@/stores/dashboard-store'
import { server } from '@/test/msw/server'
import { meHandler } from '@/test/msw/handlers'

vi.mock('@azure/msal-react', () => ({
  useMsal: vi.fn(),
  useIsAuthenticated: vi.fn(),
}))

import { useMsal, useIsAuthenticated } from '@azure/msal-react'

const mockAccount = {
  name: 'Bheki M',
  username: 'Bheki@rscarriers.co.za',
  tenantId: 'tenant-id',
  homeAccountId: 'home-account-a',
}

function mockMsal() {
  const instance = {
    // Reject → useAuth falls back to account info; jwt-decode never runs
    acquireTokenSilent: vi.fn().mockRejectedValue(new Error('scope not configured')),
    logoutRedirect: vi.fn(),
  }
  vi.mocked(useMsal).mockReturnValue({
    instance,
    accounts: [mockAccount],
    inProgress: 'none',
  } as never)
  return instance
}

// Route table mirrors the app: AppLayout is a layout route with an Outlet
function renderLayout() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<div data-testid="dashboard-outlet">Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('AppLayout', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, me: null, meStatus: 'idle' })
    useDashboardStore.setState({
      activeService: null, activeEntityKey: null, subscribedServices: null,
    })
    vi.mocked(useIsAuthenticated).mockReturnValue(true)
    mockMsal()
  })

  it('shows a lightweight loading state before bootstrap completes, not the shell', () => {
    renderLayout()

    expect(screen.getByText(/loading your workspace/i)).toBeInTheDocument()
    expect(screen.queryByTestId('dashboard-outlet')).not.toBeInTheDocument()
  })

  it('renders the shell with tenant breadcrumb and service selector for a tenant user', async () => {
    renderLayout()

    expect(await screen.findByTestId('dashboard-outlet')).toBeInTheDocument()
    // Tenant from /api/me, not SERVICE_CONFIG
    expect(screen.getByText('RS Carriers')).toBeInTheDocument()
    // Two subscribed services → a selector listing exactly those
    const dropdown = screen.getByRole('combobox', { name: /service/i })
    const options = Array.from(dropdown.querySelectorAll('option')).map((o) => o.textContent)
    expect(options).toEqual(['SQAS', 'Accreditation'])
  })

  it('shows the PlatformAdmin view with no service tabs and no tenant breadcrumb', async () => {
    server.use(meHandler('platformAdmin'))

    renderLayout()

    expect(await screen.findByText(/platform administration/i)).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByText('RS Carriers')).not.toBeInTheDocument()
    expect(screen.queryByTestId('dashboard-outlet')).not.toBeInTheDocument()
    // Not the empty-services message — PlatformAdmin is a distinct state
    expect(screen.queryByText(/no compliance services configured/i)).not.toBeInTheDocument()
  })

  it('shows the empty state (with tenant) for a non-admin with no services', async () => {
    server.use(meHandler('nonAdminNoServices'))

    renderLayout()

    expect(
      await screen.findByText(/no compliance services configured/i)
    ).toBeInTheDocument()
    // tenantName is shown — this is NOT the PlatformAdmin state
    expect(screen.getAllByText(/newco logistics/i).length).toBeGreaterThan(0)
    expect(screen.queryByText(/platform administration/i)).not.toBeInTheDocument()
    expect(screen.queryByTestId('dashboard-outlet')).not.toBeInTheDocument()
  })

  it('shows a retryable error state on /api/me failure without signing out', async () => {
    server.use(meHandler('failure'))
    const instance = mockMsal()

    renderLayout()

    expect(await screen.findByText(/couldn't load your workspace/i)).toBeInTheDocument()
    // Shell not rendered, session untouched
    expect(screen.queryByTestId('dashboard-outlet')).not.toBeInTheDocument()
    expect(instance.logoutRedirect).not.toHaveBeenCalled()

    // Retry re-triggers the bootstrap — this time it succeeds
    server.use(meHandler('tenantSingleService'))
    await userEvent.click(screen.getByRole('button', { name: /retry/i }))

    expect(await screen.findByTestId('dashboard-outlet')).toBeInTheDocument()
    // Single service → static label, no pointless dropdown
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    await waitFor(() =>
      expect(useDashboardStore.getState().activeService).toBe('sqas')
    )
  })

  it('selecting a service in the dropdown sets activeService', async () => {
    renderLayout()

    const dropdown = await screen.findByRole('combobox', { name: /service/i })
    await userEvent.selectOptions(dropdown, 'accreditation')

    expect(useDashboardStore.getState().activeService).toBe('accreditation')
  })
})
