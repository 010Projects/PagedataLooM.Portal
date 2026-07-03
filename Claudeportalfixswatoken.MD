# CLAUDE.md — Portal: remove the duplicate (stale) SWA workflow

## Context
Portal's `.github/workflows/` contains TWO workflows that both trigger on push to main:
- `deploy.yml` — the intended pipeline (name: "Deploy Portal (dev)"). Uses OIDC (azure/login@v2,
  vars.*), fetches the SWA deploy token at runtime via az CLI, writes it to $GITHUB_ENV. This one
  WORKS.
- `azure-static-web-apps.yml` — a STALE auto-generated workflow (name: "Deploy PagedataLooM
  Portal"), created when the Static Web App was provisioned. It expects the deploy token as a
  GitHub SECRET that does not exist in this repo (we use OIDC + runtime token fetch instead), so it
  FAILS every push with `deployment_token was not provided`.

Both run on every push → duplicate/racing deploys, and the stale one fails noisily. We want exactly
ONE workflow: `deploy.yml`.

## Objective
Delete the stale `azure-static-web-apps.yml`, keeping only `deploy.yml`.

## The fix
- Delete `.github/workflows/azure-static-web-apps.yml`.
- Do NOT touch `.github/workflows/deploy.yml` (it's the good one).
- Change nothing else.

## Verify
- `.github/workflows/` now contains ONLY `deploy.yml` (Get-ChildItem shows one file).
- `deploy.yml` is unchanged.
- `git status` shows only the deletion of azure-static-web-apps.yml.

## Do NOT commit — report back; the human commits + pushes. After push, only ONE workflow ("Deploy
Portal (dev)") should run, and it should be green.