import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, beforeEach } from 'vitest'
import React from 'react'
import { NotificationRecipientsPage } from '@/features/settings/NotificationRecipientsPage'
import { useAuthStore } from '@/stores'

function wrap(children: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <MemoryRouter>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </MemoryRouter>
  )
}

describe('NotificationRecipientsPage', () => {
  beforeEach(() => {
    useAuthStore.getState().setUser({
      name: 'Admin', email: 'admin@rscarriers.co.za',
      tenantId: 'rsc_prod_001', roles: ['TenantAdmin'],
    })
  })

  it('loads and displays existing recipients', async () => {
    render(wrap(<NotificationRecipientsPage />))
    await waitFor(() =>
      expect(screen.getByText('ops@rscarriers.co.za')).toBeInTheDocument()
    )
  })

  it('rejects invalid email format', async () => {
    render(wrap(<NotificationRecipientsPage />))
    await waitFor(() => screen.getByPlaceholderText(/add email/i))
    await userEvent.type(screen.getByPlaceholderText(/add email/i), 'not-an-email')
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }))
    expect(screen.getByText(/valid email/i)).toBeInTheDocument()
  })

  it('rejects duplicate email', async () => {
    render(wrap(<NotificationRecipientsPage />))
    await waitFor(() => screen.getByText('ops@rscarriers.co.za'))
    await userEvent.type(
      screen.getByPlaceholderText(/add email/i),
      'ops@rscarriers.co.za'
    )
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }))
    expect(screen.getByText(/already in the list/i)).toBeInTheDocument()
  })

  it('marks form as dirty after adding a recipient', async () => {
    render(wrap(<NotificationRecipientsPage />))
    await waitFor(() => screen.getByPlaceholderText(/add email/i))
    await userEvent.type(
      screen.getByPlaceholderText(/add email/i),
      'new@rscarriers.co.za'
    )
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }))
    expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument()
  })

  it('shows empty-recipients warning before saving empty list', async () => {
    render(wrap(<NotificationRecipientsPage />))
    await waitFor(() => screen.getByText('ops@rscarriers.co.za'))
    await userEvent.click(screen.getByLabelText(/remove ops@rscarriers/i))
    await userEvent.click(screen.getByRole('button', { name: /save recipients/i }))
    expect(screen.getByText(/disable expiry alerts/i)).toBeInTheDocument()
  })

  it('redirects non-admins away from the page', () => {
    useAuthStore.getState().setUser({
      name: 'Viewer', email: 'viewer@rscarriers.co.za',
      tenantId: 'rsc_prod_001', roles: ['Viewer'],
    })
    render(wrap(
      <>
        <NotificationRecipientsPage />
        <div data-testid="marker">on settings</div>
      </>
    ))
    // Gate redirects via <Navigate>; the page heading must not render
    expect(screen.queryByText('Notification recipients')).not.toBeInTheDocument()
  })
})
