import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const TRACKED_FIELDS = [
  'food_reserves',
  'water_supply',
  'medical_supplies',
  'power_level',
  'defense_integrity',
  'morale',
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event, data, old_data } = body;

    if (!data || !old_data || event?.type !== 'update') {
      return Response.json({ status: 'skipped', reason: 'not an update with both data and old_data' });
    }

    const colonyId = event.entity_id;
    const changedBy = data.updated_by || old_data.updated_by || '';

    const changes = [];

    for (const field of TRACKED_FIELDS) {
      const oldVal = old_data[field];
      const newVal = data[field];

      // Only log if both values exist as numbers and actually changed
      if (typeof oldVal === 'number' && typeof newVal === 'number' && oldVal !== newVal) {
        changes.push({
          colony_id: colonyId,
          resource: field,
          old_value: oldVal,
          new_value: newVal,
          delta: Math.round((newVal - oldVal) * 100) / 100,
          changed_by: changedBy,
        });
      }
    }

    if (changes.length === 0) {
      return Response.json({ status: 'skipped', reason: 'no resource fields changed' });
    }

    // Bulk create history records
    await base44.asServiceRole.entities.ResourceHistory.bulkCreate(changes);

    return Response.json({ status: 'ok', logged: changes.length });
  } catch (error) {
    console.error('logResourceChange error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});