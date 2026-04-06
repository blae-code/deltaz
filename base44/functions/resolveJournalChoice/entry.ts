import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

const VALID_CATEGORIES = ['encounter', 'discovery', 'dilemma', 'crisis', 'opportunity'];
const THREAT_LEVELS = ['minimal', 'low', 'moderate', 'high', 'critical'];

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

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const entryId = sanitizeText(body.entry_id, 80);
    const choiceId = sanitizeText(body.choice_id, 80);
    if (!entryId || !choiceId) {
      return Response.json({ error: 'Missing entry_id or choice_id' }, { status: 400 });
    }

    const entries = await base44.asServiceRole.entities.JournalEntry.filter({ id: entryId });
    const entry = entries[0];
    if (!entry || entry.player_email !== user.email) {
      return Response.json({ error: 'Entry not found' }, { status: 404 });
    }
    if (entry.status === 'resolved') {
      return Response.json({ error: 'Already resolved' }, { status: 400 });
    }

    const pendingChoices = sanitizePendingChoiceMap(user.pending_journal_choices);
    const storedChoice = Array.isArray(pendingChoices[entryId])
      ? pendingChoices[entryId].find((choice) => choice.id === choiceId)
      : null;
    const fallbackChoice = Array.isArray(entry.choices)
      ? entry.choices.find((choice) => sanitizeText(choice?.id, 80) === choiceId)
      : null;
    const selectedChoice = normalizeChoice(storedChoice || fallbackChoice);

    if (!selectedChoice) {
      return Response.json({ error: 'Invalid choice' }, { status: 400 });
    }

    const [charProfiles, factions, territories, recentIntel, reputations] = await Promise.all([
      base44.asServiceRole.entities.CharacterProfile.filter({ player_email: user.email }, '-created_date', 1),
      base44.asServiceRole.entities.Faction.filter({}),
      base44.asServiceRole.entities.Territory.filter({}),
      base44.asServiceRole.entities.IntelFeed.filter({ is_active: true }, '-created_date', 5),
      base44.asServiceRole.entities.Reputation.filter({ player_email: user.email }),
    ]);

    const charProfile = charProfiles[0] || null;
    const relatedFaction = factions.find((faction) => faction.id === entry.related_faction_id) || null;
    const relatedTerritory = territories.find((territory) => territory.id === entry.related_territory_id) || null;
    const recentIntelTitles = recentIntel.map((intel) => sanitizeText(intel.title, 120)).filter(Boolean);
    const pastConsequences = normalizeStringArray(user.journal_consequence_tags, 48, 20);

    const outcomeResult = await generateOutcome(base44, {
      user,
      entry,
      selectedChoice,
      charProfile,
      relatedFaction,
      relatedTerritory,
      recentIntelTitles,
      pastConsequences,
    });

    const repDelta = clampNumber(selectedChoice.reputation_delta, -15, 20, 0);
    let reputationEffect = null;
    if (repDelta !== 0 && entry.related_faction_id) {
      reputationEffect = { faction_id: entry.related_faction_id, delta: repDelta };

      const reputationRows = reputations.filter((reputation) => reputation.faction_id === entry.related_faction_id);
      const reputationRow = reputationRows[0];
      if (reputationRow) {
        const newScore = clampNumber((Number(reputationRow.score || 0) || 0) + repDelta, -100, 150, repDelta);
        const nextRank = getReputationRank(newScore);
        await Promise.all(reputationRows.map((row) =>
          base44.asServiceRole.entities.Reputation.update(row.id, {
            score: newScore,
            rank: nextRank,
          }),
        ));
      } else {
        await base44.asServiceRole.entities.Reputation.create({
          player_email: user.email,
          faction_id: entry.related_faction_id,
          score: repDelta,
          rank: getReputationRank(repDelta),
        });
      }

      await base44.asServiceRole.entities.ReputationLog.create({
        player_email: user.email,
        faction_id: entry.related_faction_id,
        delta: repDelta,
        reason: `Journal: "${sanitizeText(entry.title, 120)}" — chose "${selectedChoice.label}"`,
      });
    }

    const worldEffects = [];
    for (const effect of normalizeWorldEffects(outcomeResult.world_effects)) {
      if (effect.type === 'intel_report') {
        const intel = await base44.asServiceRole.entities.IntelFeed.create({
          title: effect.title || `Intel from ${sanitizeText(user.callsign, 80) || 'operative'}`,
          content: effect.content,
          category: 'rumor',
          severity: mapIntelSeverity(effect.severity),
          source: `Field report from ${sanitizeText(user.callsign, 80) || 'Anonymous operative'}`,
          related_faction_id: entry.related_faction_id || '',
          related_territory_id: entry.related_territory_id || '',
          is_active: true,
        });
        worldEffects.push({
          type: 'intel_created',
          description: effect.title || 'Intel report created',
          entity_id: intel.id,
        });
        continue;
      }

      if (effect.type === 'territory_shift' && relatedTerritory) {
        const currentIndex = Math.max(0, THREAT_LEVELS.indexOf(relatedTerritory.threat_level || 'moderate'));
        const shift = effect.severity === 'critical' ? 2 : 1;
        const lowerThreat = /stabil|reduce|lower|quiet|calm/i.test(`${effect.title} ${effect.content}`);
        const nextIndex = Math.min(
          Math.max(currentIndex + (lowerThreat ? -shift : shift), 0),
          THREAT_LEVELS.length - 1,
        );

        await base44.asServiceRole.entities.Territory.update(relatedTerritory.id, {
          threat_level: THREAT_LEVELS[nextIndex],
        });

        worldEffects.push({
          type: 'territory_threat_changed',
          description: `${sanitizeText(relatedTerritory.name, 80)} threat -> ${THREAT_LEVELS[nextIndex]}`,
          entity_id: relatedTerritory.id,
        });
        continue;
      }

      if (effect.type === 'broadcast' || effect.type === 'faction_alert') {
        const event = await base44.asServiceRole.entities.Event.create({
          title: effect.title || 'Field Report',
          content: effect.content,
          type: effect.type === 'faction_alert' ? 'faction_conflict' : 'broadcast',
          severity: mapEventSeverity(effect.severity),
          territory_id: entry.related_territory_id || '',
          faction_id: entry.related_faction_id || '',
          is_active: true,
        });
        worldEffects.push({
          type: 'event_created',
          description: effect.title || 'Field report created',
          entity_id: event.id,
        });
      }
    }

    await base44.asServiceRole.entities.JournalEntry.update(entryId, {
      status: 'resolved',
      chosen: choiceId,
      chosen_label: selectedChoice.label,
      outcome: sanitizeText(outcomeResult.outcome, 1800) || selectedChoice.outcome_narrative || 'The consequences unfold...',
      reputation_effect: reputationEffect,
      world_effects: worldEffects,
      consequence_tags: outcomeResult.consequence_tags,
    });

    const updatedPending = { ...pendingChoices };
    delete updatedPending[entryId];
    const mergedTags = [...pastConsequences, ...outcomeResult.consequence_tags];
    const nextTagList = Array.from(new Set(mergedTags.filter(Boolean))).slice(-50);

    let followupId = null;
    if (outcomeResult.has_followup && shouldCreateFollowup(outcomeResult.followup_event, entry.chain_depth)) {
      const followupChoices = normalizeJournalChoices(
        outcomeResult.followup_event.choices,
        buildFallbackChoices({
          relatedFactionId: entry.related_faction_id || '',
          territoryName: sanitizeText(relatedTerritory?.name, 80) || 'the wastes',
        }),
      );

      const followup = await base44.asServiceRole.entities.JournalEntry.create({
        player_email: user.email,
        title: sanitizeText(outcomeResult.followup_event.title, 140) || 'After the fallout',
        narrative: sanitizeText(outcomeResult.followup_event.narrative, 2400) || 'The aftermath opens a new path forward.',
        category: sanitizeCategory(outcomeResult.followup_event.category),
        status: 'pending',
        choices: followupChoices.map((choice) => ({
          id: choice.id,
          label: choice.label,
          effect_description: choice.effect_description,
        })),
        related_faction_id: entry.related_faction_id || '',
        related_territory_id: entry.related_territory_id || '',
        parent_entry_id: entryId,
        chain_depth: Math.min(Number(entry.chain_depth || 0) + 1, 3),
        consequence_tags: outcomeResult.consequence_tags,
      });

      updatedPending[followup.id] = followupChoices;
      followupId = followup.id;
    }

    await base44.auth.updateMe({
      pending_journal_choices: updatedPending,
      journal_consequence_tags: nextTagList,
    });

    return Response.json({
      status: 'ok',
      outcome: sanitizeText(outcomeResult.outcome, 1800) || selectedChoice.outcome_narrative || 'The consequences unfold...',
      reputation_effect: reputationEffect,
      world_effects: worldEffects,
      consequence_tags: outcomeResult.consequence_tags,
      followup_entry_id: followupId,
    });
  } catch (error) {
    console.error('resolveJournalChoice error:', error);
    return Response.json({ error: error.message || 'Failed to resolve journal choice' }, { status: 500 });
  }
});

async function generateOutcome(base44, context) {
  const fallback = buildFallbackOutcome(context);

  try {
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the GHOST PROTOCOL narrative engine for DEAD SIGNAL, a post-apocalyptic survival game.

The operative "${sanitizeText(context.user.callsign, 80) || 'Unknown'}" faced this event:
"${sanitizeText(context.entry.title, 140)}" — ${sanitizeText(context.entry.narrative, 1200)}

They chose: "${context.selectedChoice.label}"
Expected effect: ${context.selectedChoice.effect_description || 'unknown'}

${context.charProfile ? `Character: ${sanitizeText(context.charProfile.character_name, 80) || sanitizeText(context.user.callsign, 80)}\nBackstory: ${sanitizeText(context.charProfile.backstory, 320)}\nPersonality: ${sanitizeText(context.charProfile.personality, 220)}\nWeaknesses: ${sanitizeText(context.charProfile.weaknesses, 220)}` : ''}

Related faction: ${sanitizeText(context.relatedFaction?.name, 80) || 'None'} [${sanitizeText(context.relatedFaction?.tag, 20)}]
Related territory: ${sanitizeText(context.relatedTerritory?.name, 80) || 'None'} (sector ${sanitizeText(context.relatedTerritory?.sector, 20) || '??'}, threat: ${sanitizeText(context.relatedTerritory?.threat_level, 20) || '??'})
Previous consequence history: ${context.pastConsequences.join(', ') || 'None'}
Recent intel headlines: ${context.recentIntelTitles.join(', ') || 'None'}

Generate a structured response with:
1. A 2-3 sentence outcome narrative
2. Up to 3 world effects using only: intel_report, territory_shift, faction_alert, broadcast
3. Up to 5 consequence tags
4. A boolean has_followup
5. If has_followup, a complete follow-up event with 3 choices that continues this consequence thread`,
      response_json_schema: {
        type: 'object',
        properties: {
          outcome: { type: 'string' },
          world_effects: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                title: { type: 'string' },
                content: { type: 'string' },
                severity: { type: 'string' },
              },
            },
          },
          consequence_tags: {
            type: 'array',
            items: { type: 'string' },
          },
          has_followup: { type: 'boolean' },
          followup_event: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              narrative: { type: 'string' },
              category: { type: 'string' },
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
        },
      },
    });

    return {
      outcome: sanitizeText(result?.outcome, 1800) || fallback.outcome,
      world_effects: Array.isArray(result?.world_effects) ? result.world_effects : fallback.world_effects,
      consequence_tags: normalizeStringArray(result?.consequence_tags, 48, 5),
      has_followup: Boolean(result?.has_followup),
      followup_event: result?.followup_event || null,
    };
  } catch (error) {
    console.error('resolveJournalChoice LLM generation failed:', error);
    return fallback;
  }
}

function buildFallbackOutcome(context) {
  const territoryName = sanitizeText(context.relatedTerritory?.name, 80) || 'the wastes';
  const factionName = sanitizeText(context.relatedFaction?.name, 80) || 'a nearby faction';

  return {
    outcome: `${sanitizeText(context.user.callsign, 80) || 'The operative'} follows through on "${context.selectedChoice.label}" and leaves a visible mark on ${territoryName}. The move shifts how ${factionName} reads their intentions, and the fallout will travel farther than the first decision did.`,
    world_effects: [
      {
        type: 'intel_report',
        title: `Echo from ${territoryName}`,
        content: `${sanitizeText(context.selectedChoice.label, 120)} has started to circulate through local channels.`,
        severity: 'medium',
      },
    ],
    consequence_tags: normalizeStringArray([
      sanitizeTag(context.selectedChoice.id),
      sanitizeTag(context.relatedTerritory?.sector),
    ], 48, 5),
    has_followup: false,
    followup_event: null,
  };
}

function normalizeWorldEffects(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((effect) => ({
      type: sanitizeEffectType(effect?.type),
      title: sanitizeText(effect?.title, 140),
      content: sanitizeText(effect?.content, 1200),
      severity: sanitizeSeverity(effect?.severity),
    }))
    .filter((effect) => effect.type && effect.content)
    .slice(0, 3);
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

function buildFallbackChoices({ relatedFactionId, territoryName }) {
  return [
    {
      id: 'steady_hand',
      label: 'Keep a steady hand',
      effect_description: `Contain the fallout quietly around ${territoryName}.`,
      reputation_delta: 6,
      outcome_narrative: 'The situation stabilizes, but people notice who kept control.',
      related_faction_id: relatedFactionId,
    },
    {
      id: 'cut_ties',
      label: 'Cut ties and move',
      effect_description: 'Break contact, protect yourself, and accept the political cost.',
      reputation_delta: -5,
      outcome_narrative: 'You preserve your position at the expense of trust.',
      related_faction_id: relatedFactionId,
    },
    {
      id: 'force_issue',
      label: 'Force the issue',
      effect_description: 'Escalate publicly and force every nearby actor to react.',
      reputation_delta: 3,
      outcome_narrative: 'The choice creates momentum immediately, but it also expands the blast radius.',
      related_faction_id: relatedFactionId,
    },
  ];
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

function normalizeChoice(value) {
  if (!value) {
    return null;
  }

  const id = sanitizeText(value.id, 80);
  const label = sanitizeText(value.label, 120);
  if (!id || !label) {
    return null;
  }

  return {
    id,
    label,
    effect_description: sanitizeText(value.effect_description, 220),
    reputation_delta: clampNumber(value.reputation_delta, -15, 20, 0),
    outcome_narrative: sanitizeText(value.outcome_narrative, 500),
  };
}

function normalizeStringArray(value, maxLength = 48, maxItems = 20) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(
    value
      .map((item) => sanitizeText(item, maxLength))
      .filter(Boolean),
  )).slice(0, maxItems);
}

function sanitizeEffectType(value) {
  const effectType = sanitizeText(value, 40);
  return ['intel_report', 'territory_shift', 'faction_alert', 'broadcast'].includes(effectType) ? effectType : '';
}

function sanitizeSeverity(value) {
  const severity = sanitizeText(value, 20).toLowerCase();
  return ['low', 'medium', 'high', 'critical'].includes(severity) ? severity : 'medium';
}

function sanitizeCategory(value) {
  const category = sanitizeText(value, 20);
  return VALID_CATEGORIES.includes(category) ? category : 'encounter';
}

function sanitizeTag(value) {
  return sanitizeText(String(value || '').toLowerCase().replace(/[^a-z0-9_ -]+/g, '').replace(/\s+/g, '_'), 48);
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

function getReputationRank(score) {
  if (score >= 60) {
    return 'revered';
  }
  if (score >= 40) {
    return 'allied';
  }
  if (score >= 20) {
    return 'trusted';
  }
  if (score >= 0) {
    return 'neutral';
  }
  if (score <= -40) {
    return 'enemy';
  }
  if (score <= -15) {
    return 'hostile';
  }
  return 'unknown';
}

function mapIntelSeverity(value) {
  if (value === 'critical') {
    return 'critical';
  }
  if (value === 'high') {
    return 'high';
  }
  if (value === 'low') {
    return 'low';
  }
  return 'medium';
}

function mapEventSeverity(value) {
  if (value === 'critical') {
    return 'critical';
  }
  if (value === 'high') {
    return 'warning';
  }
  if (value === 'low') {
    return 'info';
  }
  return 'warning';
}

function shouldCreateFollowup(followupEvent, chainDepth) {
  if (!followupEvent || Number(chainDepth || 0) >= 3) {
    return false;
  }

  return Boolean(sanitizeText(followupEvent.title, 140));
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
