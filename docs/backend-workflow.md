# Backend Workflow

This repo is a Base44 GitHub mirror. Treat `base44/**` as the backend-owned surface and assume Base44 can continue changing the frontend under `src/**`.

## Ownership Boundary

- Backend-owned: `base44/**`, `scripts/**`, `docs/**`, `.env.example`, and backend-related `package.json` script changes.
- Frontend-owned unless coordinated: `src/**`, `index.html`, `tailwind.config.js`, `vite.config.js`, and most UI-focused root config.

## Local Setup

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env.local`.
3. Fill in the Base44 values from the app settings:
   - `VITE_BASE44_APP_ID`
   - `VITE_BASE44_APP_BASE_URL`
   - `VITE_BASE44_FUNCTIONS_VERSION` only when you intentionally need to pin a specific deployed backend version.

## Recommended Branch Workflow

1. `git fetch origin`
2. `git switch -c backend/<topic> origin/main`
3. Keep rebasing onto `origin/main` while Base44 continues frontend work:
   - `git pull --rebase origin main`
4. Run the backend checks before every push:
   - `npm run backend:status`
   - `npm run build`
   - `npm run backend:check`
   - `npm run backend:guard`
   - `npm run backend:ship:check` for a ship-ready branch

## What The Checks Do

- `npm run backend:status` summarizes branch position, local backend-boundary changes, and upstream backend drift relative to `origin/main`.
- `npm run backend:check` validates that every entity schema in `base44/entities` parses as JSONC, every function entrypoint exists, every function still uses `Deno.serve`, and every function pins the same `@base44/sdk` version as the app dependency.
- `npm run backend:guard` fails if your branch or working tree includes files outside the backend-owned boundary. Use it before committing when the goal is a backend-only change.
- `npm run backend:ship:check` enforces ship prerequisites: non-`main` branch, clean working tree, rebased on `origin/main`, backend-only diff, and successful build/check/guard gates.

## Current Baseline

- `npm run build` succeeds even without `.env.local`, but the Base44 proxy is disabled until `VITE_BASE44_APP_BASE_URL` is set.
- `npm run lint` and `npm run typecheck` currently fail in upstream frontend code outside `base44/**`. Until that baseline is fixed, they are not reliable gates for backend-only work.

## Sync Behavior

Pushing to this repository syncs changes back into the connected Base44 app. After backend changes land, publish from Base44 when you want them live in the app environment.
