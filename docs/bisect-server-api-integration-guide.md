# BiSect Server API Audit and Integration Guide

## Scope

I did not find a literal `BiSect` SDK or dedicated `BiSect` module in this repo. The effective game-server integration layer is implemented through Base44 functions that talk to:

- Pterodactyl client API
- direct RCON commands
- Steam OpenID
- Base44 entities used as persistent read models inside the app

For practical purposes, this is the BiSect-facing API surface of the app.

## Executive Summary

The current backend already exposes a solid set of server-adjacent capabilities:

- live server status and power control
- RCON command execution and broadcasts
- online player telemetry
- Steam linking and whitelist sync
- authoritative world clock and weather sync
- operational log ingestion
- scheduled server automations
- server file listing for admin/debug tooling

The strongest product pattern in the codebase is this:

1. Use Base44 functions for privileged commands or external-server reads.
2. Persist important state into Base44 entities.
3. Subscribe to those entities in the frontend for immersive, live UI.

That pattern is already working well for `WorldConditions`, `ServerLog`, `OpsLog`, `Event`, and `Notification`.

## Implementation Status

The follow-up hardening and integration pass described in this guide has now been implemented in the repo.

Implemented:

- `executeScheduledTask` now requires an admin user or a trusted Base44 service-role invocation
- `worldStateSync` now requires an admin user or a trusted Base44 service-role invocation
- `serverManager.status` now exposes `current_state`
- `serverManager.players` now exposes both `raw` and parsed `players`
- frontend consumers now use a shared adapter in `src/api/serverApi.js`
- Steam unlink now attempts to remove the linked Steam ID from the whitelist before clearing local link state
- `ingestOpsLog` now supports signed webhook ingestion through `OPS_LOG_WEBHOOK_SECRET`
- the dashboard now includes a unified `Comms & Telemetry` surface backed by read models

The audit findings section below is preserved as the original gap analysis that drove this implementation pass.

## Architecture

```text
App UI
  -> base44.functions.invoke(...)
  -> Base44 function
     -> Pterodactyl API / RCON / Steam OpenID
     -> Base44 entities (ServerLog, OpsLog, WorldConditions, Notification, Event, User)
  -> UI subscribes to entities for live updates
```

Recommended rule:

- Command path: functions
- Ambient/live read path: entities
- Audit/history path: entities

## Audited Endpoints

### 1. `serverManager`

File: `base44/functions/serverManager/entry.ts`

Purpose:

- privileged server control surface for admins
- wraps Pterodactyl resource and power actions
- wraps direct RCON commands
- persists an audit trail into `ServerLog`

Auth:

- admin only

Supported actions:

- `status`
- `start`
- `stop`
- `restart`
- `kill`
- `broadcast`
- `players`
- `rcon`

Upstream dependencies:

- `PTERODACTYL_URL`
- `PTERODACTYL_API_KEY`
- `PTERODACTYL_SERVER_ID`
- `GAME_SERVER_IP`
- `RCON_PORT`
- `RCON_PASSWORD`

Upstream calls:

- `GET /api/client/servers/{serverId}/resources`
- `POST /api/client/servers/{serverId}/power`
- RCON `ListPlayers`
- RCON arbitrary command
- RCON `Say <message>`

Persistent side effects:

- `ServerLog` for power actions, broadcasts, and RCON usage
- `Notification` on broadcast
- `Event` on broadcast

Useful response shapes:

```js
await base44.functions.invoke("serverManager", { action: "status" })
// -> {
//   is_suspended,
//   resources: {
//     memory_bytes,
//     memory_limit_bytes,
//     cpu_absolute,
//     disk_bytes,
//     network_rx_bytes,
//     network_tx_bytes,
//     uptime
//   }
// }
```

```js
await base44.functions.invoke("serverManager", { action: "players" })
// -> { status: "ok", result: "<raw RCON output>" }
```

```js
await base44.functions.invoke("serverManager", {
  action: "rcon",
  command: "ListPlayers"
})
// -> { status: "ok", result: "<raw output>" }
```

Best use in app:

- Admin Command Center
- broadcast composer
- RCON console
- server ops audit trail

Best immersive display:

- "Command Uplink" card with live power state, resource gauges, heartbeat animation, and transition-state labels
- "Comms Burst" modal for broadcasts that also lands in the world feed
- "Connected Operatives" panel with live roster, callsigns, and squad grouping

### 2. `playerTelemetry`

File: `base44/functions/playerTelemetry/entry.ts`

Purpose:

- admin-only player presence and activity snapshot
- combines RCON player list with Base44 `User`, `Reputation`, and `OpsLog`

Auth:

- admin only

Upstream:

- RCON `ListPlayers`
- `User`
- `Reputation`
- `OpsLog`

Response:

```js
await base44.functions.invoke("playerTelemetry", {})
// -> {
//   players: [{
//     email, name, callsign, role, credits,
//     totalReputation, factionReps,
//     isOnline, kills, deaths, missionsCompleted,
//     recentActivity, joinedAt
//   }],
//   onlinePlayers,
//   recentOpsLogs,
//   rconError,
//   timestamp
// }
```

Best use in app:

- admin telemetry table
- operative detail drawer
- GM war-room roster

Best immersive display:

- "Operative Presence Board" with online pulse dots, role badges, recent kill/mission strips
- "Unit Readiness" widgets: online count, active combatants, operators with no recent activity, top reputation shifts
- "Live squad wall" on the War Room page using callsign cards, faction insignia, and recent-event spark lines

### 3. `whitelistPlayer`

File: `base44/functions/whitelistPlayer/entry.ts`

Purpose:

- manages the HumanitZ whitelist file through Pterodactyl
- optionally reloads whitelist in-game via RCON

Auth:

- authenticated user can `add` only their own verified Steam ID
- admin can `add`, `remove`, and `list`

Actions:

- `add`
- `remove`
- `list`

Upstream:

- `GET/POST /api/client/servers/{serverId}/files/contents?file=...`
- `POST /api/client/servers/{serverId}/files/write?file=...`
- RCON `/reloadwhitelist`

Persistent side effects:

- `ServerLog` with `player_event` category

Best use in app:

- onboarding clearance flow
- admin whitelist management
- access audit feed

Best immersive display:

- "Clearance Pipeline" with states: account linked -> identity verified -> whitelist written -> server reload attempted
- roster chips showing `Verified`, `Whitelisted`, `Pending Reload`, `Mismatch`

### 4. `steamAuth`

File: `base44/functions/steamAuth/entry.ts`

Purpose:

- Steam OpenID login URL generation
- callback verification
- local Steam identity persistence
- automatic handoff into `whitelistPlayer.add`

Auth:

- authenticated user

Actions:

- `get_login_url`
- `verify`
- `unlink`
- `status`

Upstream:

- `https://steamcommunity.com/openid/login`

Persistent side effects:

- updates `User.steam_id`
- updates `User.steam_name`
- updates `User.steam_linked_at`
- invokes `whitelistPlayer`

Best use in app:

- profile page
- onboarding checkpoint
- gated server-access status panel

Best immersive display:

- "Identity Seal" card showing Steam link state, date linked, and server clearance status
- use a short status timeline instead of a plain button row

### 5. `worldStateSync`

File: `base44/functions/worldStateSync/entry.ts`

Purpose:

- authoritative world-time and world-weather ingestion
- normalizes external server payload into app-native `WorldConditions`

Auth:

- intended for admin or automation
- current implementation also allows no-user "automation context"

Actions:

- `status`
- `pull`

Upstream:

- either `WORLD_STATE_FILE_PATH` through Pterodactyl file reads
- or `WORLD_STATE_RCON_COMMAND` through RCON

Required upstream JSON payload:

- `world_day_number`
- `world_minute_of_day`
- `clock_rate_multiplier`
- `season`
- `weather`
- `daylight_phase`

Optional fields:

- `temperature_c`
- `visibility`
- `radiation_level`
- `wind`
- `special_conditions`
- `gm_flavor_text`

Persistent side effects:

- creates or updates `WorldConditions`

Best use in app:

- top-bar world clock
- Today hero panel
- map weather overlays
- day/night ambience
- world freshness and telemetry trust indicators

Best immersive display:

- use `WorldConditions` as the app's global atmospheric backbone
- animate particles, light levels, color grading, map haze, and warning banners from this single entity
- show freshness and authority state everywhere the world clock appears

### 6. `listServerFiles`

File: `base44/functions/listServerFiles/entry.ts`

Purpose:

- admin-only file browser for Pterodactyl directories

Auth:

- admin only

Request:

```js
await base44.functions.invoke("listServerFiles", {
  directory: "/HumanitZServer"
})
```

Response:

```js
// -> {
//   directory,
//   files: [{ name, is_file, size }]
// }
```

Best use in app:

- debug/admin tooling only
- world-state source validation
- whitelist file troubleshooting
- log file browsing

Best immersive display:

- keep this in a "Maintenance Bay" or "Server Files" drawer
- do not surface to normal players

### 7. `ingestOpsLog`

File: `base44/functions/ingestOpsLog/entry.ts`

Purpose:

- centralized ingestion endpoint for operational events
- accepts one entry or a bulk array

Auth:

- any authenticated user

Persistent side effects:

- creates `OpsLog` records

Best use in app:

- kill feed
- base breach feed
- territory and mission timelines
- player dossier history

Best immersive display:

- "Ops Tape" with severity sounds, faction colors, callsign emphasis, and sector chips
- feed into map flashes, dossier timelines, and live event toasts

### 8. `executeScheduledTask`

File: `base44/functions/executeScheduledTask/entry.ts`

Purpose:

- scheduler executor for queued server tasks
- indirectly invokes `serverManager`

Auth:

- currently no explicit auth gate in code

Consumes:

- `ScheduledTask`

Invokes:

- `serverManager.restart`
- `serverManager.broadcast`
- `serverManager.rcon`

Best use in app:

- admin-only scheduler and timeline UI
- maintenance windows
- event start/end orchestration

Best immersive display:

- "Command Queue" timeline with upcoming broadcasts, restart windows, and event triggers

## Primary Read Models To Subscribe To

These entities are the correct sources for immersive UI after commands finish:

- `WorldConditions`: world clock, season, weather, radiation, visibility, ambient mood
- `ServerLog`: admin audit console, mission log, command history
- `OpsLog`: live ops feed, kill tape, dossier timelines, territory incident stream
- `Event`: world-state interrupts, broadcasts, colony alerts, narrative headlines
- `Notification`: personal or server-wide alert delivery
- `ScheduledTask`: admin queue and automation monitor
- `User`: Steam link and access state

## Best Frontend Integration Pattern

### 1. Separate commands from live display

Use functions for:

- direct server actions
- upstream server reads
- secure privileged operations

Use entities for:

- anything the user should watch continuously
- anything that needs history
- anything that should appear in multiple surfaces at once

### 2. Normalize responses once

Create a thin client adapter layer such as `src/lib/server-api.js` or `src/api/server.js` that wraps raw function responses into stable app-native shapes.

Recommended view models:

- `ServerStatusView`
- `ServerCommandResult`
- `WorldTelemetryView`
- `PlayerTelemetryView`
- `WhitelistEntryView`
- `SteamLinkStateView`

### 3. Design for stale/offline states

For every server-facing card, define four presentation states:

- live
- stale
- degraded
- offline

The current world-state UX already does this well and should be copied elsewhere.

## Immersive Display Blueprint

### Admin / GM surfaces

#### Command Center

Use:

- `serverManager.status`
- `playerTelemetry`
- `ScheduledTask`
- `ServerLog`

Display ideas:

- live server heartbeat with animated rack gauges
- connected-player wall with online pulse markers
- recent RCON actions as a scrolling command tape
- scheduler timeline with maintenance countdowns
- player cards that open into "operative dossiers"

#### Maintenance Bay

Use:

- `listServerFiles`
- `ServerLog`
- `whitelistPlayer`

Display ideas:

- file browser drawer with path breadcrumbs
- whitelist diff viewer
- server-access audit list

### Player-facing surfaces

#### Top Bar / HUD

Use:

- `WorldConditions`

Display ideas:

- authoritative world clock
- freshness badge
- season/weather icons
- tooltip with source and error state

#### Today page

Use:

- `WorldConditions`
- `Event`
- `Notification`

Display ideas:

- make the weather hero the emotional center of the page
- tint the page by daylight phase
- add environmental motion only when telemetry is verified
- show critical broadcasts as interrupt banners, not buried cards

#### War Room / Map

Use:

- `WorldConditions`
- `OpsLog`
- `playerTelemetry`
- `Event`

Display ideas:

- overlay visibility, radiation, and special-condition haze
- flash sectors when `OpsLog` events land
- show online operators as presence markers beside active sectors
- use faction-colored incident trails for recent combat

#### Profile / Dossier

Use:

- `steamAuth.status`
- `User`
- `OpsLog`
- `playerTelemetry`

Display ideas:

- identity panel showing Steam link, access clearance, join date, recent action tape
- turn whitelist and Steam status into "clearance" rather than plain account settings

#### Mission / Ops Feed

Use:

- `OpsLog`
- `ServerLog`
- `Event`
- `Notification`

Display ideas:

- split into "Comms", "Ops", and "System"
- use severity-specific tone, iconography, and sound
- let broadcasts cut through as full-width interrupt cards

## Original Audit Findings

### Critical

1. `executeScheduledTask` has no explicit auth guard, yet it reads active tasks with service-role access and can indirectly restart the server, broadcast messages, or run arbitrary RCON commands.
   Reference: `base44/functions/executeScheduledTask/entry.ts:8`

2. `worldStateSync` intentionally allows no-user execution for automation, but there is no additional verification layer in the function itself. If this function is publicly invokable in the deployed environment, external callers could trigger authoritative server reads.
   Reference: `base44/functions/worldStateSync/entry.ts:20`

### High

3. The admin server dashboard expects data that `serverManager.status` does not return. The backend returns `is_suspended` and `resources`, but the UI reads `status.current_state`, so the server can render as offline even when healthy.
   References:
   - `base44/functions/serverManager/entry.ts:151`
   - `src/components/admin/ServerStatusPanel.jsx:22`
   - `src/components/admin/ServerDashboard.jsx:93`

4. The admin player-list panel is wired to the wrong response key. `serverManager.players` returns `result`, but the dashboard stores `res.data.raw`, so connected players never populate.
   References:
   - `base44/functions/serverManager/entry.ts:241`
   - `src/components/admin/ServerDashboard.jsx:32`

### Medium

5. `ingestOpsLog` is documented as a webhook target, but it requires an authenticated user and has no webhook secret or signed-ingestion path. Direct external kill-feed or server webhook integrations are not currently supported as written.
   Reference: `base44/functions/ingestOpsLog/entry.ts:7`

6. `steamAuth.unlink` clears local Steam fields but does not remove the linked Steam ID from the actual game-server whitelist. A user can appear "unlinked" in-app while retaining server access.
   References:
   - `base44/functions/steamAuth/entry.ts:129`
   - `base44/functions/whitelistPlayer/entry.ts:229`

7. `playerTelemetry` labels imply broad player stats, but the metrics are derived from only the latest 50 `OpsLog` rows and online presence is matched by name/callsign string equality. Treat these as recent heuristics, not authoritative lifetime stats.
   Reference: `base44/functions/playerTelemetry/entry.ts:101`

### Low

8. The broadcast UI allows 256 characters, but `serverManager` trims broadcasts to 200 characters. The UI should match the backend limit so operators do not lose text silently.
   References:
   - `src/components/admin/ServerBroadcast.jsx:38`
   - `base44/functions/serverManager/entry.ts:44`

9. `listServerFiles` has no current frontend consumer. The endpoint is useful, but it is effectively latent functionality right now.
   Reference: `base44/functions/listServerFiles/entry.ts:31`

## Recommended Implementation Order

1. Fix security posture.
   - lock down `executeScheduledTask`
   - verify `worldStateSync` automation access model
   - add a real webhook ingestion path if BiSect-side pushes are required

2. Normalize command contracts.
   - return `current_state` from `serverManager.status`
   - return `players_raw` or `players` consistently from `serverManager.players`
   - align frontend max lengths with backend sanitizers

3. Double down on read models.
   - keep using `WorldConditions`, `ServerLog`, `OpsLog`, `Event`, and `Notification`
   - prefer entity subscriptions for immersive UI

4. Build the immersive layer.
   - Top-bar authoritative world HUD
   - Today weather/atmosphere hero
   - War Room presence board + incident map
   - Command Center scheduler timeline + system tape

## Recommended Next Step

If you want to turn this guide into implementation work, the highest-leverage next move is:

1. harden the exposed functions
2. normalize `serverManager` response contracts
3. add a dedicated `server read model` client wrapper
4. build a unified "Comms and Telemetry" surface that merges `WorldConditions`, `Event`, `Notification`, `ServerLog`, and `OpsLog`

That gives the app one immersive backbone instead of several disconnected admin widgets.
