# CLAUDE.md — Portal PROD: .env.production + tag-gated deploy-prod job

## Context
Portal dev pipeline works (`.github/workflows/deploy.yml`, one job `build-and-deploy`, deploys to
dev SWA on push to main). Now add PROD, tag-gated, in the SAME workflow file (dev + prod jobs,
if-gated — mirrors the backend pattern; do NOT create a second workflow file).

Prod Azure side is ready:
- Prod SWA: `swa-pagedataloom-prod-weu` in `rg-pagedataloom-prod-weu`,
  hostname `ashy-rock-0cddfac03.7.azurestaticapps.net`
- Prod deploy identity (OIDC): client `ca0a0608-9048-4358-bb04-ef32a2806c21`, federated subject
  `repo:010Projects/PagedataLooM.Portal:environment:production`, Contributor on
  `rg-pagedataloom-prod-weu`
- Prod Portal app registration (customer sign-in): client `91951f75-f84b-43d4-8ad9-ec1120c26169`
  in the PagedataLooM prod External ID tenant (`2e345282-...`)
- Prod backend: `func-pageloom-prod-weu.azurewebsites.net`

## Two parts
A. Create `.env.production` with the PROD build config.
B. Extend `deploy.yml`: add `tags: ['v*']` trigger; rename the existing job to `deploy-dev` with a
   push-to-main if-condition; add a `deploy-prod` job (tag-gated, `environment: production`,
   plain `vite build` for prod mode, deploy to prod SWA).

## Constraints
- ONE workflow file (deploy.yml). Do NOT create a second workflow.
- deploy-dev runs on push to main, NOT on tags. deploy-prod runs on v* tags, NOT on main pushes.
- Same `${{ vars.AZURE_CLIENT_ID }}` reference in both jobs — GitHub resolves it to the dev value
  (repo variable) in deploy-dev and the prod value (production environment variable) in
  deploy-prod (which sets `environment: production`). Do NOT hardcode client IDs.
- Non-secret public client IDs — safe to commit in .env.production.
- Prod build uses PLAIN `vite build` (defaults to production mode → loads .env.production).
  Dev build keeps `vite build --mode development`.
- Fetch SWA deploy token at runtime via az CLI, write to $GITHUB_ENV (NOT $GITHUB_OUTPUT — the
  step-output+mask interaction drops it). This is the proven pattern from the dev fix.

## Part A — .env.production (prod build config)
Create `.env.production` at repo root:
```
VITE_MSAL_CLIENT_ID=91951f75-f84b-43d4-8ad9-ec1120c26169
VITE_MSAL_TENANT_ID=2e345282-d325-45c0-8b7b-27d834038e30
VITE_MSAL_AUTHORITY=https://pagedataloom.ciamlogin.com/2e345282-d325-45c0-8b7b-27d834038e30
VITE_MSAL_KNOWN_AUTHORITIES=pagedataloom.ciamlogin.com
VITE_MSAL_API_SCOPE=api://bb2f3678-c2c4-4e88-b851-04168c62cab3/access_as_user
VITE_MSAL_REDIRECT_URI=https://ashy-rock-0cddfac03.7.azurestaticapps.net
VITE_API_BASE_URL=https://func-pageloom-prod-weu.azurewebsites.net
VITE_APP_ENV=production
VITE_ENABLE_MSW=false
```

## Part B — deploy.yml (add trigger + prod job, split dev/prod)

### B1. Trigger — add tags
```yaml
on:
  push:
    branches: [main]
    tags: ['v*']
```

### B2. Rename existing job `build-and-deploy` → `deploy-dev`, add if-condition
```yaml
  deploy-dev:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      # ... existing dev steps UNCHANGED (build with --mode development, deploy to
      #     swa-pagedataloom-dev-weu in rg-pagedataloom-dev-weu) ...
```
(Keep all existing dev steps exactly; only add the job-level `if:` and keep the name deploy-dev.)

### B3. Add deploy-prod job (tag-gated)
```yaml
  deploy-prod:
    if: github.event_name == 'push' && startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install
        run: npm ci
      - name: Build (prod mode)
        run: |
          npx tsc -b
          npx vite build          # prod mode by default → loads .env.production

      - name: Azure login (OIDC, no secret)
        uses: azure/login@v2
        with:
          client-id: ${{ vars.AZURE_CLIENT_ID }}      # resolves to prod via environment
          tenant-id: ${{ vars.AZURE_TENANT_ID }}
          subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}

      - name: Get SWA deployment token
        run: |
          TOKEN=$(az staticwebapp secrets list \
            --name swa-pagedataloom-prod-weu \
            --resource-group rg-pagedataloom-prod-weu \
            --query "properties.apiKey" -o tsv)
          echo "::add-mask::$TOKEN"
          echo "SWA_TOKEN=$TOKEN" >> "$GITHUB_ENV"

      - name: Deploy to Static Web App
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ env.SWA_TOKEN }}
          action: 'upload'
          app_location: 'dist'
          skip_app_build: true
```

## Verify after edit
- `.env.production` exists with the prod values above.
- deploy.yml `on:` includes `tags: ['v*']`.
- deploy-dev has the main-push if-condition; deploy-prod has the tag if-condition + `environment: production`.
- Prod job builds with plain `vite build` (no --mode), targets swa-pagedataloom-prod-weu / rg-pagedataloom-prod-weu.
- Both jobs use `vars.AZURE_CLIENT_ID` (no hardcoded IDs); token via $GITHUB_ENV.
- Valid YAML. `npx vite build` (prod mode) succeeds locally.
- If npm ci fails on Linux with missing optional native deps, regenerate the lock cross-platform
  (npm install --os=linux --cpu=x64 --include=optional) and commit package-lock.json.

## After Claude Code — human steps
1. Create GitHub `production` environment on 010Projects/PagedataLooM.Portal (Settings →
   Environments → New → "production"). Required reviewers likely unavailable on the plan — that's
   fine, the v* tag is the gate. Optionally restrict deployment branches/tags to v*.
2. On the `production` environment → Variables: add
   AZURE_CLIENT_ID = ca0a0608-9048-4358-bb04-ef32a2806c21   (prod deploy identity)
   (AZURE_TENANT_ID + AZURE_SUBSCRIPTION_ID also need to resolve for the prod job — add them as
   environment variables too if the repo-level ones don't apply, matching how the backend needed
   all three at the environment level.)
3. Add redirect URI on the PROD Portal app registration (91951f75..., in the PagedataLooM prod
   tenant): Authentication → Single-page application → add
   `https://ashy-rock-0cddfac03.7.azurestaticapps.net` → Save.
4. Commit + push to main (deploys DEV only — proves the split, prod stays dormant).
5. Then tag a release:  git tag -a v1.0.0 -m "Portal first prod release"
                        git push origin v1.0.0
   → deploy-prod runs → deploys to prod SWA.
6. Visit https://ashy-rock-0cddfac03.7.azurestaticapps.net → sign in as a prod tenant user →
   confirm Portal loads and auth works against the prod External ID tenant.
```