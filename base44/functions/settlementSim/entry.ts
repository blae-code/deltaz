import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

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
  const task = await base44.asServiceRole.entities.SurvivorTask.create({
    survivor_id: survivor.id,
    survivor_name: survivor.name,
    base_id: survivor.base_id,
    task_type: taskType,
    status: 'active',
    started_at: now,
    duration_minutes: TASK_DURATIONS[taskType] || 30,
  });

  await base44.asServiceRole.entities.Survivor.update(survivor.id, {
    current_task: taskType,
    task_started_at: now,
  });

  return Response.json({ status: 'ok', task });
}

async function handleResolveTasks(base44, user) {
  const baseFilter = user.role === 'admin' ? {} : { owner_email: user.email };
  const bases = await base44.asServiceRole.entities.PlayerBase.filter(baseFilter);
  const baseIds = new Set(bases.map((base) => base.id).filter(Boolean));

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
    if (!survivor) {
      continue;
    }

    const outcome = await generateTaskOutcome(base44, task, survivor);

    await base44.asServiceRole.entities.SurvivorTask.update(task.id, {
      status: outcome.status,
      completed_at: new Date().toISOString(),
      outcome_summary: outcome.narrative,
      resources_gained: outcome.resources,
      credits_gained: outcome.credits,
      defense_contributed: outcome.defense,
      quality: outcome.quality,
      injury_caused: outcome.injured,
    });

    const survivorUpdate = {
      current_task: 'idle',
      task_started_at: '',
      tasks_completed: (survivor.tasks_completed || 0) + 1,
    };

    if (outcome.injured) {
      survivorUpdate.health = 'injured';
      survivorUpdate.status = 'injured';
    }

    if (outcome.skillUp && Number(survivor.skill_level || 1) < 5) {
      survivorUpdate.skill_level = Number(survivor.skill_level || 1) + 1;
    }

    await base44.asServiceRole.entities.Survivor.update(survivor.id, survivorUpdate);
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

  const survivors = await base44.asServiceRole.entities.Survivor.filter({ base_id: base.id });
  const activeSurvivors = survivors.filter((survivor) => survivor.status === 'active');
  const defenders = activeSurvivors.filter((survivor) =>
    survivor.current_task === 'patrol' || survivor.current_task === 'defend' || survivor.skill === 'guard'
  );
  const nonDefenders = activeSurvivors.filter((survivor) => !defenders.some((defender) => defender.id === survivor.id));

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

  const defaultThreat = Math.floor(Math.random() * 40) + 20;
  const threatStrength = clampNumber(body.threat_strength, 10, 200, defaultThreat);
  const defenseRatio = defensePower / Math.max(threatStrength, 1);
  const victory = defenseRatio > 0.8 || (defenseRatio > 0.5 && Math.random() > 0.4);
  const result = await generateDefenseNarrative(base44, base, defenders, nonDefenders, threatStrength, defensePower, victory);

  const activeTasks = await base44.asServiceRole.entities.SurvivorTask.filter({ base_id: base.id, status: 'active' });
  for (const task of activeTasks) {
    if (!defenders.some((defender) => defender.id === task.survivor_id)) {
      continue;
    }

    await base44.asServiceRole.entities.SurvivorTask.update(task.id, {
      status: 'interrupted',
      interrupted_by: 'Base defense event',
      completed_at: new Date().toISOString(),
    });
  }

  for (const defender of defenders) {
    await base44.asServiceRole.entities.SurvivorTask.create({
      survivor_id: defender.id,
      survivor_name: defender.name,
      base_id: base.id,
      task_type: 'defend',
      status: 'completed',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      duration_minutes: 0,
      outcome_summary: victory ? `Helped defend ${base.name}` : `Fought in the defense of ${base.name}`,
      defense_contributed: Math.round(defensePower / Math.max(defenders.length, 1)),
      quality: victory ? 'good' : 'poor',
      injury_caused: result.injuries.includes(defender.id),
    });

    const update = {
      current_task: 'idle',
      task_started_at: '',
      defense_kills: (Number(defender.defense_kills || 0) || 0) + (victory ? Math.floor(Math.random() * 3) + 1 : 0),
    };
    if (result.injuries.includes(defender.id)) {
      update.health = 'injured';
      update.status = 'injured';
      update.morale = 'anxious';
    }

    await base44.asServiceRole.entities.Survivor.update(defender.id, update);
  }

  if (victory) {
    if (base.status === 'under_siege') {
      await base44.asServiceRole.entities.PlayerBase.update(base.id, { status: 'active' });
    }
  } else {
    await base44.asServiceRole.entities.PlayerBase.update(base.id, {
      status: 'under_siege',
      defense_level: Math.max(1, (Number(base.defense_level || 1) || 1) - 1),
    });
  }

  if (base.owner_email) {
    await base44.asServiceRole.entities.Notification.create({
      player_email: base.owner_email,
      title: victory ? `${base.name} defended successfully!` : `${base.name} was overrun!`,
      message: result.summary,
      type: 'colony_alert',
      priority: victory ? 'normal' : 'critical',
      is_read: false,
    });
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

async function generateTaskOutcome(base44, task, survivor) {
  const skillMatch = {
    scavenger: 'scavenge',
    medic: 'heal',
    mechanic: 'repair',
    farmer: 'farm',
    guard: 'patrol',
    trader: 'trade',
    engineer: 'craft',
    cook: 'cook',
  };

  const survivorSkillLevel = clampNumber(survivor.skill_level, 1, 5, 1);
  const isSpecialist = skillMatch[survivor.skill] === task.task_type;
  const skillBonus = isSpecialist ? survivorSkillLevel * 15 : survivorSkillLevel * 5;
  const baseSuccess = 60 + skillBonus;
  const roll = Math.random() * 100;
  const success = roll < baseSuccess;
  const excellent = success && roll < baseSuccess * 0.4;
  const injured = !success && Math.random() > 0.7;
  const skillUp = excellent && isSpecialist && Math.random() > 0.6;

  const creditBase = {
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
  const defaultCredits = success
    ? Math.round((creditBase[task.task_type] || 10) * (excellent ? 2 : 1) * (1 + survivorSkillLevel * 0.1))
    : 0;

  try {
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `A post-apocalyptic survivor named "${sanitizeText(survivor.name, 80)}" (${sanitizeText(survivor.skill, 40)}, skill level ${survivorSkillLevel}/5, personality: "${sanitizeText(survivor.personality, 160)}") just ${success ? 'completed' : 'attempted'} a ${sanitizeText(task.task_type, 40)} task at their settlement.

Result: ${excellent ? 'EXCELLENT - extraordinary success' : success ? 'SUCCESS - completed adequately' : 'FAILURE - something went wrong'}
${injured ? 'The survivor was INJURED during the task.' : ''}

Write a 1-2 sentence gritty narrative of what happened. Also list any resources produced (be specific and thematic). Keep it short and atmospheric.`,
      response_json_schema: {
        type: 'object',
        properties: {
          narrative: { type: 'string' },
          resources: { type: 'string' },
          credits: { type: 'number' },
        },
      },
    });

    return {
      status: success ? 'completed' : 'failed',
      narrative: sanitizeText(result?.narrative, 400) || getDefaultTaskNarrative(task, survivor, success, excellent),
      resources: sanitizeText(result?.resources, 200) || getDefaultTaskResources(task, success),
      credits: success ? clampNumber(result?.credits, 0, 500, defaultCredits) : 0,
      defense: task.task_type === 'patrol' ? Math.round(5 + survivorSkillLevel * 2) : 0,
      quality: excellent ? 'excellent' : success ? (Math.random() > 0.5 ? 'good' : 'standard') : 'poor',
      injured,
      skillUp,
    };
  } catch (error) {
    console.error('settlementSim task generation failed:', error);
    return {
      status: success ? 'completed' : 'failed',
      narrative: getDefaultTaskNarrative(task, survivor, success, excellent),
      resources: getDefaultTaskResources(task, success),
      credits: defaultCredits,
      defense: task.task_type === 'patrol' ? Math.round(5 + survivorSkillLevel * 2) : 0,
      quality: excellent ? 'excellent' : success ? 'good' : 'poor',
      injured,
      skillUp,
    };
  }
}

async function generateDefenseNarrative(base44, base, defenders, others, threatStrength, defensePower, victory) {
  const injuries = [];
  const injuryChance = victory ? 0.15 : 0.4;

  for (const defender of defenders) {
    if (Math.random() < injuryChance) {
      injuries.push(defender.id);
    }
  }
  if (!victory) {
    for (const survivor of others) {
      if (Math.random() < 0.2) {
        injuries.push(survivor.id);
      }
    }
  }

  const defenderNames = defenders
    .map((defender) => `${sanitizeText(defender.name, 60)} (${sanitizeText(defender.skill, 30)})`)
    .join(', ');

  try {
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `A post-apocalyptic base called "${sanitizeText(base.name, 80)}" was attacked by hostiles.

Defenders (${defenders.length}): ${defenderNames || 'None — base was undefended'}
Other survivors at base: ${others.length}
Base defense level: ${Number(base.defense_level || 1) || 1}
Defense power: ${defensePower} vs Threat: ${threatStrength}
Outcome: ${victory ? 'DEFENDERS WON' : 'BASE WAS OVERRUN'}
Injuries: ${injuries.length}

Write a 2-3 sentence gritty combat narrative. Be specific about what happened. Mention defenders by name if possible.`,
      response_json_schema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          details: { type: 'string' },
        },
      },
    });

    return {
      summary: sanitizeText(result?.summary, 500) || getDefaultDefenseSummary(base, victory, defenders.length),
      details: sanitizeText(result?.details, 500),
      injuries,
    };
  } catch (error) {
    console.error('settlementSim defense generation failed:', error);
    return {
      summary: getDefaultDefenseSummary(base, victory, defenders.length),
      details: '',
      injuries,
    };
  }
}

function getDefaultTaskNarrative(task, survivor, success, excellent) {
  if (excellent) {
    return `${survivor.name} returned from ${task.task_type} duty with uncommon efficiency and a story the rest of the camp will repeat tonight.`;
  }
  if (success) {
    return `${survivor.name} completed the ${task.task_type} assignment and brought back something the settlement can use.`;
  }
  return `${survivor.name}'s ${task.task_type} run broke down in the field, leaving little to show for the risk.`;
}

function getDefaultTaskResources(task, success) {
  if (!success) {
    return 'Nothing recovered';
  }

  const defaults = {
    scavenge: 'Recovered scrap and salvageable gear',
    farm: 'Fresh ration crops and usable seed stock',
    craft: 'Field-made tools and reinforced parts',
    patrol: 'Perimeter intel and a safer approach route',
    heal: 'Stabilized patients and conserved medical supplies',
    cook: 'Prepared meals and improved camp morale',
    repair: 'Reinforced structures and patched equipment',
    trade: 'Barter goods and favorable caravan contacts',
    defend: 'No material yield',
  };

  return defaults[task.task_type] || 'Some useful materials';
}

function getDefaultDefenseSummary(base, victory, defenderCount) {
  if (victory) {
    return `${base.name} held the line with ${defenderCount} defender(s) in the fight, and the attackers broke before the perimeter did.`;
  }
  return `${base.name} could not absorb the assault, and the attackers pushed through the defenses before the settlement could recover.`;
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
