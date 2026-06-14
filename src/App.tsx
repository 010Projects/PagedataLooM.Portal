import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useIsAuthenticated, useMsal } from '@azure/msal-react'
import { InteractionStatus } from '@azure/msal-browser'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardStub } from '@/features/dashboard/DashboardStub'
import { UploadStub } from '@/features/upload/UploadStub'
import { SettingsStub } from '@/features/settings/SettingsStub'

function AuthRedirect() {
  const isAuthenticated = useIsAuthenticated()
  const { inProgress } = useMsal()
  if (inProgress !== InteractionStatus.None) return null
  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected — all wrapped in AppLayout */}
        <Route
          path="/"
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<AuthRedirect />} />
          <Route path="dashboard" element={<DashboardStub />} />
          <Route path="upload"    element={<UploadStub />} />
          <Route path="settings"               element={<SettingsStub />} />
          <Route path="settings/notifications" element={<SettingsStub />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
