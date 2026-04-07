import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';
import {
  buildMissionRecordPayload,
  getErrorMessage,
  selectMissionBatch,
} from '../_shared/missionRules.ts';
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
      // Scheduled automation is allowed.
    }

    const [factions, territories, jobs, economies, diplomacy, events, commodities, scavengeRuns] = await Promise.all([
      base44.asServiceRole.entities.Faction.filter({}),
      base44.asServiceRole.entities.Territory.filter({}),
      base44.asServiceRole.entities.Job.filter({}, '-created_date', 300),
      base44.asServiceRole.entities.FactionEconomy.filter({}),
      base44.asServiceRole.entities.Diplomacy.filter({}),
      base44.asServiceRole.entities.Event.filter({ is_active: true }, '-created_date', 20),
      base44.asServiceRole.entities.CommodityPrice.filter({}),
      base44.asServiceRole.entities.ScavengeRun.filter({}, '-created_date', 80),
    ]);

    const activeFactions = factions.filter((faction) => faction.status === 'active');
    if (activeFactions.length < 2 || territories.length === 0) {
      return Response.json({ status: 'ok', economy_tier: 'stable', avg_faction_wealth: 0, generated: 0, missions: [] });
    }

    const economiesByFaction = new Map(economies.map((economy) => [economy.faction_id, economy]));
    const avgWealth = economies.length > 0
      ? Math.round(economies.reduce((sum, economy) => sum + (Number(economy.wealth || 0) || 0), 0) / economies.length)
      : 0;
    const economyTier = avgWealth < 500 ? 'scarce' : avgWealth < 1500 ? 'moderate' : 'abundant';

    const excludeSignatures = new Set(
      jobs
        .filter((job) => job.status === 'available' || job.status === 'in_progress')
        .map((job) => typeof job.generation_meta?.params?.signature === 'string' ? job.generation_meta.params.signature : '')
        .filter(Boolean),
    );

    const drafts = selectMissionBatch({
      factions,
      territories,
      jobs,
      economies,
      diplomacy,
      events,
      commodities,
      scavengeRuns,
      reputations: [],
    }, {
      actorKey: `mission_forge:${economyTier}:${avgWealth}`,
      count: 3,
    }).filter((draft) => !excludeSignatures.has(draft.signature));

    const created = [];
    for (const draft of drafts) {
      const record = await base44.asServiceRole.entities.Job.create(buildMissionRecordPayload(draft, {
        status: 'available',
        maxSlots: 1,
      }));
      created.push({ record, draft });
      excludeSignatures.add(draft.signature);
    }

    if (created.length > 0) {
      await base44.asServiceRole.entities.Event.create(withProvenance({
        title: `MISSION FORGE: ${created.length} new operations posted`,
        content: created.map(({ record }) => `• ${record.title} (${record.difficulty} ${record.type})`).join('\n'),
        type: 'system_alert',
        severity: 'info',
        is_active: true,
      }, {
        dataOrigin: DATA_ORIGINS.DETERMINISTIC_PROJECTION,
        sourceRefs: created.flatMap(({ record }) => [buildSourceRef('job', record.id)]),
      }));
    }

    return Response.json({
      status: 'ok',
      economy_tier: economyTier,
      avg_faction_wealth: avgWealth,
      generated: created.length,
      missions: created.map(({ record }) => ({
        title: record.title,
        type: record.type,
        difficulty: record.difficulty,
        reward: record.reward_reputation,
      })),
    });
  } catch (error) {
    console.error('Mission Forge error:', error);
    return Response.json({ error: getErrorMessage(error) }, { status: 500 });
  }
});
