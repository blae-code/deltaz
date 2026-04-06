import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    // ACTION: assign_task — player assigns a survivor to a task
    if (action === 'assign_task') {
      const { survivor_id, task_type } = body;
      if (!survivor_id || !task_type) {
        return Response.json({ error: 'survivor_id and task_type required' }, { status: 400 });
      }

      const survivor = await base44.entities.Survivor.filter({ id: survivor_id });
      const s = survivor[0];
      if (!s) return Response.json({ error: 'Survivor not found' }, { status: 404 });
      if (s.current_task && s.current_task !== 'idle') {
        return Response.json({ error: 'Survivor is already busy' }, { status: 409 });
      }
      if (s.status !== 'active') {
        return Response.json({ error: 'Survivor is not active' }, { status: 409 });
      }

      const now = new Date().toISOString();
      const durationMap = {
        scavenge: 45, farm: 60, craft: 40, patrol: 30,
        heal: 50, cook: 35, repair: 45, trade: 40, defend: 0,
      };

      const task = await base44.entities.SurvivorTask.create({
        survivor_id: s.id,
        survivor_name: s.name,
        base_id: s.base_id,
        task_type,
        status: 'active',
        started_at: now,
        duration_minutes: durationMap[task_type] || 30,
      });

      await base44.entities.Survivor.update(s.id, {
        current_task: task_type,
        task_started_at: now,
      });

      return Response.json({ status: 'ok', task });
    }

    // ACTION: resolve_tasks — resolve all active tasks that have elapsed
    if (action === 'resolve_tasks') {
      const isAdmin = user.role === 'admin';
      const baseFilter = isAdmin ? {} : { owner_email: user.email };
      const bases = await base44.entities.PlayerBase.filter(baseFilter);
      const baseIds = bases.map(b => b.id);

      const activeTasks = await base44.asServiceRole.entities.SurvivorTask.filter({ status: 'active' });
      const tasksToResolve = activeTasks.filter(t => {
        if (!baseIds.includes(t.base_id)) return false;
        const started = new Date(t.started_at).getTime();
        const elapsed = (Date.now() - started) / 60000;
        return elapsed >= (t.duration_minutes || 30);
      });

      if (tasksToResolve.length === 0) {
        return Response.json({ status: 'ok', resolved: 0, message: 'No tasks ready to resolve' });
      }

      const survivors = await base44.asServiceRole.entities.Survivor.filter({});
      const survivorMap = Object.fromEntries(survivors.map(s => [s.id, s]));

      const results = [];
      for (const task of tasksToResolve) {
        const s = survivorMap[task.survivor_id];
        if (!s) continue;

        const outcome = await generateTaskOutcome(base44, task, s);
        
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
          tasks_completed: (s.tasks_completed || 0) + 1,
        };
        if (outcome.injured) {
          survivorUpdate.health = 'injured';
          survivorUpdate.status = 'injured';
        }
        if (outcome.skillUp && s.skill_level < 5) {
          survivorUpdate.skill_level = s.skill_level + 1;
        }
        await base44.asServiceRole.entities.Survivor.update(s.id, survivorUpdate);

        results.push({ survivor: s.name, task: task.task_type, outcome: outcome.quality });
      }

      return Response.json({ status: 'ok', resolved: results.length, results });
    }

    // ACTION: trigger_defense — simulate a base attack
    if (action === 'trigger_defense') {
      const { base_id } = body;
      const isAdmin = user.role === 'admin';
      if (!isAdmin) {
        const myBases = await base44.entities.PlayerBase.filter({ owner_email: user.email });
        if (!myBases.find(b => b.id === base_id)) {
          return Response.json({ error: 'Not your base' }, { status: 403 });
        }
      }

      const base = (await base44.asServiceRole.entities.PlayerBase.filter({ id: base_id }))[0];
      if (!base) return Response.json({ error: 'Base not found' }, { status: 404 });

      const survivors = await base44.asServiceRole.entities.Survivor.filter({ base_id });
      const activeSurvivors = survivors.filter(s => s.status === 'active');
      const defenders = activeSurvivors.filter(s =>
        s.current_task === 'patrol' || s.current_task === 'defend' || s.skill === 'guard'
      );
      const nonDefenders = activeSurvivors.filter(s =>
        !defenders.includes(s)
      );

      // Calculate defense power
      const defenseLevel = base.defense_level || 1;
      let defensePower = defenseLevel * 10;
      defenders.forEach(s => {
        defensePower += (s.combat_rating || 1) * 3 + (s.skill_level || 1) * 2;
        if (s.skill === 'guard') defensePower += 5;
      });
      // Non-defenders contribute less
      nonDefenders.forEach(s => {
        defensePower += (s.combat_rating || 1);
      });

      const threatStrength = body.threat_strength || Math.floor(Math.random() * 40) + 20;
      const defenseRatio = defensePower / threatStrength;
      const victory = defenseRatio > 0.8 || (defenseRatio > 0.5 && Math.random() > 0.4);

      const result = await generateDefenseNarrative(base44, base, defenders, nonDefenders, threatStrength, defensePower, victory);

      // Interrupt active tasks for defenders
      const activeTasks = await base44.asServiceRole.entities.SurvivorTask.filter({ base_id, status: 'active' });
      for (const task of activeTasks) {
        const isDefender = defenders.find(d => d.id === task.survivor_id);
        if (isDefender) {
          await base44.asServiceRole.entities.SurvivorTask.update(task.id, {
            status: 'interrupted',
            interrupted_by: 'Base defense event',
            completed_at: new Date().toISOString(),
          });
        }
      }

      // Create defense task records for each defender
      for (const d of defenders) {
        await base44.asServiceRole.entities.SurvivorTask.create({
          survivor_id: d.id,
          survivor_name: d.name,
          base_id,
          task_type: 'defend',
          status: 'completed',
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          duration_minutes: 0,
          outcome_summary: victory ? `Helped defend ${base.name}` : `Fought in the defense of ${base.name}`,
          defense_contributed: Math.round(defensePower / Math.max(defenders.length, 1)),
          quality: victory ? 'good' : 'poor',
          injury_caused: result.injuries.includes(d.id),
        });

        const upd = {
          current_task: 'idle',
          task_started_at: '',
          defense_kills: (d.defense_kills || 0) + (victory ? Math.floor(Math.random() * 3) + 1 : 0),
        };
        if (result.injuries.includes(d.id)) {
          upd.health = 'injured';
          upd.status = 'injured';
          upd.morale = 'anxious';
        }
        await base44.asServiceRole.entities.Survivor.update(d.id, upd);
      }

      // Update base status
      if (!victory) {
        await base44.asServiceRole.entities.PlayerBase.update(base.id, {
          status: 'under_siege',
          defense_level: Math.max(1, (base.defense_level || 1) - 1),
        });
      }

      // Notify owner
      await base44.asServiceRole.entities.Notification.create({
        player_email: base.owner_email,
        title: victory ? `${base.name} defended successfully!` : `${base.name} was overrun!`,
        message: result.summary,
        type: 'colony_alert',
        priority: victory ? 'normal' : 'critical',
        is_read: false,
      });

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

    // ACTION: get_base_status — get defense readiness
    if (action === 'get_base_status') {
      const { base_id } = body;
      const base = (await base44.entities.PlayerBase.filter({ id: base_id }))[0];
      if (!base) return Response.json({ error: 'Base not found' }, { status: 404 });

      const survivors = await base44.entities.Survivor.filter({ base_id });
      const active = survivors.filter(s => s.status === 'active');
      const patrolling = active.filter(s => s.current_task === 'patrol' || s.current_task === 'defend');
      const guards = active.filter(s => s.skill === 'guard');
      const working = active.filter(s => s.current_task && s.current_task !== 'idle');
      const idle = active.filter(s => !s.current_task || s.current_task === 'idle');

      let defensePower = (base.defense_level || 1) * 10;
      patrolling.forEach(s => {
        defensePower += (s.combat_rating || 1) * 3 + (s.skill_level || 1) * 2;
        if (s.skill === 'guard') defensePower += 5;
      });
      active.filter(s => !patrolling.includes(s)).forEach(s => {
        defensePower += (s.combat_rating || 1);
      });

      const recentTasks = await base44.entities.SurvivorTask.filter(
        { base_id },
        '-created_date',
        20
      );

      return Response.json({
        status: 'ok',
        defense_power: defensePower,
        defense_level: base.defense_level || 1,
        total_active: active.length,
        patrolling: patrolling.length,
        guards: guards.length,
        working: working.length,
        idle: idle.length,
        recent_tasks: recentTasks,
        task_summary: {
          scavenge: working.filter(s => s.current_task === 'scavenge').length,
          farm: working.filter(s => s.current_task === 'farm').length,
          craft: working.filter(s => s.current_task === 'craft').length,
          patrol: working.filter(s => s.current_task === 'patrol').length,
          heal: working.filter(s => s.current_task === 'heal').length,
          cook: working.filter(s => s.current_task === 'cook').length,
          repair: working.filter(s => s.current_task === 'repair').length,
          trade: working.filter(s => s.current_task === 'trade').length,
        },
      });
    }

    return Response.json({ error: 'Unknown action. Use: assign_task, resolve_tasks, trigger_defense, get_base_status' }, { status: 400 });
  } catch (error) {
    console.error('settlementSim error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function generateTaskOutcome(base44, task, survivor) {
  const skillMatch = {
    scavenger: 'scavenge', medic: 'heal', mechanic: 'repair',
    farmer: 'farm', guard: 'patrol', trader: 'trade',
    engineer: 'craft', cook: 'cook',
  };
  const isSpecialist = skillMatch[survivor.skill] === task.task_type;
  const skillBonus = isSpecialist ? survivor.skill_level * 15 : survivor.skill_level * 5;
  const baseSuccess = 60 + skillBonus;
  const roll = Math.random() * 100;
  const success = roll < baseSuccess;
  const excellent = roll < baseSuccess * 0.4;

  const prompt = `A post-apocalyptic survivor named "${survivor.name}" (${survivor.skill}, skill level ${survivor.skill_level}/5, personality: "${survivor.personality}") just ${success ? 'completed' : 'attempted'} a ${task.task_type} task at their settlement.

Result: ${excellent ? 'EXCELLENT - extraordinary success' : success ? 'SUCCESS - completed adequately' : 'FAILURE - something went wrong'}
${!success && Math.random() > 0.7 ? 'The survivor was INJURED during the task.' : ''}

Write a 1-2 sentence gritty narrative of what happened. Also list any resources produced (be specific and thematic). Keep it short and atmospheric.`;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        narrative: { type: 'string' },
        resources: { type: 'string' },
        credits: { type: 'number' },
      },
    },
  });

  const injured = !success && Math.random() > 0.7;
  const skillUp = excellent && isSpecialist && Math.random() > 0.6;
  const creditBase = { scavenge: 15, farm: 10, craft: 20, patrol: 5, heal: 8, cook: 8, repair: 12, trade: 25 };
  const credits = success ? Math.round((creditBase[task.task_type] || 10) * (excellent ? 2 : 1) * (1 + survivor.skill_level * 0.1)) : 0;

  return {
    status: success ? 'completed' : 'failed',
    narrative: result.narrative || (success ? 'Task completed without incident.' : 'The task did not go as planned.'),
    resources: result.resources || (success ? 'Some useful materials' : 'Nothing recovered'),
    credits: result.credits || credits,
    defense: task.task_type === 'patrol' ? Math.round(5 + survivor.skill_level * 2) : 0,
    quality: excellent ? 'excellent' : success ? (Math.random() > 0.5 ? 'good' : 'standard') : 'poor',
    injured,
    skillUp,
  };
}

async function generateDefenseNarrative(base44, base, defenders, others, threatStr, defPower, victory) {
  const injuries = [];
  // Determine injuries — stronger threat = more injuries
  const injuryChance = victory ? 0.15 : 0.4;
  for (const d of defenders) {
    if (Math.random() < injuryChance) injuries.push(d.id);
  }
  if (!victory) {
    for (const o of others) {
      if (Math.random() < 0.2) injuries.push(o.id);
    }
  }

  const defenderNames = defenders.map(d => `${d.name} (${d.skill})`).join(', ');
  const prompt = `A post-apocalyptic base called "${base.name}" was attacked by hostiles.

Defenders (${defenders.length}): ${defenderNames || 'None — base was undefended'}
Other survivors at base: ${others.length}
Base defense level: ${base.defense_level || 1}
Defense power: ${defPower} vs Threat: ${threatStr}
Outcome: ${victory ? 'DEFENDERS WON' : 'BASE WAS OVERRUN'}
Injuries: ${injuries.length}

Write a 2-3 sentence gritty combat narrative. Be specific about what happened. Mention defenders by name if possible.`;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        details: { type: 'string' },
      },
    },
  });

  return {
    summary: result.summary || (victory ? 'The base held.' : 'The base was overrun.'),
    details: result.details || '',
    injuries,
  };
}