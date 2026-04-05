import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const userEmail = normalizeEmail(user?.email);

    if (!user || !userEmail) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const requestedEmail = normalizeEmail(body.player_email) || userEmail;

    if (requestedEmail !== userEmail && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [jobs, scavengeRuns, reputationLogs] = await Promise.all([
      base44.asServiceRole.entities.Job.filter({}),
      base44.asServiceRole.entities.ScavengeRun.filter({}),
      base44.asServiceRole.entities.ReputationLog.filter({}),
    ]);

    const myJobs = jobs.filter((job) => normalizeEmail(job.assigned_to) === requestedEmail);
    const myScavengeRuns = scavengeRuns.filter((run) => normalizeEmail(run.player_email) === requestedEmail);
    const myReputationLogs = reputationLogs.filter((log) => normalizeEmail(log.player_email) === requestedEmail);

    const completed = myJobs.filter((job) => job.status === 'completed');
    const failed = myJobs.filter((job) => job.status === 'failed');
    const inProgress = myJobs.filter((job) => job.status === 'in_progress');

    const typeBreakdown = {};
    for (const job of myJobs) {
      if (!typeBreakdown[job.type]) {
        typeBreakdown[job.type] = { total: 0, completed: 0, failed: 0 };
      }
      typeBreakdown[job.type].total++;
      if (job.status === 'completed') typeBreakdown[job.type].completed++;
      if (job.status === 'failed') typeBreakdown[job.type].failed++;
    }

    const diffBreakdown = {};
    for (const job of completed) {
      diffBreakdown[job.difficulty] = (diffBreakdown[job.difficulty] || 0) + 1;
    }

    const scavCompleted = myScavengeRuns.filter((run) => run.status === 'completed');
    const scavFailed = myScavengeRuns.filter((run) => run.status === 'failed');
    const totalLoot = scavCompleted.reduce((sum, run) => sum + (Number(run.total_value) || 0), 0);

    const totalRepGained = myReputationLogs
      .filter((log) => (Number(log.delta) || 0) > 0)
      .reduce((sum, log) => sum + (Number(log.delta) || 0), 0);
    const totalRepLost = myReputationLogs
      .filter((log) => (Number(log.delta) || 0) < 0)
      .reduce((sum, log) => sum + Math.abs(Number(log.delta) || 0), 0);

    const totalCreditsEarned = completed.reduce((sum, job) => sum + (Number(job.reward_credits) || 0), 0);

    const rawStats = {
      total_missions: myJobs.length,
      completed: completed.length,
      failed: failed.length,
      in_progress: inProgress.length,
      completion_rate: formatRate(completed.length, myJobs.length),
      type_breakdown: typeBreakdown,
      difficulty_breakdown: diffBreakdown,
      total_scavenge_runs: myScavengeRuns.length,
      scavenge_completed: scavCompleted.length,
      scavenge_failed: scavFailed.length,
      scavenge_success_rate: formatRate(scavCompleted.length, myScavengeRuns.length),
      total_loot_value: totalLoot,
      total_credits_earned: totalCreditsEarned,
      total_rep_gained: totalRepGained,
      total_rep_lost: totalRepLost,
    };

    const assessment = await buildAssessment(base44, rawStats, typeBreakdown, diffBreakdown);

    return Response.json({
      stats: rawStats,
      assessment,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return Response.json({ error: getErrorMessage(error) }, { status: 500 });
  }
});

async function buildAssessment(base44, rawStats, typeBreakdown, diffBreakdown) {
  try {
    const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are ARTEMIS, a military AI evaluating an operative's field performance.

OPERATIVE PERFORMANCE DATA:
- Total missions: ${rawStats.total_missions} (${rawStats.completed} completed, ${rawStats.failed} failed, ${rawStats.in_progress} active)
- Mission completion rate: ${rawStats.completion_rate}%
- Mission type breakdown: ${JSON.stringify(typeBreakdown)}
- Difficulty breakdown of completed: ${JSON.stringify(diffBreakdown)}
- Scavenge runs: ${rawStats.total_scavenge_runs} (${rawStats.scavenge_completed} successful, ${rawStats.scavenge_failed} failed)
- Scavenge success rate: ${rawStats.scavenge_success_rate}%
- Total loot recovered: ${rawStats.total_loot_value} credits
- Total listed mission reward credits: ${rawStats.total_credits_earned}
- Reputation gained: ${rawStats.total_rep_gained}, lost: ${rawStats.total_rep_lost}

Generate a performance evaluation. Be tactical, gritty, and direct. If data is sparse, acknowledge limited records but still provide an assessment.

IMPORTANT:
- Scores must be 0-100.
- Return concise field-ready prose, not paragraphs.
- Consider combat efficiency, scavenging reliability, overall rating, and risk profile.`,
      response_json_schema: {
        type: 'object',
        properties: {
          combat_efficiency: {
            type: 'object',
            properties: {
              score: { type: 'number' },
              grade: { type: 'string' },
              summary: { type: 'string' },
            },
          },
          scavenging_reliability: {
            type: 'object',
            properties: {
              score: { type: 'number' },
              grade: { type: 'string' },
              summary: { type: 'string' },
            },
          },
          overall_rating: {
            type: 'object',
            properties: {
              score: { type: 'number' },
              grade: { type: 'string' },
              classification: { type: 'string' },
            },
          },
          risk_profile: { type: 'string' },
          strengths: {
            type: 'array',
            items: { type: 'string' },
          },
          weaknesses: {
            type: 'array',
            items: { type: 'string' },
          },
          tactical_assessment: { type: 'string' },
        },
      },
    });

    const sanitized = sanitizeAssessment(response);
    if (sanitized) {
      return sanitized;
    }
  } catch (error) {
    console.error('AI assessment failed:', getErrorMessage(error));
  }

  return buildFallbackAssessment(rawStats, typeBreakdown);
}

function sanitizeAssessment(response) {
  if (!response || typeof response !== 'object') {
    return null;
  }

  const combatScore = clampScore(response?.combat_efficiency?.score);
  const scavScore = clampScore(response?.scavenging_reliability?.score);
  const overallScore = clampScore(response?.overall_rating?.score);

  return {
    combat_efficiency: {
      score: combatScore,
      grade: normalizeString(response?.combat_efficiency?.grade, 24) || gradeFromScore(combatScore),
      summary: normalizeString(response?.combat_efficiency?.summary, 180) || 'Combat data remains limited.',
    },
    scavenging_reliability: {
      score: scavScore,
      grade: normalizeString(response?.scavenging_reliability?.grade, 24) || gradeFromScore(scavScore),
      summary: normalizeString(response?.scavenging_reliability?.summary, 180) || 'Scavenging records remain thin.',
    },
    overall_rating: {
      score: overallScore,
      grade: normalizeString(response?.overall_rating?.grade, 24) || gradeFromScore(overallScore),
      classification: normalizeString(response?.overall_rating?.classification, 40) || classificationFromScore(overallScore),
    },
    risk_profile: normalizeString(response?.risk_profile, 180) || 'Risk profile unavailable.',
    strengths: sanitizeList(response?.strengths, 4),
    weaknesses: sanitizeList(response?.weaknesses, 4),
    tactical_assessment: normalizeString(response?.tactical_assessment, 260) || 'Field data is too sparse for a deeper assessment.',
  };
}

function buildFallbackAssessment(rawStats, typeBreakdown) {
  const missionRate = Number(rawStats.completion_rate) || 0;
  const scavRate = Number(rawStats.scavenge_success_rate) || 0;
  const hardMissionCount = (rawStats.difficulty_breakdown.critical || 0) + (rawStats.difficulty_breakdown.suicide || 0);
  const combatMissionPool = ['sabotage', 'elimination', 'escort'];
  const combatMissions = combatMissionPool.reduce((sum, type) => sum + (typeBreakdown[type]?.total || 0), 0);

  const combatScore = clampScore(Math.round((missionRate * 0.65) + (hardMissionCount * 6) + Math.min(combatMissions * 3, 15)));
  const scavScore = clampScore(Math.round((scavRate * 0.7) + Math.min(rawStats.total_loot_value / 25, 20)));
  const overallScore = clampScore(Math.round((combatScore * 0.55) + (scavScore * 0.45)));

  const strengths = [];
  const weaknesses = [];

  if (missionRate >= 70) strengths.push('Keeps most operations on target.');
  if (hardMissionCount > 0) strengths.push('Has credible exposure to high-risk assignments.');
  if (scavRate >= 70 || rawStats.total_loot_value >= 250) strengths.push('Returns usable value from scavenging runs.');
  if (missionRate < 50) weaknesses.push('Mission completion rate is still unstable.');
  if (rawStats.failed > rawStats.completed) weaknesses.push('Failure volume is outpacing confirmed wins.');
  if (rawStats.total_scavenge_runs > 0 && scavRate < 50) weaknesses.push('Scavenging reliability is below safe operating thresholds.');

  return {
    combat_efficiency: {
      score: combatScore,
      grade: gradeFromScore(combatScore),
      summary: missionRate === 0
        ? 'Very little combat record exists yet.'
        : `Completion rate is ${missionRate.toFixed(1)}%, with ${hardMissionCount} higher-risk clears on record.`,
    },
    scavenging_reliability: {
      score: scavScore,
      grade: gradeFromScore(scavScore),
      summary: rawStats.total_scavenge_runs === 0
        ? 'No scavenging runs logged yet.'
        : `${rawStats.scavenge_completed}/${rawStats.total_scavenge_runs} scavenging runs succeeded for ${rawStats.total_loot_value} credits of recovered value.`,
    },
    overall_rating: {
      score: overallScore,
      grade: gradeFromScore(overallScore),
      classification: classificationFromScore(overallScore),
    },
    risk_profile: hardMissionCount > 0
      ? 'Shows willingness to operate in elevated-threat environments.'
      : 'Mostly operating in lower-risk profiles so far.',
    strengths: strengths.slice(0, 4),
    weaknesses: weaknesses.slice(0, 4),
    tactical_assessment: rawStats.total_missions === 0 && rawStats.total_scavenge_runs === 0
      ? 'Records are sparse. Field more operations before trusting a hard rating.'
      : 'Performance is serviceable, but the record is still small enough that one bad streak could move the profile quickly.',
  };
}

function sanitizeList(value, limit) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => normalizeString(entry, 120))
    .filter(Boolean)
    .slice(0, limit);
}

function normalizeEmail(value) {
  return normalizeString(value, 320).toLowerCase();
}

function normalizeString(value, maxLength = 255) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function formatRate(numerator, denominator) {
  if (!denominator) return '0.0';
  return ((numerator / denominator) * 100).toFixed(1);
}

function clampScore(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

function gradeFromScore(score) {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

function classificationFromScore(score) {
  if (score >= 90) return 'ELITE ASSET';
  if (score >= 75) return 'RELIABLE OPERATIVE';
  if (score >= 60) return 'FIELD CAPABLE';
  if (score >= 40) return 'UNPROVEN';
  return 'HIGH LIABILITY';
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : 'Unexpected error';
}
