import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Gather all relevant data for threat analysis
    const [territories, factions, jobs, events, scavengeRuns, diplomacy] = await Promise.all([
      base44.asServiceRole.entities.Territory.filter({}),
      base44.asServiceRole.entities.Faction.filter({}),
      base44.asServiceRole.entities.Job.filter({}),
      base44.asServiceRole.entities.Event.filter({}),
      base44.asServiceRole.entities.ScavengeRun.filter({}),
      base44.asServiceRole.entities.Diplomacy.filter({}),
    ]);

    const ROWS = ['A', 'B', 'C', 'D', 'E'];
    const COLS = [1, 2, 3, 4, 5];

    // Build per-sector activity data
    const sectorData = {};
    for (const row of ROWS) {
      for (const col of COLS) {
        const sector = `${row}-${col}`;
        sectorData[sector] = {
          sector,
          territory: null,
          combatEvents: 0,
          activeJobs: 0,
          completedJobs: 0,
          failedJobs: 0,
          scavengeRuns: 0,
          scavengeFails: 0,
          factionConflicts: 0,
          recentEvents: 0,
          threatLevel: 'minimal',
          controllingFaction: null,
          status: 'uncharted',
          resources: [],
        };
      }
    }

    // Map territories to sectors
    for (const t of territories) {
      if (t.sector && sectorData[t.sector]) {
        sectorData[t.sector].territory = t;
        sectorData[t.sector].threatLevel = t.threat_level || 'minimal';
        sectorData[t.sector].status = t.status || 'uncharted';
        sectorData[t.sector].controllingFaction = t.controlling_faction_id;
        sectorData[t.sector].resources = t.resources || [];
      }
    }

    // Count job activity per sector
    for (const j of jobs) {
      const t = territories.find(tr => tr.id === j.territory_id);
      const sector = t?.sector;
      if (!sector || !sectorData[sector]) continue;
      if (j.status === 'available' || j.status === 'in_progress') sectorData[sector].activeJobs++;
      if (j.status === 'completed') sectorData[sector].completedJobs++;
      if (j.status === 'failed') sectorData[sector].failedJobs++;
      if (j.type === 'elimination' || j.type === 'sabotage') sectorData[sector].combatEvents++;
    }

    // Count event activity per sector
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 86400000);
    for (const e of events) {
      const sector = territories.find(t => t.id === e.territory_id)?.sector;
      if (sector && sectorData[sector]) {
        if (new Date(e.created_date) > threeDaysAgo) sectorData[sector].recentEvents++;
        if (e.type === 'faction_conflict') sectorData[sector].factionConflicts++;
        if (e.severity === 'critical' || e.severity === 'emergency') sectorData[sector].combatEvents++;
      }
    }

    // Count scavenge activity per sector
    for (const sr of scavengeRuns) {
      const t = territories.find(tr => tr.id === sr.territory_id);
      const sector = t?.sector;
      if (!sector || !sectorData[sector]) continue;
      sectorData[sector].scavengeRuns++;
      if (sr.status === 'failed') sectorData[sector].scavengeFails++;
    }

    // Count faction tensions affecting sectors
    const hostileRelations = diplomacy.filter(d => d.status === 'war' || d.status === 'hostile');
    for (const sector in sectorData) {
      const sd = sectorData[sector];
      if (!sd.controllingFaction) continue;
      const tensionCount = hostileRelations.filter(d =>
        d.faction_a_id === sd.controllingFaction || d.faction_b_id === sd.controllingFaction
      ).length;
      sd.factionConflicts += tensionCount;
    }

    // Calculate heat scores (0-100)
    const sectorScores = {};
    for (const sector in sectorData) {
      const sd = sectorData[sector];
      let score = 0;

      // Base threat contributes 0-30
      const threatBase = { minimal: 5, low: 12, moderate: 25, high: 40, critical: 55 };
      score += threatBase[sd.threatLevel] || 10;

      // Territory status contributes 0-20
      const statusBase = { secured: 0, uncharted: 5, contested: 18, hostile: 25 };
      score += statusBase[sd.status] || 5;

      // Combat/elimination missions: +8 each
      score += sd.combatEvents * 8;

      // Active jobs = activity = risk: +3 each
      score += sd.activeJobs * 3;

      // Failed jobs/scavenges = danger: +6 each
      score += sd.failedJobs * 6;
      score += sd.scavengeFails * 5;

      // Faction conflicts: +10 each
      score += sd.factionConflicts * 10;

      // Recent events: +4 each
      score += sd.recentEvents * 4;

      // High scavenge activity = contested resources: +2 each
      score += Math.min(sd.scavengeRuns, 10) * 2;

      sectorScores[sector] = Math.min(100, Math.max(0, Math.round(score)));
    }

    // Use AI to generate risk predictions
    const hotSectors = Object.entries(sectorScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([sector, score]) => {
        const sd = sectorData[sector];
        return `${sector}: score=${score}, status=${sd.status}, threat=${sd.threatLevel}, `
          + `combat=${sd.combatEvents}, active_jobs=${sd.activeJobs}, `
          + `failed=${sd.failedJobs}, scav_fails=${sd.scavengeFails}, `
          + `faction_conflicts=${sd.factionConflicts}, recent_events=${sd.recentEvents}, `
          + `resources=[${sd.resources.join(',')}], `
          + `controller=${factions.find(f => f.id === sd.controllingFaction)?.name || 'none'}`;
      });

    let aiPredictions = [];
    try {
      const resp = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are ARTEMIS, a military AI analyzing a post-apocalyptic territory threat map.

Here are the top 10 sectors by activity/danger score:
${hotSectors.join('\n')}

Active hostile diplomacy: ${hostileRelations.map(d => {
  const fA = factions.find(f => f.id === d.faction_a_id)?.name || '?';
  const fB = factions.find(f => f.id === d.faction_b_id)?.name || '?';
  return `${fA} vs ${fB} (${d.status})`;
}).join(', ') || 'none'}

Generate risk predictions for the TOP 5 most dangerous sectors. For each, provide:
- sector code
- risk_level (low/moderate/high/critical)
- prediction: 1-2 sentence tactical prediction about likely near-term developments
- recommended_action: brief tactical recommendation

Be gritty, tactical, and specific. Reference faction names and resource types.`,
        response_json_schema: {
          type: "object",
          properties: {
            predictions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  sector: { type: "string" },
                  risk_level: { type: "string" },
                  prediction: { type: "string" },
                  recommended_action: { type: "string" },
                }
              }
            }
          }
        }
      });
      aiPredictions = resp.predictions || [];
    } catch (_) {
      // Fallback: generate basic predictions from data
      const top5 = Object.entries(sectorScores).sort((a, b) => b[1] - a[1]).slice(0, 5);
      aiPredictions = top5.map(([sector, score]) => ({
        sector,
        risk_level: score >= 70 ? 'critical' : score >= 50 ? 'high' : score >= 30 ? 'moderate' : 'low',
        prediction: `Sector ${sector} shows elevated threat indicators.`,
        recommended_action: 'Exercise extreme caution. Avoid solo operations.',
      }));
    }

    return Response.json({
      sector_scores: sectorScores,
      predictions: aiPredictions,
      summary: {
        total_sectors: 25,
        critical_sectors: Object.values(sectorScores).filter(s => s >= 70).length,
        high_sectors: Object.values(sectorScores).filter(s => s >= 50 && s < 70).length,
        active_conflicts: hostileRelations.length,
      }
    });
  } catch (err) {
    console.error('Threat analysis error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});