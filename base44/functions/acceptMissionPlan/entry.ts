import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

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

    const missionPlanId = body.missionPlanId;
    if (!missionPlanId || typeof missionPlanId !== 'string') {
        return Response.json({ error: 'missionPlanId is required' }, { status: 400 });
    }

    const plans = await base44.asServiceRole.entities.MissionPlan.filter({ id: missionPlanId });
    const plan = plans[0];

    if (!plan) {
        return Response.json({ error: 'MissionPlan not found' }, { status: 404 });
    }

    if (plan.status !== 'generated') {
        return Response.json({ error: `MissionPlan cannot be accepted. Status is '${plan.status}'.` }, { status: 409 });
    }

    const now = new Date().toISOString();
    const updatedPlan = await base44.asServiceRole.entities.MissionPlan.update(missionPlanId, {
        status: 'accepted',
        acceptedAt: now,
        updatedAt: now,
    });

    // TODO: Add logging/audit hooks
    // TODO: Add event emission

    return Response.json({
        status: 'ok',
        plan: updatedPlan,
    });

  } catch (error) {
    console.error('acceptMissionPlan error:', error);
    return Response.json({ error: error.message || 'Failed to accept mission plan' }, { status: 500 });
  }
});
