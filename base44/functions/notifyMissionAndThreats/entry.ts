import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);

    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch (_) {}

    const body = await req.json().catch(() => ({}));
    const event = body.event && typeof body.event === 'object' ? body.event : null;
    const data = body.data && typeof body.data === 'object' ? body.data : null;

    if (!event || !data) {
      return Response.json({ error: 'Missing event or data' }, { status: 400 });
    }

    const entityName = normalizeString(event.entity_name, 64);
    const eventType = normalizeString(event.type, 32);
    const entityId = normalizeString(event.entity_id, 128);

    if (entityName === 'Job' && eventType === 'create') {
      const difficultyLabels = {
        routine: 'ROUTINE',
        hazardous: 'HAZARDOUS',
        critical: 'CRITICAL',
        suicide: 'SUICIDE',
      };

      const difficulty = normalizeString(data.difficulty, 24).toLowerCase();
      const diffLabel = difficultyLabels[difficulty] || difficulty.toUpperCase() || 'UNKNOWN';
      const rewardCredits = Math.max(0, Number(data.reward_credits) || 0);
      const rewardRep = Math.max(0, Number(data.reward_reputation) || 0);
      const reward = rewardCredits > 0 ? `${rewardCredits}c` : `${rewardRep} rep`;
      const priority = difficulty === 'critical' || difficulty === 'suicide' ? 'high' : 'normal';

      await base44.asServiceRole.entities.Notification.create({
        player_email: 'broadcast',
        title: `NEW MISSION: ${normalizeString(data.title, 120) || 'Classified'}`,
        message: `${diffLabel} ${(normalizeString(data.type, 24) || 'recon').toUpperCase()} operation posted. Reward: ${reward}. Report to Mission Board for briefing.`,
        type: 'mission_assigned',
        priority,
        is_read: false,
        reference_id: entityId,
      });

      return Response.json({ status: 'ok', action: 'mission_notification', mission: normalizeString(data.title, 120) });
    }

    if (entityName === 'Event' && eventType === 'create') {
      const severity = normalizeString(data.severity, 24).toLowerCase();
      if (severity !== 'critical' && severity !== 'emergency') {
        return Response.json({ status: 'skipped', reason: 'Event severity below threshold' });
      }

      const priorityMap = { critical: 'high', emergency: 'critical' };

      await base44.asServiceRole.entities.Notification.create({
        player_email: 'broadcast',
        title: `THREAT ALERT: ${normalizeString(data.title, 120) || 'Unknown Event'}`,
        message: normalizeString(data.content, 400) || `A ${severity.toUpperCase()} event has been detected. All operatives report to SITREP.`,
        type: 'colony_alert',
        priority: priorityMap[severity] || 'high',
        is_read: false,
        reference_id: entityId,
      });

      return Response.json({ status: 'ok', action: 'threat_notification', event: normalizeString(data.title, 120) });
    }

    return Response.json({ status: 'skipped', reason: 'Unhandled entity/event combination' });
  } catch (error) {
    console.error('[NOTIFY ERROR]', error.message);
    return Response.json({ error: error.message || 'Unexpected error' }, { status: 500 });
  }
});

function normalizeString(value, maxLength = 255) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}
