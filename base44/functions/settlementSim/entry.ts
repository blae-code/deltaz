import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';
import { deterministicBoolean, deterministicNumber } from '../_shared/deterministic.ts';
import { DATA_ORIGINS, buildSourceRef, withProvenance } from '../_shared/provenance.ts';

const TASK_TYPES = new Set([
  'scavenge',
  'farm',
  'craft',
  'patrol',
  'heal',
  'cook',
  'repair',
  'trade',
  'defend',
]);

const TASK_DURATIONS = {
  scavenge: 45,
  farm: 60,
  craft: 40,
  patrol: 30,
  heal: 50,
  cook: 35,
  repair: 45,
  trade: 40,
  defend: 0,
};

const TASK_SKILL_MATCH = {
  scavenger: 'scavenge',
  medic: 'heal',
  mechanic: 'repair',
  farmer: 'farm',
  guard: 'patrol',
  trader: 'trade',
  engineer: 'craft',
  cook: 'cook',
};

const TASK_CREDIT_BASE = {
  scavenge: 15,
  farm: 10,
  craft: 20,
  patrol: 5,
  heal: 8,
  cook: 8,
  repair: 12,
  trade: 25,
  defend: 0,
};

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

    const action = typeof body.action === 'string' ? body.action.trim() : '';
    switch (action) {
      case 'assign_task':
        return await handleAssignTask(base44, user, body);
      case 'resolve_tasks':
        return await handleResolveTasks(base44, user);
      case 'trigger_defense':
        return await handleTriggerDefense(base44, user, body);
      case 'get_base_status':
        return await handleGetBaseStatus(base44, user, body);
      default:
        return Response.json(
          { error: 'Unknown action. Use: assign_task, resolve_tasks, trigger_defense, get_base_status' },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error('settlementSim error:', error);
    return Response.json({ error: error.message || 'Settlement simulation failed' }, { status: 500 });
  }
});

async function handleAssignTask(base44, user, body) {
  const survivorId = sanitizeText(body.survivor_id, 80);
  const taskType = sanitizeTaskType(body.task_type);

  if (!survivorId || !taskType) {
    return Response.json({ error: 'survivor_id and valid task_type required' }, { status: 400 });
  }

  const survivor = await getSurvivor(base44, survivorId);
  if (!survivor) {
    return Response.json({ error: 'Survivor not found' }, { status: 404 });
  }

  const base = await getAuthorizedBaseForSurvivor(base44, user, survivor);
  if (!base) {
    return Response.json({ error: 'Not authorized to manage this survivor' }, { status: 403 });
  }
  if (base.status === 'destroyed' || base.status === 'abandoned') {
    return Response.json({ error: 'Cannot assign tasks from an inactive base' }, { status: 409 });
  }
  if (survivor.current_task && survivor.current_task !== 'idle') {
    return Response.json({ error: 'Survivor is already busy' }, { status: 409 });
  }
  if (survivor.status !== 'active') {
    return Response.json({ error: 'Survivor is not active' }, { status: 409 });
  }

  const activeTasks = await base44.asServiceRole.entities.SurvivorTask.filter({
    survivor_id: survivor.id,
    status: 'active',
  });
  if (activeTasks.length > 0) {
    return Response.json({ error: 'Survivor already has an active task' }, { status: 409 });
  }

  const now = new Date().toISOString();
  const sourceRefs = [
    buildSourceRef('survivor', survivor.id),
    buildSourceRef('base', survivor.base_id),
  ];
  const task = await base44.asServiceRole.entities.SurvivorTask.create(withProvenance({
    survivor_id: survivor.id,
    survivor_name: survivor.name,
    base_id: survivor.base_id,
    task_type: taskType,
    status: 'active',
    started_at: now,
    duration_minutes: TASK_DURATIONS[taskType] || 30,
  }, {
    dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
    sourceRefs,
  }));

  await base44.asServiceRole.entities.Survivor.update(survivor.id, withProvenance({
    current_task: taskType,
    task_started_at: now,
  }, {
    dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
    sourceRefs: [
      buildSourceRef('survivor', survivor.id),
      buildSourceRef('survivor_task', task.id),
      buildSourceRef('base', survivor.base_id),
    ],
  }));

  return Response.json({ status: 'ok', task });
}

async function handleResolveTasks(base44, user) {
  const baseFilter = user.role === 'admin' ? {} : { owner_email: user.email };
  const bases = await base44.asServiceRole.entities.PlayerBase.filter(baseFilter);
  const baseIds = new Set(bases.map((base) => base.id).filter(Boolean));
  const baseMap = new Map(bases.map((base) => [base.id, base]));

  if (baseIds.size === 0) {
    return Response.json({ status: 'ok', resolved: 0, message: 'No bases available to resolve' });
  }

  const activeTasks = await base44.asServiceRole.entities.SurvivorTask.filter({ status: 'active' });
  const tasksToResolve = activeTasks.filter((task) => {
    if (!baseIds.has(task.base_id)) {
      return false;
    }

    const startedAt = Date.parse(task.started_at || '');
    if (!Number.isFinite(startedAt)) {
      return false;
    }

    const elapsedMinutes = (Date.now() - startedAt) / 60000;
    return elapsedMinutes >= (task.duration_minutes || 30);
  });

  if (tasksToResolve.length === 0) {
    return Response.json({ status: 'ok', resolved: 0, message: 'No tasks ready to resolve' });
  }

  const survivors = await base44.asServiceRole.entities.Survivor.filter({});
  const survivorMap = new Map(survivors.map((survivor) => [survivor.id, survivor]));

  const results = [];
  for (const task of tasksToResolve) {
    const survivor = survivorMap.get(task.survivor_id);
    const base = baseMap.get(task.base_id);
    if (!survivor || !base) {
      continue;
    }

    const outcome = buildTaskOutcome(task, survivor, base);
    const sourceRefs = [
      buildSourceRef('survivor_task', task.id),
      buildSourceRef('survivor', survivor.id),
      buildSourceRef('base', base.id),
    ];

    await base44.asServiceRole.entities.SurvivorTask.update(task.id, withProvenance({
      status: outcome.status,
      completed_at: new Date().toISOString(),
      outcome_summary: outcome.narrative,
      resources_gained: outcome.resources,
      credits_gained: outcome.credits,
      defense_contributed: outcome.defense,
      quality: outcome.quality,
      injury_caused: outcome.injured,
    }, {
      dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
      sourceRefs,
    }));

    const survivorUpdate: Record<string, unknown> = {
      current_task: 'idle',
      task_started_at: '',
      tasks_completed: (Number(survivor.tasks_completed || 0) || 0) + 1,
    };

    if (outcome.injured) {
      survivorUpdate.health = 'injured';
      survivorUpdate.status = 'injured';
    }

    if (outcome.skillUp && Number(survivor.skill_level || 1) < 5) {
      survivorUpdate.skill_level = Number(survivor.skill_level || 1) + 1;
    }

    await base44.asServiceRole.entities.Survivor.update(survivor.id, withProvenance(survivorUpdate, {
      dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
      sourceRefs,
    }));

    results.push({ survivor: survivor.name, task: task.task_type, outcome: outcome.quality });
  }

  return Response.json({ status: 'ok', resolved: results.length, results });
}

async function handleTriggerDefense(base44, user, body) {
  if (user.role !== 'admin') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  const baseId = sanitizeText(body.base_id, 80);
  if (!baseId) {
    return Response.json({ error: 'base_id required' }, { status: 400 });
  }

  const base = await getBase(base44, baseId);
  if (!base) {
    return Response.json({ error: 'Base not found' }, { status: 404 });
  }

  const [survivors, taskHistory] = await Promise.all([
    base44.asServiceRole.entities.Survivor.filter({ base_id: base.id }),
    base44.asServiceRole.entities.SurvivorTask.filter({ base_id: base.id }, '-created_date', 200),
  ]);
  const activeSurvivors = survivors.filter((survivor) => survivor.status === 'active');
  const defenders = activeSurvivors.filter((survivor) =>
    survivor.current_task === 'patrol' || survivor.current_task === 'defend' || survivor.skill === 'guard'
  );
  const nonDefenders = activeSurvivors.filter((survivor) => !defenders.some((defender) => defender.id === survivor.id));
  const defenseSeed = `defense:${base.id}:${taskHistory.filter((task) => task.task_type === 'defend').length}:${activeSurvivors.length}`;

  let defensePower = (Number(base.defense_level || 1) || 1) * 10;
  for (const defender of defenders) {
    defensePower += (Number(defender.combat_rating || 1) || 1) * 3 + (Number(defender.skill_level || 1) || 1) * 2;
    if (defender.skill === 'guard') {
      defensePower += 5;
    }
  }
  for (const survivor of nonDefenders) {
    defensePower += Number(survivor.combat_rating || 1) || 1;
  }

  const defaultThreat = deterministicNumber(20, 59, defenseSeed, 'default_threat');
  const threatStrength = clampNumber(body.threat_strength, 10, 200, defaultThreat);
  const defenseRatio = defensePower / Math.max(threatStrength, 1);
  const victoryChance = Math.max(0.05, Math.min(0.95, defenseRatio));
  const victory = defenseRatio >= 1 || (defenseRatio > 0.5 && deterministicBoolean(victoryChance, defenseSeed, 'victory'));
  const result = buildDefenseOutcome(base, defenders, nonDefenders, threatStrength, defensePower, victory, defenseSeed);

  const activeTasks = taskHistory.filter((task) => task.status === 'active');
  for (const task of activeTasks) {
    if (!defenders.some((defender) => defender.id === task.survivor_id)) {
      continue;
    }

    await base44.asServiceRole.entities.SurvivorTask.update(task.id, withProvenance({
      status: 'interrupted',
      interrupted_by: 'Base defense event',
      completed_at: new Date().toISOString(),
    }, {
      dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
      sourceRefs: [
        buildSourceRef('survivor_task', task.id),
        buildSourceRef('survivor', task.survivor_id),
        buildSourceRef('base', base.id),
      ],
    }));
  }

  for (const defender of defenders) {
    const injured = result.injuries.includes(defender.id);
    const kills = victory ? deterministicNumber(0, 3, defenseSeed, defender.id, 'kills') : 0;
    await base44.asServiceRole.entities.SurvivorTask.create(withProvenance({
      survivor_id: defender.id,
      survivor_name: defender.name,
      base_id: base.id,
      task_type: 'defend',
      status: 'completed',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      duration_minutes: 0,
      outcome_summary: injured
        ? `${defender.name} held the line at ${base.name} and came away hurt.`
        : victory
          ? `${defender.name} helped repel the assault on ${base.name}.`
          : `${defender.name} fought through the breach at ${base.name}.`,
      defense_contributed: Math.round(defensePower / Math.max(defenders.length, 1)),
      quality: victory ? 'good' : 'poor',
      injury_caused: injured,
    }, {
      dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
      sourceRefs: [
        buildSourceRef('survivor', defender.id),
        buildSourceRef('base', base.id),
      ],
    }));

    const update: Record<string, unknown> = {
      current_task: 'idle',
      task_started_at: '',
      defense_kills: (Number(defender.defense_kills || 0) || 0) + kills,
    };
    if (injured) {
      update.health = 'injured';
      update.status = 'injured';
      update.morale = 'anxious';
    }

    await base44.asServiceRole.entities.Survivor.update(defender.id, withProvenance(update, {
      dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
      sourceRefs: [
        buildSourceRef('survivor', defender.id),
        buildSourceRef('base', base.id),
      ],
    }));
  }

  if (victory) {
    if (base.status === 'under_siege') {
      await base44.asServiceRole.entities.PlayerBase.update(base.id, withProvenance({
        status: 'active',
      }, {
        dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
        sourceRefs: [buildSourceRef('base', base.id)],
      }));
    }
  } else {
    await base44.asServiceRole.entities.PlayerBase.update(base.id, withProvenance({
      status: 'under_siege',
      defense_level: Math.max(1, (Number(base.defense_level || 1) || 1) - 1),
    }, {
      dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
      sourceRefs: [buildSourceRef('base', base.id)],
    }));
  }

  if (base.owner_email) {
    await base44.asServiceRole.entities.Notification.create(withProvenance({
      player_email: base.owner_email,
      title: victory ? `${base.name} defended successfully!` : `${base.name} was overrun!`,
      message: result.summary,
      type: 'colony_alert',
      priority: victory ? 'normal' : 'critical',
      is_read: false,
    }, {
      dataOrigin: DATA_ORIGINS.DETERMINISTIC_PROJECTION,
      sourceRefs: [buildSourceRef('base', base.id)],
    }));
  }

  return Response.json({
    status: 'ok',
    victory,
    defense_power: defensePower,
    threat_strength: threatStrength,
    defenders_count: defenders.length,
    injuries: result.injuries.length,
    narrative: result.summary,
    details: result.details,
  });
}

async function handleGetBaseStatus(base44, user, body) {
  const baseId = sanitizeText(body.base_id, 80);
  if (!baseId) {
    return Response.json({ error: 'base_id required' }, { status: 400 });
  }

  const base = await getAuthorizedBase(base44, user, baseId);
  if (!base) {
    return Response.json({ error: 'Base not found or not authorized' }, { status: 404 });
  }

  const survivors = await base44.asServiceRole.entities.Survivor.filter({ base_id: base.id });
  const activeSurvivors = survivors.filter((survivor) => survivor.status === 'active');
  const patrolling = activeSurvivors.filter((survivor) =>
    survivor.current_task === 'patrol' || survivor.current_task === 'defend'
  );
  const guards = activeSurvivors.filter((survivor) => survivor.skill === 'guard');
  const working = activeSurvivors.filter((survivor) => survivor.current_task && survivor.current_task !== 'idle');
  const idle = activeSurvivors.filter((survivor) => !survivor.current_task || survivor.current_task === 'idle');

  let defensePower = (Number(base.defense_level || 1) || 1) * 10;
  for (const survivor of patrolling) {
    defensePower += (Number(survivor.combat_rating || 1) || 1) * 3 + (Number(survivor.skill_level || 1) || 1) * 2;
    if (survivor.skill === 'guard') {
      defensePower += 5;
    }
  }
  for (const survivor of activeSurvivors) {
    if (!patrolling.some((patrol) => patrol.id === survivor.id)) {
      defensePower += Number(survivor.combat_rating || 1) || 1;
    }
  }

  const recentTasks = await base44.asServiceRole.entities.SurvivorTask.filter({ base_id: base.id }, '-created_date', 20);

  return Response.json({
    status: 'ok',
    defense_power: defensePower,
    defense_level: Number(base.defense_level || 1) || 1,
    total_active: activeSurvivors.length,
    patrolling: patrolling.length,
    guards: guards.length,
    working: working.length,
    idle: idle.length,
    recent_tasks: recentTasks,
    task_summary: {
      scavenge: working.filter((survivor) => survivor.current_task === 'scavenge').length,
      farm: working.filter((survivor) => survivor.current_task === 'farm').length,
      craft: working.filter((survivor) => survivor.current_task === 'craft').length,
      patrol: working.filter((survivor) => survivor.current_task === 'patrol').length,
      heal: working.filter((survivor) => survivor.current_task === 'heal').length,
      cook: working.filter((survivor) => survivor.current_task === 'cook').length,
      repair: working.filter((survivor) => survivor.current_task === 'repair').length,
      trade: working.filter((survivor) => survivor.current_task === 'trade').length,
    },
  });
}

async function getSurvivor(base44, survivorId) {
  const survivors = await base44.asServiceRole.entities.Survivor.filter({ id: survivorId });
  return survivors[0] || null;
}

async function getBase(base44, baseId) {
  const bases = await base44.asServiceRole.entities.PlayerBase.filter({ id: baseId });
  return bases[0] || null;
}

async function getAuthorizedBase(base44, user, baseId) {
  const base = await getBase(base44, baseId);
  if (!base) {
    return null;
  }
  if (user.role === 'admin' || base.owner_email === user.email) {
    return base;
  }
  return null;
}

async function getAuthorizedBaseForSurvivor(base44, user, survivor) {
  if (!survivor?.base_id) {
    return null;
  }
  return await getAuthorizedBase(base44, user, survivor.base_id);
}

function buildTaskOutcome(task, survivor, base) {
  const survivorSkillLevel = clampNumber(survivor.skill_level, 1, 5, 1);
  const isSpecialist = TASK_SKILL_MATCH[survivor.skill] === task.task_type;
  const skillBonus = isSpecialist ? survivorSkillLevel * 15 : survivorSkillLevel * 5;
  const baseSuccess = Math.min(95, 60 + skillBonus);
  const seed = `task:${task.id}:${survivor.id}:${task.task_type}:${base.id}`;
  const roll = deterministicNumber(1, 100, seed, 'roll');
  const success = roll <= baseSuccess;
  const excellent = success && roll <= Math.max(10, Math.round(baseSuccess * 0.4));
  const injured = !success && deterministicBoolean(0.3, seed, 'injured');
  const skillUp = excellent && isSpecialist && deterministicBoolean(0.35, seed, 'skill_up');
  const quality = excellent ? 'excellent' : success ? (deterministicBoolean(0.5, seed, 'quality') ? 'good' : 'standard') : 'poor';
  const creditBase = TASK_CREDIT_BASE[task.task_type] || 10;
  const defaultCredits = success
    ? Math.round(creditBase * (excellent ? 2 : 1) * (1 + survivorSkillLevel * 0.1))
    : 0;

  return {
    status: success ? 'completed' : 'failed',
    narrative: buildTaskNarrative(task, survivor, base, success, excellent, injured),
    resources: getTaskResources(task.task_type, success, excellent),
    credits: success ? defaultCredits + deterministicNumber(0, Math.max(2, survivorSkillLevel * 2), seed, 'credits') : 0,
    defense: task.task_type === 'patrol' ? Math.round(5 + survivorSkillLevel * 2 + (survivor.skill === 'guard' ? 2 : 0)) : 0,
    quality,
    injured,
    skillUp,
  };
}

function buildDefenseOutcome(base, defenders, others, threatStrength, defensePower, victory, seed) {
  const injuries = [];
  const injuryChance = victory ? 0.15 : 0.4;

  for (const defender of defenders) {
    if (deterministicBoolean(injuryChance, seed, defender.id, 'injury')) {
      injuries.push(defender.id);
    }
  }
  if (!victory) {
    for (const survivor of others) {
      if (deterministicBoolean(0.2, seed, survivor.id, 'collateral')) {
        injuries.push(survivor.id);
      }
    }
  }

  const leadDefender = defenders[0]?.name || 'No standing defender';
  const summary = victory
    ? `${base.name} held the perimeter. ${leadDefender} anchored the defense while the attackers burned time against prepared positions.`
    : `${base.name} lost the perimeter under concentrated pressure. ${leadDefender} bought time, but the breach spread faster than the camp could seal it.`;
  const details = `Defense power ${defensePower} met threat strength ${threatStrength}. ${injuries.length} survivor(s) were marked as injured during the exchange.`;

  return { summary, details, injuries };
}

function buildTaskNarrative(task, survivor, base, success, excellent, injured) {
  if (excellent) {
    return `${survivor.name} turned a routine ${task.task_type} shift at ${base.name} into a clean surplus run. The camp got more out of the job than it budgeted for.`;
  }
  if (success) {
    return `${survivor.name} completed ${task.task_type} duty at ${base.name} and returned with usable output before the window closed.`;
  }
  if (injured) {
    return `${survivor.name}'s ${task.task_type} assignment at ${base.name} went sideways and cost blood as well as time.`;
  }
  return `${survivor.name}'s ${task.task_type} assignment at ${base.name} stalled out before it paid the settlement back.`;
}

function getTaskResources(taskType, success, excellent) {
  if (!success) {
    return 'Nothing recovered';
  }

  const defaults = {
    scavenge: excellent ? 'Recovered scrap, sealed gear, and a clean salvage map' : 'Recovered scrap and salvageable gear',
    farm: excellent ? 'Fresh ration crops, seed stock, and stable water yield' : 'Fresh ration crops and usable seed stock',
    craft: excellent ? 'Field-made tools, reinforced parts, and a spare assembly' : 'Field-made tools and reinforced parts',
    patrol: excellent ? 'Perimeter intel, cleared lines of sight, and safer routes' : 'Perimeter intel and a safer approach route',
    heal: excellent ? 'Stabilized patients and preserved high-value medical stock' : 'Stabilized patients and conserved medical supplies',
    cook: excellent ? 'Prepared meals, ration reserves, and a measurable morale lift' : 'Prepared meals and improved camp morale',
    repair: excellent ? 'Reinforced structures, patched gear, and hardened weak points' : 'Reinforced structures and patched equipment',
    trade: excellent ? 'Barter goods, favorable caravan terms, and fresh contacts' : 'Barter goods and favorable caravan contacts',
    defend: 'No material yield',
  };

  return defaults[taskType] || 'Some useful materials';
}

function sanitizeTaskType(value) {
  const taskType = sanitizeText(value, 40);
  return TASK_TYPES.has(taskType) ? taskType : '';
}

function sanitizeText(value, maxLength = 200) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, numeric));
}
