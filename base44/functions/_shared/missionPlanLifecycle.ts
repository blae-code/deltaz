import { MissionPlanningError, sanitizeText } from './missionPlanning.ts';

type MissionPlanStatus = 'accepted' | 'active' | 'completed' | 'failed' | 'aborted';

type TransitionRule = {
  allowedStatuses: string[];
  timestampField: string;
  requiresOutcome: boolean;
  defaultOutcome?: string;
};

const TRANSITION_RULES: Record<MissionPlanStatus, TransitionRule> = {
  accepted: {
    allowedStatuses: ['generated'],
    timestampField: 'acceptedAt',
    requiresOutcome: false,
  },
  active: {
    allowedStatuses: ['accepted'],
    timestampField: 'activatedAt',
    requiresOutcome: false,
  },
  completed: {
    allowedStatuses: ['active'],
    timestampField: 'completedAt',
    requiresOutcome: true,
  },
  failed: {
    allowedStatuses: ['active'],
    timestampField: 'failedAt',
    requiresOutcome: true,
  },
  aborted: {
    allowedStatuses: ['generated', 'accepted', 'active'],
    timestampField: 'abortedAt',
    requiresOutcome: false,
    defaultOutcome: 'Mission aborted by user.',
  },
};

const normalizeEmail = (value: unknown) => sanitizeText(value, 200).toLowerCase();

export const getMissionPlanId = (value: unknown) => {
  const missionPlanId = sanitizeText(value, 80);
  if (!missionPlanId) {
    throw new MissionPlanningError('missionPlanId is required', 400);
  }

  return missionPlanId;
};

export const getMissionOutcome = (
  value: unknown,
  { required = false, fallback = '' }: { required?: boolean; fallback?: string } = {},
) => {
  const outcome = sanitizeText(value, 2_000);
  if (!outcome && required) {
    throw new MissionPlanningError('outcome is required', 400);
  }

  return outcome || fallback;
};

const canManageMissionPlan = (user: any, missionPlan: any) => (
  user?.role === 'admin'
  || normalizeEmail(missionPlan?.planned_by) === normalizeEmail(user?.email)
);

const getTransitionRule = (nextStatus: MissionPlanStatus) => {
  const rule = TRANSITION_RULES[nextStatus];
  if (!rule) {
    throw new MissionPlanningError(`Unsupported mission plan status "${nextStatus}"`, 400);
  }

  return rule;
};

const loadMissionPlan = async (base44: any, missionPlanId: string) => {
  const [missionPlan] = await base44.asServiceRole.entities.MissionPlan.filter({ id: missionPlanId });
  if (!missionPlan) {
    throw new MissionPlanningError('Mission plan not found', 404);
  }

  return missionPlan;
};

export const updateMissionPlanStatus = async (
  base44: any,
  user: any,
  {
    missionPlanId,
    nextStatus,
    outcome,
  }: {
    missionPlanId: string;
    nextStatus: MissionPlanStatus;
    outcome?: string;
  },
) => {
  const rule = getTransitionRule(nextStatus);
  const missionPlan = await loadMissionPlan(base44, missionPlanId);

  if (!canManageMissionPlan(user, missionPlan)) {
    throw new MissionPlanningError('You are not allowed to update this mission plan', 403);
  }

  if (!rule.allowedStatuses.includes(missionPlan.status)) {
    throw new MissionPlanningError(
      `Mission plan cannot be ${nextStatus}. Status is '${missionPlan.status}'.`,
      409,
    );
  }

  const normalizedOutcome = getMissionOutcome(outcome, {
    required: rule.requiresOutcome,
    fallback: rule.defaultOutcome ?? '',
  });
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    status: nextStatus,
    updatedAt: now,
    [rule.timestampField]: now,
  };

  if (normalizedOutcome) {
    patch.outcome = normalizedOutcome;
  }

  return base44.asServiceRole.entities.MissionPlan.update(missionPlan.id, patch);
};
