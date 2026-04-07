import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';
import { MissionPlanningError } from '../_shared/missionPlanning.ts';
import { getMissionPlanId, updateMissionPlanStatus } from '../_shared/missionPlanLifecycle.ts';

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
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const missionPlanId = getMissionPlanId(body.missionPlanId);
    const updatedPlan = await updateMissionPlanStatus(base44, user, {
      missionPlanId,
      nextStatus: 'accepted',
    });

    return Response.json({
      status: 'ok',
      plan: updatedPlan,
    });
  } catch (error) {
    if (error instanceof MissionPlanningError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    console.error('acceptMissionPlan error:', error);
    return Response.json({ error: error.message || 'Failed to accept mission plan' }, { status: 500 });
  }
});
