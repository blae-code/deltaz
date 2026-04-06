import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * ingestOpsLog — Centralized ingestion endpoint for operational logs.
 * 
 * Accepts single or bulk log entries.
 * Can be called by:
 *   - Other backend functions (mission completion, diplomacy changes)
 *   - Webhook integrations (server kill feed)
 *   - Admin manual entry from the frontend
 * 
 * Payload:
 *   { entries: [ { event_type, title, detail?, severity?, faction_id?, sector?, ... } ] }
 *   OR single: { event_type, title, detail?, ... }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Normalize to array
    const entries = Array.isArray(body.entries) ? body.entries : [body];

    if (entries.length === 0) {
      return Response.json({ error: 'No entries provided' }, { status: 400 });
    }

    // Validate and clean entries
    const validEntries = [];
    const errors = [];

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (!e.event_type || !e.title) {
        errors.push({ index: i, error: 'Missing required fields: event_type, title' });
        continue;
      }

      validEntries.push({
        event_type: e.event_type,
        title: String(e.title).slice(0, 200),
        detail: e.detail ? String(e.detail).slice(0, 2000) : undefined,
        severity: e.severity || 'routine',
        faction_id: e.faction_id || undefined,
        faction_name: e.faction_name || undefined,
        secondary_faction_id: e.secondary_faction_id || undefined,
        secondary_faction_name: e.secondary_faction_name || undefined,
        sector: e.sector || undefined,
        territory_id: e.territory_id || undefined,
        mission_id: e.mission_id || undefined,
        mission_title: e.mission_title || undefined,
        player_email: e.player_email || undefined,
        player_callsign: e.player_callsign || undefined,
        target_player_email: e.target_player_email || undefined,
        target_callsign: e.target_callsign || undefined,
        weapon: e.weapon || undefined,
        distance: typeof e.distance === 'number' ? e.distance : undefined,
        coordinates: e.coordinates || undefined,
        metadata: e.metadata ? (typeof e.metadata === 'string' ? e.metadata : JSON.stringify(e.metadata)) : undefined,
        source: e.source || 'manual',
      });
    }

    let created = 0;
    if (validEntries.length > 0) {
      if (validEntries.length === 1) {
        await base44.asServiceRole.entities.OpsLog.create(validEntries[0]);
        created = 1;
      } else {
        await base44.asServiceRole.entities.OpsLog.bulkCreate(validEntries);
        created = validEntries.length;
      }
    }

    return Response.json({
      status: 'ok',
      created,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('ingestOpsLog error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});