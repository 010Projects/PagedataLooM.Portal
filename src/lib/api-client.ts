import axios from 'axios'
import { PublicClientApplication } from '@azure/msal-browser'
import { tokenRequest } from './msal-config'

declare global {
  interface Window {
    // Set in main.tsx after MSAL initialization — avoids circular imports
    __msalInstance?: PublicClientApplication
  }
}

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30_000,
})

// Attach bearer token to every request
apiClient.interceptors.request.use(async (config) => {
  try {
    // msalInstance is accessed via window to avoid circular imports
    const msal = window.__msalInstance
    if (!msal) return config

    const account = msal.getActiveAccount()
    if (!account || !tokenRequest.scopes?.length) return config

    const response = await msal.acquireTokenSilent({
      ...tokenRequest,
      account,
    })

    config.headers.Authorization = `Bearer ${response.accessToken}`
  } catch {
    // Silent token acquisition failed — login will handle it
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — redirect to login
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient
