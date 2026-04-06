import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Reputation awards for mission difficulty
const MISSION_REP = {
  routine: 5,
  hazardous: 15,
  critical: 30,
  suicide: 50,
};

// Reputation awards for OpsLog event types
const OPS_REP = {
  combat_kill: 3,
  combat_raid: 10,
  base_breach: -5,
  territory_capture: 20,
  territory_lost: -10,
  trade_completed: 2,
  airdrop: 1,
  vehicle_destroyed: 5,
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => null);
    if (!body) {
      return Response.json({ error: 'No payload' }, { status: 400 });
    }

    const { event, data, old_data } = body;
    if (!event || !data) {
      return Response.json({ skipped: true, reason: 'no event or data' });
    }

    const results = [];

    // --- MISSION COMPLETED ---
    if (event.entity_name === 'Job' && event.type === 'update') {
      const wasNotCompleted = !old_data || old_data.status !== 'completed';
      const isNowCompleted = data.status === 'completed';

      if (wasNotCompleted && isNowCompleted && data.assigned_to) {
        const playerEmail = data.assigned_to;
        const factionId = data.faction_id;
        const repAmount = MISSION_REP[data.difficulty] || 5;
        const credits = data.reward_credits || 0;

        // Award faction reputation if faction exists
        if (factionId) {
          await awardReputation(base44, playerEmail, factionId, repAmount, 
            `Mission completed: ${data.title || 'Unknown'}`, data.id);
          results.push({ type: 'rep', player: playerEmail, faction: factionId, amount: repAmount });
        }

        // Log the event
        results.push({ type: 'mission_complete', player: playerEmail, credits, rep: repAmount });
      }

      // Mission failed — small rep penalty
      const wasNotFailed = !old_data || old_data.status !== 'failed';
      const isNowFailed = data.status === 'failed';

      if (wasNotFailed && isNowFailed && data.assigned_to && data.faction_id) {
        const penalty = -Math.ceil((MISSION_REP[data.difficulty] || 5) / 2);
        await awardReputation(base44, data.assigned_to, data.faction_id, penalty,
          `Mission failed: ${data.title || 'Unknown'}`, data.id);
        results.push({ type: 'rep_penalty', player: data.assigned_to, amount: penalty });
      }
    }

    // --- OPSLOG EVENT ---
    if (event.entity_name === 'OpsLog' && event.type === 'create') {
      const repAmount = OPS_REP[data.event_type];
      
      if (repAmount && data.player_email && data.faction_id) {
        await awardReputation(base44, data.player_email, data.faction_id, repAmount,
          `${data.event_type}: ${data.title || ''}`, null);
        results.push({ type: 'ops_rep', player: data.player_email, event: data.event_type, amount: repAmount });
      }

      // Negative rep for the opposing faction if territory was lost
      if (data.event_type === 'territory_lost' && data.player_email && data.secondary_faction_id) {
        await awardReputation(base44, data.player_email, data.secondary_faction_id, 5,
          `Territory conflict: ${data.title || ''}`, null);
        results.push({ type: 'ops_rep_secondary', player: data.player_email, amount: 5 });
      }
    }

    return Response.json({ status: 'ok', results });
  } catch (error) {
    console.error('processReputation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function awardReputation(base44, playerEmail, factionId, delta, reason, jobId) {
  // Create log entry
  const logData = {
    player_email: playerEmail,
    faction_id: factionId,
    delta,
    reason,
  };
  if (jobId) logData.source_job_id = jobId;
  await base44.asServiceRole.entities.ReputationLog.create(logData);

  // Update or create Reputation record
  const existing = await base44.asServiceRole.entities.Reputation.filter({
    player_email: playerEmail,
    faction_id: factionId,
  });

  if (existing.length > 0) {
    const rep = existing[0];
    const newScore = (rep.score || 0) + delta;
    const newRank = scoreToRank(newScore);
    await base44.asServiceRole.entities.Reputation.update(rep.id, {
      score: newScore,
      rank: newRank,
    });
  } else {
    const newScore = Math.max(0, delta);
    await base44.asServiceRole.entities.Reputation.create({
      player_email: playerEmail,
      faction_id: factionId,
      score: newScore,
      rank: scoreToRank(newScore),
    });
  }
}

function scoreToRank(score) {
  if (score <= -50) return 'enemy';
  if (score < 0) return 'hostile';
  if (score < 10) return 'unknown';
  if (score < 30) return 'neutral';
  if (score < 75) return 'trusted';
  if (score < 150) return 'allied';
  return 'revered';
}