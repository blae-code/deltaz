import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';
import {
  buildMissionCompletionNarrative,
  getErrorMessage,
  isGeneratedMission,
  normalizeEmail,
  normalizeString,
} from '../_shared/missionRules.ts';
import { DATA_ORIGINS, buildSourceRef, withProvenance } from '../_shared/provenance.ts';

const ACTIVE_JOB_LIMIT = 5;
const MAX_COMPLETION_NOTES_LENGTH = 1200;
const VALID_ACTIONS = new Set(['accept', 'complete', 'abandon', 'fail']);

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
    const action = normalizeAction(body.action);
    const jobId = normalizeString(body.job_id, 128);
    const completionNotes = normalizeString(body.completion_notes, MAX_COMPLETION_NOTES_LENGTH);

    if (!action) {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!jobId) {
      return Response.json({ error: 'job_id is required' }, { status: 400 });
    }

    const jobs = await base44.asServiceRole.entities.Job.filter({});
    const job = jobs.find((entry) => entry.id === jobId);

    if (!job) {
      return Response.json({ error: 'Mission not found' }, { status: 404 });
    }

    if (action === 'accept') {
      return await acceptMission(base44, jobs, job, userEmail);
    }

    if (action === 'complete') {
      return await completeMission(base44, job, user, userEmail, completionNotes);
    }

    if (action === 'abandon') {
      return await abandonMission(base44, job, user, userEmail);
    }

    return await failMission(base44, job, user, completionNotes);
  } catch (error) {
    console.error('MissionOps error:', error);
    return Response.json({ error: getErrorMessage(error) }, { status: 500 });
  }
});

async function acceptMission(base44, jobs, job, userEmail) {
  if (isGeneratedMission(job)) {
    return Response.json(
      { error: 'Legacy generated missions are no longer claimable. Generate a fresh mission instead.' },
      { status: 409 },
    );
  }

  if (isJobExpired(job)) {
    if (job.status === 'available') {
      await base44.asServiceRole.entities.Job.update(job.id, withProvenance({
        status: 'expired',
      }, {
        dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
        sourceRefs: getMissionSourceRefs(job),
      }));
    }
    return Response.json({ error: 'Mission has expired' }, { status: 409 });
  }

  if (job.status !== 'available') {
    return Response.json({ error: 'Mission is no longer available' }, { status: 409 });
  }

  if (normalizeEmail(job.assigned_to)) {
    return Response.json({ error: 'Mission is already assigned' }, { status: 409 });
  }

  const activeJobs = jobs.filter((entry) => normalizeEmail(entry.assigned_to) === userEmail && entry.status === 'in_progress');
  if (activeJobs.length >= ACTIVE_JOB_LIMIT) {
    return Response.json(
      { error: `You already have ${ACTIVE_JOB_LIMIT} active missions. Complete or abandon some first.` },
      { status: 409 },
    );
  }

  const factions = job.faction_id ? await base44.asServiceRole.entities.Faction.filter({}) : [];
  const factionName = factions.find((faction) => faction.id === job.faction_id)?.name || 'Unknown';

  await base44.asServiceRole.entities.Job.update(job.id, withProvenance({
    status: 'in_progress',
    assigned_to: userEmail,
    accepted_at: new Date().toISOString(),
    completed_at: '',
    completion_notes: '',
  }, {
    dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
    sourceRefs: getMissionSourceRefs(job, [buildSourceRef('player', userEmail)]),
  }));

  await Promise.all([
    createNotification(base44, {
      playerEmail: userEmail,
      title: `Mission Accepted: ${job.title}`,
      message: `You have accepted a ${job.difficulty} ${job.type} mission. Good luck, operative.`,
      type: 'mission_assigned',
      priority: 'normal',
      referenceId: job.id,
    }),
    createEvent(base44, {
      title: `MISSION ACCEPTED: ${job.title}`,
      content: `An operative has accepted a ${job.difficulty} ${job.type} mission for ${factionName}.`,
      type: 'broadcast',
      severity: 'info',
      factionId: job.faction_id,
      territoryId: job.territory_id,
    }),
  ]);

  return Response.json({
    status: 'ok',
    message: 'Mission accepted',
    max_slots: Math.max(1, Number(job.max_slots) || 1),
    supported_slots: 1,
  });
}

async function completeMission(base44, job, user, userEmail, completionNotes) {
  if (job.status !== 'in_progress') {
    return Response.json({ error: 'Mission is not in progress' }, { status: 409 });
  }

  const assigneeEmail = normalizeEmail(job.assigned_to);
  if (!assigneeEmail) {
    return Response.json({ error: 'Mission has no assigned operative' }, { status: 409 });
  }

  if (assigneeEmail !== userEmail && user.role !== 'admin') {
    return Response.json({ error: 'This mission is not assigned to you' }, { status: 403 });
  }

  const now = new Date().toISOString();
  const narrative = completionNotes || buildMissionCompletionNarrative(job);
  const repReward = Math.max(0, Math.trunc(Number(job.reward_reputation) || 0));
  const listedCredits = Math.max(0, Math.trunc(Number(job.reward_credits) || 0));

  await base44.asServiceRole.entities.Job.update(job.id, withProvenance({
    status: 'completed',
    completed_at: now,
    completion_notes: narrative,
  }, {
    dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
    sourceRefs: getMissionSourceRefs(job, [buildSourceRef('player', assigneeEmail)]),
  }));

  const reputation = await applyReputationDelta(base44, {
    playerEmail: assigneeEmail,
    factionId: normalizeString(job.faction_id, 128),
    delta: repReward,
    reason: `Completed mission: ${job.title}`,
    sourceJobId: job.id,
  });

  const factions = job.faction_id ? await base44.asServiceRole.entities.Faction.filter({}) : [];
  const factionName = factions.find((faction) => faction.id === job.faction_id)?.name || 'faction';
  const notificationParts = [truncateText(narrative, 200)];
  if (reputation?.delta > 0) {
    notificationParts.push(`+${reputation.delta} REP with ${factionName}`);
  }
  if (listedCredits > 0) {
    notificationParts.push(`Listed reward: ${listedCredits} CR`);
  }

  await Promise.all([
    createNotification(base44, {
      playerEmail: assigneeEmail,
      title: `Mission Complete: ${job.title}`,
      message: notificationParts.join(' | '),
      type: 'mission_update',
      priority: 'normal',
      referenceId: job.id,
    }),
    createEvent(base44, {
      title: `MISSION COMPLETE: ${job.title}`,
      content: narrative,
      type: 'broadcast',
      severity: 'info',
      factionId: job.faction_id,
      territoryId: job.territory_id,
    }),
  ]);

  return Response.json({
    status: 'ok',
    message: 'Mission completed',
    narrative,
    reputation,
    credits: 0,
    listed_credits: listedCredits,
  });
}

async function abandonMission(base44, job, user, userEmail) {
  if (job.status !== 'in_progress') {
    return Response.json({ error: 'Mission is not in progress' }, { status: 409 });
  }

  const assigneeEmail = normalizeEmail(job.assigned_to);
  if (!assigneeEmail) {
    return Response.json({ error: 'Mission has no assigned operative' }, { status: 409 });
  }

  if (assigneeEmail !== userEmail && user.role !== 'admin') {
    return Response.json({ error: 'This mission is not assigned to you' }, { status: 403 });
  }

  const generatedMission = isGeneratedMission(job);

  await base44.asServiceRole.entities.Job.update(job.id, withProvenance({
    status: generatedMission ? 'expired' : 'available',
    assigned_to: '',
    accepted_at: '',
    completed_at: '',
    completion_notes: '',
  }, {
    dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
    sourceRefs: getMissionSourceRefs(job, [buildSourceRef('player', assigneeEmail)]),
  }));

  const requestedPenalty = -Math.ceil(Math.max(5, Number(job.reward_reputation) || 0) * 0.5);
  const reputation = await applyReputationDelta(base44, {
    playerEmail: assigneeEmail,
    factionId: normalizeString(job.faction_id, 128),
    delta: requestedPenalty,
    reason: `Abandoned mission: ${job.title}`,
    sourceJobId: job.id,
  });

  await createNotification(base44, {
    playerEmail: assigneeEmail,
    title: `Mission Abandoned: ${job.title}`,
    message: generatedMission
      ? `You abandoned the generated mission. It has been retired.${reputation?.delta ? ` Reputation penalty applied (${reputation.delta}).` : ''}`
      : reputation?.delta
        ? `You abandoned the mission. Reputation penalty applied (${reputation.delta}).`
        : 'You abandoned the mission. Reputation penalty applied.',
    type: 'mission_update',
    priority: 'normal',
    referenceId: job.id,
  });

  return Response.json({
    status: 'ok',
    message: generatedMission ? 'Generated mission retired' : 'Mission abandoned',
    reputation,
  });
}

async function failMission(base44, job, user, completionNotes) {
  if (user.role !== 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 });
  }

  if (job.status !== 'in_progress') {
    return Response.json({ error: 'Only in-progress missions can be failed' }, { status: 409 });
  }

  const assigneeEmail = normalizeEmail(job.assigned_to);
  const now = new Date().toISOString();
  const narrative = completionNotes || 'Mission failed.';

  await base44.asServiceRole.entities.Job.update(job.id, withProvenance({
    status: 'failed',
    completed_at: now,
    completion_notes: narrative,
  }, {
    dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
    sourceRefs: getMissionSourceRefs(job, assigneeEmail ? [buildSourceRef('player', assigneeEmail)] : []),
  }));

  let reputation = null;
  if (assigneeEmail) {
    const requestedPenalty = -Math.ceil(Math.max(5, Number(job.reward_reputation) || 0) * 0.3);
    reputation = await applyReputationDelta(base44, {
      playerEmail: assigneeEmail,
      factionId: normalizeString(job.faction_id, 128),
      delta: requestedPenalty,
      reason: `Failed mission: ${job.title}`,
      sourceJobId: job.id,
    });

    await createNotification(base44, {
      playerEmail: assigneeEmail,
      title: `Mission Failed: ${job.title}`,
      message: narrative,
      type: 'mission_update',
      priority: 'high',
      referenceId: job.id,
    });
  }

  await createEvent(base44, {
    title: `MISSION FAILED: ${job.title}`,
    content: narrative,
    type: 'broadcast',
    severity: 'warning',
    factionId: job.faction_id,
    territoryId: job.territory_id,
  });

  return Response.json({ status: 'ok', message: 'Mission marked as failed', reputation });
}

async function applyReputationDelta(base44, { playerEmail, factionId, delta, reason, sourceJobId }) {
  if (!playerEmail || !factionId || !Number.isFinite(delta) || delta === 0) {
    return null;
  }

  const reputations = await base44.asServiceRole.entities.Reputation.filter({
    player_email: playerEmail,
    faction_id: factionId,
  });

  const existing = reputations[0];
  const currentScore = Number(existing?.score) || 0;
  const nextScore = Math.max(-100, currentScore + Math.trunc(delta));
  const appliedDelta = nextScore - currentScore;
  const rank = getReputationRank(nextScore);
  const sourceRefs = [
    buildSourceRef('player', playerEmail),
    buildSourceRef('faction', factionId),
    buildSourceRef('job', sourceJobId),
  ];

  if (existing) {
    await base44.asServiceRole.entities.Reputation.update(existing.id, withProvenance({
      score: nextScore,
      rank,
    }, {
      dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
      sourceRefs,
    }));
  } else {
    await base44.asServiceRole.entities.Reputation.create(withProvenance({
      player_email: playerEmail,
      faction_id: factionId,
      score: nextScore,
      rank,
    }, {
      dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
      sourceRefs,
    }));
  }

  if (appliedDelta !== 0) {
    await base44.asServiceRole.entities.ReputationLog.create(withProvenance({
      player_email: playerEmail,
      faction_id: factionId,
      delta: appliedDelta,
      reason,
      source_job_id: sourceJobId,
    }, {
      dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
      sourceRefs,
    }));
  }

  return { score: nextScore, rank, delta: appliedDelta };
}

async function createNotification(base44, { playerEmail, title, message, type, priority, referenceId }) {
  return await base44.asServiceRole.entities.Notification.create(withProvenance({
    player_email: playerEmail,
    title,
    message,
    type,
    priority,
    is_read: false,
    reference_id: referenceId,
  }, {
    dataOrigin: DATA_ORIGINS.DETERMINISTIC_PROJECTION,
    sourceRefs: [
      buildSourceRef('player', playerEmail),
      buildSourceRef('job', referenceId),
    ],
  }));
}

async function createEvent(base44, { title, content, type, severity, factionId, territoryId }) {
  return await base44.asServiceRole.entities.Event.create(withProvenance({
    title,
    content,
    type,
    severity,
    is_active: true,
    faction_id: factionId,
    territory_id: territoryId,
  }, {
    dataOrigin: DATA_ORIGINS.DETERMINISTIC_PROJECTION,
    sourceRefs: [
      buildSourceRef('faction', factionId),
      buildSourceRef('territory', territoryId),
    ],
  }));
}

function normalizeAction(value) {
  return typeof value === 'string' && VALID_ACTIONS.has(value) ? value : '';
}

function truncateText(value, maxLength) {
  const normalized = normalizeString(value, maxLength);
  return normalized.length <= maxLength ? normalized : normalized.slice(0, maxLength);
}

function isJobExpired(job) {
  if (!job?.expires_at || job.status !== 'available') {
    return false;
  }

  const expiresAt = Date.parse(job.expires_at);
  return Number.isFinite(expiresAt) && expiresAt <= Date.now();
}

function getMissionSourceRefs(job, extraRefs = []) {
  return [
    buildSourceRef('job', job?.id),
    buildSourceRef('faction', job?.faction_id),
    buildSourceRef('territory', job?.territory_id),
    ...extraRefs,
  ];
}

function getReputationRank(score) {
  if (score >= 100) return 'revered';
  if (score >= 50) return 'allied';
  if (score >= 20) return 'trusted';
  if (score >= 5) return 'neutral';
  if (score <= -50) return 'enemy';
  if (score <= -20) return 'hostile';
  if (score > 0) return 'neutral';
  return 'unknown';
}
