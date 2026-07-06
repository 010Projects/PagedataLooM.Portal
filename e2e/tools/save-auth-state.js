// save-auth-state.js — regenerate e2e/.auth/session.json for the Playwright smoke suite.
//
// Seeds a real browser's localStorage with MSAL cache entries built from a
// caller-supplied access token, loads the running portal so msal-browser
// normalises (and encrypts) the cache in its own on-disk format, then saves
// Playwright storageState. The output (e2e/.auth/session.json) contains live
// tokens and is gitignored — NEVER commit it.
//
// Usage:
//   1. Obtain an access token for the portal API scope (see VITE_MSAL_API_SCOPE
//      in .env.development) for the identity you want the E2E run to use.
//      Save it to %TEMP%/loom-e2e/token.txt, or export E2E_ACCESS_TOKEN.
//      Optionally provide a matching ID token via E2E_ID_TOKEN or
//      %TEMP%/loom-e2e/idtoken.txt (falls back to the access token's claims).
//   2. Start the portal locally: npm run dev
//   3. node e2e/tools/save-auth-state.js
//   4. E2E_AUTH_READY=1 npx playwright test
//
// Tokens expire in ~60–75 minutes — regenerate before each E2E session.
// No credentials live in this file; identity comes entirely from the token.

import { readFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { chromium } from '@playwright/test'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT_PATH = join(repoRoot, 'e2e', '.auth', 'session.json')
const APP_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'

// ── Config: environment variables win, .env.development is the fallback ──
function loadDotEnv(file) {
  const env = {}
  if (!existsSync(file)) return env
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) env[m[1]] = m[2]
  }
  return env
}

const dotenv = loadDotEnv(join(repoRoot, '.env.development'))
const cfg = (key) => process.env[key] ?? dotenv[key]

const clientId = cfg('VITE_MSAL_CLIENT_ID')
const tenantId = cfg('VITE_MSAL_TENANT_ID')
const authority = cfg('VITE_MSAL_AUTHORITY')
const apiScope = cfg('VITE_MSAL_API_SCOPE')

if (!clientId || !tenantId || !authority || !apiScope) {
  console.error('Missing MSAL config — set VITE_MSAL_* env vars or run from a repo with .env.development')
  process.exit(1)
}

// The "environment" segment of MSAL cache keys is the authority host
const environment = new URL(authority).host

// ── Token input (never logged) ────────────────────────────────────────────
function readToken(envVar, fileName) {
  if (process.env[envVar]) return process.env[envVar].trim()
  const file = join(tmpdir(), 'loom-e2e', fileName)
  if (existsSync(file)) return readFileSync(file, 'utf8').trim()
  return null
}

const accessToken = readToken('E2E_ACCESS_TOKEN', 'token.txt')
if (!accessToken) {
  console.error(`No access token. Set E2E_ACCESS_TOKEN or write it to ${join(tmpdir(), 'loom-e2e', 'token.txt')}`)
  process.exit(1)
}
const idToken = readToken('E2E_ID_TOKEN', 'idtoken.txt') ?? accessToken

function decodeJwt(token) {
  const payload = token.split('.')[1]
  if (!payload) throw new Error('Input is not a JWT')
  return JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'))
}

const claims = decodeJwt(accessToken)
const idClaims = decodeJwt(idToken)
const nowSec = Math.floor(Date.now() / 1000)
if (claims.exp && claims.exp < nowSec) {
  console.error(`Access token expired at ${new Date(claims.exp * 1000).toISOString()} — mint a fresh one`)
  process.exit(1)
}

// ── MSAL v3+ cache entities (plaintext legacy format; msal-browser migrates
//    them into its current — possibly encrypted — format on first load) ────
const localAccountId = claims.oid ?? claims.sub
const realm = claims.tid ?? tenantId
const homeAccountId = `${localAccountId}.${realm}`
const username = claims.preferred_username ?? claims.upn ?? claims.email ?? 'e2e-user'
const clientInfo = Buffer.from(JSON.stringify({ uid: localAccountId, utid: realm })).toString('base64')
const target = `openid profile email ${apiScope}`

const accountKey = `${homeAccountId}-${environment}-${realm}`
const accessTokenKey = `${homeAccountId}-${environment}-accesstoken-${clientId}-${realm}-${target}`
const idTokenKey = `${homeAccountId}-${environment}-idtoken-${clientId}-${realm}-`

const entries = {
  [accountKey]: JSON.stringify({
    authorityType: 'MSSTS',
    clientInfo,
    environment,
    homeAccountId,
    idTokenClaims: idClaims,
    localAccountId,
    name: claims.name ?? username,
    realm,
    username,
    tenantProfiles: [{ tenantId: realm, localAccountId, name: claims.name ?? username, isHomeTenant: true }],
  }),
  [accessTokenKey]: JSON.stringify({
    cachedAt: String(nowSec),
    clientId,
    credentialType: 'AccessToken',
    environment,
    expiresOn: String(claims.exp ?? nowSec + 3600),
    extendedExpiresOn: String(claims.exp ?? nowSec + 3600),
    homeAccountId,
    realm,
    secret: accessToken,
    target,
    tokenType: 'Bearer',
  }),
  [idTokenKey]: JSON.stringify({
    clientId,
    credentialType: 'IdToken',
    environment,
    homeAccountId,
    realm,
    secret: idToken,
  }),
  'msal.account.keys': JSON.stringify([accountKey]),
  [`msal.token.keys.${clientId}`]: JSON.stringify({
    idToken: [idTokenKey],
    accessToken: [accessTokenKey],
    refreshToken: [],
  }),
  [`msal.${clientId}.active-account-filters`]: JSON.stringify({
    homeAccountId,
    localAccountId,
    tenantId: realm,
  }),
}

// ── Seed a real browser, let MSAL adopt the cache, save storageState ─────
const browser = await chromium.launch()
try {
  const context = await browser.newContext()
  await context.addInitScript((seed) => {
    for (const [k, v] of Object.entries(seed)) window.localStorage.setItem(k, v)
  }, entries)

  const page = await context.newPage()
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' })

  // main.tsx exposes the MSAL instance after initialize(); wait until it has
  // adopted the seeded account so the saved state is in MSAL's own format
  await page.waitForFunction(
    () => window.__msalInstance?.getAllAccounts().length > 0,
    undefined,
    { timeout: 15_000 }
  )

  mkdirSync(dirname(OUT_PATH), { recursive: true })
  await context.storageState({ path: OUT_PATH })

  console.log(`Auth state saved for ${username} (token expires ${new Date((claims.exp ?? 0) * 1000).toISOString()})`)
  console.log(`→ ${OUT_PATH}`)
  console.log('Run: E2E_AUTH_READY=1 npx playwright test')
} finally {
  await browser.close()
}
