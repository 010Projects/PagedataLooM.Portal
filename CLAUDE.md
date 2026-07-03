# CLAUDE.md — Portal (dev): env-driven authority fix + dev config + deploy pipeline

## Context
PagedataLooM Portal — React/Vite customer-facing SPA. Deploying the DEV environment first.
Azure side ready:
- Dev SWA deployed: `swa-pagedataloom-dev-weu` in `rg-pagedataloom-dev-weu`,
  hostname `gray-moss-074a51a03.7.azurestaticapps.net`
- Portal dev deploy identity (OIDC): client `ad1e84c3-7020-40ad-b50f-f41c3dd795d6`, federated to
  `repo:010Projects/PagedataLooM.Portal:ref:refs/heads/main`, Contributor on `rg-pagedataloom-dev-weu`
- Portal dev app registration (customer sign-in): client `bca4a6c5-a364-4413-a465-835987013a6f`
  in the PagedataLooM-Dev External ID tenant (`c5497d2a-...`)

Portal is customer-facing → dev/prod config is BUILD-TIME (no runtime env switch; a customer sees
exactly one environment). This task does DEV only; prod is a later mirror.

## Three parts
A. Fix `src/lib/msal-config.ts` — the authority is currently hardcoded to the WORKFORCE endpoint
   `login.microsoftonline.com`, which is WRONG for External ID customers. Make it env-driven so it
   uses the External ID `ciamlogin.com` endpoint.
B. Add `.env.development` with the dev build config (non-secret public client ID etc.).
C. Add `.github/workflows/deploy.yml` — build with dev config, deploy to the dev SWA via OIDC.

## Constraints
- Do NOT hardcode tenant/client values in msal-config.ts — read from import.meta.env.
- The client IDs here are NON-SECRET public SPA client IDs — safe to commit in .env.development.
- Do NOT commit .env.local or .env.*.local (already gitignored — leave them alone).
- Pipeline: OIDC only (no stored secret), `vars.AZURE_CLIENT_ID` etc., NO GitHub environment
  (federated subject is branch-based), fetch SWA deploy token at runtime via az CLI (do NOT store).
- Build stays `tsc -b && vite build`; output dir `dist`.
- Preserve MSW toggle (VITE_ENABLE_MSW) and all existing Portal features.

---

## Part A — src/lib/msal-config.ts (authority fix)

Change the `authority` line so it reads a full authority URL from env, with knownAuthorities, and
falls back sensibly. Replace:
```ts
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_MSAL_TENANT_ID}`,
```
with an env-driven authority + knownAuthorities:
```ts
    authority: import.meta.env.VITE_MSAL_AUTHORITY,
    knownAuthorities: (import.meta.env.VITE_MSAL_KNOWN_AUTHORITIES ?? '')
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean),
```
Keep clientId, redirectUri, postLogoutRedirectUri, cache, system exactly as they are.
(The apiScope via VITE_MSAL_API_SCOPE and the loginRequest/tokenRequest stay unchanged.)

## Part B — .env.development (dev build config)
Create `.env.development` at repo root (Vite auto-loads it for `vite build` in development mode
and `npm run dev`). Content:
```
VITE_MSAL_CLIENT_ID=bca4a6c5-a364-4413-a465-835987013a6f
VITE_MSAL_TENANT_ID=c5497d2a-27f6-411d-b937-468c820e2095
VITE_MSAL_AUTHORITY=https://pagedataloomdev.ciamlogin.com/c5497d2a-27f6-411d-b937-468c820e2095
VITE_MSAL_KNOWN_AUTHORITIES=pagedataloomdev.ciamlogin.com
VITE_MSAL_API_SCOPE=api://29a7655c-aa15-4765-8eef-20c6af7a7126/access_as_user
VITE_MSAL_REDIRECT_URI=https://gray-moss-074a51a03.7.azurestaticapps.net
VITE_API_BASE_URL=https://func-pageloom-dev-weu.azurewebsites.net
VITE_APP_ENV=development
VITE_ENABLE_MSW=false
```
NOTE: these are non-secret public client IDs + public endpoints — safe to commit. Do NOT put any
secret here.

IMPORTANT — the pipeline builds in production mode by default (`vite build`), which loads
`.env.production`, NOT `.env.development`. Two options — pick the one that fits how the pipeline
should build DEV:
  (1) Simplest for now: have the workflow build with `--mode development` so Vite loads
      `.env.development`. (Set in the workflow build step: `npx vite build --mode development`,
      keeping `tsc -b` before it.)
  (2) Later, for prod, add `.env.production` with prod values and build normally.
Use option (1) for this dev pipeline so `.env.development` is the source of truth.

## Part C — .github/workflows/deploy.yml
```yaml
name: Deploy Portal (dev)

on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install
        run: npm ci
      - name: Build (dev mode)
        run: |
          npx tsc -b
          npx vite build --mode development

      - name: Azure login (OIDC, no secret)
        uses: azure/login@v2
        with:
          client-id: ${{ vars.AZURE_CLIENT_ID }}
          tenant-id: ${{ vars.AZURE_TENANT_ID }}
          subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}

      - name: Get SWA deployment token
        id: swatoken
        run: |
          TOKEN=$(az staticwebapp secrets list \
            --name swa-pagedataloom-dev-weu \
            --resource-group rg-pagedataloom-dev-weu \
            --query "properties.apiKey" -o tsv)
          echo "::add-mask::$TOKEN"
          echo "token=$TOKEN" >> "$GITHUB_OUTPUT"

      - name: Deploy to Static Web App
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ steps.swatoken.outputs.token }}
          action: 'upload'
          app_location: 'dist'
          skip_app_build: true
```

## Verify after edit
- `npm run build` still succeeds (or `npx tsc -b && npx vite build --mode development`)
- msal-config.ts reads VITE_MSAL_AUTHORITY (no hardcoded login.microsoftonline.com left)
- .env.development exists with the dev values; no .env.local committed
- deploy.yml uses azure/login@v2 + vars.*, no stored secret, no GitHub environment
- If the lock file is Windows-generated and `npm ci` fails on Linux with missing optional native
  deps (like zOz hit with @emnapi/*), regenerate cross-platform:
  `npm install --os=linux --cpu=x64 --include=optional` then commit package-lock.json.

## After Claude Code — human steps
1. Repo VARIABLES on 010Projects/PagedataLooM.Portal (Settings → Secrets and variables → Actions →
   Variables tab, NOT secrets):
   - AZURE_CLIENT_ID = ad1e84c3-7020-40ad-b50f-f41c3dd795d6
   - AZURE_TENANT_ID = e1f6457f-dca9-4e65-9782-6eb63cfd6a58
   - AZURE_SUBSCRIPTION_ID = aa56e865-753e-4f0d-948c-5d9a36629980
2. Add redirect URI on the Portal DEV app registration (bca4a6c5..., in PagedataLooM-Dev tenant):
   Authentication → Single-page application → add
   `https://gray-moss-074a51a03.7.azurestaticapps.net` → Save
3. Commit + push to main → pipeline builds & deploys to swa-pagedataloom-dev-weu
4. Visit https://gray-moss-074a51a03.7.azurestaticapps.net → sign in as a dev tenant user →
   confirm Portal loads and auth works against the dev External ID tenant.
```