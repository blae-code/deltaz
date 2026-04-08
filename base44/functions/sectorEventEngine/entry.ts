import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';
import { rotateDeterministic, stableHash } from '../_shared/deterministic.ts';
import { DATA_ORIGINS, buildSourceRef, getCycleKey, hasSourceRef, withProvenance } from '../_shared/provenance.ts';

const validEventTypes = ['world_event', 'faction_conflict', 'anomaly', 'broadcast', 'system_alert'];
const validJobTypes = ['recon', 'extraction', 'sabotage', 'escort', 'scavenge', 'elimination'];
const validDifficulty = ['routine', 'hazardous', 'critical', 'suicide'];
const validChannels = ['emergency', 'territory_alert', 'conflict', 'faction_comm', 'propaganda'];
const validThreat = ['minimal', 'low', 'moderate', 'high', 'critical'];
const validBroadcastSeverity = ['routine', 'urgent', 'critical', 'emergency'];

const THREAT_UP = {
  minimal: 'low',
  low: 'moderate',
  moderate: 'high',
  high: 'critical',
  critical: 'critical',
};

const THREAT_DOWN = {
  critical: 'high',
  high: 'moderate',
  moderate: 'low',
  low: 'minimal',
  minimal: 'minimal',
};

const clampHours = (value: unknown) => Math.max(6, Math.min(72, Math.round(Number(value) || 24)));

const pickFallbackFaction = (activeFactions: any[], economies: any[]) => {
  const ranked = [...activeFactions].sort((left, right) => {
    const leftEco = economies.find((entry) => entry.faction_id === left.id);
    const rightEco = economies.find((entry) => entry.faction_id === right.id);
    return Number(rightEco?.wealth || 0) - Number(leftEco?.wealth || 0);
  });
  return ranked[0] || null;
};

const formatResources = (territory: any) => {
  const resources = Array.isArray(territory?.resources) ? territory.resources.filter(Boolean) : [];
  return resources.length > 0 ? resources.join(', ') : 'general salvage';
};

const buildEventCandidate = ({
  category,
  territory,
  controller,
  missionFaction,
  world,
  economy,
  recentTitles,
  cycleKey,
}: {
  category: string;
  territory: any;
  controller: any;
  missionFaction: any;
  world: any;
  economy: any;
  recentTitles: Set<string>;
  cycleKey: string;
}) => {
  const threat = String(territory?.threat_level || 'moderate');
  const territoryName = territory?.name || territory?.sector || 'Unknown sector';
  const factionName = missionFaction?.name || controller?.name || 'Independent cells';
  const weather = String(world?.weather || 'overcast');
  const topResource = Array.isArray(territory?.resources) && territory.resources.length > 0 ? territory.resources[0] : 'salvage';
  const wealth = Number(economy?.wealth || 0);
  const titleSeed = stableHash('sector-event-title', cycleKey, category, territory?.id, threat);

  let payload: any = null;

  if (category === 'environmental_hazard') {
    payload = {
      title: `${weather.replace(/_/g, ' ')} front over ${territoryName}`,
      description: `Sensor drift and field reports confirm a ${weather.replace(/_/g, ' ')} front is rolling across ${territoryName}. Patrol routes and extraction plans through ${territory?.sector} are now exposed to real attrition.`,
      severity: threat === 'critical' ? 'emergency' : 'critical',
      eventType: 'system_alert',
      missionType: 'recon',
      missionDifficulty: threat === 'critical' ? 'critical' : 'hazardous',
      broadcastChannel: 'emergency',
      broadcastSeverity: threat === 'critical' ? 'emergency' : 'critical',
      rewardReputation: 16,
      rewardDescription: 'Weather intel package and exposure protocols',
      expiresHours: 18,
      threatChange: THREAT_UP[threat] || 'high',
    };
  } else if (category === 'supply_drop') {
    payload = {
      title: `Broken convoy cache in ${territoryName}`,
      description: `A shattered convoy has spilled usable supplies across ${territoryName}. Whoever reaches the wreck first controls the medicine, fuel, and ammunition still intact inside.`,
      severity: wealth < 40 ? 'critical' : 'warning',
      eventType: 'world_event',
      missionType: 'scavenge',
      missionDifficulty: wealth < 40 ? 'critical' : 'hazardous',
      broadcastChannel: 'territory_alert',
      broadcastSeverity: wealth < 40 ? 'critical' : 'urgent',
      rewardReputation: 18,
      rewardDescription: 'Recovered supply crates and transport manifests',
      expiresHours: 24,
      threatChange: THREAT_UP[threat] || 'moderate',
    };
  } else if (category === 'anomaly') {
    payload = {
      title: `Signal bloom in ${territoryName}`,
      description: `A repeating burst pattern has appeared over ${territoryName}, strong enough to trip old receivers and bait scouts into the open. Nobody has confirmed whether the source is a functioning relay, a trap, or something buried deeper.`,
      severity: ['high', 'critical'].includes(threat) ? 'critical' : 'warning',
      eventType: 'anomaly',
      missionType: 'recon',
      missionDifficulty: ['high', 'critical'].includes(threat) ? 'critical' : 'hazardous',
      broadcastChannel: 'faction_comm',
      broadcastSeverity: ['high', 'critical'].includes(threat) ? 'critical' : 'urgent',
      rewardReputation: 14,
      rewardDescription: 'Signal telemetry, route data, and encrypted fragments',
      expiresHours: 20,
      threatChange: threat,
    };
  } else if (category === 'resource_surge') {
    payload = {
      title: `${topResource} surge at ${territoryName}`,
      description: `Survey teams have confirmed a concentrated pocket of ${formatResources(territory)} in ${territoryName}. The site could stabilize regional production if someone can secure it before scavengers strip it clean.`,
      severity: 'warning',
      eventType: 'world_event',
      missionType: topResource === 'fuel' ? 'extraction' : 'scavenge',
      missionDifficulty: ['high', 'critical'].includes(threat) ? 'critical' : 'hazardous',
      broadcastChannel: 'territory_alert',
      broadcastSeverity: 'urgent',
      rewardReputation: 15,
      rewardDescription: `${topResource} extraction rights and haul credits`,
      expiresHours: 30,
      threatChange: THREAT_DOWN[threat] || 'low',
    };
  } else if (category === 'infrastructure_collapse') {
    payload = {
      title: `Relay collapse in ${territoryName}`,
      description: `A critical span or power relay inside ${territoryName} has failed under strain. Logistics through ${territory?.sector} are degraded, and any faction holding the ground is now fighting the map itself.`,
      severity: 'critical',
      eventType: 'system_alert',
      missionType: 'escort',
      missionDifficulty: 'critical',
      broadcastChannel: 'emergency',
      broadcastSeverity: 'critical',
      rewardReputation: 17,
      rewardDescription: 'Restored route access and engineering salvage',
      expiresHours: 16,
      threatChange: THREAT_UP[threat] || 'high',
    };
  } else if (category === 'hostile_incursion') {
    payload = {
      title: `Hostile sweep through ${territoryName}`,
      description: `Spotters have confirmed organized hostiles moving through ${territoryName}. Their route threatens both local holdings and any crew trying to exploit the ground while the line is still soft.`,
      severity: ['high', 'critical'].includes(threat) ? 'emergency' : 'critical',
      eventType: controller ? 'faction_conflict' : 'world_event',
      missionType: 'elimination',
      missionDifficulty: ['high', 'critical'].includes(threat) ? 'suicide' : 'critical',
      broadcastChannel: 'conflict',
      broadcastSeverity: ['high', 'critical'].includes(threat) ? 'emergency' : 'critical',
      rewardReputation: 20,
      rewardDescription: 'Battlefield salvage, deterrence, and influence gains',
      expiresHours: 12,
      threatChange: 'critical',
    };
  }

  if (!payload || recentTitles.has(payload.title.toLowerCase())) {
    return null;
  }

  const categoryBias = {
    environmental_hazard: ['radiation_storm', 'acid_rain', 'dust_storm', 'blizzard'].includes(weather) ? 30 : 10,
    supply_drop: wealth < 45 ? 28 : 16,
    anomaly: weather === 'radiation_storm' ? 26 : 14,
    resource_surge: Array.isArray(territory?.resources) && territory.resources.length > 0 ? 24 : 8,
    infrastructure_collapse: ['contested', 'hostile'].includes(String(territory?.status || '')) ? 22 : 12,
    hostile_incursion: ['high', 'critical'].includes(threat) ? 32 : 18,
  }[category] || 10;

  return {
    score: categoryBias + (titleSeed % 11),
    category,
    territory,
    controller,
    missionFaction,
    event_title: payload.title,
    event_description: payload.description,
    event_type: payload.eventType,
    event_severity: payload.severity,
    target_territory_name: territoryName,
    target_sector: territory?.sector || '',
    affected_resources: Array.isArray(territory?.resources) ? territory.resources : [],
    broadcast_title: `BROADCAST: ${payload.title}`,
    broadcast_content: `${factionName} reports ${payload.title.toLowerCase()}. ${payload.description}`,
    broadcast_channel: payload.broadcastChannel,
    broadcast_severity: payload.broadcastSeverity,
    broadcast_faction_name: factionName,
    mission_title: `${factionName}: ${payload.title}`,
    mission_description: `${factionName} is deploying teams toward ${territoryName}. Objective: ${payload.description}`,
    mission_type: payload.missionType,
    mission_difficulty: payload.missionDifficulty,
    mission_faction_name: factionName,
    mission_reward_reputation: payload.rewardReputation,
    mission_reward_description: payload.rewardDescription,
    mission_expires_hours: payload.expiresHours,
    territory_threat_change: payload.threatChange,
  };
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    } catch {
      // Scheduled automation is allowed.
    }

    const [factions, territories, economies, diplomacy, recentEvents, recentBroadcasts, world] = await Promise.all([
      base44.asServiceRole.entities.Faction.filter({}),
      base44.asServiceRole.entities.Territory.filter({}),
      base44.asServiceRole.entities.FactionEconomy.filter({}),
      base44.asServiceRole.entities.Diplomacy.filter({}),
      base44.asServiceRole.entities.Event.filter({}, '-created_date', 12),
      base44.asServiceRole.entities.Broadcast.filter({ auto_generated: true }, '-created_date', 6),
      base44.asServiceRole.entities.WorldConditions.list('-updated_date', 1).then((rows: any[]) => rows[0] || {}),
    ]);

    const cycleKey = getCycleKey(240);
    const cycleSourceRef = buildSourceRef('SectorEventCycle', cycleKey);
    if (recentEvents.some((event: any) => hasSourceRef(event, cycleSourceRef))) {
      return Response.json({
        status: 'ok',
        events_created: 0,
        broadcasts_created: 0,
        missions_created: 0,
        territories_updated: 0,
        details: [],
      });
    }

    const activeFactions = factions.filter((faction: any) => faction.status === 'active');
    const fallbackFaction = pickFallbackFaction(activeFactions, economies);
    const recentTitles = new Set(recentEvents.map((event: any) => String(event.title || '').toLowerCase()));

    const categoryOrder = rotateDeterministic(
      ['environmental_hazard', 'supply_drop', 'anomaly', 'resource_surge', 'infrastructure_collapse', 'hostile_incursion'],
      'sector-event-categories',
      cycleKey,
    );

    const candidates = territories.flatMap((territory: any) => {
      const controller = factions.find((faction: any) => faction.id === territory.controlling_faction_id) || null;
      const missionFaction = controller || fallbackFaction;
      const economy = missionFaction ? economies.find((entry: any) => entry.faction_id === missionFaction.id) : null;

      return categoryOrder
        .map((category) => buildEventCandidate({
          category,
          territory,
          controller,
          missionFaction,
          world,
          economy,
          recentTitles,
          cycleKey,
        }))
        .filter(Boolean);
    }).sort((left: any, right: any) => right.score - left.score);

    const selected = [];
    const usedSectors = new Set<string>();
    for (const candidate of candidates) {
      if (selected.length >= 3) {
        break;
      }
      if (!candidate?.territory?.sector || usedSectors.has(candidate.territory.sector)) {
        continue;
      }
      usedSectors.add(candidate.territory.sector);
      selected.push(candidate);
    }

    const output = { events_created: 0, broadcasts_created: 0, missions_created: 0, territories_updated: 0, details: [] as any[] };

    for (const candidate of selected) {
      const territory = candidate.territory;
      const controller = candidate.controller;
      const missionFaction = candidate.missionFaction || fallbackFaction;
      const sourceRefs = [
        cycleSourceRef,
        buildSourceRef('Territory', territory.id, candidate.category),
        missionFaction ? buildSourceRef('Faction', missionFaction.id, 'sector_event') : '',
      ].filter(Boolean);

      await base44.asServiceRole.entities.Event.create(withProvenance({
        title: candidate.event_title,
        content: candidate.event_description,
        type: validEventTypes.includes(candidate.event_type) ? candidate.event_type : 'world_event',
        severity: ['info', 'warning', 'critical', 'emergency'].includes(candidate.event_severity) ? candidate.event_severity : 'warning',
        territory_id: territory?.id || '',
        faction_id: controller?.id || missionFaction?.id || '',
        is_active: true,
      }, {
        dataOrigin: DATA_ORIGINS.DETERMINISTIC_PROJECTION,
        sourceRefs,
      }));
      output.events_created += 1;

      await base44.asServiceRole.entities.Broadcast.create(withProvenance({
        channel: validChannels.includes(candidate.broadcast_channel) ? candidate.broadcast_channel : 'territory_alert',
        title: candidate.broadcast_title,
        content: candidate.broadcast_content,
        faction_id: missionFaction?.id || '',
        faction_name: missionFaction?.name || 'UNKNOWN',
        faction_color: missionFaction?.color || '#888',
        severity: validBroadcastSeverity.includes(candidate.broadcast_severity) ? candidate.broadcast_severity : 'urgent',
        territory_id: territory?.id || '',
        sector: territory?.sector || candidate.target_sector || '',
        is_pinned: ['critical', 'emergency'].includes(candidate.event_severity),
        auto_generated: true,
        expires_at: new Date(Date.now() + 24 * 3600000).toISOString(),
      }, {
        dataOrigin: DATA_ORIGINS.DETERMINISTIC_PROJECTION,
        sourceRefs,
      }));
      output.broadcasts_created += 1;

      await base44.asServiceRole.entities.Job.create(withProvenance({
        title: candidate.mission_title,
        description: candidate.mission_description,
        type: validJobTypes.includes(candidate.mission_type) ? candidate.mission_type : 'recon',
        difficulty: validDifficulty.includes(candidate.mission_difficulty) ? candidate.mission_difficulty : 'hazardous',
        status: 'available',
        faction_id: missionFaction?.id || '',
        territory_id: territory?.id || '',
        reward_reputation: Number(candidate.mission_reward_reputation || 15),
        reward_description: candidate.mission_reward_description || '',
        expires_at: new Date(Date.now() + clampHours(candidate.mission_expires_hours) * 3600000).toISOString(),
      }, {
        dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
        sourceRefs,
      }));
      output.missions_created += 1;

      if (territory && validThreat.includes(candidate.territory_threat_change)) {
        await base44.asServiceRole.entities.Territory.update(
          territory.id,
          withProvenance(
            { threat_level: candidate.territory_threat_change },
            {
              dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
              sourceRefs,
            },
          ),
        );
        output.territories_updated += 1;
      }

      output.details.push({
        event: candidate.event_title,
        broadcast: candidate.broadcast_title,
        mission: candidate.mission_title,
        sector: territory?.sector || candidate.target_sector,
        category: candidate.category,
      });
    }

    return Response.json({ status: 'ok', ...output });
  } catch (err) {
    console.error('Sector Event Engine error:', err);
    return Response.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
});
