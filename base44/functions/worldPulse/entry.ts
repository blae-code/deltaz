import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';
import { buildWorldPulseCandidates } from '../_shared/worldPulseRules.ts';
import { DATA_ORIGINS, getCycleKey, withProvenance } from '../_shared/provenance.ts';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch (_) {
      // Scheduled automation — no user context, proceed with service role
    }

    const now = new Date();
    const cycleKey = getCycleKey(30, now.getTime());
    const cycleRef = `world_pulse:${cycleKey}`;
    const [factions, territories, jobs, recentEvents, recentIntel, economies, charProfiles, diplomacy, commodities] = await Promise.all([
      base44.asServiceRole.entities.Faction.filter({}),
      base44.asServiceRole.entities.Territory.filter({}),
      base44.asServiceRole.entities.Job.filter({}),
      base44.asServiceRole.entities.Event.filter({ is_active: true }, '-created_date', 20),
      base44.asServiceRole.entities.IntelFeed.filter({ is_active: true }, '-created_date', 20),
      base44.asServiceRole.entities.FactionEconomy.filter({}),
      base44.asServiceRole.entities.CharacterProfile.filter({}, '-created_date', 30),
      base44.asServiceRole.entities.Diplomacy.filter({}),
      base44.asServiceRole.entities.CommodityPrice.filter({}),
    ]);

    const recentEventTitles = new Set(recentEvents.map((event) => normalizeTitle(event.title)).filter(Boolean));
    const recentIntelTitles = new Set(recentIntel.map((intel) => normalizeTitle(intel.title)).filter(Boolean));
    const candidates = buildWorldPulseCandidates({
      factions,
      territories,
      jobs,
      economies,
      diplomacy,
      commodities,
      charProfiles,
      cycleKey,
      now,
    });

    const intelCreated = [];
    const eventsCreated = [];

    for (const item of candidates.intel) {
      const title = normalizeTitle(item.title);
      if (!title || recentIntelTitles.has(title) || intelCreated.length >= 3) {
        continue;
      }

      const record = await base44.asServiceRole.entities.IntelFeed.create(withProvenance({
        title: item.title,
        content: item.content,
        category: item.category,
        severity: item.severity,
        source: item.source,
        related_faction_id: item.related_faction_id,
        related_territory_id: item.related_territory_id,
        is_active: true,
        expires_at: item.expires_at,
      }, {
        dataOrigin: DATA_ORIGINS.DETERMINISTIC_PROJECTION,
        sourceRefs: [cycleRef, ...(item.source_refs || [])],
      }));
      recentIntelTitles.add(title);
      intelCreated.push(record);
    }

    for (const item of candidates.events) {
      const title = normalizeTitle(item.title);
      if (!title || recentEventTitles.has(title) || eventsCreated.length >= 2) {
        continue;
      }

      const record = await base44.asServiceRole.entities.Event.create(withProvenance({
        title: item.title,
        content: item.content,
        type: item.type,
        severity: item.severity,
        territory_id: item.territory_id,
        faction_id: item.faction_id,
        is_active: true,
      }, {
        dataOrigin: DATA_ORIGINS.DETERMINISTIC_PROJECTION,
        sourceRefs: [cycleRef, ...(item.source_refs || [])],
      }));
      recentEventTitles.add(title);
      eventsCreated.push(record);
    }

    return Response.json({
      status: 'ok',
      intel_generated: intelCreated.length,
      events_generated: eventsCreated.length,
    });
  } catch (error) {
    console.error('worldPulse error:', error);
    return Response.json({ error: error.message || 'World pulse failed' }, { status: 500 });
  }
});

function normalizeTitle(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim().slice(0, 140);
}
