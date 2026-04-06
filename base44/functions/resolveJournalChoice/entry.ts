import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { entry_id, choice_id } = body;

  if (!entry_id || !choice_id) {
    return Response.json({ error: 'Missing entry_id or choice_id' }, { status: 400 });
  }

  // Get the journal entry
  const entries = await base44.entities.JournalEntry.filter({ id: entry_id });
  const entry = entries[0];

  if (!entry || entry.player_email !== user.email) {
    return Response.json({ error: 'Entry not found' }, { status: 404 });
  }

  if (entry.status === 'resolved') {
    return Response.json({ error: 'Already resolved' }, { status: 400 });
  }

  // Get the stored choice data
  const pendingChoices = user.pending_journal_choices || {};
  const choiceData = pendingChoices[entry_id];
  const selectedChoice = choiceData?.find(c => c.id === choice_id);

  if (!selectedChoice) {
    return Response.json({ error: 'Invalid choice' }, { status: 400 });
  }

  // Generate the outcome narrative using AI
  const charProfiles = await base44.asServiceRole.entities.CharacterProfile.filter({ player_email: user.email }, '-created_date', 1);
  const charProfile = charProfiles[0];

  const outcomePrompt = `You are the GHOST PROTOCOL narrative engine for DEAD SIGNAL.

The operative "${user.callsign || 'Unknown'}" faced this event:
"${entry.title}" — ${entry.narrative}

They chose: "${selectedChoice.label}"
Expected effect: ${selectedChoice.effect_description || 'unknown'}

${charProfile ? `Character backstory: ${charProfile.backstory?.substring(0, 200) || ''}\nPersonality: ${charProfile.personality || ''}\nWeaknesses: ${charProfile.weaknesses || ''}` : ''}

Write a 2-3 sentence outcome narrative that:
- Describes the immediate consequence of their choice
- References their personality or backstory when relevant
- Is atmospheric, gritty, and slightly darkly humorous
- Makes the player feel their choice mattered`;

  const outcomeText = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt: outcomePrompt });

  // Apply reputation effect
  const repDelta = selectedChoice.reputation_delta || 0;
  let repEffect = null;

  if (repDelta !== 0 && entry.related_faction_id) {
    repEffect = { faction_id: entry.related_faction_id, delta: repDelta };

    // Update reputation
    const reps = await base44.entities.Reputation.filter({
      player_email: user.email,
      faction_id: entry.related_faction_id,
    });

    if (reps.length > 0) {
      const newScore = (reps[0].score || 0) + repDelta;
      let newRank = reps[0].rank;
      if (newScore >= 100) newRank = 'revered';
      else if (newScore >= 60) newRank = 'allied';
      else if (newScore >= 30) newRank = 'trusted';
      else if (newScore >= 0) newRank = 'neutral';
      else if (newScore >= -30) newRank = 'hostile';
      else newRank = 'enemy';

      await base44.entities.Reputation.update(reps[0].id, { score: newScore, rank: newRank });
    }

    // Log the rep change
    const factions = await base44.asServiceRole.entities.Faction.filter({});
    const factionName = factions.find(f => f.id === entry.related_faction_id)?.name || 'Unknown';

    await base44.entities.ReputationLog.create({
      player_email: user.email,
      faction_id: entry.related_faction_id,
      delta: repDelta,
      reason: `Journal event: "${entry.title}" — chose "${selectedChoice.label}"`,
    });
  }

  // Update journal entry
  await base44.entities.JournalEntry.update(entry_id, {
    status: 'resolved',
    chosen: choice_id,
    chosen_label: selectedChoice.label,
    outcome: outcomeText,
    reputation_effect: repEffect,
  });

  // Clean up pending choices
  const updatedPending = { ...(user.pending_journal_choices || {}) };
  delete updatedPending[entry_id];
  await base44.auth.updateMe({ pending_journal_choices: updatedPending });

  return Response.json({ status: 'ok', outcome: outcomeText, reputation_effect: repEffect });
});