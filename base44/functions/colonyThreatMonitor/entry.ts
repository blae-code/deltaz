import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

const ALERT_THRESHOLDS = ['high', 'critical'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data, old_data } = body;

    if (!data || !old_data || event?.type !== 'update') {
      return Response.json({ status: 'skipped', reason: 'not a valid update' });
    }

    const newThreat = data.threat_level;
    const oldThreat = old_data.threat_level;

    // Only fire when threat level changes INTO a high/critical state
    if (newThreat === oldThreat) {
      return Response.json({ status: 'skipped', reason: 'threat level unchanged' });
    }

    if (!ALERT_THRESHOLDS.includes(newThreat)) {
      return Response.json({ status: 'skipped', reason: `new threat "${newThreat}" below alert threshold` });
    }

    const colonyName = data.colony_name || 'Colony';
    const isCritical = newThreat === 'critical';

    // Create a broadcast notification for all players
    await base44.asServiceRole.entities.Notification.create({
      player_email: 'broadcast',
      title: isCritical
        ? `🚨 CRITICAL: ${colonyName} Under Imminent Threat`
        : `⚠️ ALERT: ${colonyName} Threat Level Elevated`,
      message: isCritical
        ? `Colony threat level has reached CRITICAL. All operatives are advised to report to the colony immediately. Defense integrity: ${data.defense_integrity ?? '?'}%, Food: ${data.food_reserves ?? '?'}%, Water: ${data.water_supply ?? '?'}%.`
        : `Colony threat level has escalated to HIGH. Increased vigilance recommended. Monitor colony vitals and prepare defenses.`,
      type: 'colony_alert',
      priority: isCritical ? 'critical' : 'high',
      is_read: false,
    });

    // Also create an Event for the situation feed
    await base44.asServiceRole.entities.Event.create({
      title: isCritical
        ? `Colony Threat Level: CRITICAL`
        : `Colony Threat Level: HIGH`,
      content: isCritical
        ? `${colonyName} threat level has reached CRITICAL. Previous level: ${oldThreat}. All operatives should prioritize colony defense immediately.`
        : `${colonyName} threat level has escalated to HIGH from ${oldThreat}. Operatives should monitor the situation and prepare accordingly.`,
      type: 'system_alert',
      severity: isCritical ? 'emergency' : 'warning',
      is_active: true,
    });

    return Response.json({ status: 'ok', threat: newThreat, notifications_sent: true });
  } catch (error) {
    console.error('colonyThreatMonitor error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
