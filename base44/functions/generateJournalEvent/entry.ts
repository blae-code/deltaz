import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

const VALID_CATEGORIES = ['encounter', 'discovery', 'dilemma', 'crisis', 'opportunity'];

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await req.json().catch(() => ({}));

    const [factions, territories, charProfiles, recentJournal, pendingJournal, jobs, reputations] = await Promise.all([
      base44.asServiceRole.entities.Faction.filter({}),
      base44.asServiceRole.entities.Territory.filter({}),
      base44.asServiceRole.entities.CharacterProfile.filter({ player_email: user.email }, '-created_date', 1),
      base44.asServiceRole.entities.JournalEntry.filter({ player_email: user.email }, '-created_date', 20),
      base44.asServiceRole.entities.JournalEntry.filter({ player_email: user.email, status: 'pending' }),
      base44.asServiceRole.entities.Job.filter({}),
      base44.asServiceRole.entities.Reputation.filter({ player_email: user.email }),
    ]);

    if (pendingJournal.length >= 3) {
      return Response.json({ error: 'Resolve existing events first (max 3 pending)' }, { status: 400 });
    }

    const charProfile = charProfiles[0] || null;
    const recentTitles = recentJournal.map((entry) => sanitizeText(entry.title, 120)).filter(Boolean);
    const pendingChoices = sanitizePendingChoiceMap(user.pending_journal_choices);
    const consequenceTags = normalizeStringArray(user.journal_consequence_tags, 48, 20);
    const playerReps = reputations.map((reputation) => {
      const faction = factions.find((candidate) => candidate.id === reputation.faction_id);
      return `${faction?.name || 'Unknown'}: ${Number(reputation.score || 0)} (${sanitizeText(reputation.rank, 20) || 'unknown'})`;
    });
    const activeMissions = jobs.filter((job) => job.assigned_to === user.email && job.status === 'in_progress');
    const contestedTerritories = territories.filter((territory) =>
      territory.status === 'contested' || territory.status === 'hostile'
    );
    const originChoices = Array.isArray(user.origin_choices)
      ? user.origin_choices.map((choice) => sanitizeText(choice?.label, 80)).filter(Boolean)
      : [];

    const generated = await generateJournalPayload(base44, {
      user,
      charProfile,
      factions,
      territories,
      recentTitles,
      consequenceTags,
      playerReps,
      activeMissions,
      contestedTerritories,
      originChoices,
    });

    const fallbackFactionId = sanitizeText(contestedTerritories[0]?.controlling_faction_id, 80);
    const relatedFaction = factions.find((faction) => faction.id === generated.related_faction_id)
      || factions.find((faction) => faction.id === fallbackFactionId)
      || null;
    const relatedTerritory = territories.find((territory) => territory.id === generated.related_territory_id)
      || contestedTerritories[0]
      || territories[0]
      || null;
    const journalChoices = normalizeJournalChoices(generated.choices, buildFallbackChoices({
      relatedFactionId: relatedFaction?.id || '',
      territoryName: relatedTerritory?.name || 'the wastes',
    }));

    const entry = await base44.asServiceRole.entities.JournalEntry.create({
      player_email: user.email,
      title: sanitizeText(generated.title, 140) || 'Static on the line',
      narrative: sanitizeText(generated.narrative, 2400) || 'Something in the wasteland shifts and demands your attention.',
      category: VALID_CATEGORIES.includes(generated.category) ? generated.category : 'encounter',
      status: 'pending',
      choices: journalChoices.map((choice) => ({
        id: choice.id,
        label: choice.label,
        effect_description: choice.effect_description,
      })),
      related_faction_id: relatedFaction?.id || '',
      related_territory_id: relatedTerritory?.id || '',
      chain_depth: 0,
      consequence_tags: [],
    });

    pendingChoices[entry.id] = journalChoices;
    await base44.auth.updateMe({
      pending_journal_choices: pendingChoices,
    });

    return Response.json({ status: 'ok', entry_id: entry.id });
  } catch (error) {
    console.error('generateJournalEvent error:', error);
    return Response.json({ error: error.message || 'Failed to generate journal event' }, { status: 500 });
  }
});

async function generateJournalPayload(base44, context) {
  const fallback = buildFallbackJournalEvent(context);
  const characterSection = context.charProfile ? `
CHARACTER DATA:
- Name: ${sanitizeText(context.charProfile.character_name, 80) || sanitizeText(context.user.callsign, 80) || 'Unknown'}
- Backstory: ${sanitizeText(context.charProfile.backstory, 600) || 'Unknown'}
- Personality: ${sanitizeText(context.charProfile.personality, 240) || 'Unknown'}
- Skills: ${sanitizeText(context.charProfile.skills, 240) || 'general'}
- Weaknesses: ${sanitizeText(context.charProfile.weaknesses, 240) || 'none known'}
- Faction Loyalty: ${sanitizeText(context.charProfile.faction_loyalty, 120) || 'unaligned'}
- Goals: ${sanitizeText(context.charProfile.goals, 240) || 'survival'}
- Origin: ${sanitizeText(context.charProfile.origin, 120) || 'unknown'}
- Origin choices: ${context.originChoices.join(', ') || 'none'}
` : '';

  try {
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the narrative engine for DEAD SIGNAL, a post-apocalyptic survival game. Generate a personal narrative event for this operative.

${characterSection}
OPERATIVE: ${sanitizeText(context.user.callsign, 80) || 'Unknown'} (${context.user.email})
Reputation standings: ${context.playerReps.join(', ') || 'None'}
Active missions: ${context.activeMissions.map((mission) => sanitizeText(mission.title, 100)).join(', ') || 'None'}
Contested territories: ${context.contestedTerritories.map((territory) => sanitizeText(territory.name, 80)).join(', ') || 'None'}
Available factions: ${context.factions.map((faction) => `${sanitizeText(faction.name, 80)} [${sanitizeText(faction.tag, 20)}] (id: ${faction.id})`).join(', ')}
Available territories: ${context.territories.slice(0, 12).map((territory) => `${sanitizeText(territory.name, 80)} [${sanitizeText(territory.sector, 20)}] threat:${sanitizeText(territory.threat_level, 20)} (id: ${territory.id})`).join(', ')}

PREVIOUS CONSEQUENCE THREADS: ${context.consequenceTags.join(', ') || 'None'}
DO NOT repeat these recent event titles: ${context.recentTitles.join(', ') || 'None'}

Generate a narrative event with EXACTLY 3 choices. The event should:
- Be tied to the operative's backstory, skills, and weaknesses
- Reference real factions and territories by name
- Build on prior consequence threads when they exist
- Present a meaningful moral or tactical dilemma
- Include varied reputation_delta values from -15 to +20
- Feel atmospheric and specific, not generic

Category must be one of: encounter, discovery, dilemma, crisis, opportunity.
Include only real faction IDs and territory IDs from the lists above.`,
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          narrative: { type: 'string' },
          category: { type: 'string' },
          related_faction_id: { type: 'string' },
          related_territory_id: { type: 'string' },
          choices: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                label: { type: 'string' },
                effect_description: { type: 'string' },
                reputation_delta: { type: 'number' },
                outcome_narrative: { type: 'string' },
              },
            },
          },
        },
      },
    });

    return {
      title: sanitizeText(result?.title, 140) || fallback.title,
      narrative: sanitizeText(result?.narrative, 2400) || fallback.narrative,
      category: sanitizeCategory(result?.category),
      related_faction_id: sanitizeText(result?.related_faction_id, 80),
      related_territory_id: sanitizeText(result?.related_territory_id, 80),
      choices: Array.isArray(result?.choices) ? result.choices : fallback.choices,
    };
  } catch (error) {
    console.error('generateJournalEvent LLM generation failed:', error);
    return fallback;
  }
}

function buildFallbackJournalEvent(context) {
  const focalTerritory = context.contestedTerritories[0] || context.territories[0] || null;
  const focalFaction = context.factions.find((faction) => faction.id === focalTerritory?.controlling_faction_id)
    || context.factions[0]
    || null;
  const operativeName = sanitizeText(context.user.callsign, 80) || 'the operative';
  const territoryName = sanitizeText(focalTerritory?.name, 80) || 'the dead zone';
  const factionName = sanitizeText(focalFaction?.name, 80) || 'a nearby faction';

  return {
    title: `Static Over ${territoryName}`,
    narrative: `${operativeName} intercepts a fractured transmission tied to ${territoryName}. The message points toward a narrow window to influence ${factionName}, but acting on it means exposing old loyalties and leaving a trace in the wasteland.`,
    category: 'dilemma',
    related_faction_id: focalFaction?.id || '',
    related_territory_id: focalTerritory?.id || '',
    choices: buildFallbackChoices({
      relatedFactionId: focalFaction?.id || '',
      territoryName,
    }),
  };
}

function buildFallbackChoices({ relatedFactionId, territoryName }) {
  return [
    {
      id: 'back_channel',
      label: 'Work the back channel',
      effect_description: `Quietly pass the intel through local contacts tied to ${territoryName}.`,
      reputation_delta: 8,
      outcome_narrative: 'Your quiet hand keeps the signal alive and buys cautious trust.',
      related_faction_id: relatedFactionId,
    },
    {
      id: 'burn_it',
      label: 'Burn the trail',
      effect_description: 'Destroy the lead before anyone else can exploit it.',
      reputation_delta: -6,
      outcome_narrative: 'You deny everyone the advantage, but word spreads that you acted alone.',
      related_faction_id: relatedFactionId,
    },
    {
      id: 'go_public',
      label: 'Push it into the open',
      effect_description: 'Broadcast the discovery and force every nearby actor to respond.',
      reputation_delta: 3,
      outcome_narrative: 'The wasteland hears the signal at once, and the situation escalates faster than anyone can control.',
      related_faction_id: relatedFactionId,
    },
  ];
}

function normalizeJournalChoices(choices, fallbackChoices) {
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
    });
  }

  return normalized;
}

function sanitizePendingChoiceMap(value) {
  if (!isRecord(value)) {
    return {};
  }

  const normalized = {};
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
}

function normalizeStringArray(value, maxLength = 48, maxItems = 20) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => sanitizeText(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function sanitizeCategory(value) {
  const category = sanitizeText(value, 20);
  return VALID_CATEGORIES.includes(category) ? category : 'encounter';
}

function sanitizeText(value, maxLength = 200) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, numeric));
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
