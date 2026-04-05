import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, job_id, completion_notes } = await req.json();

    // ============ ACCEPT MISSION ============
    if (action === 'accept') {
      const jobs = await base44.asServiceRole.entities.Job.filter({});
      const job = jobs.find(j => j.id === job_id);
      if (!job) return Response.json({ error: 'Mission not found' }, { status: 404 });
      if (job.status !== 'available') {
        return Response.json({ error: 'Mission is no longer available' }, { status: 400 });
      }
      if (job.assigned_to) {
        return Response.json({ error: 'Mission is already assigned' }, { status: 400 });
      }

      // Check if player already has too many active missions
      const activeJobs = jobs.filter(j => j.assigned_to === user.email && j.status === 'in_progress');
      if (activeJobs.length >= 5) {
        return Response.json({ error: 'You already have 5 active missions. Complete or abandon some first.' }, { status: 400 });
      }

      await base44.asServiceRole.entities.Job.update(job_id, {
        status: 'in_progress',
        assigned_to: user.email,
        accepted_at: new Date().toISOString(),
      });

      // Notify the player
      await base44.asServiceRole.entities.Notification.create({
        player_email: user.email,
        title: `Mission Accepted: ${job.title}`,
        message: `You have accepted a ${job.difficulty} ${job.type} mission. Good luck, operative.`,
        type: 'mission_assigned',
        priority: 'normal',
        reference_id: job_id,
      });

      // Get faction name for the event
      let factionName = 'Unknown';
      if (job.faction_id) {
        const factions = await base44.asServiceRole.entities.Faction.filter({});
        const faction = factions.find(f => f.id === job.faction_id);
        factionName = faction?.name || 'Unknown';
      }

      // Create world event
      await base44.asServiceRole.entities.Event.create({
        title: `MISSION ACCEPTED: ${job.title}`,
        content: `An operative has accepted a ${job.difficulty} ${job.type} mission for ${factionName}.`,
        type: 'broadcast',
        severity: 'info',
        is_active: true,
        faction_id: job.faction_id,
      });

      return Response.json({ status: 'ok', message: 'Mission accepted' });
    }

    // ============ COMPLETE MISSION ============
    if (action === 'complete') {
      const jobs = await base44.asServiceRole.entities.Job.filter({});
      const job = jobs.find(j => j.id === job_id);
      if (!job) return Response.json({ error: 'Mission not found' }, { status: 404 });
      if (job.status !== 'in_progress') {
        return Response.json({ error: 'Mission is not in progress' }, { status: 400 });
      }
      if (job.assigned_to !== user.email && user.role !== 'admin') {
        return Response.json({ error: 'This mission is not assigned to you' }, { status: 403 });
      }

      const now = new Date().toISOString();

      // Generate completion narrative
      let narrative = completion_notes || '';
      if (!narrative) {
        try {
          const resp = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Write a brief 2-sentence post-apocalyptic mission report for a completed "${job.type}" mission titled "${job.title}". Difficulty: ${job.difficulty}. ${job.description || ''}. Keep it gritty and tactical.`,
          });
          narrative = resp;
        } catch (_) {
          narrative = 'Mission completed successfully. Operative returned to base.';
        }
      }

      // Update job
      await base44.asServiceRole.entities.Job.update(job_id, {
        status: 'completed',
        completed_at: now,
        completion_notes: narrative,
      });

      // Award reputation
      const repReward = job.reward_reputation || 0;
      const creditReward = job.reward_credits || 0;
      let repResult = null;

      if (repReward > 0 && job.faction_id) {
        // Find or create reputation record
        const reps = await base44.asServiceRole.entities.Reputation.filter({
          player_email: user.email,
          faction_id: job.faction_id,
        });

        let rep = reps[0];
        if (rep) {
          const newScore = (rep.score || 0) + repReward;
          // Determine rank based on score
          let rank = 'unknown';
          if (newScore >= 100) rank = 'revered';
          else if (newScore >= 50) rank = 'allied';
          else if (newScore >= 20) rank = 'trusted';
          else if (newScore >= 5) rank = 'neutral';
          else if (newScore <= -50) rank = 'enemy';
          else if (newScore <= -20) rank = 'hostile';

          await base44.asServiceRole.entities.Reputation.update(rep.id, {
            score: newScore,
            rank,
          });
          repResult = { score: newScore, rank, delta: repReward };
        } else {
          let rank = 'neutral';
          if (repReward >= 20) rank = 'trusted';

          await base44.asServiceRole.entities.Reputation.create({
            player_email: user.email,
            faction_id: job.faction_id,
            score: repReward,
            rank,
          });
          repResult = { score: repReward, rank, delta: repReward };
        }

        // Log the reputation change
        await base44.asServiceRole.entities.ReputationLog.create({
          player_email: user.email,
          faction_id: job.faction_id,
          delta: repReward,
          reason: `Completed mission: ${job.title}`,
          source_job_id: job_id,
        });
      }

      // Notify player
      const factions = await base44.asServiceRole.entities.Faction.filter({});
      const faction = factions.find(f => f.id === job.faction_id);

      await base44.asServiceRole.entities.Notification.create({
        player_email: user.email,
        title: `Mission Complete: ${job.title}`,
        message: `${narrative.substring(0, 200)}${repReward > 0 ? ` | +${repReward} REP with ${faction?.name || 'faction'}` : ''}${creditReward > 0 ? ` | +${creditReward} CR` : ''}`,
        type: 'mission_update',
        priority: 'normal',
        reference_id: job_id,
      });

      // World event
      await base44.asServiceRole.entities.Event.create({
        title: `MISSION COMPLETE: ${job.title}`,
        content: narrative,
        type: 'broadcast',
        severity: 'info',
        is_active: true,
        faction_id: job.faction_id,
      });

      return Response.json({
        status: 'ok',
        message: 'Mission completed',
        narrative,
        reputation: repResult,
        credits: creditReward,
      });
    }

    // ============ ABANDON MISSION ============
    if (action === 'abandon') {
      const jobs = await base44.asServiceRole.entities.Job.filter({});
      const job = jobs.find(j => j.id === job_id);
      if (!job) return Response.json({ error: 'Mission not found' }, { status: 404 });
      if (job.status !== 'in_progress') {
        return Response.json({ error: 'Mission is not in progress' }, { status: 400 });
      }
      if (job.assigned_to !== user.email && user.role !== 'admin') {
        return Response.json({ error: 'This mission is not assigned to you' }, { status: 403 });
      }

      await base44.asServiceRole.entities.Job.update(job_id, {
        status: 'available',
        assigned_to: '',
        accepted_at: '',
      });

      // Reputation penalty for abandoning
      if (job.faction_id) {
        const penalty = -Math.ceil((job.reward_reputation || 5) * 0.5);
        const reps = await base44.asServiceRole.entities.Reputation.filter({
          player_email: user.email,
          faction_id: job.faction_id,
        });
        if (reps[0]) {
          const newScore = Math.max(-100, (reps[0].score || 0) + penalty);
          let rank = reps[0].rank;
          if (newScore <= -50) rank = 'enemy';
          else if (newScore <= -20) rank = 'hostile';
          else if (newScore < 5) rank = 'unknown';

          await base44.asServiceRole.entities.Reputation.update(reps[0].id, {
            score: newScore,
            rank,
          });
        }

        await base44.asServiceRole.entities.ReputationLog.create({
          player_email: user.email,
          faction_id: job.faction_id,
          delta: penalty,
          reason: `Abandoned mission: ${job.title}`,
          source_job_id: job_id,
        });
      }

      await base44.asServiceRole.entities.Notification.create({
        player_email: user.email,
        title: `Mission Abandoned: ${job.title}`,
        message: `You abandoned the mission. Reputation penalty applied.`,
        type: 'mission_update',
        priority: 'normal',
        reference_id: job_id,
      });

      return Response.json({ status: 'ok', message: 'Mission abandoned' });
    }

    // ============ FAIL MISSION (Admin only) ============
    if (action === 'fail') {
      if (user.role !== 'admin') {
        return Response.json({ error: 'Admin only' }, { status: 403 });
      }
      const jobs = await base44.asServiceRole.entities.Job.filter({});
      const job = jobs.find(j => j.id === job_id);
      if (!job) return Response.json({ error: 'Mission not found' }, { status: 404 });

      await base44.asServiceRole.entities.Job.update(job_id, {
        status: 'failed',
        completed_at: new Date().toISOString(),
        completion_notes: completion_notes || 'Mission failed.',
      });

      // Rep penalty for failure
      if (job.assigned_to && job.faction_id) {
        const penalty = -Math.ceil((job.reward_reputation || 5) * 0.3);
        const reps = await base44.asServiceRole.entities.Reputation.filter({
          player_email: job.assigned_to,
          faction_id: job.faction_id,
        });
        if (reps[0]) {
          const newScore = Math.max(-100, (reps[0].score || 0) + penalty);
          await base44.asServiceRole.entities.Reputation.update(reps[0].id, { score: newScore });
        }
        await base44.asServiceRole.entities.ReputationLog.create({
          player_email: job.assigned_to,
          faction_id: job.faction_id,
          delta: penalty,
          reason: `Failed mission: ${job.title}`,
          source_job_id: job_id,
        });

        await base44.asServiceRole.entities.Notification.create({
          player_email: job.assigned_to,
          title: `Mission Failed: ${job.title}`,
          message: completion_notes || 'Your mission has been marked as failed by command.',
          type: 'mission_update',
          priority: 'high',
          reference_id: job_id,
        });
      }

      return Response.json({ status: 'ok', message: 'Mission marked as failed' });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('MissionOps error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});