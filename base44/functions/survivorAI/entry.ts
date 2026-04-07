import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

/**
 * survivorAI — Simulates individual survivor needs (hunger, social, rest, stress),
 * auto-assigns idle survivors to optimal tasks, evolves relationships,
 * awards skill XP based on tasks performed,
 * and generates nuanced drama events based on needs rather than just morale.
 *
 * Actions:
 *   { action: "tick" }        — Run a full simulation cycle for all active survivors
 *   { action: "auto_assign" } — Only auto-assign idle survivors to tasks
 */

const SKILL_TASK_MAP = {
  scavenger: "scavenge",
  medic: "heal",
  mechanic: "repair",
  farmer: "farm",
  guard: "patrol",
  trader: "trade",
  engineer: "craft",
  cook: "cook",
};

const TASK_NEED_EFFECTS = {
  scavenge:  { hunger: -8, social: -5, rest: -12, stress: 5 },
  farm:      { hunger: -5, social: 2, rest: -8, stress: -2 },
  craft:     { hunger: -4, social: -3, rest: -6, stress: 3 },
  patrol:    { hunger: -10, social: 3, rest: -15, stress: 8 },
  heal:      { hunger: -3, social: 5, rest: -5, stress: -3 },
  cook:      { hunger: 5, social: 8, rest: -6, stress: -5 },
  repair:    { hunger: -6, social: -2, rest: -10, stress: 2 },
  trade:     { hunger: -3, social: 10, rest: -4, stress: -1 },
  defend:    { hunger: -12, social: 5, rest: -18, stress: 15 },
  idle:      { hunger: -3, social: -8, rest: 15, stress: -5 },
};

// Which skills get XP from which tasks
const TASK_SKILL_XP = {
  scavenge: { survival: 8, combat: 2 },
  farm:     { survival: 6 },
  craft:    { crafting: 10 },
  patrol:   { combat: 6, survival: 3 },
  heal:     { medical: 10 },
  cook:     { survival: 5, social: 3 },
  repair:   { crafting: 8 },
  trade:    { social: 8, leadership: 2 },
  defend:   { combat: 12, leadership: 3 },
  idle:     {},
};

const PERSONALITY_MODIFIERS = {
  "paranoid":    { social: -3, stress: 4 },
  "cheerful":    { social: 3, stress: -3 },
  "loner":       { social: -6, stress: -2 },
  "aggressive":  { social: -2, stress: 5 },
  "nurturing":   { social: 5, stress: -2 },
  "anxious":     { stress: 6, rest: -3 },
  "stoic":       { stress: -4, social: -1 },
  "charismatic": { social: 8, stress: -1 },
};

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function getPersonalityMods(personality) {
  if (!personality) return {};
  const lc = personality.toLowerCase();
  for (const [key, mods] of Object.entries(PERSONALITY_MODIFIERS)) {
    if (lc.includes(key)) return mods;
  }
  return {};
}

function deriveMorale(hunger, social, rest, stress) {
  const composite = (hunger * 0.3 + social * 0.25 + rest * 0.2 + (100 - stress) * 0.25);
  if (composite >= 80) return "thriving";
  if (composite >= 60) return "content";
  if (composite >= 40) return "neutral";
  if (composite >= 20) return "anxious";
  return "desperate";
}

function identifyNeedCrisis(survivor) {
  const crises = [];
  if ((survivor.hunger ?? 80) < 20) crises.push({ need: "hunger", value: survivor.hunger, label: "starving" });
  if ((survivor.social ?? 60) < 15) crises.push({ need: "social", value: survivor.social, label: "isolated" });
  if ((survivor.rest ?? 70) < 15) crises.push({ need: "rest", value: survivor.rest, label: "exhausted" });
  if ((survivor.stress ?? 20) > 80) crises.push({ need: "stress", value: survivor.stress, label: "breaking point" });
  return crises;
}

function pickBestTask(survivor, colony, baseDefenseNeeded) {
  const hunger = survivor.hunger ?? 80;
  const social = survivor.social ?? 60;
  const rest = survivor.rest ?? 70;
  const stress = survivor.stress ?? 20;

  if (rest < 20) return "idle";
  if (hunger < 25 && survivor.skill === "farmer") return "farm";
  if (hunger < 25 && survivor.skill === "cook") return "cook";

  if (colony) {
    if ((colony.food_reserves ?? 100) < 30) {
      if (survivor.skill === "farmer") return "farm";
      if (survivor.skill === "cook") return "cook";
      if (survivor.skill === "scavenger") return "scavenge";
    }
    if ((colony.defense_integrity ?? 100) < 30 || baseDefenseNeeded) {
      if (survivor.skill === "guard") return "patrol";
      if (survivor.skill === "mechanic") return "repair";
    }
    if ((colony.medical_supplies ?? 100) < 30 && survivor.skill === "medic") return "heal";
  }

  if (social < 25) {
    if (["cook", "trade", "heal"].includes(SKILL_TASK_MAP[survivor.skill])) {
      return SKILL_TASK_MAP[survivor.skill];
    }
    return pick(["cook", "trade"]);
  }

  if (stress > 70) {
    return pick(["idle", "cook", "farm"]);
  }

  return SKILL_TASK_MAP[survivor.skill] || "scavenge";
}

function getSkillLevel(xp) {
  const thresholds = [0, 50, 150, 350, 700, 1200];
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (xp >= thresholds[i]) return i + 1;
  }
  return 1;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    const { action = "tick" } = await req.json().catch(() => ({}));

    const [survivors, colonies, bases, territories] = await Promise.all([
      base44.asServiceRole.entities.Survivor.filter({ status: "active" }),
      base44.asServiceRole.entities.ColonyStatus.list("-updated_date", 1),
      base44.asServiceRole.entities.PlayerBase.filter({ status: "active" }),
      base44.asServiceRole.entities.Territory.filter({}),
    ]);

    const colony = colonies[0] || null;
    const now = new Date().toISOString();

    const threatenedSectors = territories.filter(t => t.active_threat_wave?.status === "incoming").map(t => t.sector);
    const basesUnderThreat = bases.filter(b => threatenedSectors.includes(b.sector));

    // ─── AUTO-ASSIGN IDLE SURVIVORS ───
    if (action === "auto_assign" || action === "tick") {
      const idlers = survivors.filter(s => s.current_task === "idle");
      const assignments = [];

      for (const s of idlers) {
        const sBase = bases.find(b => b.id === s.base_id);
        const baseUnderThreat = sBase && basesUnderThreat.some(b => b.id === sBase.id);
        const task = pickBestTask(s, colony, baseUnderThreat);

        if (task !== "idle") {
          await base44.asServiceRole.entities.Survivor.update(s.id, {
            current_task: task,
            task_started_at: now,
          });
          assignments.push({ name: s.nickname || s.name, task, reason: "AI auto-assign" });
        }
      }

      if (action === "auto_assign") {
        return Response.json({ status: "ok", assignments });
      }
    }

    // ─── FULL TICK ───
    const needsUpdates = [];
    const dramaTriggers = [];
    const relationshipChanges = [];
    const skillXpAwarded = [];

    for (const s of survivors) {
      const task = s.current_task || "idle";
      const effects = TASK_NEED_EFFECTS[task] || TASK_NEED_EFFECTS.idle;
      const pMods = getPersonalityMods(s.personality);

      let hungerDelta = effects.hunger + (pMods.hunger || 0);
      let socialDelta = effects.social + (pMods.social || 0);
      let restDelta = effects.rest + (pMods.rest || 0);
      let stressDelta = effects.stress + (pMods.stress || 0);

      if (s.health === "injured" || s.health === "sick") {
        hungerDelta -= 5;
        restDelta -= 5;
        stressDelta += 5;
      }
      if (s.health === "critical") {
        hungerDelta -= 10;
        restDelta -= 10;
        stressDelta += 12;
      }

      if (colony && (colony.food_reserves ?? 100) < 25) {
        hungerDelta -= 8;
      }

      const sBase = bases.find(b => b.id === s.base_id);
      if (sBase && basesUnderThreat.some(b => b.id === sBase.id)) {
        stressDelta += 10;
      }

      const newHunger = clamp((s.hunger ?? 80) + hungerDelta, 0, 100);
      const newSocial = clamp((s.social ?? 60) + socialDelta, 0, 100);
      const newRest = clamp((s.rest ?? 70) + restDelta, 0, 100);
      const newStress = clamp((s.stress ?? 20) + stressDelta, 0, 100);
      const newMorale = deriveMorale(newHunger, newSocial, newRest, newStress);

      // ─── AWARD SKILL XP BASED ON TASK ───
      const taskXp = TASK_SKILL_XP[task] || {};
      const skills = { ...(s.skills || {}) };
      const skillLog = [...(s.skill_log || [])];
      const xpGains = [];

      for (const [skillName, baseXp] of Object.entries(taskXp)) {
        // Skill level bonus: primary skill tasks give +50% XP
        const primaryMatch = SKILL_TASK_MAP[s.skill] === task;
        const xp = primaryMatch ? Math.round(baseXp * 1.5) : baseXp;
        skills[skillName] = (skills[skillName] || 0) + xp;
        skillLog.unshift({ skill: skillName, xp, reason: `${task} task`, date: now });
        xpGains.push({ skill: skillName, xp });
      }

      if (xpGains.length > 0) {
        skillXpAwarded.push({ name: s.nickname || s.name, gains: xpGains });
      }

      // Evolve relationships
      const sameBaseSameTask = survivors.filter(o =>
        o.id !== s.id && o.base_id === s.base_id && o.current_task === s.current_task && s.current_task !== "idle"
      );
      const updatedRelationships = [...(s.relationships || [])];
      for (const other of sameBaseSameTask.slice(0, 3)) {
        const existing = updatedRelationships.find(r => r.survivor_id === other.id);
        if (existing) {
          existing.strength = clamp((existing.strength || 0) + 2, -10, 10);
        } else {
          updatedRelationships.push({
            survivor_id: other.id,
            name: other.nickname || other.name,
            type: "colleague",
            strength: 1,
          });
          relationshipChanges.push({ from: s.nickname || s.name, to: other.nickname || other.name, type: "new bond" });
        }
      }

      // Social tasks give social XP bonus for relationships
      if (sameBaseSameTask.length > 0 && ['cook', 'trade', 'heal'].includes(task)) {
        const socialBonus = Math.min(5, sameBaseSameTask.length * 2);
        skills.social = (skills.social || 0) + socialBonus;
        skillLog.unshift({ skill: 'social', xp: socialBonus, reason: `teamwork (${sameBaseSameTask.length} colleagues)`, date: now });
      }

      // Drama triggers
      const crises = identifyNeedCrisis({ hunger: newHunger, social: newSocial, rest: newRest, stress: newStress });
      for (const crisis of crises) {
        dramaTriggers.push({
          survivor_id: s.id,
          survivor_name: s.nickname || s.name,
          personality: s.personality,
          need: crisis.need,
          value: crisis.value,
          label: crisis.label,
          task: s.current_task,
          health: s.health,
          relationships: updatedRelationships.slice(0, 3),
          skills,
        });
      }

      let newTask = s.current_task;
      if (newRest < 10 && s.current_task !== "idle") {
        newTask = "idle";
      }

      // Update combat_rating based on combat skill
      const updates = {
        hunger: newHunger,
        social: newSocial,
        rest: newRest,
        stress: newStress,
        morale: newMorale,
        last_needs_update: now,
        relationships: updatedRelationships.slice(0, 10),
        current_task: newTask,
        skills,
        skill_log: skillLog.slice(0, 20),
        ...(newTask !== s.current_task ? { task_started_at: now } : {}),
      };
      if (skills.combat !== undefined) {
        updates.combat_rating = Math.min(10, getSkillLevel(skills.combat || 0) + Math.floor((skills.combat || 0) / 200));
      }

      await base44.asServiceRole.entities.Survivor.update(s.id, updates);

      needsUpdates.push({
        name: s.nickname || s.name,
        hunger: newHunger,
        social: newSocial,
        rest: newRest,
        stress: newStress,
        morale: newMorale,
        crises: crises.map(c => c.label),
      });
    }

    // ─── GENERATE NEEDS-BASED DRAMA ───
    let generatedDrama = null;
    if (dramaTriggers.length > 0) {
      const activeDramas = await base44.asServiceRole.entities.SurvivorDrama.filter({ status: "active" });
      if (activeDramas.length < 5) {
        const trigger = dramaTriggers.sort((a, b) => (a.value || 0) - (b.value || 0))[0];

        // Include skill levels in drama generation for skill-based challenges
        const triggerSkills = trigger.skills || {};
        const skillSummary = Object.entries(triggerSkills)
          .filter(([, xp]) => xp > 0)
          .map(([name, xp]) => `${name}:Lv${getSkillLevel(xp)}`)
          .join(', ') || 'no trained skills';

        const dramaResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `You are a post-apocalyptic survival game drama writer.

A survivor named "${trigger.survivor_name}" (personality: "${trigger.personality || 'unknown'}") is in crisis:
- NEED: ${trigger.need} — ${trigger.label} (value: ${trigger.value}/100)
- Current task: ${trigger.task}
- Health: ${trigger.health}
- Skill Levels: ${skillSummary}
- Relationships: ${JSON.stringify(trigger.relationships)}

Generate a DRAMATIC SCENARIO from this need crisis.

SKILL-BASED RESOLUTION RULES:
- At least ONE resolution option should reference a specific skill (combat, crafting, medical, leadership, survival, or social)
- Mark skill-based options with a skill_check field containing { skill: "skill_name", difficulty: "easy"|"moderate"|"hard"|"extreme" }
- The skill_check determines success probability — higher skill survivors succeed more often
- If the survivor HAS a high level in a relevant skill, create an option that uses it
- Include a non-skill option for GMs who want to resolve without a check

Examples:
- Medical crisis → option with medical skill check to treat symptoms
- Fight → option with leadership check to mediate, or combat check to intervene physically
- Theft → option with social check to negotiate, or survival check to track missing supplies

Return:
- drama_type: one of desertion, fight, mutiny, theft, breakdown, sabotage, romance, rivalry
- severity: minor, moderate, serious, or critical
- title: short dramatic headline
- description: 2-3 sentence vivid narrative
- resolution_options: array of 3 options, each with id, label, description, morale_effect (-10 to +10), risk (none/low/medium/high), and optional skill_check object { skill, difficulty }`,
          response_json_schema: {
            type: "object",
            properties: {
              drama_type: { type: "string" },
              severity: { type: "string" },
              title: { type: "string" },
              description: { type: "string" },
              resolution_options: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    label: { type: "string" },
                    description: { type: "string" },
                    morale_effect: { type: "number" },
                    risk: { type: "string" },
                    skill_check: {
                      type: "object",
                      properties: {
                        skill: { type: "string" },
                        difficulty: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        });

        const validTypes = ["desertion", "fight", "mutiny", "theft", "breakdown", "sabotage", "romance", "rivalry"];
        const validSeverities = ["minor", "moderate", "serious", "critical"];

        const colonyId = colony?.id || "";
        const drama = await base44.asServiceRole.entities.SurvivorDrama.create({
          title: dramaResult.title || `${trigger.survivor_name}: ${trigger.label}`,
          description: dramaResult.description || `${trigger.survivor_name} is ${trigger.label}.`,
          drama_type: validTypes.includes(dramaResult.drama_type) ? dramaResult.drama_type : "breakdown",
          severity: validSeverities.includes(dramaResult.severity) ? dramaResult.severity : "moderate",
          morale_trigger: null,
          involved_survivor_ids: [trigger.survivor_id],
          involved_survivor_names: [trigger.survivor_name],
          colony_id: colonyId,
          status: "active",
          resolution_options: (dramaResult.resolution_options || []).slice(0, 3),
        });

        await base44.asServiceRole.entities.Survivor.update(trigger.survivor_id, {
          ai_behavior_note: `${trigger.label} — drama event generated: ${dramaResult.title}`,
        });

        await base44.asServiceRole.entities.Notification.create({
          player_email: "broadcast",
          title: `⚠ ${dramaResult.title}`,
          message: `${trigger.survivor_name} is ${trigger.label}. ${dramaResult.severity} ${dramaResult.drama_type} requires attention.`,
          type: "colony_alert",
          priority: dramaResult.severity === "critical" ? "critical" : "normal",
        });

        generatedDrama = {
          id: drama.id,
          title: dramaResult.title,
          type: dramaResult.drama_type,
          severity: dramaResult.severity,
          trigger_need: trigger.need,
          trigger_label: trigger.label,
        };
      }
    }

    return Response.json({
      status: "ok",
      survivors_processed: survivors.length,
      needs_updates: needsUpdates.length,
      drama_triggers: dramaTriggers.length,
      relationship_changes: relationshipChanges.length,
      skill_xp_awarded: skillXpAwarded.length,
      generated_drama: generatedDrama,
      summary: {
        avg_hunger: Math.round(needsUpdates.reduce((s, u) => s + u.hunger, 0) / (needsUpdates.length || 1)),
        avg_social: Math.round(needsUpdates.reduce((s, u) => s + u.social, 0) / (needsUpdates.length || 1)),
        avg_rest: Math.round(needsUpdates.reduce((s, u) => s + u.rest, 0) / (needsUpdates.length || 1)),
        avg_stress: Math.round(needsUpdates.reduce((s, u) => s + u.stress, 0) / (needsUpdates.length || 1)),
        in_crisis: dramaTriggers.length,
        xp_gains: skillXpAwarded.length,
      },
    });
  } catch (error) {
    console.error("survivorAI error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
