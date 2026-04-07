import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';
import { buildScavengeOutcome } from '../_shared/scavengeRules.ts';
import { DATA_ORIGINS, buildSourceRef, withProvenance } from '../_shared/provenance.ts';

const ACTIVE_RUN_STATUSES = new Set(['deploying', 'in_progress']);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const territoryId = typeof body.territory_id === 'string' ? body.territory_id : '';
    if (!territoryId) return Response.json({ error: 'territory_id required' }, { status: 400 });

    const allRuns = await base44.asServiceRole.entities.ScavengeRun.filter({ player_email: user.email });
    const activeRun = allRuns.find((run) => ACTIVE_RUN_STATUSES.has(run.status));
    if (activeRun) {
      return Response.json({ error: 'You already have an active scavenge run. Wait for it to complete.' }, { status: 429 });
    }

    const [territories, factions, commodities] = await Promise.all([
      base44.asServiceRole.entities.Territory.filter({}),
      base44.asServiceRole.entities.Faction.filter({}),
      base44.asServiceRole.entities.CommodityPrice.filter({}),
    ]);

    const territory = territories.find((entry) => entry.id === territoryId);
    if (!territory) return Response.json({ error: 'Territory not found' }, { status: 404 });

    const controller = factions.find((faction) => faction.id === territory.controlling_faction_id);
    const attemptIndex = allRuns.filter((run) => run.territory_id === territoryId).length + 1;
    const outcome = buildScavengeOutcome({
      territory,
      controller,
      commodities,
      playerEmail: user.email,
      attemptIndex,
    });

    let run = null;

    try {
      run = await base44.asServiceRole.entities.ScavengeRun.create(withProvenance({
        player_email: user.email,
        territory_id: territoryId,
        status: 'in_progress',
        threat_level: territory.threat_level || 'moderate',
        controlling_faction: controller?.name || 'Unclaimed',
      }, {
        dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
        sourceRefs: outcome.source_refs,
      }));

      await base44.asServiceRole.entities.ScavengeRun.update(run.id, withProvenance({
        status: 'completed',
        loot_items: outcome.loot_items,
        loot_summary: outcome.loot_summary,
        risk_event: outcome.had_complication ? outcome.risk_event : '',
        total_value: outcome.total_value,
        duration_minutes: outcome.duration_minutes,
      }, {
        dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
        sourceRefs: [
          buildSourceRef('scavenge_run', run.id),
          ...outcome.source_refs,
        ],
      }));

      await base44.asServiceRole.entities.Notification.create(withProvenance({
        player_email: user.email,
        title: `Scavenge complete: ${territory.name}`,
        message: `${outcome.loot_summary} Total value: ${outcome.total_value} credits.`,
        type: 'mission_update',
        priority: outcome.had_complication ? 'high' : 'normal',
        is_read: false,
        reference_id: run.id,
      }, {
        dataOrigin: DATA_ORIGINS.DETERMINISTIC_PROJECTION,
        sourceRefs: [
          buildSourceRef('player', user.email),
          buildSourceRef('scavenge_run', run.id),
          ...outcome.source_refs,
        ],
      }));

      return Response.json({
        status: 'completed',
        run_id: run.id,
        loot_items: outcome.loot_items,
        loot_summary: outcome.loot_summary,
        risk_event: outcome.had_complication ? outcome.risk_event : null,
        total_value: outcome.total_value,
      });
    } catch (error) {
      console.error('scavengeRun generation error:', error);

      if (run?.id) {
        await base44.asServiceRole.entities.ScavengeRun.update(run.id, withProvenance({
          status: 'failed',
          risk_event: 'Scavenge run aborted before completion.',
          loot_summary: 'The scout returned empty-handed after the route collapsed.',
        }, {
          dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
          sourceRefs: [
            buildSourceRef('scavenge_run', run.id),
            ...outcome.source_refs,
          ],
        })).catch((updateError) => console.error('scavengeRun cleanup error:', updateError));
      }

      return Response.json({ error: 'Scavenge run failed. Please try again.' }, { status: 500 });
    }
  } catch (error) {
    console.error('scavengeRun error:', error);
    return Response.json({ error: error.message || 'Unexpected error' }, { status: 500 });
  }
});
