import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';
import { buildMissionRecordPayload, selectMissionBatch } from '../_shared/missionRules.ts';
import { DATA_ORIGINS, buildSourceRef, withProvenance } from '../_shared/provenance.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    } catch (_) {
      // Scheduled automation context.
    }

    const body = await req.json().catch(() => ({}));
    const missionCount = Math.min(Math.max(Number(body.count) || 3, 1), 6);

    const [factions, territories, jobs, economies, diplomacy, events, commodities, scavengeRuns, reputations] = await Promise.all([
      base44.asServiceRole.entities.Faction.filter({}),
      base44.asServiceRole.entities.Territory.filter({}),
      base44.asServiceRole.entities.Job.filter({}, '-created_date', 300),
      base44.asServiceRole.entities.FactionEconomy.filter({}),
      base44.asServiceRole.entities.Diplomacy.filter({}),
      base44.asServiceRole.entities.Event.filter({ is_active: true }, '-created_date', 40),
      base44.asServiceRole.entities.CommodityPrice.filter({}),
      base44.asServiceRole.entities.ScavengeRun.filter({}, '-created_date', 120),
      base44.asServiceRole.entities.Reputation.filter({}),
    ]);

    const drafts = selectMissionBatch({
      factions,
      territories,
      jobs,
      economies,
      diplomacy,
      events,
      commodities,
      scavengeRuns,
      reputations,
    }, {
      actorKey: 'mission-forge',
      count: missionCount,
    });

    const created = [];
    for (const draft of drafts) {
      const record = await base44.asServiceRole.entities.Job.create(buildMissionRecordPayload(draft, {
        status: 'available',
        maxSlots: 1,
      }));
      created.push({
        ...record,
        world_trigger: draft.world_context,
      });
    }

    const economyValues = economies.map((entry) => Number(entry.wealth || 0) || 0);
    const avgFactionWealth = economyValues.length > 0
      ? Math.round(economyValues.reduce((sum, value) => sum + value, 0) / economyValues.length)
      : 0;
    const economyTier = avgFactionWealth >= 1200 ? 'surplus' : avgFactionWealth >= 800 ? 'stable' : avgFactionWealth >= 450 ? 'strained' : 'scarce';

    if (created.length > 0) {
      await base44.asServiceRole.entities.Event.create(withProvenance({
        title: `MISSION FORGE: ${created.length} new operations posted`,
        content: created.map((mission) => `• ${mission.title} (${mission.difficulty} ${mission.type})`).join('\n'),
        type: 'system_alert',
        severity: created.some((mission) => mission.difficulty === 'critical' || mission.difficulty === 'suicide') ? 'warning' : 'info',
        is_active: true,
      }, {
        dataOrigin: DATA_ORIGINS.DETERMINISTIC_PROJECTION,
        sourceRefs: created.map((mission) => buildSourceRef('job', mission.id)),
      }));
    }

    return Response.json({
      status: 'ok',
      economy_tier: economyTier,
      avg_faction_wealth: avgFactionWealth,
      generated: created.length,
      missions: created.map((mission) => ({
        title: mission.title,
        type: mission.type,
        difficulty: mission.difficulty,
        reward_rep: mission.reward_reputation,
        reward_credits: mission.reward_credits,
        world_trigger: mission.world_trigger,
      })),
    });
  } catch (error) {
    console.error('Mission Forge error:', error);
    return Response.json({ error: error.message || 'Mission forge failed' }, { status: 500 });
  }
});
