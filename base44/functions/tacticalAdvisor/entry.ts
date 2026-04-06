import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const playerQuestion = body.question || '';

  const [factions, territories, jobs, reps, repLogs, intel, events, charProfiles] = await Promise.all([
    base44.asServiceRole.entities.Faction.filter({}),
    base44.asServiceRole.entities.Territory.filter({}),
    base44.asServiceRole.entities.Job.filter({}),
    base44.entities.Reputation.filter({ player_email: user.email }),
    base44.entities.ReputationLog.filter({ player_email: user.email }, '-created_date', 10),
    base44.asServiceRole.entities.IntelFeed.filter({ is_active: true }, '-created_date', 5),
    base44.asServiceRole.entities.Event.filter({ is_active: true }, '-created_date', 5),
    base44.asServiceRole.entities.CharacterProfile.filter({ player_email: user.email }, '-created_date', 1),
  ]);

  const charProfile = charProfiles.length > 0 ? charProfiles[0] : null;

  const playerReps = reps.map(r => {
    const f = factions.find(fc => fc.id === r.faction_id);
    return { faction: f?.name || 'Unknown', score: r.score, rank: r.rank };
  });

  const availableMissions = jobs.filter(j => j.status === 'available').map(j => ({
    title: j.title, type: j.type, difficulty: j.difficulty,
    faction: factions.find(f => f.id === j.faction_id)?.name || 'unknown',
    territory: territories.find(t => t.id === j.territory_id)?.name || 'unknown',
    reward: j.reward_reputation,
  }));

  const myActiveMissions = jobs.filter(j => j.assigned_to === user.email && j.status === 'in_progress').map(j => ({
    title: j.title, type: j.type, difficulty: j.difficulty,
  }));

  // Build deep origin context from user profile
  const originChoices = user.origin_choices;
  const originCompiled = user.origin_compiled;
  let originBlock = '';
  if (originChoices && originChoices.length > 0) {
    originBlock = `\nORIGIN STORY (the choices that forged this operative):\n${originChoices.map(c => `  [${c.step}]: "${c.label}"`).join('\n')}`;
    if (originCompiled) {
      originBlock += `\n  Origin archetype: ${originCompiled.origin_tags?.join(', ') || 'unknown'}`;
      originBlock += `\n  Primary skill from origin: ${originCompiled.primary_skill || 'general'}`;
      originBlock += `\n  Faction alignment from origin: ${originCompiled.faction_loyalty || 'unaligned'}`;
      originBlock += `\n  Driving goal: ${originCompiled.goal || 'survival'}`;
      if (originCompiled.weaknesses?.length) originBlock += `\n  Deep flaws: ${originCompiled.weaknesses.join('; ')}`;
      const statMods = originCompiled.stat_modifiers || {};
      const strengths = Object.entries(statMods).filter(([,v]) => v > 5).map(([k,v]) => `${k.replace(/_/g,' ')}:+${v}`);
      if (strengths.length) originBlock += `\n  Notable strengths: ${strengths.join(', ')}`;
    }
  }

  const charBlock = charProfile ? `
CHARACTER DOSSIER (use this DEEPLY — reference their origin story, backstory events, personality, and goals in every response):
- Character Name: ${charProfile.character_name || 'Not set'}
- Age: ${charProfile.age || 'Unknown'}
- Origin Tags: ${charProfile.origin || 'Unknown'}
- Primary Skill: ${charProfile.primary_skill || 'general'}
- Combat Rating: ${charProfile.combat_rating || 2}/10
- Backstory: ${charProfile.backstory || 'Not provided'}
- Personality: ${charProfile.personality || 'Not provided'}
- Skills: ${charProfile.skills || 'Not provided'}
- Weaknesses: ${charProfile.weaknesses || 'Not provided'}
- Appearance: ${charProfile.appearance || 'Not provided'}
- Faction Loyalty: ${charProfile.faction_loyalty || 'Not provided'}
- Goals: ${charProfile.goals || 'Not provided'}
- Catchphrase: ${charProfile.catchphrase || 'None'}
${originBlock}
` : '';

  const prompt = `You are ARTEMIS, the tactical AI advisor embedded in the DEAD SIGNAL field terminal. You're a sardonic, battle-hardened AI with dark humour who's seen too many operatives come and go. You address the operative by callsign "${user.callsign || 'Operative'}".
${charBlock}
IMPORTANT: If the operative has a CHARACTER DOSSIER and ORIGIN STORY above, you MUST:
- Reference their origin events naturally (e.g. "Given your military background..." or "After what you lost...")
- Recommend missions that align with their primary skill and faction loyalty
- Warn about threats that play on their weaknesses/flaws
- Connect current world events to their personal goals
- Make tactical advice feel personally tailored, not generic
- If they have a catchphrase, occasionally echo its sentiment

OPERATIVE PROFILE:
- Callsign: ${user.callsign || 'Undesignated'}
- Discord: ${user.discord_username || 'Unlinked'}
- Faction standings: ${playerReps.length > 0 ? playerReps.map(r => `${r.faction}: ${r.score} (${r.rank})`).join(', ') : 'No faction data'}
- Active missions: ${myActiveMissions.length > 0 ? myActiveMissions.map(m => `${m.title} (${m.difficulty} ${m.type})`).join(', ') : 'None'}
- Recent reputation changes: ${repLogs.slice(0, 5).map(l => `${l.reason} (${l.delta > 0 ? '+' : ''}${l.delta})`).join(', ') || 'None'}

WORLD SITUATION:
- Available missions: ${availableMissions.map(m => `"${m.title}" — ${m.difficulty} ${m.type} in ${m.territory} for ${m.faction} (+${m.reward} rep)`).join('; ') || 'None'}
- Active events: ${events.map(e => `${e.title} (${e.severity})`).join(', ') || 'None'}
- Latest intel: ${intel.map(i => `${i.title} — ${i.content?.substring(0, 80)}`).join('; ') || 'None'}
- Contested territories: ${territories.filter(t => t.status === 'contested' || t.status === 'hostile').map(t => t.name).join(', ') || 'None'}

${playerQuestion ? `The operative asks: "${playerQuestion}"` : 'Give a strategic briefing: recommend the best mission to take next, warn about threats, and suggest how to improve faction standing. Be specific — reference real missions, factions, and territories.'}

Respond in 3-5 sentences. Be tactical, direct, and darkly witty. Use gallows humour — the wasteland is grim but your operative needs a reason to laugh. Reference specific data from above. NEVER use real names, only callsigns.`;

  const response = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });

  return Response.json({ advisory: response, callsign: user.callsign || 'Operative' });
});