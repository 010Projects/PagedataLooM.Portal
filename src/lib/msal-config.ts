import type { Configuration, RedirectRequest, SilentRequest } from '@azure/msal-browser'

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_MSAL_CLIENT_ID,
    authority: import.meta.env.VITE_MSAL_AUTHORITY,
    knownAuthorities: (import.meta.env.VITE_MSAL_KNOWN_AUTHORITIES ?? '')
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean),
    redirectUri: import.meta.env.VITE_MSAL_REDIRECT_URI ?? window.location.origin,
    postLogoutRedirectUri: import.meta.env.VITE_MSAL_REDIRECT_URI ?? window.location.origin,
  },
  cache: {
    // localStorage persists tokens across tabs and browser restarts — slightly
    // broader exposure than sessionStorage, accepted deliberately (PM-approved,
    // Portal-Test v2): Playwright storageState only captures cookies and
    // localStorage, so E2E session reuse requires it.
    cacheLocation: 'localStorage',
  },
  system: {
    allowPlatformBroker: false,
  },
}

const baseScopes = ['openid', 'profile', 'email']
const apiScope = import.meta.env.VITE_MSAL_API_SCOPE

export const loginRequest: RedirectRequest = {
  scopes: apiScope
    ? [...baseScopes, apiScope]
    : baseScopes,
}

export const tokenRequest: SilentRequest = {
  scopes: apiScope ? [apiScope] : [],
  forceRefresh: false,
}
