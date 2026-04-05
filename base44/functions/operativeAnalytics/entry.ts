import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { player_email } = await req.json();
    const email = player_email || user.email;

    // Fetch all relevant data for this operative
    const [jobs, scavengeRuns, repLogs, factions] = await Promise.all([
      base44.asServiceRole.entities.Job.filter({}),
      base44.asServiceRole.entities.ScavengeRun.filter({ player_email: email }),
      base44.asServiceRole.entities.ReputationLog.filter({ player_email: email }),
      base44.asServiceRole.entities.Faction.filter({}),
    ]);

    // Filter jobs for this operative
    const myJobs = jobs.filter(j => j.assigned_to === email);
    const completed = myJobs.filter(j => j.status === 'completed');
    const failed = myJobs.filter(j => j.status === 'failed');
    const inProgress = myJobs.filter(j => j.status === 'in_progress');

    // Mission type breakdown
    const typeBreakdown = {};
    for (const j of myJobs) {
      if (!typeBreakdown[j.type]) typeBreakdown[j.type] = { total: 0, completed: 0, failed: 0 };
      typeBreakdown[j.type].total++;
      if (j.status === 'completed') typeBreakdown[j.type].completed++;
      if (j.status === 'failed') typeBreakdown[j.type].failed++;
    }

    // Difficulty breakdown
    const diffBreakdown = {};
    for (const j of completed) {
      if (!diffBreakdown[j.difficulty]) diffBreakdown[j.difficulty] = 0;
      diffBreakdown[j.difficulty]++;
    }

    // Scavenge stats
    const scavCompleted = scavengeRuns.filter(r => r.status === 'completed');
    const scavFailed = scavengeRuns.filter(r => r.status === 'failed');
    const totalLoot = scavCompleted.reduce((sum, r) => sum + (r.total_value || 0), 0);

    // Reputation earned
    const totalRepGained = repLogs.filter(l => l.delta > 0).reduce((sum, l) => sum + l.delta, 0);
    const totalRepLost = repLogs.filter(l => l.delta < 0).reduce((sum, l) => sum + Math.abs(l.delta), 0);

    // Credits earned from missions
    const totalCreditsEarned = completed.reduce((sum, j) => sum + (j.reward_credits || 0), 0);

    // Raw data summary for AI
    const rawStats = {
      total_missions: myJobs.length,
      completed: completed.length,
      failed: failed.length,
      in_progress: inProgress.length,
      completion_rate: myJobs.length > 0 ? ((completed.length / myJobs.length) * 100).toFixed(1) : '0',
      type_breakdown: typeBreakdown,
      difficulty_breakdown: diffBreakdown,
      total_scavenge_runs: scavengeRuns.length,
      scavenge_completed: scavCompleted.length,
      scavenge_failed: scavFailed.length,
      scavenge_success_rate: scavengeRuns.length > 0 ? ((scavCompleted.length / scavengeRuns.length) * 100).toFixed(1) : '0',
      total_loot_value: totalLoot,
      total_credits_earned: totalCreditsEarned,
      total_rep_gained: totalRepGained,
      total_rep_lost: totalRepLost,
    };

    // Use AI to generate ratings and assessment
    let aiAssessment = null;
    try {
      aiAssessment = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are ARTEMIS, a military AI evaluating an operative's field performance.

OPERATIVE PERFORMANCE DATA:
- Total missions: ${rawStats.total_missions} (${rawStats.completed} completed, ${rawStats.failed} failed, ${rawStats.in_progress} active)
- Mission completion rate: ${rawStats.completion_rate}%
- Mission type breakdown: ${JSON.stringify(typeBreakdown)}
- Difficulty breakdown of completed: ${JSON.stringify(diffBreakdown)}
- Scavenge runs: ${rawStats.total_scavenge_runs} (${rawStats.scavenge_completed} successful, ${rawStats.scavenge_failed} failed)
- Scavenge success rate: ${rawStats.scavenge_success_rate}%
- Total loot recovered: ${rawStats.total_loot_value} credits
- Total mission credits earned: ${rawStats.total_credits_earned}
- Reputation gained: ${rawStats.total_rep_gained}, lost: ${rawStats.total_rep_lost}

Generate a performance evaluation. Be tactical, gritty, and direct. If data is sparse, acknowledge limited records but still provide an assessment.

IMPORTANT: Scores should be 0-100. Consider:
- Combat efficiency: mission success rate, difficulty of completed missions, combat-type mission performance
- Scavenging reliability: scavenge success rate, loot value consistency, resource recovery
- Overall rating: weighted combination considering all factors
- Risk profile: how dangerous their missions tend to be vs success rate`,
        response_json_schema: {
          type: "object",
          properties: {
            combat_efficiency: {
              type: "object",
              properties: {
                score: { type: "number" },
                grade: { type: "string" },
                summary: { type: "string" }
              }
            },
            scavenging_reliability: {
              type: "object",
              properties: {
                score: { type: "number" },
                grade: { type: "string" },
                summary: { type: "string" }
              }
            },
            overall_rating: {
              type: "object",
              properties: {
                score: { type: "number" },
                grade: { type: "string" },
                classification: { type: "string" }
              }
            },
            risk_profile: { type: "string" },
            strengths: {
              type: "array",
              items: { type: "string" }
            },
            weaknesses: {
              type: "array",
              items: { type: "string" }
            },
            tactical_assessment: { type: "string" }
          }
        }
      });
    } catch (err) {
      console.error('AI assessment failed:', err.message);
    }

    return Response.json({
      stats: rawStats,
      assessment: aiAssessment,
    });
  } catch (err) {
    console.error('Analytics error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});