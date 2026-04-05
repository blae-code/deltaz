import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow admin manual + automation
    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch (_) {}

    const body = await req.json().catch(() => ({}));
    const mode = body.mode === 'assign' ? 'assign' : 'cycle';

    const [bases, survivors, diplomacy, territories, reputations, events] = await Promise.all([
      base44.asServiceRole.entities.PlayerBase.filter({ status: 'active' }),
      base44.asServiceRole.entities.Survivor.filter({}),
      base44.asServiceRole.entities.Diplomacy.filter({}),
      base44.asServiceRole.entities.Territory.filter({}),
      base44.asServiceRole.entities.Reputation.filter({}),
      base44.asServiceRole.entities.Event.filter({ is_active: true }, '-created_date', 10),
    ]);

    if (mode === 'assign') {
      const requestedCount = Number.parseInt(String(body.count ?? '1'), 10);
      const safeCount = Number.isFinite(requestedCount) ? Math.max(1, Math.min(5, requestedCount)) : 1;
      const base_id = typeof body.base_id === 'string' ? body.base_id : '';
      const targetBase = bases.find((base) => base.id === base_id);
      if (!targetBase) return Response.json({ error: 'Base not found' }, { status: 404 });

      const currentCount = survivors.filter((survivor) => survivor.base_id === base_id && survivor.status === 'active').length;
      const slots = (targetBase.capacity || 5) - currentCount;
      const toGenerate = Math.min(safeCount, slots);

      if (toGenerate <= 0) {
        return Response.json(
          { error: 'Base at capacity', current: currentCount, max: targetBase.capacity },
          { status: 409 },
        );
      }

      const generated = await generateSurvivors(base44, toGenerate, targetBase, 'assigned', 'Assigned by Command');
      return Response.json({ status: 'ok', generated: generated.length });
    }

    const results = [];

    for (const base of bases) {
      const currentSurvivors = survivors.filter((survivor) => survivor.base_id === base.id && survivor.status === 'active');
      const slots = (base.capacity || 5) - currentSurvivors.length;
      if (slots <= 0) continue;

      let attractionScore = 0;
      let origin = 'wanderer';
      let reason = 'Drawn by signs of habitation';

      const ownerReps = reputations.filter((rep) => rep.player_email === base.owner_email);
      const totalRep = ownerReps.reduce((sum, rep) => sum + (rep.score || 0), 0);
      attractionScore += Math.min(totalRep * 0.02, 3);

      const linkedTerritory = territories.find((territory) => territory.id === base.territory_id);
      if (linkedTerritory) {
        const safetyBonus = { minimal: 2, low: 1.5, moderate: 1, high: 0.5, critical: 0 };
        attractionScore += safetyBonus[linkedTerritory.threat_level] || 0.5;
      }

      attractionScore += (base.defense_level || 1) * 0.3;

      const activeWars = diplomacy.filter((relationship) => relationship.status === 'war');
      if (activeWars.length > 0 && (linkedTerritory?.threat_level === 'minimal' || linkedTerritory?.threat_level === 'low')) {
        attractionScore += activeWars.length * 1.5;
        origin = 'refugee';
        reason = 'Fleeing from faction warfare';
      }

      const emergencies = events.filter((event) => event.severity === 'emergency' || event.severity === 'critical');
      if (emergencies.length > 0) {
        attractionScore += emergencies.length * 0.8;
        if (origin === 'wanderer') {
          origin = 'refugee';
          reason = `Displaced by: ${emergencies[0].title}`;
        }
      }

      const chance = Math.min(attractionScore / 5, 1);
      if (Math.random() > chance) continue;

      const count = Math.min(Math.floor(attractionScore / 3) + 1, slots, 2);
      const generated = await generateSurvivors(base44, count, base, origin, reason);
      results.push({ base: base.name, owner: base.owner_email, new_survivors: generated.length });

      if (generated.length > 0) {
        await base44.asServiceRole.entities.Notification.create({
          player_email: base.owner_email,
          title: `${generated.length} survivor${generated.length > 1 ? 's' : ''} arrived at ${base.name}`,
          message: generated.map((survivor) => `${survivor.name} the ${survivor.skill} (${survivor.origin})`).join(', '),
          type: 'system_alert',
          priority: 'normal',
          is_read: false,
        });
      }
    }

    return Response.json({ status: 'ok', bases_processed: bases.length, arrivals: results });
  } catch (error) {
    console.error('survivorEngine error:', error);
    return Response.json({ error: error.message || 'Unexpected error' }, { status: 500 });
  }
});

async function generateSurvivors(base44, count, base, origin, reason) {
  const safeCount = Math.max(1, Math.floor(count || 1));
  const prompt = `Generate ${safeCount} post-apocalyptic survivor(s) for a base called "${base.name}". These NPCs arrived as "${origin}" because: "${reason}".

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
  for (const survivor of (result.survivors || []).slice(0, safeCount)) {
    const validSkill = ['scavenger', 'medic', 'mechanic', 'farmer', 'guard', 'trader', 'engineer', 'cook'].includes(survivor.skill)
      ? survivor.skill
      : 'scavenger';
    const bonuses = skillBonusMap[validSkill] || skillBonusMap.scavenger;
    const skillLevel = Math.max(1, Math.min(5, Number(survivor.skill_level) || 1));

    const record = await base44.asServiceRole.entities.Survivor.create({
      name: survivor.name,
      nickname: survivor.nickname || '',
      backstory: survivor.backstory || '',
      personality: survivor.personality || '',
      skill: validSkill,
      skill_level: skillLevel,
      morale: ['desperate', 'anxious', 'neutral', 'content', 'thriving'].includes(survivor.morale) ? survivor.morale : 'neutral',
      health: ['critical', 'injured', 'sick', 'healthy', 'peak'].includes(survivor.health) ? survivor.health : 'healthy',
      base_id: base.id,
      origin,
      arrival_reason: reason,
      bonus_type: bonuses.bonus_type,
      bonus_value: bonuses.bonus_value * skillLevel,
      status: 'active',
    });
    created.push(record);
  }

  return created;
}
