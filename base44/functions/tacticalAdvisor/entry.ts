import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const playerQuestion = body.question || '';

  const [factions, territories, jobs, reps, repLogs, intel, events] = await Promise.all([
    base44.asServiceRole.entities.Faction.filter({}),
    base44.asServiceRole.entities.Territory.filter({}),
    base44.asServiceRole.entities.Job.filter({}),
    base44.entities.Reputation.filter({ player_email: user.email }),
    base44.entities.ReputationLog.filter({ player_email: user.email }, '-created_date', 10),
    base44.asServiceRole.entities.IntelFeed.filter({ is_active: true }, '-created_date', 5),
    base44.asServiceRole.entities.Event.filter({ is_active: true }, '-created_date', 5),
  ]);

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

  const prompt = `You are ARTEMIS, the tactical AI advisor embedded in the DEAD SIGNAL field terminal. You're a sardonic, battle-hardened AI with dark humour who's seen too many operatives come and go. You address the operative by callsign "${user.callsign || 'Operative'}".

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