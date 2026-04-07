import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';
import { deterministicBoolean, deterministicNumber } from '../_shared/deterministic.ts';
import { DATA_ORIGINS, buildSourceRef, getCycleKey, hasSourceRef, withProvenance } from '../_shared/provenance.ts';
import {
  buildArrivalSummary,
  buildAttractionReason,
  buildSurvivorPayloads,
  getSurvivorCycleSourceRef,
  getSurvivorNameSet,
} from '../_shared/survivorRules.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let actor = null;
    try {
      actor = await base44.auth.me();
      if (actor && actor.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch (_) {}

    const body = await req.json().catch(() => ({}));
    const mode = body.mode === 'assign' ? 'assign' : 'cycle';

    const [bases, survivors, diplomacy, territories, reputations, events] = await Promise.all([
      base44.asServiceRole.entities.PlayerBase.filter({ status: 'active' }),
      base44.asServiceRole.entities.Survivor.filter({}),
      base44.asServiceRole.entities.Diplomacy.filter({}),
      base44.asServiceRole.entities.Territory.filter({}),
      base44.asServiceRole.entities.Reputation.filter({}),
      base44.asServiceRole.entities.Event.filter({ is_active: true }, '-created_date', 20),
    ]);

    if (mode === 'assign') {
      const requestedCount = Number.parseInt(String(body.count ?? '1'), 10);
      const safeCount = Number.isFinite(requestedCount) ? Math.max(1, Math.min(5, requestedCount)) : 1;
      const baseId = typeof body.base_id === 'string' ? body.base_id : '';
      const targetBase = bases.find((base) => base.id === baseId);
      if (!targetBase) return Response.json({ error: 'Base not found' }, { status: 404 });

      const baseSurvivors = survivors.filter((survivor) => survivor.base_id === baseId);
      const currentCount = baseSurvivors.filter((survivor) => survivor.status === 'active').length;
      const slots = (Number(targetBase.capacity || 5) || 5) - currentCount;
      const toGenerate = Math.min(safeCount, slots);
      if (toGenerate <= 0) {
        return Response.json(
          { error: 'Base at capacity', current: currentCount, max: targetBase.capacity },
          { status: 409 },
        );
      }

      const territory = territories.find((entry) => entry.id === targetBase.territory_id);
      const manualRef = `survivor_assign:${targetBase.id}:${toGenerate}:${actor?.email || 'automation'}`;
      const payloads = buildSurvivorPayloads({
        base: targetBase,
        territory,
        count: toGenerate,
        origin: 'assigned',
        reason: 'Assigned by Command',
        seed: manualRef,
        existingNames: getSurvivorNameSet(baseSurvivors),
        sourceRefs: [
          manualRef,
          buildSourceRef('base', targetBase.id),
          buildSourceRef('territory', territory?.id),
        ],
      });

      const generated = [];
      for (const payload of payloads) {
        generated.push(await base44.asServiceRole.entities.Survivor.create(payload));
      }

      if (generated.length > 0 && targetBase.owner_email) {
        await base44.asServiceRole.entities.Notification.create(withProvenance({
          player_email: targetBase.owner_email,
          title: `${generated.length} survivor${generated.length > 1 ? 's' : ''} assigned to ${targetBase.name}`,
          message: buildArrivalSummary(generated),
          type: 'system_alert',
          priority: 'normal',
          is_read: false,
        }, {
          dataOrigin: DATA_ORIGINS.DETERMINISTIC_PROJECTION,
          sourceRefs: [
            buildSourceRef('base', targetBase.id),
            ...generated.map((survivor) => buildSourceRef('survivor', survivor.id)),
          ],
        }));
      }

      return Response.json({ status: 'ok', generated: generated.length });
    }

    const results = [];
    const cycleKey = getCycleKey(30);
    const activeWars = diplomacy.filter((relationship) => relationship.status === 'war');
    const emergencies = events.filter((event) => event.severity === 'emergency' || event.severity === 'critical');

    for (const base of bases) {
      const baseSurvivors = survivors.filter((survivor) => survivor.base_id === base.id);
      if (baseSurvivors.some((survivor) => hasSourceRef(survivor, getSurvivorCycleSourceRef(cycleKey, base.id)))) {
        continue;
      }

      const currentSurvivors = baseSurvivors.filter((survivor) => survivor.status === 'active');
      const slots = (Number(base.capacity || 5) || 5) - currentSurvivors.length;
      if (slots <= 0) continue;

      const linkedTerritory = territories.find((territory) => territory.id === base.territory_id);
      const ownerReps = reputations.filter((rep) => rep.player_email === base.owner_email);
      const totalRep = ownerReps.reduce((sum, rep) => sum + (Number(rep.score || 0) || 0), 0);
      const cycleRef = getSurvivorCycleSourceRef(cycleKey, base.id);
      const attraction = buildAttractionProfile({
        base,
        linkedTerritory,
        totalRep,
        activeWars,
        emergencies,
      });

      const chance = Math.min(attraction.score / 5, 1);
      if (!deterministicBoolean(
        chance,
        cycleKey,
        base.id,
        totalRep,
        linkedTerritory?.threat_level || 'moderate',
        Number(base.defense_level || 1) || 1,
        activeWars.length,
        emergencies.length,
      )) {
        continue;
      }

      const maxArrivals = Math.min(Math.floor(attraction.score / 3) + 1, slots, 2);
      if (maxArrivals <= 0) continue;

      const count = deterministicNumber(1, maxArrivals, cycleKey, base.id, 'count');
      const payloads = buildSurvivorPayloads({
        base,
        territory: linkedTerritory,
        count,
        origin: attraction.origin,
        reason: attraction.reason,
        seed: `${cycleKey}:${base.id}:${attraction.origin}:${Math.round(attraction.score * 10)}`,
        existingNames: getSurvivorNameSet(baseSurvivors),
        sourceRefs: [
          cycleRef,
          buildSourceRef('base', base.id),
          buildSourceRef('territory', linkedTerritory?.id),
          ...attraction.sourceRefs,
        ],
      });

      const created = [];
      for (const payload of payloads) {
        created.push(await base44.asServiceRole.entities.Survivor.create(payload));
      }

      if (created.length === 0) {
        continue;
      }

      results.push({ base: base.name, owner: base.owner_email, new_survivors: created.length });

      if (base.owner_email) {
        await base44.asServiceRole.entities.Notification.create(withProvenance({
          player_email: base.owner_email,
          title: `${created.length} survivor${created.length > 1 ? 's' : ''} arrived at ${base.name}`,
          message: buildArrivalSummary(created),
          type: 'system_alert',
          priority: 'normal',
          is_read: false,
        }, {
          dataOrigin: DATA_ORIGINS.DETERMINISTIC_PROJECTION,
          sourceRefs: [
            buildSourceRef('base', base.id),
            cycleRef,
            ...created.map((survivor) => buildSourceRef('survivor', survivor.id)),
          ],
        }));
      }
    }

    return Response.json({ status: 'ok', bases_processed: bases.length, arrivals: results });
  } catch (error) {
    console.error('survivorEngine error:', error);
    return Response.json({ error: error.message || 'Unexpected error' }, { status: 500 });
  }
});

function buildAttractionProfile({ base, linkedTerritory, totalRep, activeWars, emergencies }) {
  let attractionScore = 0;
  const sourceRefs = [];

  attractionScore += Math.min(totalRep * 0.02, 3);

  if (linkedTerritory) {
    const safetyBonus = { minimal: 2, low: 1.5, moderate: 1, high: 0.5, critical: 0 };
    attractionScore += safetyBonus[linkedTerritory.threat_level] || 0.5;
    sourceRefs.push(buildSourceRef('territory', linkedTerritory.id));
  }

  attractionScore += (Number(base.defense_level || 1) || 1) * 0.3;
  const attraction = buildAttractionReason({ activeWars, emergencies, territory: linkedTerritory });

  if (activeWars.length > 0 && ['minimal', 'low'].includes(linkedTerritory?.threat_level)) {
    attractionScore += activeWars.length * 1.5;
    sourceRefs.push(buildSourceRef('diplomacy', activeWars[0]?.id));
  }

  if (emergencies.length > 0) {
    attractionScore += emergencies.length * 0.8;
    sourceRefs.push(buildSourceRef('event', emergencies[0]?.id));
  }

  return {
    score: attractionScore,
    origin: attraction.origin,
    reason: attraction.reason,
    sourceRefs,
  };
}
