import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AppHeader } from '@/components/layout/AppHeader'
import { useAuthStore } from '@/stores/auth-store'
import { useDashboardStore } from '@/stores/dashboard-store'
import type { ComplianceService } from '@/types/api'

vi.mock('@azure/msal-react', () => ({
  useMsal: vi.fn(),
  useIsAuthenticated: vi.fn(),
}))

import { useMsal, useIsAuthenticated } from '@azure/msal-react'

function seedDashboard(services: ComplianceService[], active: ComplianceService | null) {
  useDashboardStore.setState({
    subscribedServices: services,
    activeService: active,
    activeEntityKey: null,
  })
}

describe('AppHeader', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, me: null, meStatus: 'ready' })
    useDashboardStore.setState({
      activeService: null, activeEntityKey: null, subscribedServices: null,
    })
    vi.mocked(useIsAuthenticated).mockReturnValue(false)
    vi.mocked(useMsal).mockReturnValue({
      instance: { logoutRedirect: vi.fn() },
      accounts: [],
      inProgress: 'none',
    } as never)
  })

  it('lists exactly the subscribed services in the dropdown', () => {
    seedDashboard(['sqas', 'accreditation', 'bbbee'], 'sqas')

    render(<AppHeader tenantName="RS Carriers" />)

    const dropdown = screen.getByRole('combobox', { name: /service/i })
    const options = Array.from(dropdown.querySelectorAll('option')).map((o) => o.textContent)
    expect(options).toEqual(['SQAS', 'Accreditation', 'B-BBEE'])
  })

  it('selecting a service calls setService (activeService updates)', async () => {
    seedDashboard(['sqas', 'accreditation'], 'sqas')

    render(<AppHeader tenantName="RS Carriers" />)

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: /service/i }),
      'accreditation'
    )
    expect(useDashboardStore.getState().activeService).toBe('accreditation')
  })

  it('renders a static label instead of a dropdown for a single service', () => {
    seedDashboard(['sqas'], 'sqas')

    render(<AppHeader tenantName="RS Carriers" />)

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.getByText('SQAS')).toBeInTheDocument()
  })

  it('renders no service segment when there are no services', () => {
    seedDashboard([], null)

    render(<AppHeader tenantName="RS Carriers" />)

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByText('SQAS')).not.toBeInTheDocument()
    expect(screen.getByText('RS Carriers')).toBeInTheDocument()
  })

  it('renders no tenant segment when tenantName is null (PlatformAdmin)', () => {
    seedDashboard([], null)

    render(<AppHeader tenantName={null} />)

    expect(screen.queryByText('RS Carriers')).not.toBeInTheDocument()
  })
})
