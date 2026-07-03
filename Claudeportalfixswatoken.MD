# CLAUDE.md — Portal: fix SPA deep-link 404 (staticwebapp.config.json not deployed)

## Context
Portal's dev SWA is deployed and the app renders at `/`. But navigating DIRECTLY to a client-side
route (e.g. `/login`) or refreshing on a sub-route returns Azure's "404: Not Found". Cause:
`staticwebapp.config.json` (which has the `navigationFallback` rewrite to /index.html that makes
SPA routing work) lives in the REPO ROOT and is NOT copied into the build output `dist/`, so the
deployed Static Web App never sees it.

Confirmed:
- `staticwebapp.config.json` exists at repo root
- it is NOT in `public/`
- it does NOT appear in `dist/` after build

Vite copies everything in `public/` verbatim into `dist/` at build time. So the fix is to put
`staticwebapp.config.json` in `public/`.

## Objective
Ensure `staticwebapp.config.json` ends up in `dist/` after `vite build`, so the SWA applies the
navigationFallback and deep links / refreshes work.

## The fix (do this)
Move `staticwebapp.config.json` from the repo root into `public/`:
- Copy the existing file to `public/staticwebapp.config.json` (keep its exact contents — the
  navigationFallback, globalHeaders, mimeTypes block is already correct).
- Remove the root-level `staticwebapp.config.json` (so there's a single source of truth in
  `public/`).

Do NOT change the file's contents — only its location.

## Verify
- `public/staticwebapp.config.json` exists.
- root `staticwebapp.config.json` no longer exists.
- Run `npx vite build --mode development` and confirm `dist/staticwebapp.config.json` now exists
  (`Test-Path dist\staticwebapp.config.json` → True).
- Only file moves — no source/logic changes. `git status` shows the delete + add (and the built
  `dist` is gitignored, so it won't appear).

## Do NOT commit — report back; the human commits + pushes, which re-triggers the deploy.
After it deploys, navigating directly to https://gray-moss-074a51a03.7.azurestaticapps.net/login
(and refreshing on any route) should serve the app instead of 404.