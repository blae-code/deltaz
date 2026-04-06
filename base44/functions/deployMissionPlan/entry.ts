import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';
import {
  MissionPlanningError,
  VALID_OPERATION_TYPES,
  buildMissionRiskAssessment,
  loadMissionPlanningContext,
  normalizeIdArray,
  sanitizeText,
} from '../_shared/missionPlanning.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const title = sanitizeText(body.title, 120);
    const territoryId = sanitizeText(body.territory_id, 80);
    const operationType = sanitizeText(body.operation_type, 40);
    const survivorIds = normalizeIdArray(body.survivor_ids, 12);

    if (!title || !territoryId || survivorIds.length === 0 || !VALID_OPERATION_TYPES.has(operationType)) {
      return Response.json(
        { error: 'title, territory_id, valid survivor_ids, and valid operation_type are required' },
        { status: 400 },
      );
    }

    const context = await loadMissionPlanningContext(base44, user, { territoryId, survivorIds });
    const assessment = buildMissionRiskAssessment({
      territory: context.territory,
      diplomacyRecords: context.diplomacyRecords,
      factions: context.factions,
      inventoryItems: context.inventoryItems,
      squad: context.squad,
      operationType,
    });

    const plan = await base44.asServiceRole.entities.MissionPlan.create({
      title,
      territory_id: context.territory.id,
      territory_name: context.territory.name,
      operation_type: operationType,
      assigned_survivors: context.squad.map((survivor) => ({
        survivor_id: survivor.id,
        name: survivor.name,
        skill: survivor.skill,
        combat_rating: survivor.combat_rating || 1,
      })),
      risk_score: assessment.risk_score,
      success_probability: assessment.success_probability,
      risk_factors: assessment.risk_factors,
      status: 'deployed',
      planned_by: user.email,
      deployed_at: new Date().toISOString(),
    });

    return Response.json({
      status: 'ok',
      plan,
      assessment,
    });
  } catch (error) {
    if (error instanceof MissionPlanningError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    console.error('deployMissionPlan error:', error);
    return Response.json({ error: error.message || 'Failed to deploy mission plan' }, { status: 500 });
  }
});
