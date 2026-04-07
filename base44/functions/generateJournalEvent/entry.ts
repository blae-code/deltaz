import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';
import {
  buildJournalEntryPayload,
  buildJournalEventDraft,
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

    const [factions, territories, charProfiles, recentJournal, pendingJournal, jobs, reputations] = await Promise.all([
      base44.asServiceRole.entities.Faction.filter({}),
      base44.asServiceRole.entities.Territory.filter({}),
      base44.asServiceRole.entities.CharacterProfile.filter({ player_email: user.email }, '-created_date', 1),
      base44.asServiceRole.entities.JournalEntry.filter({ player_email: user.email }, '-created_date', 20),
      base44.asServiceRole.entities.JournalEntry.filter({ player_email: user.email, status: 'pending' }),
      base44.asServiceRole.entities.Job.filter({}, '-created_date', 100),
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

    const draft = buildJournalEventDraft({
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

    if (!draft) {
      return Response.json({ error: 'Unable to derive a journal event from current state' }, { status: 409 });
    }

    const entry = await base44.asServiceRole.entities.JournalEntry.create(buildJournalEntryPayload(user.email, draft));
    pendingChoices[entry.id] = draft.choices;

    await base44.auth.updateMe({
      pending_journal_choices: pendingChoices,
    });

    return Response.json({ status: 'ok', entry_id: entry.id });
  } catch (error) {
    console.error('generateJournalEvent error:', error);
    return Response.json({ error: error.message || 'Failed to generate journal event' }, { status: 500 });
  }
});

function sanitizeText(value: unknown, maxLength = 200) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function normalizeStringArray(value: unknown, maxLength = 48, maxItems = 20) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => sanitizeText(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}
