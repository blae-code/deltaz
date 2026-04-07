import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';
import {
  buildMissionRecordPayload,
  buildMissionResponse,
  getErrorMessage,
  normalizeEmail,
  selectMissionDraft,
} from '../_shared/missionRules.ts';
import { DATA_ORIGINS, buildSourceRef, withProvenance } from '../_shared/provenance.ts';

const MAX_ACTIVE_GENERATED_MISSIONS = 2;

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
    const preferredType = typeof body.preferred_type === 'string' ? body.preferred_type : '';

    const [factions, territories, jobs, economies, diplomacy, events, commodities, scavengeRuns, reputations] = await Promise.all([
      base44.asServiceRole.entities.Faction.filter({}),
      base44.asServiceRole.entities.Territory.filter({}),
      base44.asServiceRole.entities.Job.filter({}, '-created_date', 300),
      base44.asServiceRole.entities.FactionEconomy.filter({}),
      base44.asServiceRole.entities.Diplomacy.filter({}),
      base44.asServiceRole.entities.Event.filter({ is_active: true }, '-created_date', 20),
      base44.asServiceRole.entities.CommodityPrice.filter({}),
      base44.asServiceRole.entities.ScavengeRun.filter({}, '-created_date', 80),
      base44.asServiceRole.entities.Reputation.filter({ player_email: userEmail }),
    ]);

    const activeFactions = factions.filter((faction) => faction.status === 'active');
    if (activeFactions.length === 0 || territories.length === 0) {
      return Response.json({ error: 'Insufficient world state to generate a mission' }, { status: 409 });
    }

    const activeGenerated = jobs.filter((job) =>
      normalizeEmail(job.assigned_to) === userEmail
      && job.status === 'in_progress'
      && job.generation_meta?.generator === 'truth-engine'
    );
    if (activeGenerated.length >= MAX_ACTIVE_GENERATED_MISSIONS) {
      return Response.json(
        { error: `You already have ${MAX_ACTIVE_GENERATED_MISSIONS} active generated missions. Complete or abandon one first.` },
        { status: 409 },
      );
    }

    const excludeSignatures = new Set(
      jobs
        .filter((job) => job.status === 'available' || job.status === 'in_progress')
        .map((job) => typeof job.generation_meta?.params?.signature === 'string' ? job.generation_meta.params.signature : '')
        .filter(Boolean),
    );

    const draft = selectMissionDraft({
      factions,
      territories,
      jobs,
      economies,
      diplomacy,
      events,
      commodities,
      scavengeRuns,
      reputations,
    }, {
      actorKey: userEmail,
      preferredType,
      excludeSignatures,
    });

    if (!draft) {
      return Response.json({ error: 'No deterministic mission could be generated from current state' }, { status: 409 });
    }

    const now = new Date().toISOString();
    const payload = buildMissionRecordPayload(draft, {
      status: 'in_progress',
      assignedTo: userEmail,
      acceptedAt: now,
      maxSlots: 1,
    });

    const job = await base44.asServiceRole.entities.Job.create(payload);
    await base44.asServiceRole.entities.Notification.create(withProvenance({
      player_email: userEmail,
      title: `Generated Mission Ready: ${job.title}`,
      message: `Command assigned a ${job.difficulty} ${job.type} mission tied to ${draft.territory_name}.`,
      type: 'mission_assigned',
      priority: draft.difficulty === 'suicide' || draft.difficulty === 'critical' ? 'high' : 'normal',
      is_read: false,
      reference_id: job.id,
    }, {
      dataOrigin: DATA_ORIGINS.DETERMINISTIC_PROJECTION,
      sourceRefs: [
        buildSourceRef('job', job.id),
        ...draft.source_refs,
      ],
    }));

    return Response.json({
      status: 'ok',
      mission: buildMissionResponse(draft, job),
    });
  } catch (error) {
    console.error('Mission generator error:', error);
    return Response.json({ error: getErrorMessage(error) }, { status: 500 });
  }
});
