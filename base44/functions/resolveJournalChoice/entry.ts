import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';
import {
  applyThreatShift,
  buildFallbackChoices,
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
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
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

    const [factions, territories, reputations] = await Promise.all([
      base44.asServiceRole.entities.Faction.filter({}),
      base44.asServiceRole.entities.Territory.filter({}),
      base44.asServiceRole.entities.Reputation.filter({ player_email: user.email }),
    ]);

    const relatedFaction = factions.find((faction) => faction.id === entry.related_faction_id) || null;
    const relatedTerritory = territories.find((territory) => territory.id === entry.related_territory_id) || null;
    const outcomeResult = resolveJournalOutcome({
      user,
      entry,
      selectedChoice,
      relatedFaction,
      relatedTerritory,
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
          base44.asServiceRole.entities.Reputation.update(row.id, withProvenance({
            score: newScore,
            rank: nextRank,
          }, {
            dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
            sourceRefs: [
              buildSourceRef('journal_entry', entryId),
              buildSourceRef('faction', entry.related_faction_id),
            ],
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
          sourceRefs: [
            buildSourceRef('journal_entry', entryId),
            buildSourceRef('faction', entry.related_faction_id),
          ],
        }));
      }

      await base44.asServiceRole.entities.ReputationLog.create(withProvenance({
        player_email: user.email,
        faction_id: entry.related_faction_id,
        delta: repDelta,
        reason: `Journal: "${sanitizeText(entry.title, 120)}" — chose "${selectedChoice.label}"`,
      }, {
        dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
        sourceRefs: [
          buildSourceRef('journal_entry', entryId),
          buildSourceRef('faction', entry.related_faction_id),
        ],
      }));
    }

    const worldEffects = [];
    for (const effect of Array.isArray(outcomeResult.world_effects) ? outcomeResult.world_effects : []) {
      if (effect.type === 'intel_report') {
        const intel = await base44.asServiceRole.entities.IntelFeed.create(withProvenance({
          title: effect.title,
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
            buildSourceRef('journal_entry', entryId),
            entry.related_territory_id ? buildSourceRef('territory', entry.related_territory_id) : '',
            entry.related_faction_id ? buildSourceRef('faction', entry.related_faction_id) : '',
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
        const nextThreat = applyThreatShift(relatedTerritory.threat_level || 'moderate', clampNumber(effect.delta, -1, 1, 0));
        await base44.asServiceRole.entities.Territory.update(relatedTerritory.id, withProvenance({
          threat_level: nextThreat,
        }, {
          dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
          sourceRefs: [
            buildSourceRef('journal_entry', entryId),
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
            buildSourceRef('journal_entry', entryId),
            entry.related_territory_id ? buildSourceRef('territory', entry.related_territory_id) : '',
            entry.related_faction_id ? buildSourceRef('faction', entry.related_faction_id) : '',
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
      source_refs: Array.from(new Set([...(entry.source_refs || []), buildSourceRef('journal_entry', entryId)])),
    }, {
      dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
      sourceRefs: Array.from(new Set([...(entry.source_refs || []), buildSourceRef('journal_entry', entryId)])),
    }));

    const updatedPending = { ...pendingChoices };
    delete updatedPending[entryId];
    const mergedTags = [...normalizeStringArray(user.journal_consequence_tags, 48, 50), ...outcomeResult.consequence_tags];
    const nextTagList = Array.from(new Set(mergedTags.filter(Boolean))).slice(-50);

    let followupId = null;
    if (outcomeResult.has_followup && outcomeResult.followup_event && Number(entry.chain_depth || 0) < 3) {
      const followupChoices = normalizeJournalChoices(
        outcomeResult.followup_event.choices,
        buildFallbackChoices({
          relatedFactionId: entry.related_faction_id || '',
          territoryName: sanitizeText(relatedTerritory?.name, 80) || 'the wastes',
        }),
      );

      const followup = await base44.asServiceRole.entities.JournalEntry.create(withProvenance({
        player_email: user.email,
        title: sanitizeText(outcomeResult.followup_event.title, 140) || 'After the fallout',
        narrative: sanitizeText(outcomeResult.followup_event.narrative, 2400) || 'The aftermath opens a new path forward.',
        category: sanitizeCategory(outcomeResult.followup_event.category),
        status: 'pending',
        choices: followupChoices,
        related_faction_id: entry.related_faction_id || '',
        related_territory_id: entry.related_territory_id || '',
        parent_entry_id: entryId,
        chain_depth: Math.min(Number(entry.chain_depth || 0) + 1, 3),
        consequence_tags: outcomeResult.consequence_tags,
        event_key: `${sanitizeText(entry.event_key, 60) || 'followup'}_followup`,
      }, {
        dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
        sourceRefs: [
          buildSourceRef('journal_entry', entryId),
          entry.related_faction_id ? buildSourceRef('faction', entry.related_faction_id) : '',
          entry.related_territory_id ? buildSourceRef('territory', entry.related_territory_id) : '',
        ],
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

function normalizeChoice(value: any) {
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
    effect_key: sanitizeText(value.effect_key, 40),
    followup_key: sanitizeText(value.followup_key, 40),
  };
}

function normalizeStringArray(value: unknown, maxLength = 48, maxItems = 20) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(
    value
      .map((item) => sanitizeText(item, maxLength))
      .filter(Boolean),
  )).slice(0, maxItems);
}

function sanitizeCategory(value: unknown) {
  const category = sanitizeText(value, 20);
  return ['encounter', 'discovery', 'dilemma', 'crisis', 'opportunity'].includes(category) ? category : 'encounter';
}

function sanitizeText(value: unknown, maxLength = 200) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, numeric));
}

function getReputationRank(score: number) {
  if (score >= 60) return 'revered';
  if (score >= 40) return 'allied';
  if (score >= 20) return 'trusted';
  if (score >= 0) return 'neutral';
  if (score <= -40) return 'enemy';
  if (score <= -15) return 'hostile';
  return 'unknown';
}

function mapIntelSeverity(value: unknown) {
  if (value === 'critical') return 'critical';
  if (value === 'high') return 'high';
  if (value === 'low') return 'low';
  return 'medium';
}

function mapEventSeverity(value: unknown) {
  if (value === 'critical') return 'critical';
  if (value === 'high') return 'warning';
  if (value === 'low') return 'info';
  return 'warning';
}
