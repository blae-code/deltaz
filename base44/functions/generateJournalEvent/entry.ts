import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Gather context
  const [factions, territories, charProfiles, recentJournal, jobs, reputations] = await Promise.all([
    base44.asServiceRole.entities.Faction.filter({}),
    base44.asServiceRole.entities.Territory.filter({}),
    base44.asServiceRole.entities.CharacterProfile.filter({ player_email: user.email }, '-created_date', 1),
    base44.entities.JournalEntry.filter({ player_email: user.email }, '-created_date', 10),
    base44.asServiceRole.entities.Job.filter({}),
    base44.entities.Reputation.filter({ player_email: user.email }),
  ]);

  const charProfile = charProfiles.length > 0 ? charProfiles[0] : null;
  const pendingCount = recentJournal.filter(j => j.status === 'pending').length;

  if (pendingCount >= 3) {
    return Response.json({ error: 'Resolve existing events first (max 3 pending)' }, { status: 400 });
  }

  const recentTitles = recentJournal.map(j => j.title);
  const playerReps = reputations.map(r => {
    const f = factions.find(fc => fc.id === r.faction_id);
    return `${f?.name || 'Unknown'}: ${r.score} (${r.rank})`;
  });

  const activeMissions = jobs.filter(j => j.assigned_to === user.email && j.status === 'in_progress');
  const contestedTerritories = territories.filter(t => t.status === 'contested' || t.status === 'hostile');

  const originData = user.origin_compiled || {};
  const originChoices = user.origin_choices || [];

  const charContext = charProfile ? `
CHARACTER DATA:
- Name: ${charProfile.character_name || user.callsign || 'Unknown'}
- Backstory: ${charProfile.backstory || 'Unknown'}
- Personality: ${charProfile.personality || 'Unknown'}
- Skills: ${charProfile.skills || 'general'}
- Weaknesses: ${charProfile.weaknesses || 'none known'}
- Faction Loyalty: ${charProfile.faction_loyalty || 'unaligned'}
- Goals: ${charProfile.goals || 'survival'}
- Origin: ${charProfile.origin || 'unknown'}
- Origin choices: ${originChoices.map(c => c.label).join(', ') || 'none'}
` : '';

  const prompt = `You are the narrative engine for DEAD SIGNAL, a post-apocalyptic survival game. Generate a personal narrative event for this operative.

${charContext}
OPERATIVE: ${user.callsign || 'Unknown'} (${user.email})
Reputation standings: ${playerReps.join(', ') || 'None'}
Active missions: ${activeMissions.map(m => m.title).join(', ') || 'None'}
Contested territories: ${contestedTerritories.map(t => t.name).join(', ') || 'None'}
Available factions: ${factions.map(f => `${f.name} [${f.tag}]`).join(', ')}

DO NOT repeat these recent event titles: ${recentTitles.join(', ') || 'None'}

Generate a narrative event with EXACTLY 3 choices. The event should:
- Be deeply personal, tied to the operative's backstory, skills, and weaknesses
- Reference real factions and territories
- Present a genuine moral dilemma or tactical decision
- Have choices that lead to different outcomes (reputation gains/losses, narrative consequences)
- Feel like a moment in a novel — atmospheric, immersive, and emotionally resonant
- Each choice should have a clear label and a brief effect description hint

Category must be one of: encounter, discovery, dilemma, crisis, opportunity

Pick a random faction from the list that would be relevant. Include its ID.
Pick a random territory from the list. Include its ID.`;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        narrative: { type: "string" },
        category: { type: "string" },
        choices: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              label: { type: "string" },
              effect_description: { type: "string" },
              reputation_delta: { type: "number" },
              outcome_narrative: { type: "string" }
            }
          }
        },
        related_faction_name: { type: "string" },
        related_territory_name: { type: "string" }
      }
    }
  });

  const relFaction = factions.find(f => f.name === result.related_faction_name);
  const relTerritory = territories.find(t => t.name === result.related_territory_name);

  const validCategories = ['encounter', 'discovery', 'dilemma', 'crisis', 'opportunity'];
  const category = validCategories.includes(result.category) ? result.category : 'encounter';

  const entry = await base44.entities.JournalEntry.create({
    player_email: user.email,
    title: result.title,
    narrative: result.narrative,
    category,
    status: 'pending',
    choices: (result.choices || []).map(c => ({
      id: c.id,
      label: c.label,
      effect_description: c.effect_description,
    })),
    related_faction_id: relFaction?.id || '',
    related_territory_id: relTerritory?.id || '',
  });

  // Store the full choice data in a temp structure for resolution
  await base44.auth.updateMe({
    pending_journal_choices: {
      ...(user.pending_journal_choices || {}),
      [entry.id]: result.choices,
    }
  });

  return Response.json({ status: 'ok', entry_id: entry.id });
});