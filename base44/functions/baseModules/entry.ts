import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * baseModules — construct, upgrade, and manage base modules.
 *
 * Actions:
 *   { action: "construct", base_id, module_type }
 *   { action: "upgrade", module_id }
 *   { action: "repair", module_id }
 */

const MODULE_DEFS = {
  crafting_station: {
    label: "Crafting Station",
    description: "Workbenches and tooling for item fabrication",
    bonus_type: "crafting",
    base_bonus: 10,
    cost: { scrap: 15, power: 5 },
    upgrade_cost_mult: 1.5,
    effects: { capacity: 0, defense: 0 },
  },
  medical_bay: {
    label: "Medical Bay",
    description: "Treatment facility for injuries and illness",
    bonus_type: "healing",
    base_bonus: 12,
    cost: { medical: 20, scrap: 10 },
    upgrade_cost_mult: 1.4,
    effects: { capacity: 1, defense: 0 },
  },
  defensive_turret: {
    label: "Defensive Turret",
    description: "Automated perimeter defense system",
    bonus_type: "defense",
    base_bonus: 8,
    cost: { scrap: 25, defense_parts: 15 },
    upgrade_cost_mult: 1.6,
    effects: { capacity: 0, defense: 2 },
  },
  hydroponics: {
    label: "Hydroponics Bay",
    description: "Indoor growing system for sustainable food",
    bonus_type: "food_production",
    base_bonus: 15,
    cost: { water: 15, scrap: 10 },
    upgrade_cost_mult: 1.3,
    effects: { capacity: 0, defense: 0 },
  },
  armory: {
    label: "Armory",
    description: "Weapons storage and maintenance facility",
    bonus_type: "defense",
    base_bonus: 6,
    cost: { scrap: 20, defense_parts: 10 },
    upgrade_cost_mult: 1.5,
    effects: { capacity: 0, defense: 1 },
  },
  comms_tower: {
    label: "Communications Tower",
    description: "Long-range radio for trade and intel",
    bonus_type: "trade_discount",
    base_bonus: 8,
    cost: { scrap: 15, power: 10 },
    upgrade_cost_mult: 1.4,
    effects: { capacity: 0, defense: 0 },
  },
  workshop: {
    label: "Workshop",
    description: "General-purpose repair and fabrication area",
    bonus_type: "repair",
    base_bonus: 10,
    cost: { scrap: 20 },
    upgrade_cost_mult: 1.3,
    effects: { capacity: 0, defense: 0 },
  },
  watchtower: {
    label: "Watchtower",
    description: "Elevated observation post with spotlights",
    bonus_type: "defense",
    base_bonus: 5,
    cost: { scrap: 10, defense_parts: 5 },
    upgrade_cost_mult: 1.4,
    effects: { capacity: 0, defense: 1 },
  },
  storage_vault: {
    label: "Storage Vault",
    description: "Reinforced storage for supplies and valuables",
    bonus_type: "scrap_yield",
    base_bonus: 8,
    cost: { scrap: 15 },
    upgrade_cost_mult: 1.3,
    effects: { capacity: 2, defense: 0 },
  },
  solar_array: {
    label: "Solar Array",
    description: "Photovoltaic panels for sustainable power",
    bonus_type: "morale_boost",
    base_bonus: 6,
    cost: { scrap: 20, power: 5 },
    upgrade_cost_mult: 1.5,
    effects: { capacity: 0, defense: 0 },
  },
};

const MAX_LEVEL = 5;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { action, base_id, module_type, module_id } = await req.json().catch(() => ({}));

    // ─── CONSTRUCT ───
    if (action === "construct") {
      if (!base_id || !module_type) return Response.json({ error: "base_id and module_type required" }, { status: 400 });

      const def = MODULE_DEFS[module_type];
      if (!def) return Response.json({ error: "Unknown module type" }, { status: 400 });

      const base = await base44.entities.PlayerBase.filter({ id: base_id });
      const targetBase = base[0];
      if (!targetBase || targetBase.owner_email !== user.email) {
        return Response.json({ error: "Base not found or not yours" }, { status: 403 });
      }

      // Check for duplicates
      const existing = await base44.entities.BaseModule.filter({ base_id, module_type });
      if (existing.length > 0) {
        return Response.json({ error: `${def.label} already exists at this base` }, { status: 409 });
      }

      // Create module
      const mod = await base44.entities.BaseModule.create({
        base_id,
        owner_email: user.email,
        module_type,
        level: 1,
        status: "active",
        construction_progress: 100,
        bonus_type: def.bonus_type,
        bonus_value: def.base_bonus,
        description: def.description,
      });

      // Apply base effects
      const updates = {};
      if (def.effects.capacity > 0) updates.capacity = (targetBase.capacity || 5) + def.effects.capacity;
      if (def.effects.defense > 0) updates.defense_level = (targetBase.defense_level || 1) + def.effects.defense;
      if (Object.keys(updates).length > 0) {
        await base44.entities.PlayerBase.update(base_id, updates);
      }

      await base44.asServiceRole.entities.OpsLog.create({
        event_type: "custom",
        title: `${def.label} constructed at ${targetBase.name}`,
        detail: `${user.full_name || user.email} built a ${def.label} (Lv1) at ${targetBase.name}. Bonus: +${def.base_bonus}% ${def.bonus_type}.`,
        severity: "notable",
        sector: targetBase.sector,
        source: "system",
      });

      return Response.json({
        status: "ok",
        module: mod,
        cost: def.cost,
        base_updates: updates,
      });
    }

    // ─── UPGRADE ───
    if (action === "upgrade") {
      if (!module_id) return Response.json({ error: "module_id required" }, { status: 400 });

      const mods = await base44.entities.BaseModule.filter({ id: module_id });
      const mod = mods[0];
      if (!mod || mod.owner_email !== user.email) {
        return Response.json({ error: "Module not found or not yours" }, { status: 403 });
      }
      if (mod.level >= MAX_LEVEL) {
        return Response.json({ error: "Module already at max level" }, { status: 409 });
      }
      if (mod.status !== "active") {
        return Response.json({ error: "Module must be active to upgrade" }, { status: 400 });
      }

      const def = MODULE_DEFS[mod.module_type];
      if (!def) return Response.json({ error: "Unknown module type" }, { status: 400 });

      const newLevel = mod.level + 1;
      const newBonus = Math.round(def.base_bonus * (1 + (newLevel - 1) * 0.3));

      await base44.entities.BaseModule.update(module_id, {
        level: newLevel,
        bonus_value: newBonus,
      });

      // Apply defense upgrade if applicable
      if (def.effects.defense > 0) {
        const bases = await base44.entities.PlayerBase.filter({ id: mod.base_id });
        if (bases[0]) {
          await base44.entities.PlayerBase.update(mod.base_id, {
            defense_level: (bases[0].defense_level || 1) + 1,
          });
        }
      }

      const upgradeCost = {};
      for (const [res, amt] of Object.entries(def.cost)) {
        upgradeCost[res] = Math.round(amt * Math.pow(def.upgrade_cost_mult, newLevel - 1));
      }

      return Response.json({
        status: "ok",
        new_level: newLevel,
        new_bonus: newBonus,
        cost: upgradeCost,
      });
    }

    // ─── REPAIR ───
    if (action === "repair") {
      if (!module_id) return Response.json({ error: "module_id required" }, { status: 400 });

      const mods = await base44.entities.BaseModule.filter({ id: module_id });
      const mod = mods[0];
      if (!mod || mod.owner_email !== user.email) {
        return Response.json({ error: "Module not found or not yours" }, { status: 403 });
      }
      if (mod.status !== "damaged") {
        return Response.json({ error: "Module is not damaged" }, { status: 400 });
      }

      await base44.entities.BaseModule.update(module_id, { status: "active" });
      return Response.json({ status: "ok", repaired: true });
    }

    // ─── LIST DEFINITIONS ───
    if (action === "list_defs") {
      return Response.json({ status: "ok", definitions: MODULE_DEFS });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("baseModules error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});