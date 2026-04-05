import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const [factions, territories, jobs] = await Promise.all([
    base44.asServiceRole.entities.Faction.filter({}),
    base44.asServiceRole.entities.Territory.filter({}),
    base44.asServiceRole.entities.Job.filter({}),
  ]);

  const activeJobs = jobs.filter(j => j.status === 'available' || j.status === 'in_progress');
  const contestedZones = territories.filter(t => t.status === 'contested' || t.status === 'hostile');
  const activeFactions = factions.filter(f => f.status === 'active');

  const prompt = `You are MISSION FORGE, the tactical operations AI for a post-apocalyptic game called DEAD SIGNAL.

Current state:
- Active factions: ${activeFactions.map(f => `${f.name} [${f.tag}] (${f.territory_count} territories)`).join(', ')}
- Contested/hostile territories: ${contestedZones.map(t => `${t.name} (${t.sector}, threat: ${t.threat_level}, status: ${t.status})`).join(', ') || 'none'}
- All territories: ${territories.map(t => `${t.name} (${t.sector}, controlled by: ${factions.find(f => f.id === t.controlling_faction_id)?.name || 'unclaimed'}, resources: ${(t.resources || []).join('/')})`).join('; ')}
- Current active missions: ${activeJobs.length} (types: ${[...new Set(activeJobs.map(j => j.type))].join(', ') || 'none'})
- Recently completed: ${jobs.filter(j => j.status === 'completed').length}, Failed: ${jobs.filter(j => j.status === 'failed').length}

Generate exactly 2 new missions that:
- Reference REAL faction names and territory names from the data above
- Fill gaps in mission type coverage (current types: ${[...new Set(activeJobs.map(j => j.type))].join(', ')})
- Vary in difficulty (routine, hazardous, critical, suicide)
- Have compelling, gritty briefings (2-3 sentences)
- Include reputation rewards proportional to difficulty (routine: 5-10, hazardous: 15-25, critical: 30-50, suicide: 60-100)
- Set expiry between 12-72 hours from now
- If contested territories exist, at least one mission should involve them`;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: "object",
      properties: {
        missions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              type: { type: "string" },
              difficulty: { type: "string" },
              reward_reputation: { type: "number" },
              reward_description: { type: "string" },
              expires_in_hours: { type: "number" },
              faction_name: { type: "string" },
              territory_name: { type: "string" }
            }
          }
        }
      }
    }
  });

  const created = [];
  for (const m of result.missions) {
    const faction = factions.find(f => f.name === m.faction_name);
    const territory = territories.find(t => t.name === m.territory_name);
    const expiresAt = new Date(Date.now() + (m.expires_in_hours || 24) * 3600000).toISOString();

    const validTypes = ['recon', 'extraction', 'sabotage', 'escort', 'scavenge', 'elimination'];
    const jobType = validTypes.includes(m.type) ? m.type : 'recon';
    const validDifficulty = ['routine', 'hazardous', 'critical', 'suicide'];
    const difficulty = validDifficulty.includes(m.difficulty) ? m.difficulty : 'routine';

    const record = await base44.asServiceRole.entities.Job.create({
      title: m.title,
      description: m.description,
      type: jobType,
      difficulty,
      status: 'available',
      faction_id: faction?.id || '',
      territory_id: territory?.id || '',
      reward_reputation: m.reward_reputation || 10,
      reward_description: m.reward_description || '',
      expires_at: expiresAt,
    });
    created.push(record);
  }

  return Response.json({ status: 'ok', generated: created.length, missions: created.map(c => c.title) });
});