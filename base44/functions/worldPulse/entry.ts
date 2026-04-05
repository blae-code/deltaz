import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Allow both admin manual trigger and scheduled automation (no user context)
  let isAdmin = false;
  try {
    const user = await base44.auth.me();
    if (user?.role === 'admin') isAdmin = true;
  } catch (_) {
    // Scheduled automation — no user context, proceed with service role
  }

  // Gather current world state
  const [factions, territories, jobs, recentEvents, recentIntel, economies] = await Promise.all([
    base44.asServiceRole.entities.Faction.filter({}),
    base44.asServiceRole.entities.Territory.filter({}),
    base44.asServiceRole.entities.Job.filter({}),
    base44.asServiceRole.entities.Event.filter({}, '-created_date', 10),
    base44.asServiceRole.entities.IntelFeed.filter({}, '-created_date', 5),
    base44.asServiceRole.entities.FactionEconomy.filter({}),
  ]);

  const worldState = {
    factions: factions.map(f => {
      const econ = economies.find(e => e.faction_id === f.id);
      return {
        name: f.name, tag: f.tag, status: f.status,
        territory_count: f.territory_count, member_count: f.member_count,
        wealth: econ?.wealth || 0,
        under_embargo: econ?.trade_embargo || false,
      };
    }),
    territories: territories.map(t => ({
      name: t.name, sector: t.sector, status: t.status,
      threat_level: t.threat_level, resources: t.resources,
      controller: factions.find(f => f.id === t.controlling_faction_id)?.name || 'unclaimed'
    })),
    active_missions: jobs.filter(j => j.status === 'available' || j.status === 'in_progress').length,
    completed_missions: jobs.filter(j => j.status === 'completed').length,
    failed_missions: jobs.filter(j => j.status === 'failed').length,
    recent_events: recentEvents.slice(0, 5).map(e => e.title),
    recent_intel: recentIntel.map(i => i.title),
  };

  const prompt = `You are GHOST PROTOCOL — the sardonic, darkly humorous AI intelligence engine for a post-apocalyptic tactical HQ called DEAD SIGNAL, based on the game HumanitZ. You have a war correspondent's eye for drama and a comedian's timing for gallows humour. You've watched civilizations crumble and still find time for one-liners.

Current world state:
${JSON.stringify(worldState, null, 2)}

Your job: generate a "World Pulse" — a batch of dynamic content that makes the game world feel alive, dangerous, and darkly entertaining. Generate exactly:

1. **3 Intel Items** (for the intelligence feed)
   - Categories: rumor, mission_brief, faction_intel, world_event, anomaly_report, tactical_advisory
   - Include an in-world source (e.g. "SIGINT-7 intercept", "Operative JACKAL", "Automated recon drone", "A suspiciously cheerful trader")
   - Severity: low, medium, high, or critical
   - Expiry: 4-48 hours

2. **2 World Events** (for the combat log / live feed)
   - Types: world_event, faction_conflict, anomaly, broadcast, system_alert
   - Severity: info, warning, critical, or emergency
   - These appear in the live combat log so make them punchy and dramatic

Rules:
- Reference ACTUAL faction names and territory names from the data above
- Never repeat titles from recent_events or recent_intel
- Each item should hint at emerging threats, shifting alliances, resource conflicts, or mysterious anomalies
- Vary severity and tone — mix tense warnings with darkly funny rumors and ominous discoveries
- Titles should be punchy (under 10 words), content 2-4 sentences
- Be gritty, atmospheric, and immersive with a thread of dark humour woven through
- Think: "What if a war journalist and a stand-up comedian had to write dispatches from the apocalypse?"
- NEVER use real player names — only callsigns`;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: "object",
      properties: {
        intel_items: {
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
        },
        world_events: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              content: { type: "string" },
              type: { type: "string" },
              severity: { type: "string" },
              related_faction_name: { type: "string" },
              related_territory_name: { type: "string" }
            }
          }
        }
      }
    }
  });

  const intelCreated = [];
  const eventsCreated = [];

  // Create Intel items
  for (const item of (result.intel_items || [])) {
    const relFaction = factions.find(f => f.name === item.related_faction_name);
    const relTerritory = territories.find(t => t.name === item.related_territory_name);
    const expiresAt = new Date(Date.now() + (item.expires_in_hours || 24) * 3600000).toISOString();

    const record = await base44.asServiceRole.entities.IntelFeed.create({
      title: item.title,
      content: item.content,
      category: item.category || 'rumor',
      severity: item.severity || 'medium',
      source: item.source || 'GHOST PROTOCOL',
      related_faction_id: relFaction?.id || '',
      related_territory_id: relTerritory?.id || '',
      is_active: true,
      expires_at: expiresAt,
    });
    intelCreated.push(record);
  }

  // Create World Events (these power the Combat Log and Live Feed)
  for (const ev of (result.world_events || [])) {
    const relFaction = factions.find(f => f.name === ev.related_faction_name);
    const relTerritory = territories.find(t => t.name === ev.related_territory_name);

    const record = await base44.asServiceRole.entities.Event.create({
      title: ev.title,
      content: ev.content,
      type: ev.type || 'broadcast',
      severity: ev.severity || 'info',
      territory_id: relTerritory?.id || '',
      faction_id: relFaction?.id || '',
      is_active: true,
    });
    eventsCreated.push(record);
  }

  return Response.json({
    status: 'ok',
    intel_generated: intelCreated.length,
    events_generated: eventsCreated.length,
  });
});