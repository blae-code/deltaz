import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Allow admin manual + automation
  try {
    const user = await base44.auth.me();
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  } catch (_) {}

  const body = await req.json().catch(() => ({}));
  const mode = body.mode || 'cycle'; // 'cycle' | 'assign'

  const [bases, survivors, factions, diplomacy, territories, reputations, events] = await Promise.all([
    base44.asServiceRole.entities.PlayerBase.filter({ status: 'active' }),
    base44.asServiceRole.entities.Survivor.filter({}),
    base44.asServiceRole.entities.Faction.filter({}),
    base44.asServiceRole.entities.Diplomacy.filter({}),
    base44.asServiceRole.entities.Territory.filter({}),
    base44.asServiceRole.entities.Reputation.filter({}),
    base44.asServiceRole.entities.Event.filter({ is_active: true }, '-created_date', 10),
  ]);

  // Manual assignment by admin
  if (mode === 'assign') {
    const { base_id, count } = body;
    const targetBase = bases.find(b => b.id === base_id);
    if (!targetBase) return Response.json({ error: 'Base not found' }, { status: 404 });

    const currentCount = survivors.filter(s => s.base_id === base_id && s.status === 'active').length;
    const slots = (targetBase.capacity || 5) - currentCount;
    const toGenerate = Math.min(count || 1, slots);

    if (toGenerate <= 0) return Response.json({ error: 'Base at capacity', current: currentCount, max: targetBase.capacity });

    const generated = await generateSurvivors(base44, toGenerate, targetBase, 'assigned', 'Assigned by Command');
    return Response.json({ status: 'ok', generated: generated.length });
  }

  // Auto cycle: evaluate each active base
  const results = [];

  for (const base of bases) {
    const currentSurvivors = survivors.filter(s => s.base_id === base.id && s.status === 'active');
    const slots = (base.capacity || 5) - currentSurvivors.length;
    if (slots <= 0) continue;

    // Calculate attraction score
    let attractionScore = 0;
    let origin = 'wanderer';
    let reason = 'Drawn by signs of habitation';

    // Reputation bonus: higher rep = more survivors attracted
    const ownerReps = reputations.filter(r => r.player_email === base.owner_email);
    const totalRep = ownerReps.reduce((s, r) => s + (r.score || 0), 0);
    attractionScore += Math.min(totalRep * 0.02, 3);

    // Territory safety bonus
    const linkedTerritory = territories.find(t => t.id === base.territory_id);
    if (linkedTerritory) {
      const safetyBonus = { minimal: 2, low: 1.5, moderate: 1, high: 0.5, critical: 0 };
      attractionScore += safetyBonus[linkedTerritory.threat_level] || 0.5;
    }

    // Base defense bonus
    attractionScore += (base.defense_level || 1) * 0.3;

    // War refugees: if any faction is at war, refugees flee to safer bases
    const activeWars = diplomacy.filter(d => d.status === 'war');
    if (activeWars.length > 0 && (linkedTerritory?.threat_level === 'minimal' || linkedTerritory?.threat_level === 'low')) {
      attractionScore += activeWars.length * 1.5;
      origin = 'refugee';
      reason = 'Fleeing from faction warfare';
    }

    // World events: emergencies drive people toward shelter
    const emergencies = events.filter(e => e.severity === 'emergency' || e.severity === 'critical');
    if (emergencies.length > 0) {
      attractionScore += emergencies.length * 0.8;
      if (origin === 'wanderer') {
        origin = 'refugee';
        reason = `Displaced by: ${emergencies[0].title}`;
      }
    }

    // Random chance threshold: score of 3+ = guaranteed spawn, lower = probability
    const chance = Math.min(attractionScore / 5, 1);
    const roll = Math.random();
    if (roll > chance) continue;

    const count = Math.min(Math.floor(attractionScore / 3) + 1, slots, 2); // max 2 per cycle
    const generated = await generateSurvivors(base44, count, base, origin, reason);
    results.push({ base: base.name, owner: base.owner_email, new_survivors: generated.length });

    // Notify the base owner
    if (generated.length > 0) {
      await base44.asServiceRole.entities.Notification.create({
        player_email: base.owner_email,
        title: `${generated.length} survivor${generated.length > 1 ? 's' : ''} arrived at ${base.name}`,
        message: generated.map(s => `${s.name} the ${s.skill} (${s.origin})`).join(', '),
        type: 'system_alert',
        priority: 'normal',
      });
    }
  }

  return Response.json({ status: 'ok', bases_processed: bases.length, arrivals: results });
});

async function generateSurvivors(base44, count, base, origin, reason) {
  const prompt = `Generate ${count} post-apocalyptic survivor(s) for a base called "${base.name}". These NPCs arrived as "${origin}" because: "${reason}".

For each survivor generate:
- name: realistic first + last name
- nickname: a wasteland nickname (short, evocative)
- backstory: 1-2 sentences, gritty and atmospheric
- personality: one dominant trait (e.g. "paranoid but loyal", "cheerfully morbid")
- skill: one of: scavenger, medic, mechanic, farmer, guard, trader, engineer, cook
- skill_level: 1-3 (1=novice, 2=competent, 3=skilled)
- morale: one of: desperate, anxious, neutral, content
- health: one of: critical, injured, sick, healthy

Make each unique. Vary skills. Be creative with names and backstories. Dark humor welcome.`;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        survivors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              nickname: { type: 'string' },
              backstory: { type: 'string' },
              personality: { type: 'string' },
              skill: { type: 'string' },
              skill_level: { type: 'number' },
              morale: { type: 'string' },
              health: { type: 'string' },
            },
          },
        },
      },
    },
  });

  const skillBonusMap = {
    scavenger: { bonus_type: 'scrap_yield', bonus_value: 10 },
    medic: { bonus_type: 'healing', bonus_value: 15 },
    mechanic: { bonus_type: 'repair', bonus_value: 10 },
    farmer: { bonus_type: 'food_production', bonus_value: 12 },
    guard: { bonus_type: 'defense', bonus_value: 8 },
    trader: { bonus_type: 'trade_discount', bonus_value: 10 },
    engineer: { bonus_type: 'crafting', bonus_value: 10 },
    cook: { bonus_type: 'morale_boost', bonus_value: 10 },
  };

  const created = [];
  for (const s of (result.survivors || [])) {
    const validSkill = ['scavenger', 'medic', 'mechanic', 'farmer', 'guard', 'trader', 'engineer', 'cook'].includes(s.skill) ? s.skill : 'scavenger';
    const bonuses = skillBonusMap[validSkill] || skillBonusMap.scavenger;

    const record = await base44.asServiceRole.entities.Survivor.create({
      name: s.name,
      nickname: s.nickname || '',
      backstory: s.backstory || '',
      personality: s.personality || '',
      skill: validSkill,
      skill_level: Math.max(1, Math.min(5, s.skill_level || 1)),
      morale: ['desperate', 'anxious', 'neutral', 'content', 'thriving'].includes(s.morale) ? s.morale : 'neutral',
      health: ['critical', 'injured', 'sick', 'healthy', 'peak'].includes(s.health) ? s.health : 'healthy',
      base_id: base.id,
      origin,
      arrival_reason: reason,
      bonus_type: bonuses.bonus_type,
      bonus_value: bonuses.bonus_value * (s.skill_level || 1),
      status: 'active',
    });
    created.push(record);
  }
  return created;
}