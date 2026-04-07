import { sortDeterministic } from './deterministic.ts';
import { buildSourceRef } from './provenance.ts';

const sanitizeText = (value: unknown, maxLength = 140) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
};

const difficultyToSeverity = (difficulty: string) => {
  switch (sanitizeText(difficulty, 20)) {
    case 'suicide':
    case 'critical':
      return 'critical';
    case 'hazardous':
      return 'high';
    default:
      return 'medium';
  }
};

const eventSeverityFromThreat = (threat: string) => {
  switch (sanitizeText(threat, 20)) {
    case 'critical':
      return 'emergency';
    case 'high':
      return 'critical';
    case 'moderate':
      return 'warning';
    default:
      return 'info';
  }
};

const intelSeverityFromThreat = (threat: string) => {
  switch (sanitizeText(threat, 20)) {
    case 'critical':
      return 'critical';
    case 'high':
      return 'high';
    case 'moderate':
      return 'medium';
    default:
      return 'low';
  }
};

const excerpt = (value: unknown, fallback: string) => {
  const normalized = sanitizeText(value, 180);
  return normalized || fallback;
};

export function buildWorldPulseCandidates({
  factions,
  territories,
  jobs,
  economies,
  diplomacy,
  commodities,
  charProfiles,
  cycleKey,
  now,
}: {
  factions: any[];
  territories: any[];
  jobs: any[];
  economies: any[];
  diplomacy: any[];
  commodities: any[];
  charProfiles: any[];
  cycleKey: string;
  now: Date;
}) {
  const factionById = new Map(factions.map((faction) => [faction.id, faction]));
  const territoryById = new Map(territories.map((territory) => [territory.id, territory]));
  const economyByFactionId = new Map(economies.map((economy) => [economy.faction_id, economy]));
  const scarceResources = commodities
    .filter((commodity) => ['scarce', 'low'].includes(sanitizeText(commodity?.availability, 20)))
    .map((commodity) => sanitizeText(commodity?.resource_type, 20))
    .filter(Boolean);
  const intelCandidates = [];
  const eventCandidates = [];

  for (const territory of territories) {
    const faction = factionById.get(territory.controlling_faction_id);
    if (territory.status === 'contested' || ['high', 'critical'].includes(sanitizeText(territory.threat_level, 20))) {
      intelCandidates.push({
        title: `${territory.status === 'contested' ? 'HOT SECTOR' : 'THREAT WATCH'}: ${territory.name}`,
        content: `${territory.name} in sector ${territory.sector} is currently ${territory.status || 'unstable'} with ${territory.threat_level || 'moderate'} threat conditions. ${faction?.name || 'Unclaimed operators'} remain the nearest controlling force in the area.`,
        category: 'tactical_advisory',
        severity: intelSeverityFromThreat(territory.threat_level),
        source: 'Territorial Threat Matrix',
        related_faction_id: faction?.id || '',
        related_territory_id: territory.id,
        is_active: true,
        expires_at: new Date(now.getTime() + 12 * 3600000).toISOString(),
        score: territory.status === 'contested' ? 90 : territory.threat_level === 'critical' ? 85 : 72,
        source_refs: [
          buildSourceRef('territory', territory.id),
          buildSourceRef('faction', faction?.id),
        ],
      });

      eventCandidates.push({
        title: `${territory.status === 'contested' ? 'CONTACT' : 'PRESSURE'}: ${territory.name}`,
        content: `${territory.name} is trending ${territory.status === 'contested' ? 'toward open conflict' : 'toward a wider incident'}. Field observers mark the zone as ${territory.threat_level || 'moderate'} risk and not improving.`,
        type: territory.status === 'contested' ? 'faction_conflict' : 'system_alert',
        severity: eventSeverityFromThreat(territory.threat_level),
        territory_id: territory.id,
        faction_id: faction?.id || '',
        is_active: true,
        score: territory.status === 'contested' ? 90 : territory.threat_level === 'critical' ? 84 : 68,
        source_refs: [
          buildSourceRef('territory', territory.id),
          buildSourceRef('faction', faction?.id),
        ],
      });
    }
  }

  for (const job of jobs.filter((entry) => entry.status === 'available' || entry.status === 'in_progress')) {
    const territory = territoryById.get(job.territory_id);
    const faction = factionById.get(job.faction_id);
    intelCandidates.push({
      title: `MISSION BRIEF: ${territory?.name || job.title}`,
      content: `${job.title} remains ${job.status === 'in_progress' ? 'active' : 'available'} with ${job.difficulty || 'routine'} difficulty. ${excerpt(job.reward_description, 'Command has posted concrete compensation for the work.')} ${territory?.name ? `The task is tied to ${territory.name}.` : ''}`,
      category: 'mission_brief',
      severity: difficultyToSeverity(job.difficulty),
      source: 'Operations Board',
      related_faction_id: faction?.id || '',
      related_territory_id: territory?.id || '',
      is_active: true,
      expires_at: job.expires_at || new Date(now.getTime() + 18 * 3600000).toISOString(),
      score: job.status === 'in_progress' ? 82 : 75,
      source_refs: [
        buildSourceRef('job', job.id),
        buildSourceRef('territory', territory?.id),
        buildSourceRef('faction', faction?.id),
      ],
    });
  }

  for (const record of diplomacy.filter((entry) => ['hostile', 'war'].includes(sanitizeText(entry.status, 20)))) {
    const factionA = factionById.get(record.faction_a_id);
    const factionB = factionById.get(record.faction_b_id);
    intelCandidates.push({
      title: `SIGNAL TRAFFIC: ${factionA?.tag || 'UNK'}/${factionB?.tag || 'UNK'}`,
      content: `${factionA?.name || 'Unknown'} and ${factionB?.name || 'Unknown'} remain in ${record.status}. Field pressure between the two factions is still elevated and likely to affect nearby contracts and routes.`,
      category: 'world_event',
      severity: record.status === 'war' ? 'critical' : 'high',
      source: 'SIGINT Relay',
      related_faction_id: factionA?.id || '',
      related_territory_id: '',
      is_active: true,
      expires_at: new Date(now.getTime() + 16 * 3600000).toISOString(),
      score: record.status === 'war' ? 88 : 74,
      source_refs: [
        buildSourceRef('diplomacy', record.id),
        buildSourceRef('faction', factionA?.id),
        buildSourceRef('faction', factionB?.id),
      ],
    });

    eventCandidates.push({
      title: `RELATIONS ${record.status === 'war' ? 'BROKEN' : 'STRAINED'}: ${factionA?.name || 'Unknown'} / ${factionB?.name || 'Unknown'}`,
      content: `${factionA?.name || 'Unknown'} and ${factionB?.name || 'Unknown'} remain locked in ${record.status}. Operational planners are treating the corridor between them as unstable.`,
      type: 'faction_conflict',
      severity: record.status === 'war' ? 'critical' : 'warning',
      territory_id: '',
      faction_id: factionA?.id || '',
      is_active: true,
      score: record.status === 'war' ? 86 : 70,
      source_refs: [
        buildSourceRef('diplomacy', record.id),
        buildSourceRef('faction', factionA?.id),
        buildSourceRef('faction', factionB?.id),
      ],
    });
  }

  for (const economy of economies) {
    const faction = factionById.get(economy.faction_id);
    const shortages = Object.entries(economy.resource_production || {})
      .filter(([, value]) => Number(value || 0) < 3)
      .map(([resource]) => resource);
    if (!faction) continue;
    if (economy.trade_embargo || shortages.length > 0 || Number(economy.wealth || 0) < 700) {
      const scarceMention = scarceResources.find((resource) => shortages.includes(resource)) || shortages[0] || scarceResources[0] || 'supply';
      intelCandidates.push({
        title: `SUPPLY STRAIN: ${faction.name}`,
        content: `${faction.name} is carrying ${economy.trade_embargo ? 'an active trade embargo' : 'visible logistics strain'}. Current indicators point to pressure around ${scarceMention} and reduced tolerance for disruption.`,
        category: 'faction_intel',
        severity: economy.trade_embargo ? 'critical' : shortages.length > 1 ? 'high' : 'medium',
        source: 'Economic Recon Grid',
        related_faction_id: faction.id,
        related_territory_id: '',
        is_active: true,
        expires_at: new Date(now.getTime() + 20 * 3600000).toISOString(),
        score: economy.trade_embargo ? 84 : shortages.length > 1 ? 72 : 60,
        source_refs: [
          buildSourceRef('faction', faction.id),
          buildSourceRef('economy', economy.id),
          ...shortages.slice(0, 2).map((resource) => `resource:${resource}`),
        ],
      });
    }
  }

  for (const profile of charProfiles.filter((entry) => sanitizeText(entry.character_name, 80) || sanitizeText(entry.faction_loyalty, 80))) {
    const relevantFaction = factions.find((faction) =>
      sanitizeText(profile.faction_loyalty, 120).toLowerCase().includes(sanitizeText(faction.name, 80).toLowerCase())
    );
    const relatedTerritory = relevantFaction
      ? territories.find((territory) => territory.controlling_faction_id === relevantFaction.id)
      : null;
    if (!relevantFaction || !relatedTerritory) {
      continue;
    }

    intelCandidates.push({
      title: `PROFILE FLAG: ${sanitizeText(profile.character_name || 'Operative', 40)}`,
      content: `Profile crosscheck shows ${sanitizeText(profile.character_name || 'an operative', 60)} maintains declared loyalty to ${relevantFaction.name}. Activity around ${relatedTerritory.name} is likely to intersect with that allegiance and should be monitored.`,
      category: 'rumor',
      severity: 'medium',
      source: 'Operative Registry Crosscheck',
      related_faction_id: relevantFaction.id,
      related_territory_id: relatedTerritory.id,
      is_active: true,
      expires_at: new Date(now.getTime() + 10 * 3600000).toISOString(),
      score: 52,
      source_refs: [
        buildSourceRef('character_profile', profile.id),
        buildSourceRef('faction', relevantFaction.id),
        buildSourceRef('territory', relatedTerritory.id),
      ],
    });
  }

  return {
    intel: sortByPriority(intelCandidates, cycleKey, 'intel'),
    events: sortByPriority(eventCandidates, cycleKey, 'event'),
  };
}

function sortByPriority(items: any[], cycleKey: string, lane: string) {
  const sorted = [...items].sort((left, right) => right.score - left.score);
  return sortDeterministic(sorted, (item) => `${item.title}:${item.score}`, cycleKey, lane);
}
