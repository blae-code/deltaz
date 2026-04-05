import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

const ROWS = ['A', 'B', 'C', 'D', 'E'];
const COLS = [1, 2, 3, 4, 5];
const VALID_RISK_LEVELS = new Set(['low', 'moderate', 'high', 'critical']);
const VALID_SECTORS = new Set(ROWS.flatMap((row) => COLS.map((col) => `${row}-${col}`)));

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [territories, factions, jobs, events, scavengeRuns, diplomacy] = await Promise.all([
      base44.asServiceRole.entities.Territory.filter({}),
      base44.asServiceRole.entities.Faction.filter({}),
      base44.asServiceRole.entities.Job.filter({}),
      base44.asServiceRole.entities.Event.filter({}),
      base44.asServiceRole.entities.ScavengeRun.filter({}),
      base44.asServiceRole.entities.Diplomacy.filter({}),
    ]);

    const sectorData = buildSectorData();
    const territoryById = new Map(territories.map((territory) => [territory.id, territory]));
    const factionById = new Map(factions.map((faction) => [faction.id, faction]));

    for (const territory of territories) {
      if (!territory.sector || !sectorData[territory.sector]) continue;
      sectorData[territory.sector].territory = territory;
      sectorData[territory.sector].threatLevel = territory.threat_level || 'minimal';
      sectorData[territory.sector].status = territory.status || 'uncharted';
      sectorData[territory.sector].controllingFaction = territory.controlling_faction_id || null;
      sectorData[territory.sector].resources = Array.isArray(territory.resources) ? territory.resources : [];
    }

    for (const job of jobs) {
      const sector = territoryById.get(job.territory_id)?.sector;
      if (!sector || !sectorData[sector]) continue;
      if (job.status === 'available' || job.status === 'in_progress') sectorData[sector].activeJobs++;
      if (job.status === 'completed') sectorData[sector].completedJobs++;
      if (job.status === 'failed') sectorData[sector].failedJobs++;
      if (job.type === 'elimination' || job.type === 'sabotage') sectorData[sector].combatEvents++;
    }

    const threeDaysAgo = Date.now() - (3 * 86400000);
    for (const event of events) {
      const sector = territoryById.get(event.territory_id)?.sector;
      if (!sector || !sectorData[sector]) continue;
      const createdAt = Date.parse(event.created_date || '');
      if (Number.isFinite(createdAt) && createdAt > threeDaysAgo) sectorData[sector].recentEvents++;
      if (event.type === 'faction_conflict') sectorData[sector].factionConflicts++;
      if (event.severity === 'critical' || event.severity === 'emergency') sectorData[sector].combatEvents++;
    }

    for (const run of scavengeRuns) {
      const sector = territoryById.get(run.territory_id)?.sector;
      if (!sector || !sectorData[sector]) continue;
      sectorData[sector].scavengeRuns++;
      if (run.status === 'failed') sectorData[sector].scavengeFails++;
    }

    const hostileRelations = diplomacy.filter((relationship) => relationship.status === 'war' || relationship.status === 'hostile');
    for (const sector of Object.keys(sectorData)) {
      const controllingFaction = sectorData[sector].controllingFaction;
      if (!controllingFaction) continue;
      const tensionCount = hostileRelations.filter((relationship) =>
        relationship.faction_a_id === controllingFaction || relationship.faction_b_id === controllingFaction
      ).length;
      sectorData[sector].factionConflicts += tensionCount;
    }

    const sectorScores = calculateSectorScores(sectorData);
    const sortedSectors = Object.entries(sectorScores).sort((a, b) => b[1] - a[1]);
    const hotSectors = sortedSectors.slice(0, 10).map(([sector, score]) => {
      const data = sectorData[sector];
      return `${sector}: score=${score}, status=${data.status}, threat=${data.threatLevel}, `
        + `combat=${data.combatEvents}, active_jobs=${data.activeJobs}, `
        + `failed=${data.failedJobs}, scav_fails=${data.scavengeFails}, `
        + `faction_conflicts=${data.factionConflicts}, recent_events=${data.recentEvents}, `
        + `resources=[${data.resources.join(',')}], `
        + `controller=${factionById.get(data.controllingFaction)?.name || 'none'}`;
    });

    const predictions = await generatePredictions(base44, hotSectors, hostileRelations, factions, sortedSectors);

    return Response.json({
      sector_scores: sectorScores,
      predictions,
      summary: {
        total_sectors: ROWS.length * COLS.length,
        critical_sectors: Object.values(sectorScores).filter((score) => score >= 70).length,
        high_sectors: Object.values(sectorScores).filter((score) => score >= 50 && score < 70).length,
        active_conflicts: hostileRelations.length,
      },
    });
  } catch (error) {
    console.error('Threat analysis error:', error);
    return Response.json({ error: getErrorMessage(error) }, { status: 500 });
  }
});

async function generatePredictions(base44, hotSectors, hostileRelations, factions, sortedSectors) {
  try {
    const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are ARTEMIS, a military AI analyzing a post-apocalyptic territory threat map.

Here are the top 10 sectors by activity/danger score:
${hotSectors.join('\n')}

Active hostile diplomacy: ${hostileRelations.map((relationship) => {
  const factionA = factions.find((faction) => faction.id === relationship.faction_a_id)?.name || '?';
  const factionB = factions.find((faction) => faction.id === relationship.faction_b_id)?.name || '?';
  return `${factionA} vs ${factionB} (${relationship.status})`;
}).join(', ') || 'none'}

Generate risk predictions for the TOP 5 most dangerous sectors. For each, provide:
- sector code
- risk_level (low/moderate/high/critical)
- prediction: 1-2 sentence tactical prediction about likely near-term developments
- recommended_action: brief tactical recommendation

Be gritty, tactical, and specific. Reference faction names and resource types.`,
      response_json_schema: {
        type: 'object',
        properties: {
          predictions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                sector: { type: 'string' },
                risk_level: { type: 'string' },
                prediction: { type: 'string' },
                recommended_action: { type: 'string' },
              },
            },
          },
        },
      },
    });

    const parsedPredictions = sanitizePredictions(response?.predictions);
    if (parsedPredictions.length > 0) {
      return parsedPredictions;
    }
  } catch (_) {}

  return buildFallbackPredictions(sortedSectors);
}

function buildSectorData() {
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

  return sectorData;
}

function calculateSectorScores(sectorData) {
  const threatBase = { minimal: 5, low: 12, moderate: 25, high: 40, critical: 55 };
  const statusBase = { secured: 0, uncharted: 5, contested: 18, hostile: 25 };
  const scores = {};

  for (const sector of Object.keys(sectorData)) {
    const data = sectorData[sector];
    let score = 0;

    score += threatBase[data.threatLevel] || 10;
    score += statusBase[data.status] || 5;
    score += data.combatEvents * 8;
    score += data.activeJobs * 3;
    score += data.failedJobs * 6;
    score += data.scavengeFails * 5;
    score += data.factionConflicts * 10;
    score += data.recentEvents * 4;
    score += Math.min(data.scavengeRuns, 10) * 2;

    scores[sector] = Math.min(100, Math.max(0, Math.round(score)));
  }

  return scores;
}

function sanitizePredictions(predictions) {
  if (!Array.isArray(predictions)) {
    return [];
  }

  return predictions
    .map((prediction) => {
      const sector = normalizeString(prediction?.sector, 16).toUpperCase();
      const riskLevel = normalizeString(prediction?.risk_level, 16).toLowerCase();
      const narrative = normalizeString(prediction?.prediction, 280);
      const recommendedAction = normalizeString(prediction?.recommended_action, 180);

      if (!VALID_SECTORS.has(sector) || !VALID_RISK_LEVELS.has(riskLevel) || !narrative || !recommendedAction) {
        return null;
      }

      return {
        sector,
        risk_level: riskLevel,
        prediction: narrative,
        recommended_action: recommendedAction,
      };
    })
    .filter(Boolean)
    .slice(0, 5);
}

function buildFallbackPredictions(sortedSectors) {
  return sortedSectors.slice(0, 5).map(([sector, score]) => ({
    sector,
    risk_level: score >= 70 ? 'critical' : score >= 50 ? 'high' : score >= 30 ? 'moderate' : 'low',
    prediction: `Sector ${sector} shows elevated threat indicators.`,
    recommended_action: 'Exercise extreme caution. Avoid solo operations.',
  }));
}

function normalizeString(value, maxLength = 255) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : 'Unexpected error';
}
