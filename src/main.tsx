import React from 'react'
import ReactDOM from 'react-dom/client'
import { PublicClientApplication, EventType, type AuthenticationResult } from '@azure/msal-browser'
import { MsalProvider } from '@azure/msal-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import App from './App'
import { msalConfig } from '@/lib/msal-config'
import './styles/globals.css'

const msalInstance = new PublicClientApplication(msalConfig)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,     // 5 minutes — compliance data changes slowly
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})

msalInstance.initialize().then(() => {
  // Expose instance for the API interceptor (typed in lib/api-client.ts)
  window.__msalInstance = msalInstance

  // Handle redirect response on page load
  msalInstance.handleRedirectPromise().catch(console.error)

  // Set active account if one exists
  const accounts = msalInstance.getAllAccounts()
  if (accounts.length > 0) {
    msalInstance.setActiveAccount(accounts[0])
  }

  // Keep active account in sync after login
  msalInstance.addEventCallback((event) => {
    if (
      event.eventType === EventType.LOGIN_SUCCESS &&
      (event.payload as AuthenticationResult)?.account
    ) {
      msalInstance.setActiveAccount((event.payload as AuthenticationResult).account)
    }
  })

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <MsalProvider instance={msalInstance}>
        <QueryClientProvider client={queryClient}>
          <App />
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </MsalProvider>
    </React.StrictMode>
  )
})
