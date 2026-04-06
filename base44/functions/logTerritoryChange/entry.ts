import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data, old_data } = body;

    if (!data || !old_data) {
      return Response.json({ skipped: true, reason: "no data or old_data" });
    }

    const logs = [];

    // Status change
    if (old_data.status && data.status && old_data.status !== data.status) {
      logs.push({
        territory_id: event.entity_id,
        sector: data.sector || old_data.sector || "?",
        territory_name: data.name || old_data.name || "",
        event_type: "status_change",
        old_value: old_data.status,
        new_value: data.status,
        old_faction_id: old_data.controlling_faction_id || null,
        new_faction_id: data.controlling_faction_id || null,
        description: `${data.sector || "?"} status: ${old_data.status} → ${data.status}`,
      });
    }

    // Control change
    if (old_data.controlling_faction_id !== data.controlling_faction_id) {
      logs.push({
        territory_id: event.entity_id,
        sector: data.sector || old_data.sector || "?",
        territory_name: data.name || old_data.name || "",
        event_type: "control_change",
        old_value: old_data.controlling_faction_id || "unclaimed",
        new_value: data.controlling_faction_id || "unclaimed",
        old_faction_id: old_data.controlling_faction_id || null,
        new_faction_id: data.controlling_faction_id || null,
        description: `${data.sector || "?"} control changed`,
      });
    }

    // Threat level change
    if (old_data.threat_level && data.threat_level && old_data.threat_level !== data.threat_level) {
      logs.push({
        territory_id: event.entity_id,
        sector: data.sector || old_data.sector || "?",
        territory_name: data.name || old_data.name || "",
        event_type: "threat_change",
        old_value: old_data.threat_level,
        new_value: data.threat_level,
        old_faction_id: data.controlling_faction_id || null,
        new_faction_id: data.controlling_faction_id || null,
        description: `${data.sector || "?"} threat: ${old_data.threat_level} → ${data.threat_level}`,
      });
    }

    if (logs.length > 0) {
      await base44.asServiceRole.entities.TerritoryLog.bulkCreate(logs);
    }

    return Response.json({ logged: logs.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});