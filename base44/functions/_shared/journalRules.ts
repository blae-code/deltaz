import { deterministicBoolean, deterministicNumber, sortDeterministic } from './deterministic.ts';
import { DATA_ORIGINS, buildSourceRef, withProvenance } from './provenance.ts';

const VALID_CATEGORIES = ['encounter', 'discovery', 'dilemma', 'crisis', 'opportunity'];
const THREAT_LEVELS = ['minimal', 'low', 'moderate', 'high', 'critical'];

const sanitizeText = (value: unknown, maxLength = 240) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
};

const clampNumber = (value: unknown, min: number, max: number, fallback: number) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, numeric));
};

const sanitizeCategory = (value: unknown) => {
  const category = sanitizeText(value, 20);
  return VALID_CATEGORIES.includes(category) ? category : 'encounter';
};

const sanitizeTag = (value: unknown) => sanitizeText(String(value || '').toLowerCase().replace(/[^a-z0-9_ -]+/g, '').replace(/\s+/g, '_'), 48);

export function buildFallbackChoices({ relatedFactionId, territoryName }: { relatedFactionId: string; territoryName: string }) {
  return [
    {
      id: 'steady_hand',
      label: 'Keep a steady hand',
      effect_description: `Contain the fallout quietly around ${territoryName}.`,
      reputation_delta: 6,
      outcome_narrative: 'The situation stabilizes, but people notice who kept control.',
      related_faction_id: relatedFactionId,
      world_effects: [{ type: 'intel_report', title: `Echo from ${territoryName}`, severity: 'medium' }],
      consequence_tags: ['steady_hand', sanitizeTag(territoryName)],
    },
    {
      id: 'cut_ties',
      label: 'Cut ties and move',
      effect_description: 'Break contact, protect yourself, and accept the political cost.',
      reputation_delta: -5,
      outcome_narrative: 'You preserve your position at the expense of trust.',
      related_faction_id: relatedFactionId,
      world_effects: [{ type: 'broadcast', title: 'Trail Burned', severity: 'high' }],
      consequence_tags: ['cut_ties', sanitizeTag(territoryName)],
    },
    {
      id: 'force_issue',
      label: 'Force the issue',
      effect_description: 'Escalate publicly and force every nearby actor to react.',
      reputation_delta: 3,
      outcome_narrative: 'The choice creates momentum immediately, but it also expands the blast radius.',
      related_faction_id: relatedFactionId,
      world_effects: [{ type: 'territory_shift', title: `Pressure on ${territoryName}`, severity: 'high' }],
      consequence_tags: ['force_issue', sanitizeTag(territoryName)],
    },
  ];
}

export function normalizeJournalChoices(choices: any[], fallbackChoices: any[]) {
  const input = Array.isArray(choices) ? choices : [];
  const normalized = [];
  const usedIds = new Set();

  for (let index = 0; index < 3; index += 1) {
    const source = input[index] || fallbackChoices[index] || fallbackChoices[0];
    const fallback = fallbackChoices[index] || fallbackChoices[0];
    let id = sanitizeText(source?.id, 60) || sanitizeText(fallback?.id, 60) || `choice_${index + 1}`;
    if (usedIds.has(id)) {
      id = `${id}_${index + 1}`;
    }
    usedIds.add(id);

    normalized.push({
      id,
      label: sanitizeText(source?.label, 120) || sanitizeText(fallback?.label, 120) || `Choice ${index + 1}`,
      effect_description: sanitizeText(source?.effect_description, 220) || sanitizeText(fallback?.effect_description, 220),
      reputation_delta: clampNumber(source?.reputation_delta, -15, 20, clampNumber(fallback?.reputation_delta, -15, 20, 0)),
      outcome_narrative: sanitizeText(source?.outcome_narrative, 500) || sanitizeText(fallback?.outcome_narrative, 500),
      world_effects: Array.isArray(source?.world_effects) ? source.world_effects : fallback?.world_effects || [],
      consequence_tags: normalizeStringArray(source?.consequence_tags || fallback?.consequence_tags, 48, 5),
      followup_key: sanitizeText(source?.followup_key || fallback?.followup_key, 80),
    });
  }

  return normalized;
}

export function sanitizePendingChoiceMap(value: any) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const normalized: Record<string, any[]> = {};
  for (const [entryId, choices] of Object.entries(value)) {
    const cleanEntryId = sanitizeText(entryId, 80);
    if (!cleanEntryId) continue;
    normalized[cleanEntryId] = normalizeJournalChoices(Array.isArray(choices) ? choices : [], buildFallbackChoices({
      relatedFactionId: '',
      territoryName: 'the wastes',
    }));
  }
  return normalized;
}

export function buildJournalEventDraft({
  user,
  charProfile,
  factions,
  territories,
  recentTitles,
  consequenceTags,
  activeMissions,
  contestedTerritories,
}: {
  user: any;
  charProfile: any;
  factions: any[];
  territories: any[];
  recentTitles: string[];
  consequenceTags: string[];
  activeMissions: any[];
  contestedTerritories: any[];
}) {
  const operative = sanitizeText(user?.callsign, 80) || sanitizeText(charProfile?.character_name, 80) || 'Unknown';
  const territoryPool = contestedTerritories.length > 0 ? contestedTerritories : territories;
  const territory = sortDeterministic(territoryPool, (entry) => entry.id, operative, consequenceTags.join(','), 'journal_territory')[0] || territories[0] || null;
  const faction = factions.find((entry) => entry.id === territory?.controlling_faction_id) || factions[0] || null;
  const mission = activeMissions[0] || null;
  const recentSet = new Set(recentTitles);

  const templates = [
    {
      key: 'signal_echo',
      title: `Static Over ${territory?.name || 'the wastes'}`,
      narrative: `${operative} intercepts a fractured signal tied to ${territory?.name || 'the wastes'}. The fragments line up with old traffic patterns and hint that someone nearby still knows how to weaponize history.`,
      category: 'dilemma',
      related_faction_id: faction?.id || '',
      related_territory_id: territory?.id || '',
      choices: buildFallbackChoices({
        relatedFactionId: faction?.id || '',
        territoryName: sanitizeText(territory?.name, 80) || 'the wastes',
      }),
    },
    {
      key: 'mission_spillover',
      title: `Aftermath at ${territory?.name || 'the perimeter'}`,
      narrative: `${operative} uncovers signs that a recent contract${mission ? ` tied to "${sanitizeText(mission.title, 120)}"` : ''} left more behind than the board admitted. The evidence points toward a decision that could either quiet the matter or widen it.`,
      category: 'encounter',
      related_faction_id: faction?.id || '',
      related_territory_id: territory?.id || '',
      choices: normalizeJournalChoices([
        {
          id: 'quiet_recovery',
          label: 'Recover the evidence quietly',
          effect_description: 'Secure the trail before local actors notice.',
          reputation_delta: 8,
          outcome_narrative: 'You pocket the leverage and keep the noise contained.',
          world_effects: [{ type: 'intel_report', title: `Recovered trail near ${territory?.name || 'the sector'}`, severity: 'medium' }],
          consequence_tags: ['quiet_recovery', sanitizeTag(territory?.name)],
          followup_key: 'debrief',
        },
        {
          id: 'deliver_to_faction',
          label: 'Deliver it to faction handlers',
          effect_description: 'Hand the evidence to the local power broker and take the political hit or gain.',
          reputation_delta: 5,
          outcome_narrative: 'The handoff buys favor, but not silence.',
          world_effects: [{ type: 'broadcast', title: `Handlers move in at ${territory?.name || 'the sector'}`, severity: 'high' }],
          consequence_tags: ['deliver_to_faction', sanitizeTag(faction?.name)],
        },
        {
          id: 'torch_it',
          label: 'Torch the evidence',
          effect_description: 'Erase the trail and deny everyone a clean answer.',
          reputation_delta: -4,
          outcome_narrative: 'Nothing clean remains, including your standing.',
          world_effects: [{ type: 'territory_shift', title: `Smoke over ${territory?.name || 'the sector'}`, severity: 'high' }],
          consequence_tags: ['torch_it', sanitizeTag(territory?.name)],
        },
      ], buildFallbackChoices({
        relatedFactionId: faction?.id || '',
        territoryName: sanitizeText(territory?.name, 80) || 'the wastes',
      })),
    },
  ];

  const candidate = sortDeterministic(
    templates.filter((template) => !recentSet.has(sanitizeText(template.title, 140))),
    (template) => template.key,
    operative,
    consequenceTags.join(','),
  )[0] || templates[0];

  return candidate;
}

export function buildJournalEntryPayload(playerEmail: string, draft: any) {
  return withProvenance({
    player_email: playerEmail,
    title: sanitizeText(draft.title, 140) || 'Static on the line',
    narrative: sanitizeText(draft.narrative, 2400) || 'Something in the wasteland shifts and demands your attention.',
    category: sanitizeCategory(draft.category),
    status: 'pending',
    choices: normalizeJournalChoices(draft.choices, buildFallbackChoices({
      relatedFactionId: sanitizeText(draft.related_faction_id, 80),
      territoryName: sanitizeText(draft.territory_name, 80) || 'the wastes',
    })).map((choice) => ({
      id: choice.id,
      label: choice.label,
      effect_description: choice.effect_description,
    })),
    related_faction_id: sanitizeText(draft.related_faction_id, 80),
    related_territory_id: sanitizeText(draft.related_territory_id, 80),
    event_key: sanitizeText(draft.key, 80),
    chain_depth: clampNumber(draft.chain_depth, 0, 3, 0),
    consequence_tags: normalizeStringArray(draft.consequence_tags, 48, 10),
  }, {
    dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
    sourceRefs: [
      buildSourceRef('player', playerEmail),
      buildSourceRef('faction', draft.related_faction_id),
      buildSourceRef('territory', draft.related_territory_id),
      sanitizeText(draft.key, 80) ? `journal:${sanitizeText(draft.key, 80)}` : '',
    ],
  });
}

export function resolveJournalOutcome({
  entry,
  selectedChoice,
  relatedTerritory,
}: {
  entry: any;
  selectedChoice: any;
  relatedTerritory: any;
}) {
  const territoryName = sanitizeText(relatedTerritory?.name, 80) || 'the wastes';
  const baseOutcome = sanitizeText(selectedChoice?.outcome_narrative, 1800)
    || `The decision leaves a mark on ${territoryName}, and the fallout starts moving immediately.`;
  const worldEffects = Array.isArray(selectedChoice?.world_effects) ? selectedChoice.world_effects : [];
  const consequenceTags = normalizeStringArray([
    ...(Array.isArray(entry?.consequence_tags) ? entry.consequence_tags : []),
    ...(Array.isArray(selectedChoice?.consequence_tags) ? selectedChoice.consequence_tags : []),
    sanitizeTag(selectedChoice?.id),
    sanitizeTag(territoryName),
  ], 48, 10);

  const followupKey = sanitizeText(selectedChoice?.followup_key, 80);
  const hasFollowup = Boolean(followupKey);
  return {
    outcome: baseOutcome,
    world_effects: worldEffects.map((effect: any) => ({
      type: sanitizeText(effect?.type, 40),
      title: sanitizeText(effect?.title, 140),
      content: effect?.content ? sanitizeText(effect.content, 1200) : `${baseOutcome} ${territoryName} picks up the consequence quickly.`,
      severity: sanitizeText(effect?.severity, 20) || 'medium',
    })),
    consequence_tags: consequenceTags,
    has_followup: hasFollowup,
    followup_key: followupKey,
  };
}

export function applyThreatShift(currentThreat: string, severity: string, lowerThreat = false) {
  const currentIndex = Math.max(0, THREAT_LEVELS.indexOf(sanitizeText(currentThreat, 20) || 'moderate'));
  const shift = sanitizeText(severity, 20) === 'critical' ? 2 : 1;
  const nextIndex = lowerThreat
    ? Math.max(0, currentIndex - shift)
    : Math.min(THREAT_LEVELS.length - 1, currentIndex + shift);
  return THREAT_LEVELS[nextIndex];
}

export function normalizeStringArray(value: any, maxLength = 48, maxItems = 20) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(
    value
      .map((item) => sanitizeText(item, maxLength))
      .filter(Boolean),
  )).slice(0, maxItems);
}
