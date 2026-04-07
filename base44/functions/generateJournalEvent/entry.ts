import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';
import {
  buildFallbackChoices,
  buildJournalEntryPayload,
  buildJournalEventDraft,
  normalizeJournalChoices,
  sanitizePendingChoiceMap,
} from '../_shared/journalRules.ts';

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

    const [factions, territories, charProfiles, recentJournal, pendingJournal, jobs] = await Promise.all([
      base44.asServiceRole.entities.Faction.filter({}),
      base44.asServiceRole.entities.Territory.filter({}),
      base44.asServiceRole.entities.CharacterProfile.filter({ player_email: user.email }, '-created_date', 1),
      base44.asServiceRole.entities.JournalEntry.filter({ player_email: user.email }, '-created_date', 20),
      base44.asServiceRole.entities.JournalEntry.filter({ player_email: user.email, status: 'pending' }),
      base44.asServiceRole.entities.Job.filter({}),
    ]);

    if (pendingJournal.length >= 3) {
      return Response.json({ error: 'Resolve existing events first (max 3 pending)' }, { status: 400 });
    }

    const charProfile = charProfiles[0] || null;
    const recentTitles = recentJournal.map((entry) => sanitizeText(entry.title, 120)).filter(Boolean);
    const pendingChoices = sanitizePendingChoiceMap(user.pending_journal_choices);
    const consequenceTags = Array.isArray(user.journal_consequence_tags)
      ? user.journal_consequence_tags.map((tag) => sanitizeText(tag, 48)).filter(Boolean)
      : [];
    const activeMissions = jobs.filter((job) => job.assigned_to === user.email && job.status === 'in_progress');
    const contestedTerritories = territories.filter((territory) =>
      territory.status === 'contested' || territory.status === 'hostile'
    );

    const draft = buildJournalEventDraft({
      user,
      charProfile,
      factions,
      territories,
      recentTitles,
      consequenceTags,
      activeMissions,
      contestedTerritories,
    });

    const relatedFaction = factions.find((faction) => faction.id === draft.related_faction_id) || null;
    const relatedTerritory = territories.find((territory) => territory.id === draft.related_territory_id)
      || contestedTerritories[0]
      || territories[0]
      || null;
    const journalChoices = normalizeJournalChoices(draft.choices, buildFallbackChoices({
      relatedFactionId: relatedFaction?.id || '',
      territoryName: relatedTerritory?.name || 'the wastes',
    }));

    const entry = await base44.asServiceRole.entities.JournalEntry.create(buildJournalEntryPayload(user.email, {
      ...draft,
      territory_name: relatedTerritory?.name || 'the wastes',
      related_faction_id: relatedFaction?.id || '',
      related_territory_id: relatedTerritory?.id || '',
      choices: journalChoices,
    }));

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

function sanitizeText(value, maxLength = 200) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}
