import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * executeScheduledTask — Called by a scheduled automation every 5 minutes.
 * Scans active ScheduledTasks, checks if any are due, and executes them.
 * Also handles pre-execution warnings.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const tasks = await base44.asServiceRole.entities.ScheduledTask.filter(
      { status: 'active' },
      '-created_date',
      200
    );

    const now = new Date();
    const results = [];

    for (const task of tasks) {
      try {
        const isDue = checkIfDue(task, now);
        const shouldWarn = checkIfShouldWarn(task, now);

        if (shouldWarn && !isDue) {
          await sendWarning(base44, task);
          results.push({ id: task.id, action: 'warned' });
        }

        if (isDue) {
          await executeTask(base44, task);
          const newRunCount = (task.run_count || 0) + 1;
          const updates = {
            last_run_at: now.toISOString(),
            last_run_result: 'success',
            run_count: newRunCount,
          };

          // One-time tasks auto-complete
          if (task.schedule_type === 'once') {
            updates.status = 'completed';
          }

          // Max runs check
          if (task.max_runs > 0 && newRunCount >= task.max_runs) {
            updates.status = 'completed';
          }

          await base44.asServiceRole.entities.ScheduledTask.update(task.id, updates);
          results.push({ id: task.id, action: 'executed' });
        }
      } catch (taskErr) {
        console.error(`Task ${task.id} (${task.name}) failed:`, taskErr.message);
        await base44.asServiceRole.entities.ScheduledTask.update(task.id, {
          last_run_at: now.toISOString(),
          last_run_result: `error: ${taskErr.message}`,
        });
        results.push({ id: task.id, action: 'failed', error: taskErr.message });
      }
    }

    return Response.json({ status: 'ok', checked: tasks.length, results });
  } catch (error) {
    console.error('executeScheduledTask error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function checkIfDue(task, now) {
  // Already ran in the last 4 minutes? Skip to avoid double-execution.
  if (task.last_run_at) {
    const lastRun = new Date(task.last_run_at);
    if (now - lastRun < 4 * 60 * 1000) return false;
  }

  if (task.schedule_type === 'once' && task.run_at) {
    const runAt = new Date(task.run_at);
    // Due if run_at is in the past but within the last 6 minutes
    return now >= runAt && (now - runAt) < 6 * 60 * 1000;
  }

  if (task.schedule_type === 'recurring' && task.cron_expression) {
    return cronMatchesNow(task.cron_expression, now);
  }

  return false;
}

function checkIfShouldWarn(task, now) {
  const warnMin = task.warn_minutes_before;
  if (!warnMin || warnMin <= 0) return false;

  // Already warned recently?
  if (task.last_run_result?.startsWith('warned:')) {
    const warnedAt = new Date(task.last_run_result.split('warned:')[1]);
    if (now - warnedAt < (warnMin + 2) * 60 * 1000) return false;
  }

  if (task.schedule_type === 'once' && task.run_at) {
    const runAt = new Date(task.run_at);
    const diff = (runAt - now) / 60000; // minutes until run
    return diff > 0 && diff <= warnMin;
  }

  if (task.schedule_type === 'recurring' && task.cron_expression) {
    const nextRun = getNextCronRun(task.cron_expression, now);
    if (!nextRun) return false;
    const diff = (nextRun - now) / 60000;
    return diff > 0 && diff <= warnMin;
  }

  return false;
}

async function sendWarning(base44, task) {
  const payload = safeParseJSON(task.payload);
  const defaultMsg = `⚠ SCHEDULED: "${task.name}" will execute in ${task.warn_minutes_before} minutes.`;
  const message = task.warn_message || defaultMsg;

  // Send RCON broadcast
  try {
    await base44.asServiceRole.functions.invoke('serverManager', {
      action: 'broadcast',
      message,
    });
  } catch (e) {
    console.warn('Warning broadcast failed:', e.message);
  }

  // Mark that we warned
  await base44.asServiceRole.entities.ScheduledTask.update(task.id, {
    last_run_result: `warned:${new Date().toISOString()}`,
  });
}

async function executeTask(base44, task) {
  const payload = safeParseJSON(task.payload);

  switch (task.task_type) {
    case 'restart':
      await base44.asServiceRole.functions.invoke('serverManager', { action: 'restart' });
      break;

    case 'broadcast':
      if (!payload.message) throw new Error('No broadcast message in payload');
      await base44.asServiceRole.functions.invoke('serverManager', {
        action: 'broadcast',
        message: payload.message,
      });
      break;

    case 'rcon_command':
      if (!payload.command) throw new Error('No command in payload');
      await base44.asServiceRole.functions.invoke('serverManager', {
        action: 'rcon',
        command: payload.command,
      });
      break;

    case 'event_start':
      if (payload.rcon_command) {
        await base44.asServiceRole.functions.invoke('serverManager', {
          action: 'rcon',
          command: payload.rcon_command,
        });
      }
      if (payload.broadcast_message) {
        await base44.asServiceRole.functions.invoke('serverManager', {
          action: 'broadcast',
          message: payload.broadcast_message,
        });
      }
      break;

    case 'event_end':
      if (payload.rcon_command) {
        await base44.asServiceRole.functions.invoke('serverManager', {
          action: 'rcon',
          command: payload.rcon_command,
        });
      }
      if (payload.broadcast_message) {
        await base44.asServiceRole.functions.invoke('serverManager', {
          action: 'broadcast',
          message: payload.broadcast_message,
        });
      }
      break;

    default:
      throw new Error(`Unknown task type: ${task.task_type}`);
  }
}

function safeParseJSON(str) {
  if (!str) return {};
  try { return JSON.parse(str); } catch { return {}; }
}

// Simple cron matcher: minute hour day-of-month month day-of-week
// Supports: numbers, *, step (*/N), ranges (1-5), lists (1,3,5)
function cronMatchesNow(expr, now) {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  const fields = [
    now.getUTCMinutes(),
    now.getUTCHours(),
    now.getUTCDate(),
    now.getUTCMonth() + 1,
    now.getUTCDay(),
  ];

  for (let i = 0; i < 5; i++) {
    if (!fieldMatches(parts[i], fields[i])) return false;
  }
  return true;
}

function fieldMatches(pattern, value) {
  if (pattern === '*') return true;

  // */N step
  if (pattern.startsWith('*/')) {
    const step = parseInt(pattern.slice(2), 10);
    return step > 0 && value % step === 0;
  }

  // List: 1,3,5
  const items = pattern.split(',');
  for (const item of items) {
    if (item.includes('-')) {
      const [lo, hi] = item.split('-').map(Number);
      if (value >= lo && value <= hi) return true;
    } else {
      if (parseInt(item, 10) === value) return true;
    }
  }
  return false;
}

/**
 * Gets the next cron run time (approximate, within next 24h) for warning calc.
 */
function getNextCronRun(expr, now) {
  const check = new Date(now);
  check.setUTCSeconds(0, 0);
  for (let i = 0; i < 1440; i++) { // Check next 24h in 1-min increments
    check.setUTCMinutes(check.getUTCMinutes() + 1);
    if (cronMatchesNow(expr, check)) return check;
  }
  return null;
}