import { sortDeterministic } from './deterministic.ts';
import { DATA_ORIGINS, buildSourceRef, getRuleVersion, withProvenance } from './provenance.ts';

export const VALID_TYPES = ['recon', 'extraction', 'sabotage', 'escort', 'scavenge', 'elimination'];
export const VALID_DIFFICULTIES = ['routine', 'hazardous', 'critical', 'suicide'];
export const GENERATED_MARKER = '[GENERATED]';

const THREAT_SCORE: Record<string, number> = {
  minimal: 5,
  low: 10,
  moderate: 18,
  high: 28,
  critical: 40,
};

const STATUS_SCORE: Record<string, number> = {
  secured: 4,
  uncharted: 9,
  contested: 18,
  hostile: 24,
};

const REWARD_TABLE: Record<string, { rep: [number, number]; credits: [number, number] }> = {
  routine: { rep: [5, 12], credits: [50, 110] },
  hazardous: { rep: [15, 26], credits: [110, 240] },
  critical: { rep: [30, 48], credits: [240, 480] },
  suicide: { rep: [55, 90], credits: [500, 900] },
};

type MissionContext = {
  factions: any[];
  territories: any[];
  jobs: any[];
  economies: any[];
  diplomacy: any[];
  events: any[];
  commodities: any[];
  scavengeRuns: any[];
  reputations: any[];
};

type MissionDraft = {
  signature: string;
  title: string;
  briefing: string;
  objective: string;
  type: string;
  difficulty: string;
  reward_reputation: number;
  reward_credits: number;
  reward_description: string;
  expires_in_hours: number;
  faction_id: string;
  territory_id: string;
  faction_name: string;
  territory_name: string;
  world_context: string;
  source_refs: string[];
};

export function normalizeString(value: unknown, maxLength = 255) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

export function normalizeEmail(value: unknown) {
  return normalizeString(value, 320).toLowerCase();
}

export function isGeneratedMission(job: any) {
  return typeof job?.description === 'string' && job.description.includes(GENERATED_MARKER);
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unexpected error';
}

const mapDifficulty = (score: number) => {
  if (score >= 68) return 'suicide';
  if (score >= 48) return 'critical';
  if (score >= 28) return 'hazardous';
  return 'routine';
};

const clampReward = (value: number, difficulty: string, lane: 'rep' | 'credits') => {
  const [min, max] = REWARD_TABLE[difficulty]?.[lane] || REWARD_TABLE.routine[lane];
  return Math.min(max, Math.max(min, Math.round(value)));
};

const getHostileCount = (diplomacy: any[], factionId: string) => diplomacy.filter((record) =>
  (record.faction_a_id === factionId || record.faction_b_id === factionId)
  && (record.status === 'hostile' || record.status === 'war')
).length;

const getEconomyPressure = (economy: any) => {
  if (!economy) {
    return 10;
  }

  const production = economy.resource_production || {};
  const shortages = ['fuel', 'food', 'munitions', 'tech', 'metals']
    .filter((resource) => Number(production[resource] || 0) < (resource === 'munitions' || resource === 'tech' ? 3 : 5))
    .length;

  return shortages * 6 + (economy.trade_embargo ? 10 : 0) + ((Number(economy.wealth || 0) < 600) ? 8 : 0);
};

const getCandidateType = (
  territory: any,
  scarceResources: string[],
  hostileCount: number,
  preferredType: string,
) => {
  if (preferredType && VALID_TYPES.includes(preferredType)) {
    return preferredType;
  }

  const resources = Array.isArray(territory.resources) ? territory.resources : [];
  const scarceHit = resources.find((resource) => scarceResources.includes(resource));
  if (territory.status === 'hostile' || territory.status === 'contested') {
    return hostileCount > 0 ? 'sabotage' : 'recon';
  }
  if (!territory.controlling_faction_id || territory.status === 'uncharted') {
    return scarceHit ? 'extraction' : 'recon';
  }
  if (scarceHit) {
    return territory.threat_level === 'critical' || territory.threat_level === 'high' ? 'extraction' : 'scavenge';
  }
  return hostileCount > 0 ? 'escort' : 'recon';
};

const buildMissionTitle = (draft: MissionDraft) => {
  const territory = draft.territory_name || 'Unknown Sector';
  const faction = draft.faction_name || 'Field Command';
  switch (draft.type) {
    case 'recon':
      return `Survey ${territory}`;
    case 'extraction':
      return `Extract Cache at ${territory}`;
    case 'sabotage':
      return `Sabotage ${faction} Stores`;
    case 'escort':
      return `Escort Route to ${territory}`;
    case 'scavenge':
      return `Recover Supplies from ${territory}`;
    case 'elimination':
      return `Neutralize Threat at ${territory}`;
    default:
      return `Field Task at ${territory}`;
  }
};

const buildMissionBriefing = (
  territory: any,
  faction: any,
  difficulty: string,
  type: string,
  scarceResources: string[],
  hostileCount: number,
) => {
  const resourceList = (Array.isArray(territory.resources) ? territory.resources : [])
    .filter((resource) => scarceResources.includes(resource))
    .slice(0, 2);
  const scarcityText = resourceList.length > 0
    ? `${resourceList.join(' and ')} are running scarce across the board.`
    : 'Local pressure is building around the sector.';
  const factionText = faction?.name
    ? `${faction.name} is tied to the zone and will read any move there as deliberate.`
    : 'No single faction has clean control of the ground.';
  const pressureText = hostileCount > 0
    ? 'Hostile relations around this position are active, which raises the chance of contact.'
    : 'The sector is unstable enough to reward fast action, but not forgiving enough for sloppy work.';

  return `${territory.name} is flagged as a ${difficulty} ${type} operation. ${scarcityText} ${factionText} ${pressureText}`;
};

const buildMissionObjective = (type: string, territory: any, faction: any, scarceResources: string[]) => {
  const territoryName = territory?.name || 'the target zone';
  const resource = (Array.isArray(territory?.resources) ? territory.resources : [])
    .find((entry: string) => scarceResources.includes(entry));
  switch (type) {
    case 'recon':
      return `Enter ${territoryName}, map the current threat picture, and exfiltrate with verified movement data.`;
    case 'extraction':
      return `Secure ${resource || 'priority materiel'} inside ${territoryName} and extract it before local control hardens.`;
    case 'sabotage':
      return `Disrupt ${faction?.name || 'hostile'} logistics in ${territoryName} without getting pinned in place.`;
    case 'escort':
      return `Keep the corridor through ${territoryName} open long enough for allied assets to pass intact.`;
    case 'scavenge':
      return `Recover usable salvage from ${territoryName} and return before the sector turns against you.`;
    case 'elimination':
      return `Break the active threat node operating in ${territoryName} and confirm the sector is no longer escalating.`;
    default:
      return `Move on ${territoryName}, secure the objective, and get back alive.`;
  }
};

const buildRewardDescription = (type: string, faction: any, territory: any, scarceResources: string[]) => {
  const resource = (Array.isArray(territory?.resources) ? territory.resources : [])
    .find((entry: string) => scarceResources.includes(entry))
    || (Array.isArray(territory?.resources) ? territory.resources[0] : '');
  const issuer = faction?.name || 'field command';
  if (resource) {
    return `${issuer} will prioritize payment in credits and access tied to ${resource}.`;
  }

  if (type === 'recon') {
    return `${issuer} will pay for verified route intelligence and clean sector reporting.`;
  }

  return `${issuer} will pay for timely completion and actionable field results.`;
};

export function buildMissionCandidates(
  context: MissionContext,
  {
    actorKey,
    preferredType = '',
    excludeSignatures = new Set<string>(),
  }: {
    actorKey: string;
    preferredType?: string;
    excludeSignatures?: Set<string>;
  },
) {
  const factionById = new Map(context.factions.map((faction) => [faction.id, faction]));
  const economyByFactionId = new Map(context.economies.map((economy) => [economy.faction_id, economy]));
  const activeJobs = context.jobs.filter((job) => job.status === 'available' || job.status === 'in_progress');
  const typeCounts = Object.fromEntries(VALID_TYPES.map((type) => [type, 0]));
  for (const job of activeJobs) {
    if (VALID_TYPES.includes(job.type)) {
      typeCounts[job.type] += 1;
    }
  }

  const scarceResources = context.commodities
    .filter((commodity) => commodity.availability === 'scarce' || commodity.availability === 'low')
    .map((commodity) => normalizeString(commodity.resource_type, 60))
    .filter(Boolean);
  const recentScavengeTerritories = new Set(
    context.scavengeRuns
      .map((run) => normalizeString(run.territory_id, 120))
      .filter(Boolean),
  );

  const candidates: Array<MissionDraft & { score: number }> = [];
  for (const territory of context.territories) {
    const faction = factionById.get(territory.controlling_faction_id) || null;
    const economy = faction ? economyByFactionId.get(faction.id) : null;
    const hostileCount = faction ? getHostileCount(context.diplomacy, faction.id) : 0;
    const type = getCandidateType(territory, scarceResources, hostileCount, preferredType);
    const threatScore = THREAT_SCORE[territory.threat_level] || 10;
    const statusScore = STATUS_SCORE[territory.status] || 6;
    const economyPressure = getEconomyPressure(economy);
    const scarcityHits = (Array.isArray(territory.resources) ? territory.resources : [])
      .filter((resource) => scarceResources.includes(resource)).length;
    const recentActivity = recentScavengeTerritories.has(territory.id) ? 4 : 0;
    const difficulty = mapDifficulty(threatScore + statusScore + economyPressure + (hostileCount * 8));
    const underRepresentationBonus = Math.max(0, 5 - (typeCounts[type] || 0)) * 4;
    const preferredBonus = preferredType && preferredType === type ? 12 : 0;
    const signature = `${type}:${territory.id}:${faction?.id || 'unclaimed'}`;
    if (excludeSignatures.has(signature)) {
      continue;
    }

    const baseRep = REWARD_TABLE[difficulty].rep[0] + (scarcityHits * 4) + (hostileCount * 2);
    const baseCredits = REWARD_TABLE[difficulty].credits[0] + (scarcityHits * 45) + (recentActivity * 10);
    const draft: MissionDraft & { score: number } = {
      signature,
      title: '',
      briefing: '',
      objective: '',
      type,
      difficulty,
      reward_reputation: clampReward(baseRep, difficulty, 'rep'),
      reward_credits: clampReward(baseCredits, difficulty, 'credits'),
      reward_description: '',
      expires_in_hours: difficulty === 'suicide' ? 72 : difficulty === 'critical' ? 48 : difficulty === 'hazardous' ? 30 : 18,
      faction_id: faction?.id || '',
      territory_id: territory.id,
      faction_name: faction?.name || '',
      territory_name: territory.name,
      world_context: '',
      source_refs: [
        buildSourceRef('territory', territory.id),
        faction?.id ? buildSourceRef('faction', faction.id) : '',
        ...scarceResources
          .filter((resource) => (territory.resources || []).includes(resource))
          .slice(0, 2)
          .map((resource) => `resource:${resource}`),
      ].filter(Boolean),
      score: threatScore + statusScore + economyPressure + underRepresentationBonus + preferredBonus + (scarcityHits * 10),
    };

    draft.title = buildMissionTitle(draft);
    draft.briefing = buildMissionBriefing(territory, faction, difficulty, type, scarceResources, hostileCount);
    draft.objective = buildMissionObjective(type, territory, faction, scarceResources);
    draft.reward_description = buildRewardDescription(type, faction, territory, scarceResources);
    draft.world_context = `${territory.name} is ${territory.status || 'unstable'} with threat level ${territory.threat_level || 'moderate'}.`;
    candidates.push(draft);
  }

  const sortedByScore = [...candidates].sort((left, right) => right.score - left.score);
  return sortDeterministic(sortedByScore, (candidate) => `${candidate.signature}:${candidate.score}`, actorKey);
}

export function selectMissionDraft(
  context: MissionContext,
  {
    actorKey,
    preferredType = '',
    excludeSignatures = new Set<string>(),
  }: {
    actorKey: string;
    preferredType?: string;
    excludeSignatures?: Set<string>;
  },
) {
  const candidates = buildMissionCandidates(context, { actorKey, preferredType, excludeSignatures });
  return candidates[0] || null;
}

export function selectMissionBatch(
  context: MissionContext,
  {
    actorKey,
    count,
  }: {
    actorKey: string;
    count: number;
  },
) {
  const drafts: MissionDraft[] = [];
  const usedTypes = new Set<string>();
  const usedSignatures = new Set<string>();
  const queue = buildMissionCandidates(context, { actorKey });

  for (const candidate of queue) {
    if (drafts.length >= count) {
      break;
    }
    if (usedSignatures.has(candidate.signature)) {
      continue;
    }
    if (usedTypes.has(candidate.type) && queue.length > count + 2) {
      continue;
    }

    usedSignatures.add(candidate.signature);
    usedTypes.add(candidate.type);
    drafts.push(candidate);
  }

  return drafts.slice(0, count);
}

export function buildMissionRecordPayload(
  draft: MissionDraft,
  {
    status,
    assignedTo = '',
    acceptedAt = '',
    maxSlots = 1,
  }: {
    status: string;
    assignedTo?: string;
    acceptedAt?: string;
    maxSlots?: number;
  },
) {
  const now = new Date().toISOString();
  const descriptionParts = [
    draft.briefing,
    `**OBJECTIVE:** ${draft.objective}`,
    `_${draft.world_context}_`,
    GENERATED_MARKER,
  ];

  return withProvenance({
    title: draft.title,
    description: descriptionParts.join('\n\n'),
    type: draft.type,
    difficulty: draft.difficulty,
    status,
    assigned_to: assignedTo,
    accepted_at: acceptedAt,
    created_at: now,
    faction_id: draft.faction_id,
    territory_id: draft.territory_id,
    reward_reputation: draft.reward_reputation,
    reward_credits: draft.reward_credits,
    reward_description: draft.reward_description,
    expires_at: new Date(Date.now() + (draft.expires_in_hours * 3600000)).toISOString(),
    max_slots: maxSlots,
    generation_meta: {
      generator: 'truth-engine',
      version: getRuleVersion(),
      params: {
        signature: draft.signature,
      },
    },
  }, {
    dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
    sourceRefs: draft.source_refs,
  });
}

export function buildMissionResponse(draft: MissionDraft, job: any) {
  return {
    id: job.id,
    title: job.title,
    briefing: draft.briefing,
    objective: draft.objective,
    type: draft.type,
    difficulty: draft.difficulty,
    reward_reputation: draft.reward_reputation,
    reward_credits: draft.reward_credits,
    reward_description: draft.reward_description,
    faction_name: draft.faction_name,
    territory_name: draft.territory_name,
    world_context: draft.world_context,
    expires_at: job.expires_at,
  };
}

export function buildMissionCompletionNarrative(job: any) {
  const territory = normalizeString(job?.territory_name || job?.territory_id, 80) || 'the target zone';
  switch (job?.type) {
    case 'recon':
      return `Recon assets returned from ${territory} with usable route and contact data. The objective was completed without losing the initiative.`;
    case 'extraction':
      return `The extraction window at ${territory} held just long enough to pull the target cache intact. Command logged the run as a clean recovery.`;
    case 'sabotage':
      return `Sabotage actions inside ${territory} landed on target and disrupted local control. The sector will feel the damage before the smoke clears.`;
    case 'escort':
      return `The convoy corridor through ${territory} stayed open long enough to move the payload safely. The line held because the operative did.`;
    case 'scavenge':
      return `Recovery teams came back from ${territory} with material value and a route worth keeping. The ground is leaner, but still worth another look.`;
    case 'elimination':
      return `The hostile node in ${territory} was broken and the sector pressure dropped. Command marked the threat as neutralized for now.`;
    default:
      return 'Mission completed successfully. Operative returned to base.';
  }
}
