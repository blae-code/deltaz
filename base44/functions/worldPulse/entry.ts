import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  // Gather current world state
  const [factions, territories, jobs, events, recentIntel] = await Promise.all([
    base44.asServiceRole.entities.Faction.filter({}),
    base44.asServiceRole.entities.Territory.filter({}),
    base44.asServiceRole.entities.Job.filter({}),
    base44.asServiceRole.entities.Event.filter({}, '-created_date', 10),
    base44.asServiceRole.entities.IntelFeed.filter({}, '-created_date', 5),
  ]);

  const worldState = {
    factions: factions.map(f => ({
      name: f.name, tag: f.tag, status: f.status,
      territory_count: f.territory_count, member_count: f.member_count
    })),
    territories: territories.map(t => ({
      name: t.name, sector: t.sector, status: t.status,
      threat_level: t.threat_level, resources: t.resources,
      controller: factions.find(f => f.id === t.controlling_faction_id)?.name || 'unclaimed'
    })),
    active_missions: jobs.filter(j => j.status === 'available' || j.status === 'in_progress').length,
    completed_missions: jobs.filter(j => j.status === 'completed').length,
    failed_missions: jobs.filter(j => j.status === 'failed').length,
    recent_events: events.slice(0, 5).map(e => e.title),
    recent_intel: recentIntel.map(i => i.title),
  };

  const prompt = `You are the AI "GHOST PROTOCOL" intelligence engine for a post-apocalyptic tactical operations game called DEAD SIGNAL.

Current world state:
${JSON.stringify(worldState, null, 2)}

Generate exactly 3 new intel items. Each must be different in category and feel organic, like intercepted communications, field reports, or analytical assessments. Make them reference ACTUAL factions, territories, and events from the world state above. Be creative, gritty, and immersive.

Categories to choose from: rumor, mission_brief, faction_intel, world_event, anomaly_report, tactical_advisory

Rules:
- Reference real faction names and territory names from the data
- Each item should hint at emerging threats, opportunities, or shifting alliances
- Vary severity across items
- Keep titles punchy (under 10 words), content 2-4 sentences
- Include an in-world source name (e.g. "SIGINT-7 intercept", "Operative JACKAL", "Automated recon drone")
- Do NOT repeat topics from recent_intel
- Give each item an expiry time in hours (4-48)`;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              content: { type: "string" },
              category: { type: "string" },
              severity: { type: "string" },
              source: { type: "string" },
              expires_in_hours: { type: "number" },
              related_faction_name: { type: "string" },
              related_territory_name: { type: "string" }
            }
          }
        }
      }
    }
  });

  const created = [];

  for (const item of result.items) {
    const relFaction = factions.find(f => f.name === item.related_faction_name);
    const relTerritory = territories.find(t => t.name === item.related_territory_name);
    const expiresAt = new Date(Date.now() + (item.expires_in_hours || 24) * 3600000).toISOString();

    const record = await base44.asServiceRole.entities.IntelFeed.create({
      title: item.title,
      content: item.content,
      category: item.category,
      severity: item.severity || 'medium',
      source: item.source,
      related_faction_id: relFaction?.id || '',
      related_territory_id: relTerritory?.id || '',
      is_active: true,
      expires_at: expiresAt,
    });
    created.push(record);
  }

  return Response.json({ status: 'ok', generated: created.length });
});