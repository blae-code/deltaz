# deltaz

This repository mirrors a Base44 app. Frontend code lives under `src/**`; Base44 backend resources live under `base44/**`.

## Local Setup

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env.local`.
3. Fill in:

```env
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=your_backend_url
VITE_BASE44_FUNCTIONS_VERSION=
```

4. Start local development with `npm run dev`.

## Backend Safety

If you are working backend-only while Base44 continues frontend work, use:

- `npm run backend:status`
- `npm run build`
- `npm run backend:check`
- `npm run backend:guard`
- `npm run backend:ship:check` before any ship-to-main step

The detailed workflow is in [docs/backend-workflow.md](./docs/backend-workflow.md).

## Authoritative World State

Server-authoritative world time, season, weather, and daylight are synchronized through `worldStateSync`.

- Configure one backend source in the deployed function environment:
  - `WORLD_STATE_FILE_PATH`
  - or `WORLD_STATE_RCON_COMMAND`
- The source must return JSON with:
  - `world_day_number`
  - `world_minute_of_day`
  - `clock_rate_multiplier`
  - `season`
  - `weather`
  - `daylight_phase`
- Schedule `worldStateSync` on a 60-second automation cadence in the connected Base44 app environment.

## Sync

Changes pushed to this repository sync back into the connected Base44 app. Publish from Base44 when you want the updated app live.

## References

- Base44 GitHub workflow: https://docs.base44.com/Integrations/Using-GitHub
- Base44 support: https://app.base44.com/support
