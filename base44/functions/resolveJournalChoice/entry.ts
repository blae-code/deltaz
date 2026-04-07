import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';
import {
  applyThreatShift,
  buildFallbackChoices,
  buildJournalEntryPayload,
  normalizeJournalChoices,
  resolveJournalOutcome,
  sanitizePendingChoiceMap,
} from '../_shared/journalRules.ts';
import { DATA_ORIGINS, buildSourceRef, withProvenance } from '../_shared/provenance.ts';

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
    const fallbackChoices = normalizeJournalChoices(entry.choices, buildFallbackChoices({
      relatedFactionId: sanitizeText(entry.related_faction_id, 80),
      territoryName: 'the wastes',
    }));
    const fallbackChoice = fallbackChoices.find((choice) => sanitizeText(choice?.id, 80) === choiceId) || null;
    const selectedChoice = normalizeChoice(storedChoice || fallbackChoice);

    if (!selectedChoice) {
      return Response.json({ error: 'Invalid choice' }, { status: 400 });
    }

    const [factions, territories, recentIntel, reputations] = await Promise.all([
      base44.asServiceRole.entities.Faction.filter({}),
      base44.asServiceRole.entities.Territory.filter({}),
      base44.asServiceRole.entities.IntelFeed.filter({ is_active: true }, '-created_date', 5),
      base44.asServiceRole.entities.Reputation.filter({ player_email: user.email }),
    ]);

    const relatedFaction = factions.find((faction) => faction.id === entry.related_faction_id) || null;
    const relatedTerritory = territories.find((territory) => territory.id === entry.related_territory_id) || null;
    const pastConsequences = Array.isArray(user.journal_consequence_tags)
      ? user.journal_consequence_tags.map((tag) => sanitizeText(tag, 48)).filter(Boolean)
      : [];

    const outcomeResult = resolveJournalOutcome({
      entry,
      selectedChoice,
      relatedTerritory,
    });

    const repDelta = clampNumber(selectedChoice.reputation_delta, -15, 20, 0);
    let reputationEffect = null;
    if (repDelta !== 0 && entry.related_faction_id) {
      reputationEffect = { faction_id: entry.related_faction_id, delta: repDelta };

      const reputationRows = reputations.filter((reputation) => reputation.faction_id === entry.related_faction_id);
      const reputationRow = reputationRows[0];
      const currentScore = Number(reputationRow?.score || 0) || 0;
      const newScore = clampNumber(currentScore + repDelta, -100, 150, repDelta);
      const nextRank = getReputationRank(newScore);
      const sourceRefs = [
        buildSourceRef('journal_entry', entry.id),
        buildSourceRef('faction', entry.related_faction_id),
        buildSourceRef('player', user.email),
      ];

      if (reputationRows.length > 0) {
        await Promise.all(reputationRows.map((row) =>
          base44.asServiceRole.entities.Reputation.update(row.id, withProvenance({
            score: newScore,
            rank: nextRank,
          }, {
            dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
            sourceRefs,
          })),
        ));
      } else {
        await base44.asServiceRole.entities.Reputation.create(withProvenance({
          player_email: user.email,
          faction_id: entry.related_faction_id,
          score: repDelta,
          rank: getReputationRank(repDelta),
        }, {
          dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
          sourceRefs,
        }));
      }

      await base44.asServiceRole.entities.ReputationLog.create(withProvenance({
        player_email: user.email,
        faction_id: entry.related_faction_id,
        delta: repDelta,
        reason: `Journal: "${sanitizeText(entry.title, 120)}" — chose "${selectedChoice.label}"`,
      }, {
        dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
        sourceRefs,
      }));
    }

    const worldEffects = [];
    for (const effect of outcomeResult.world_effects) {
      if (effect.type === 'intel_report') {
        const intel = await base44.asServiceRole.entities.IntelFeed.create(withProvenance({
          title: effect.title || `Intel from ${sanitizeText(user.callsign, 80) || 'operative'}`,
          content: effect.content,
          category: 'rumor',
          severity: mapIntelSeverity(effect.severity),
          source: `Field report from ${sanitizeText(user.callsign, 80) || 'Anonymous operative'}`,
          related_faction_id: entry.related_faction_id || '',
          related_territory_id: entry.related_territory_id || '',
          is_active: true,
        }, {
          dataOrigin: DATA_ORIGINS.DETERMINISTIC_PROJECTION,
          sourceRefs: [
            buildSourceRef('journal_entry', entry.id),
            buildSourceRef('faction', entry.related_faction_id),
            buildSourceRef('territory', entry.related_territory_id),
          ],
        }));
        worldEffects.push({
          type: 'intel_created',
          description: effect.title || 'Intel report created',
          entity_id: intel.id,
        });
        continue;
      }

      if (effect.type === 'territory_shift' && relatedTerritory) {
        const lowerThreat = /stabil|reduce|lower|quiet|calm/i.test(`${effect.title} ${effect.content}`);
        const nextThreat = applyThreatShift(relatedTerritory.threat_level || 'moderate', effect.severity, lowerThreat);

        await base44.asServiceRole.entities.Territory.update(relatedTerritory.id, withProvenance({
          threat_level: nextThreat,
        }, {
          dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
          sourceRefs: [
            buildSourceRef('journal_entry', entry.id),
            buildSourceRef('territory', relatedTerritory.id),
          ],
        }));

        worldEffects.push({
          type: 'territory_threat_changed',
          description: `${sanitizeText(relatedTerritory.name, 80)} threat -> ${nextThreat}`,
          entity_id: relatedTerritory.id,
        });
        continue;
      }

      if (effect.type === 'broadcast' || effect.type === 'faction_alert') {
        const event = await base44.asServiceRole.entities.Event.create(withProvenance({
          title: effect.title || 'Field Report',
          content: effect.content,
          type: effect.type === 'faction_alert' ? 'faction_conflict' : 'broadcast',
          severity: mapEventSeverity(effect.severity),
          territory_id: entry.related_territory_id || '',
          faction_id: entry.related_faction_id || '',
          is_active: true,
        }, {
          dataOrigin: DATA_ORIGINS.DETERMINISTIC_PROJECTION,
          sourceRefs: [
            buildSourceRef('journal_entry', entry.id),
            buildSourceRef('faction', entry.related_faction_id),
            buildSourceRef('territory', entry.related_territory_id),
          ],
        }));
        worldEffects.push({
          type: 'event_created',
          description: effect.title || 'Field report created',
          entity_id: event.id,
        });
      }
    }

    await base44.asServiceRole.entities.JournalEntry.update(entryId, withProvenance({
      status: 'resolved',
      chosen: choiceId,
      chosen_label: selectedChoice.label,
      outcome: sanitizeText(outcomeResult.outcome, 1800) || selectedChoice.outcome_narrative || 'The consequences unfold...',
      reputation_effect: reputationEffect,
      world_effects: worldEffects,
      consequence_tags: outcomeResult.consequence_tags,
    }, {
      dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
      sourceRefs: [
        buildSourceRef('journal_entry', entry.id),
        buildSourceRef('faction', entry.related_faction_id),
        buildSourceRef('territory', entry.related_territory_id),
      ],
    }));

    const updatedPending = { ...pendingChoices };
    delete updatedPending[entryId];
    const mergedTags = [...pastConsequences, ...outcomeResult.consequence_tags];
    const nextTagList = Array.from(new Set(mergedTags.filter(Boolean))).slice(-50);

    let followupId = null;
    if (outcomeResult.has_followup && Number(entry.chain_depth || 0) < 3) {
      const followupDraft = buildFollowupDraft({
        entry,
        selectedChoice,
        relatedTerritory,
        relatedFaction,
        outcomeResult,
      });
      const followupChoices = normalizeJournalChoices(followupDraft.choices, buildFallbackChoices({
        relatedFactionId: entry.related_faction_id || '',
        territoryName: sanitizeText(relatedTerritory?.name, 80) || 'the wastes',
      }));

      const followup = await base44.asServiceRole.entities.JournalEntry.create(buildJournalEntryPayload(user.email, {
        ...followupDraft,
        territory_name: sanitizeText(relatedTerritory?.name, 80) || 'the wastes',
        chain_depth: Math.min(Number(entry.chain_depth || 0) + 1, 3),
        choices: followupChoices,
      }));

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

function buildFollowupDraft({ entry, selectedChoice, relatedTerritory, relatedFaction, outcomeResult }) {
  const territoryName = sanitizeText(relatedTerritory?.name, 80) || 'the wastes';
  const factionName = sanitizeText(relatedFaction?.name, 80) || 'local actors';
  return {
    key: outcomeResult.followup_key || 'aftershock',
    title: `Aftermath: ${territoryName}`,
    narrative: `The fallout from "${selectedChoice.label}" keeps moving through ${territoryName}. ${factionName} has started reacting to the first-order consequences, and the next decision will determine whether the situation settles or sharpens.`,
    category: 'crisis',
    related_faction_id: entry.related_faction_id || '',
    related_territory_id: entry.related_territory_id || '',
    consequence_tags: outcomeResult.consequence_tags,
    choices: buildFallbackChoices({
      relatedFactionId: entry.related_faction_id || '',
      territoryName,
    }),
  };
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
    world_effects: Array.isArray(value.world_effects) ? value.world_effects : [],
    consequence_tags: Array.isArray(value.consequence_tags) ? value.consequence_tags : [],
    followup_key: sanitizeText(value.followup_key, 80),
  };
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
