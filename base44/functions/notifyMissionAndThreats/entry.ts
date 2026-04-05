import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event, data } = body;

    if (!event || !data) {
      return Response.json({ error: 'Missing event or data' }, { status: 400 });
    }

    const entityName = event.entity_name;
    const eventType = event.type;

    // --- New Job Created → broadcast notification ---
    if (entityName === 'Job' && eventType === 'create') {
      const difficultyLabels = {
        routine: 'ROUTINE',
        hazardous: '⚠ HAZARDOUS',
        critical: '🔴 CRITICAL',
        suicide: '💀 SUICIDE',
      };
      const diffLabel = difficultyLabels[data.difficulty] || data.difficulty?.toUpperCase() || 'UNKNOWN';
      const reward = data.reward_credits ? `${data.reward_credits}c` : `${data.reward_reputation || 0} rep`;

      const priority = (data.difficulty === 'critical' || data.difficulty === 'suicide') ? 'high' : 'normal';

      await base44.asServiceRole.entities.Notification.create({
        player_email: 'broadcast',
        title: `NEW MISSION: ${data.title || 'Classified'}`,
        message: `${diffLabel} ${(data.type || 'recon').toUpperCase()} operation posted. Reward: ${reward}. Report to Mission Board for briefing.`,
        type: 'mission_assigned',
        priority,
        is_read: false,
        reference_id: event.entity_id,
      });

      console.log(`[NOTIFY] Broadcast notification created for new mission: ${data.title}`);
      return Response.json({ status: 'ok', action: 'mission_notification', mission: data.title });
    }

    // --- Critical/Emergency Event Created → high-priority broadcast ---
    if (entityName === 'Event' && eventType === 'create') {
      const severity = data.severity;
      if (severity !== 'critical' && severity !== 'emergency') {
        return Response.json({ status: 'skipped', reason: 'Event severity below threshold' });
      }

      const priorityMap = { critical: 'high', emergency: 'critical' };

      await base44.asServiceRole.entities.Notification.create({
        player_email: 'broadcast',
        title: `⚠ THREAT ALERT: ${data.title || 'Unknown Event'}`,
        message: data.content || `A ${severity.toUpperCase()} event has been detected. All operatives report to SITREP.`,
        type: 'colony_alert',
        priority: priorityMap[severity] || 'high',
        is_read: false,
        reference_id: event.entity_id,
      });

      console.log(`[NOTIFY] Critical threat notification broadcast for event: ${data.title}`);
      return Response.json({ status: 'ok', action: 'threat_notification', event: data.title });
    }

    return Response.json({ status: 'skipped', reason: 'Unhandled entity/event combination' });
  } catch (err) {
    console.error('[NOTIFY ERROR]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});