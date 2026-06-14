import { test, expect } from '@playwright/test'

// Skip E2E until auth state is configured:
// 1. Sign in manually at http://localhost:5173
// 2. Export the session via page.context().storageState()
// 3. Save to e2e/.auth/session.json (gitignored — contains tokens)
// 4. Run with E2E_AUTH_READY=1
test.skip(!process.env.E2E_AUTH_READY, 'Auth state not configured')

test.use({ storageState: 'e2e/.auth/session.json' })

test('Journey 2 — entity selection loads documents', async ({ page }) => {
  await page.goto('/dashboard')

  // Sidebar should load entities
  await expect(page.getByText('RSC-COMP-001').first()).toBeVisible({ timeout: 10_000 })

  // Click the entity
  await page.getByText('RSC-COMP-001').first().click()

  // Stat cards should appear
  await expect(page.getByText('Required')).toBeVisible()

  // At least one document row should be present
  await expect(page.getByText('Active').first()).toBeVisible({ timeout: 10_000 })
})

test('Journey 1 — upload panel opens', async ({ page }) => {
  await page.goto('/dashboard')

  // Select an entity first
  await page.getByText('RSC-COMP-001').first().click()
  await expect(page.getByText('Required')).toBeVisible({ timeout: 10_000 })

  // Click Upload
  await page.getByRole('button', { name: /^upload$/i }).click()

  // Panel should be visible — the submit button also says "Upload document",
  // so target the heading specifically
  await expect(page.getByRole('heading', { name: 'Upload document' })).toBeVisible()
  await expect(page.getByText('Document category')).toBeVisible()
})
