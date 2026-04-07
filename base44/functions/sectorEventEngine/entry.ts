import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow admin manual trigger and scheduled automation
    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    } catch (_) {
      // Scheduled automation — no user, proceed
    }

    const [factions, territories, economies, diplomacy, recentEvents, recentBroadcasts] = await Promise.all([
      base44.asServiceRole.entities.Faction.filter({}),
      base44.asServiceRole.entities.Territory.filter({}),
      base44.asServiceRole.entities.FactionEconomy.filter({}),
      base44.asServiceRole.entities.Diplomacy.filter({}),
      base44.asServiceRole.entities.Event.filter({}, '-created_date', 10),
      base44.asServiceRole.entities.Broadcast.filter({}, '-created_date', 5),
    ]);

    const activeFactions = factions.filter(f => f.status === 'active');

    // Build territory context with controlling faction
    const territoryContext = territories.map(t => {
      const ctrl = factions.find(f => f.id === t.controlling_faction_id);
      const neighbors = territories
        .filter(nt => nt.id !== t.id && nt.sector && t.sector)
        .filter(nt => {
          const [rA, cA] = parseSector(t.sector);
          const [rB, cB] = parseSector(nt.sector);
          return Math.abs(rA - rB) <= 1 && Math.abs(cA - cB) <= 1;
        })
        .map(nt => nt.name);
      return {
        name: t.name, sector: t.sector, status: t.status,
        threat_level: t.threat_level,
        resources: t.resources || [],
        controller: ctrl?.name || 'unclaimed',
        controller_tag: ctrl?.tag || '???',
        nearby: neighbors.slice(0, 4),
      };
    });

    // Diplomacy summary
    const diploContext = diplomacy.map(d => {
      const fA = factions.find(f => f.id === d.faction_a_id);
      const fB = factions.find(f => f.id === d.faction_b_id);
      return fA && fB ? `${fA.name} ↔ ${fB.name}: ${d.status}` : null;
    }).filter(Boolean);

    // Economy summary
    const ecoContext = activeFactions.map(f => {
      const eco = economies.find(e => e.faction_id === f.id);
      if (!eco) return null;
      const prod = eco.resource_production || {};
      return {
        name: f.name, tag: f.tag,
        wealth: eco.wealth || 0,
        embargo: eco.trade_embargo || false,
        fuel: prod.fuel || 0, metals: prod.metals || 0,
        tech: prod.tech || 0, food: prod.food || 0,
        munitions: prod.munitions || 0,
      };
    }).filter(Boolean);

    const prompt = `You are SECTOR EVENT ENGINE for DEAD SIGNAL — a post-apocalyptic tactical operations system.

=== TERRITORIES ===
${JSON.stringify(territoryContext, null, 1)}

=== ACTIVE FACTIONS ===
${activeFactions.map(f => `${f.name} [${f.tag}] — ${f.status}, members: ${f.member_count || '?'}`).join('\n')}

=== FACTION ECONOMIES ===
${JSON.stringify(ecoContext, null, 1)}

=== DIPLOMACY ===
${diploContext.join('\n') || 'No formal relations.'}

=== RECENT EVENTS (avoid repeats) ===
${recentEvents.slice(0, 5).map(e => e.title).join('\n')}

=== INSTRUCTIONS ===
Generate exactly 3 random SECTOR EVENTS that shake up the game world. Each event is a major environmental or logistical occurrence in a specific sector.

EVENT TYPES (pick a mix):
- environmental_hazard: toxic storms, radiation spikes, wildfire, seismic activity, flash floods
- supply_drop: military airdrop, crashed convoy, abandoned cache, humanitarian supplies
- anomaly: strange signals, unexplained phenomenon, tech malfunction, wildlife swarm
- resource_surge: mineral vein discovered, fertile land, fuel reservoir found
- infrastructure_collapse: bridge destroyed, power grid failure, water contamination
- hostile_incursion: bandit raid, mutant horde, rogue military, marauders

For EACH sector event generate:
1. The event itself (title, description, severity, type, target sector/territory)
2. A BROADCAST transmission (urgent in-world radio message about the event)
3. A MISSION generated as a response (faction sends operatives to investigate/exploit)

RULES:
- Use REAL territory names and sector codes from the data
- Each event should affect a DIFFERENT sector
- Match missions to the controlling faction of the territory (or nearest active faction if unclaimed)
- If a faction has economic weaknesses, favor events that create opportunities or threats related to those resources
- Broadcasts should be dramatic, in-character radio transmissions with a gritty tone
- Missions should logically follow from the event (e.g. hazard → recon, supply drop → scavenge, hostiles → elimination)
- Vary severity: at least one warning-level and one critical-level event
- NEVER repeat titles from recent events listed above
- mission_type must be one of: recon, extraction, sabotage, escort, scavenge, elimination
- mission_difficulty must be one of: routine, hazardous, critical, suicide
- broadcast_channel must be one of: emergency, territory_alert, conflict, faction_comm
- event_type for the world event must be one of: world_event, faction_conflict, anomaly, broadcast, system_alert`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          sector_events: {
            type: "array",
            items: {
              type: "object",
              properties: {
                // The event
                event_title: { type: "string" },
                event_description: { type: "string" },
                event_type: { type: "string" },
                event_severity: { type: "string" },
                event_category: { type: "string" },
                target_territory_name: { type: "string" },
                target_sector: { type: "string" },
                affected_resources: { type: "array", items: { type: "string" } },
                // The broadcast
                broadcast_title: { type: "string" },
                broadcast_content: { type: "string" },
                broadcast_channel: { type: "string" },
                broadcast_severity: { type: "string" },
                broadcast_faction_name: { type: "string" },
                // The mission
                mission_title: { type: "string" },
                mission_description: { type: "string" },
                mission_type: { type: "string" },
                mission_difficulty: { type: "string" },
                mission_faction_name: { type: "string" },
                mission_reward_reputation: { type: "number" },
                mission_reward_description: { type: "string" },
                mission_expires_hours: { type: "number" },
                // Territory effects
                territory_threat_change: { type: "string" },
              }
            }
          }
        }
      }
    });

    const validEventTypes = ['world_event', 'faction_conflict', 'anomaly', 'broadcast', 'system_alert'];
    const validJobTypes = ['recon', 'extraction', 'sabotage', 'escort', 'scavenge', 'elimination'];
    const validDifficulty = ['routine', 'hazardous', 'critical', 'suicide'];
    const validChannels = ['emergency', 'territory_alert', 'conflict', 'faction_comm', 'propaganda'];
    const validThreat = ['minimal', 'low', 'moderate', 'high', 'critical'];
    const validBroadcastSeverity = ['routine', 'urgent', 'critical', 'emergency'];

    const output = { events_created: 0, broadcasts_created: 0, missions_created: 0, territories_updated: 0, details: [] };

    for (const se of (result.sector_events || [])) {
      const territory = territories.find(t =>
        t.name === se.target_territory_name || t.sector === se.target_sector
      );
      const ctrlFaction = territory
        ? factions.find(f => f.id === territory.controlling_faction_id)
        : null;
      const missionFaction = factions.find(f => f.name === se.mission_faction_name) || ctrlFaction || activeFactions[0];
      const broadcastFaction = factions.find(f => f.name === se.broadcast_faction_name) || ctrlFaction;

      // 1. Create the world event
      const event = await base44.asServiceRole.entities.Event.create({
        title: se.event_title,
        content: se.event_description,
        type: validEventTypes.includes(se.event_type) ? se.event_type : 'world_event',
        severity: ['info', 'warning', 'critical', 'emergency'].includes(se.event_severity) ? se.event_severity : 'warning',
        territory_id: territory?.id || '',
        faction_id: ctrlFaction?.id || '',
        is_active: true,
      });
      output.events_created++;

      // 2. Create the broadcast
      const broadcast = await base44.asServiceRole.entities.Broadcast.create({
        channel: validChannels.includes(se.broadcast_channel) ? se.broadcast_channel : 'territory_alert',
        title: se.broadcast_title,
        content: se.broadcast_content,
        faction_id: broadcastFaction?.id || '',
        faction_name: broadcastFaction?.name || 'UNKNOWN',
        faction_color: broadcastFaction?.color || '#888',
        severity: validBroadcastSeverity.includes(se.broadcast_severity) ? se.broadcast_severity : 'urgent',
        territory_id: territory?.id || '',
        sector: territory?.sector || se.target_sector || '',
        is_pinned: se.event_severity === 'critical' || se.event_severity === 'emergency',
        auto_generated: true,
        expires_at: new Date(Date.now() + 24 * 3600000).toISOString(),
      });
      output.broadcasts_created++;

      // 3. Create the mission
      const expiresAt = new Date(Date.now() + (se.mission_expires_hours || 24) * 3600000).toISOString();
      const mission = await base44.asServiceRole.entities.Job.create({
        title: se.mission_title,
        description: se.mission_description,
        type: validJobTypes.includes(se.mission_type) ? se.mission_type : 'recon',
        difficulty: validDifficulty.includes(se.mission_difficulty) ? se.mission_difficulty : 'hazardous',
        status: 'available',
        faction_id: missionFaction?.id || '',
        territory_id: territory?.id || '',
        reward_reputation: se.mission_reward_reputation || 15,
        reward_description: se.mission_reward_description || '',
        expires_at: expiresAt,
      });
      output.missions_created++;

      // 4. Optionally update territory threat level
      if (territory && se.territory_threat_change && validThreat.includes(se.territory_threat_change)) {
        await base44.asServiceRole.entities.Territory.update(territory.id, {
          threat_level: se.territory_threat_change,
        });
        output.territories_updated++;
      }

      output.details.push({
        event: se.event_title,
        broadcast: se.broadcast_title,
        mission: se.mission_title,
        sector: territory?.sector || se.target_sector,
        category: se.event_category,
      });
    }

    return Response.json({ status: 'ok', ...output });
  } catch (err) {
    console.error('Sector Event Engine error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});

function parseSector(sector) {
  if (!sector) return [-1, -1];
  const parts = sector.split('-');
  if (parts.length !== 2) return [-1, -1];
  const row = 'ABCDE'.indexOf(parts[0].toUpperCase());
  const col = parseInt(parts[1]) - 1;
  return [row >= 0 ? row : -1, col >= 0 ? col : -1];
}
