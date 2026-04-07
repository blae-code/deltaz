import { rotateDeterministic } from './deterministic.ts';
import { DATA_ORIGINS, buildSourceRef, withProvenance } from './provenance.ts';

const VALID_CATEGORIES = ['encounter', 'discovery', 'dilemma', 'crisis', 'opportunity'];
const THREAT_LEVELS = ['minimal', 'low', 'moderate', 'high', 'critical'];

const sanitizeText = (value: unknown, maxLength = 200) => {
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

  return Math.min(max, Math.max(min, Math.round(numeric)));
};

const normalizeStringArray = (value: unknown, maxLength = 60, maxItems = 20) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(
    value
      .map((item) => sanitizeText(item, maxLength))
      .filter(Boolean),
  )).slice(0, maxItems);
};

export const buildFallbackChoices = ({ relatedFactionId, territoryName }: { relatedFactionId: string; territoryName: string }) => [
  {
    id: 'quiet_channel',
    label: 'Work a quiet channel',
    effect_description: `Move carefully around ${territoryName} and keep the matter controlled.`,
    reputation_delta: 6,
    outcome_narrative: 'The move stays quiet, controlled, and useful.',
    effect_key: 'quiet_intel',
    related_faction_id: relatedFactionId,
  },
  {
    id: 'cut_loss',
    label: 'Cut the line and move',
    effect_description: 'Protect yourself and accept the political damage.',
    reputation_delta: -5,
    outcome_narrative: 'You keep your distance, but others notice who was left holding the risk.',
    effect_key: 'cut_loss',
    related_faction_id: relatedFactionId,
  },
  {
    id: 'force_public',
    label: 'Force it into the open',
    effect_description: 'Push the problem public and make everyone react.',
    reputation_delta: 3,
    outcome_narrative: 'The wasteland gets loud fast, and control becomes optional.',
    effect_key: 'public_broadcast',
    related_faction_id: relatedFactionId,
  },
];

export const normalizeJournalChoices = (choices: any[], fallbackChoices: any[]) => {
  const input = Array.isArray(choices) ? choices : [];
  const normalized = [];
  const usedIds = new Set<string>();

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
      effect_key: sanitizeText(source?.effect_key, 40) || sanitizeText(fallback?.effect_key, 40),
      followup_key: sanitizeText(source?.followup_key, 40),
    });
  }

  return normalized;
};

export const sanitizePendingChoiceMap = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const normalized: Record<string, any[]> = {};
  for (const [entryId, choices] of Object.entries(value)) {
    const cleanEntryId = sanitizeText(entryId, 80);
    if (!cleanEntryId) {
      continue;
    }

    normalized[cleanEntryId] = normalizeJournalChoices(Array.isArray(choices) ? choices : [], buildFallbackChoices({
      relatedFactionId: '',
      territoryName: 'the wastes',
    }));
  }

  return normalized;
};

const eventTemplates = [
  {
    key: 'relay_echo',
    category: 'dilemma',
    build: (context: any) => ({
      title: `Relay Echoes from ${context.relatedTerritory.name}`,
      narrative: `${context.callsign} intercepts a relay fragment tied to ${context.relatedTerritory.name}. The traffic names ${context.relatedFaction.name} logistics, but the signal is weak enough that one wrong move could burn the source.`,
      choices: [
        {
          id: 'relay_secure',
          label: 'Secure the relay quietly',
          effect_description: `Preserve the channel and file a silent report tied to ${context.relatedTerritory.name}.`,
          reputation_delta: 8,
          outcome_narrative: 'The channel survives, and the intel remains usable.',
          effect_key: 'quiet_intel',
          followup_key: 'after_relay',
        },
        {
          id: 'relay_burn',
          label: 'Burn the relay to deny it',
          effect_description: 'Kill the signal and deny everyone the lead.',
          reputation_delta: -4,
          outcome_narrative: 'The line goes dead, and so does the easy version of the truth.',
          effect_key: 'cut_loss',
        },
        {
          id: 'relay_broadcast',
          label: 'Broadcast the intercept',
          effect_description: 'Push the fragment into the open and force a response.',
          reputation_delta: 2,
          outcome_narrative: 'Every nearby operator hears the same bad news at the same time.',
          effect_key: 'public_broadcast',
          followup_key: 'after_broadcast',
        },
      ],
    }),
  },
  {
    key: 'border_contact',
    category: 'crisis',
    build: (context: any) => ({
      title: `Border Contact in ${context.relatedTerritory.name}`,
      narrative: `${context.callsign} receives a direct approach from operators moving through ${context.relatedTerritory.name}. Their signal traffic overlaps with ${context.relatedFaction.name}, which means every response now has diplomatic weight.`,
      choices: [
        {
          id: 'contact_parley',
          label: 'Parley and hold the line',
          effect_description: 'Keep the contact contained and reduce the chance of a wider clash.',
          reputation_delta: 7,
          outcome_narrative: 'You keep the ground from getting louder than it already is.',
          effect_key: 'territory_calm',
        },
        {
          id: 'contact_report',
          label: 'Report and reposition',
          effect_description: 'Step back and let command-grade intel shape the next move.',
          reputation_delta: 3,
          outcome_narrative: 'The report lands cleanly and gives command something they can act on.',
          effect_key: 'quiet_intel',
        },
        {
          id: 'contact_press',
          label: 'Press the contact aggressively',
          effect_description: 'Turn the encounter into pressure and accept the escalation.',
          reputation_delta: -2,
          outcome_narrative: 'The contact breaks, but the sector starts bracing for the next step.',
          effect_key: 'faction_alert',
          followup_key: 'after_clash',
        },
      ],
    }),
  },
  {
    key: 'personal_debt',
    category: 'encounter',
    build: (context: any) => ({
      title: 'Old Debt, New Static',
      narrative: `A familiar pattern surfaces in the dead channels, and ${context.callsign} recognizes it instantly. The message does not name a friend or enemy, only a debt the wasteland never finished collecting.`,
      choices: [
        {
          id: 'debt_answer',
          label: 'Answer the signal',
          effect_description: 'Treat the message as a real lead and work it carefully.',
          reputation_delta: 4,
          outcome_narrative: 'You answer the call and keep the thread alive long enough to learn from it.',
          effect_key: 'quiet_intel',
        },
        {
          id: 'debt_ignore',
          label: 'Ignore it and stay on mission',
          effect_description: 'Leave the ghost where it found you.',
          reputation_delta: 0,
          outcome_narrative: 'You keep moving, but the silence stays loud in the background.',
          effect_key: 'cut_loss',
        },
        {
          id: 'debt_weaponize',
          label: 'Weaponize the rumor',
          effect_description: 'Use the message to move other actors before they move you.',
          reputation_delta: -3,
          outcome_narrative: 'The rumor starts doing work the moment it leaves your hands.',
          effect_key: 'public_broadcast',
        },
      ],
    }),
  },
];

const buildContext = (context: any) => {
  const contestedTerritory = context.contestedTerritories?.[0] || context.territories?.[0] || null;
  const relatedTerritory = contestedTerritory || null;
  const relatedFaction = context.factions.find((faction: any) => faction.id === relatedTerritory?.controlling_faction_id)
    || context.factions[0]
    || null;

  return {
    ...context,
    relatedTerritory,
    relatedFaction,
    callsign: sanitizeText(context.user?.callsign, 80) || 'Operative',
  };
};

export const buildJournalEventDraft = (context: any) => {
  const scoped = buildContext(context);
  if (!scoped.relatedTerritory || !scoped.relatedFaction) {
    return null;
  }

  const rotatedTemplates = rotateDeterministic(eventTemplates, scoped.user?.email, scoped.recentTitles?.length || 0);
  const template = rotatedTemplates[0] || eventTemplates[0];
  const built = template.build(scoped);
  const choices = normalizeJournalChoices(built.choices, buildFallbackChoices({
    relatedFactionId: scoped.relatedFaction.id || '',
    territoryName: scoped.relatedTerritory.name || 'the wastes',
  }));

  return {
    event_key: template.key,
    title: sanitizeText(built.title, 140),
    narrative: sanitizeText(built.narrative, 2400),
    category: VALID_CATEGORIES.includes(built.category) ? built.category : 'encounter',
    related_faction_id: scoped.relatedFaction.id || '',
    related_territory_id: scoped.relatedTerritory.id || '',
    choices,
  };
};

export const buildJournalEntryPayload = (playerEmail: string, draft: any) => withProvenance({
  player_email: playerEmail,
  title: draft.title,
  narrative: draft.narrative,
  category: draft.category,
  status: 'pending',
  choices: draft.choices,
  related_faction_id: draft.related_faction_id,
  related_territory_id: draft.related_territory_id,
  chain_depth: 0,
  consequence_tags: [],
  event_key: draft.event_key,
}, {
  dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
  sourceRefs: [
    draft.related_faction_id ? buildSourceRef('faction', draft.related_faction_id) : '',
    draft.related_territory_id ? buildSourceRef('territory', draft.related_territory_id) : '',
    `journal_template:${draft.event_key}`,
  ],
});

const buildFollowupEvent = (followupKey: string, relatedTerritory: any, relatedFaction: any) => {
  const territoryName = sanitizeText(relatedTerritory?.name, 80) || 'the wastes';
  const factionName = sanitizeText(relatedFaction?.name, 80) || 'a nearby faction';
  const baseChoices = buildFallbackChoices({
    relatedFactionId: relatedFaction?.id || '',
    territoryName,
  });

  return {
    title: followupKey === 'after_broadcast' ? `Aftermath in ${territoryName}` : `Follow-up from ${territoryName}`,
    narrative: `${factionName} is still reacting to what happened in ${territoryName}, and the next move will decide whether the pressure settles or spreads.`,
    category: 'crisis',
    choices: baseChoices,
  };
};

export const resolveJournalOutcome = ({
  user,
  entry,
  selectedChoice,
  relatedFaction,
  relatedTerritory,
}: {
  user: any;
  entry: any;
  selectedChoice: any;
  relatedFaction: any;
  relatedTerritory: any;
}) => {
  const territoryName = sanitizeText(relatedTerritory?.name, 80) || 'the wastes';
  const factionName = sanitizeText(relatedFaction?.name, 80) || 'a nearby faction';
  const effectKey = sanitizeText(selectedChoice?.effect_key, 40) || 'quiet_intel';

  const worldEffectSpecs: any[] = [];
  if (effectKey === 'quiet_intel') {
    worldEffectSpecs.push({
      type: 'intel_report',
      title: `Echo from ${territoryName}`,
      content: `${sanitizeText(user?.callsign, 80) || 'An operative'} reports controlled movement around ${territoryName} tied to ${factionName}.`,
      severity: 'medium',
    });
  } else if (effectKey === 'public_broadcast') {
    worldEffectSpecs.push({
      type: 'broadcast',
      title: `Broadcast from ${territoryName}`,
      content: `${sanitizeText(user?.callsign, 80) || 'An operative'} pushed developments around ${territoryName} into the open, forcing ${factionName} to react.`,
      severity: 'high',
    });
  } else if (effectKey === 'territory_calm') {
    worldEffectSpecs.push({
      type: 'territory_shift',
      title: `Pressure eases in ${territoryName}`,
      content: `${sanitizeText(user?.callsign, 80) || 'An operative'} helped pull local pressure down around ${territoryName}.`,
      severity: 'low',
      delta: -1,
    });
  } else if (effectKey === 'faction_alert') {
    worldEffectSpecs.push({
      type: 'faction_alert',
      title: `Tension rises in ${territoryName}`,
      content: `${sanitizeText(user?.callsign, 80) || 'An operative'} triggered a sharper response around ${territoryName}.`,
      severity: 'high',
    });
  }

  return {
    outcome: sanitizeText(selectedChoice?.outcome_narrative, 1800)
      || `${sanitizeText(user?.callsign, 80) || 'The operative'} follows through and leaves a mark on ${territoryName}.`,
    world_effects: worldEffectSpecs,
    consequence_tags: normalizeStringArray([
      entry?.event_key,
      selectedChoice?.id,
      sanitizeText(relatedTerritory?.sector, 20).toLowerCase(),
    ], 48, 5),
    has_followup: Boolean(selectedChoice?.followup_key),
    followup_event: selectedChoice?.followup_key
      ? buildFollowupEvent(selectedChoice.followup_key, relatedTerritory, relatedFaction)
      : null,
  };
};

export const applyThreatShift = (currentThreat: string, delta: number) => {
  const index = Math.max(0, THREAT_LEVELS.indexOf(currentThreat || 'moderate'));
  return THREAT_LEVELS[Math.min(Math.max(index + delta, 0), THREAT_LEVELS.length - 1)];
};
