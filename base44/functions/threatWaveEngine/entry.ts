import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * threatWaveEngine — generates or resolves threat waves against territories.
 * Modes:
 *   { action: "generate" } — create new incoming threats based on territory threat levels
 *   { action: "resolve", territory_id } — resolve a specific wave (defense vs attack)
 *   { action: "resolve_all" } — resolve all incoming waves
 */

const WAVE_TYPES = [
  { type: "horde", names: ["Zombie Horde", "Shambler Swarm", "Dead Tide", "Rotting Legion"] },
  { type: "raiders", names: ["Raider War Party", "Bandit Assault", "Scavenger Gang", "Marauder Strike"] },
  { type: "mutants", names: ["Mutant Pack", "Irradiated Beasts", "Toxic Crawlers", "Abomination Swarm"] },
  { type: "storm", names: ["Radiation Storm", "Acid Rain Front", "Electromagnetic Pulse", "Dust Devil Surge"] },
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { action = "generate", territory_id } = await req.json().catch(() => ({}));

    if (action === "generate") {
      const territories = await base44.asServiceRole.entities.Territory.filter({});
      const targets = territories.filter(t =>
        t.status !== "uncharted" &&
        (!t.active_threat_wave || t.active_threat_wave.status !== "incoming")
      );

      const generated = [];
      for (const territory of targets) {
        // Probability based on threat level
        const prob = {
          minimal: 0.05, low: 0.15, moderate: 0.3, high: 0.55, critical: 0.8,
        }[territory.threat_level] || 0.1;

        if (Math.random() > prob) continue;

        const waveType = pick(WAVE_TYPES);
        const basePower = { minimal: 3, low: 6, moderate: 12, high: 20, critical: 30 }[territory.threat_level] || 10;
        const strength = basePower + Math.floor(Math.random() * basePower * 0.5);

        const wave = {
          wave_id: `wave_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          threat_name: pick(waveType.names),
          strength,
          type: waveType.type,
          arriving_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
          status: "incoming",
        };

        await base44.asServiceRole.entities.Territory.update(territory.id, {
          active_threat_wave: wave,
        });

        // Notify
        await base44.asServiceRole.entities.Notification.create({
          player_email: "broadcast",
          title: `Threat Wave: ${wave.threat_name}`,
          message: `${wave.threat_name} (STR ${strength}) inbound to sector ${territory.sector}. Assign defenders!`,
          type: "colony_alert",
          priority: strength > 20 ? "critical" : "normal",
        });

        generated.push({ sector: territory.sector, wave });
      }

      return Response.json({ status: "ok", waves_generated: generated.length, waves: generated });
    }

    if (action === "resolve" || action === "resolve_all") {
      const territories = await base44.asServiceRole.entities.Territory.filter({});
      const toResolve = territory_id
        ? territories.filter(t => t.id === territory_id)
        : territories.filter(t => t.active_threat_wave?.status === "incoming");

      const results = [];
      for (const t of toResolve) {
        const wave = t.active_threat_wave;
        if (!wave || wave.status !== "incoming") continue;

        const defense = t.defense_power || 0;
        const held = defense >= wave.strength;
        const margin = defense - wave.strength;

        let result;
        let influenceDelta = 0;
        let newStatus = t.status;

        if (held) {
          result = `Defense held against ${wave.threat_name} (DEF ${defense} vs STR ${wave.strength}). Sector ${t.sector} stands firm.`;
          influenceDelta = 5;
        } else {
          const severity = margin < -15 ? "devastated" : margin < -5 ? "overrun" : "breached";
          result = `${wave.threat_name} ${severity} sector ${t.sector} (DEF ${defense} vs STR ${wave.strength}). Defenses crumbled.`;
          influenceDelta = severity === "devastated" ? -25 : severity === "overrun" ? -15 : -8;
          if (t.status === "secured") newStatus = "contested";
        }

        const newInfluence = Math.max(0, Math.min(100, (t.influence_level || 0) + influenceDelta));

        await base44.asServiceRole.entities.Territory.update(t.id, {
          active_threat_wave: { ...wave, status: "resolved" },
          last_wave_result: result,
          influence_level: newInfluence,
          status: newStatus,
          defense_power: held ? defense : Math.max(0, defense - Math.ceil(wave.strength * 0.3)),
          defender_count: held ? (t.defender_count || 0) : Math.max(0, (t.defender_count || 0) - 1),
        });

        // Log to OpsLog
        await base44.asServiceRole.entities.OpsLog.create({
          event_type: held ? "base_breach" : "base_breach",
          title: held ? `Threat repelled at ${t.sector}` : `${t.sector} ${margin < -15 ? "devastated" : "breached"}`,
          detail: result,
          severity: held ? "notable" : "critical",
          sector: t.sector,
          source: "automation",
        });

        results.push({ sector: t.sector, held, result });
      }

      return Response.json({ status: "ok", resolved: results.length, results });
    }

    return Response.json({ error: "Unknown action. Use 'generate', 'resolve', or 'resolve_all'" }, { status: 400 });
  } catch (error) {
    console.error("threatWaveEngine error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});