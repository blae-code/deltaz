import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';
import { stableHash } from '../_shared/deterministic.ts';
import { DATA_ORIGINS, buildSourceRef, getCycleKey, withProvenance } from '../_shared/provenance.ts';
import {
  buildWeatherBulletin,
  buildWeatherMap,
  isOutdoorTask,
  shouldApplyWeatherToSurvivor,
} from '../_shared/weatherRules.ts';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || 'simulate');

    if (action === 'simulate') {
      return await handleSimulate(base44, body);
    }

    if (action === 'apply_effects') {
      if (user.role !== 'admin') {
        return Response.json({ error: 'Admin required' }, { status: 403 });
      }
      return await handleApplyEffects(base44, body);
    }

    if (action === 'get_weather_map') {
      return await handleGetWeatherMap(base44);
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('weatherSimulation error:', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
});

async function handleSimulate(base44: any, body: any) {
  const [worldConditions, territories] = await Promise.all([
    base44.asServiceRole.entities.WorldConditions.list('-updated_date', 1).then((rows: any[]) => rows[0] || null),
    base44.asServiceRole.entities.Territory.filter({}),
  ]);

  const cycleKey = getCycleKey(180);
  const weatherMap = buildWeatherMap({
    worldConditions,
    territories,
    hazardCoverage: body?.hazard_coverage,
    cycleKey,
  });
  const bulletin = buildWeatherBulletin(weatherMap, worldConditions);
  const hazardEntries = Object.entries(weatherMap).filter(([sector, data]: any) => sector !== '__meta' && data?.hazard);

  if (worldConditions?.id) {
    await base44.asServiceRole.entities.WorldConditions.update(
      worldConditions.id,
      {
        last_weather_map: weatherMap,
        last_weather_cycle: cycleKey,
      },
    );
  }

  return Response.json({
    status: 'ok',
    weather_map: weatherMap,
    bulletin,
    stats: {
      total_sectors: Object.keys(weatherMap).filter((key) => key !== '__meta').length,
      hazardous: hazardEntries.length,
      clear: Object.keys(weatherMap).filter((key) => key !== '__meta').length - hazardEntries.length,
      hazard_types: [...new Set(hazardEntries.map(([, data]: any) => data.label))],
    },
  });
}

async function handleApplyEffects(base44: any, body: any) {
  const weatherMap = body?.weather_map;
  if (!weatherMap || typeof weatherMap !== 'object') {
    return Response.json({ error: 'weather_map required' }, { status: 400 });
  }

  const meta = weatherMap.__meta || {};
  const sourceRef = String(meta.source_ref || `Weather:${stableHash(JSON.stringify(weatherMap))}`);
  const cycleKey = String(meta.cycle_key || getCycleKey(180));

  const [colony, bases, survivors] = await Promise.all([
    base44.asServiceRole.entities.ColonyStatus.list('-updated_date', 1).then((rows: any[]) => rows[0] || null),
    base44.asServiceRole.entities.PlayerBase.filter({ status: 'active' }),
    base44.asServiceRole.entities.Survivor.filter({ status: 'active' }),
  ]);

  const colonyEffects: Record<string, number> = { food: 0, water: 0, medical: 0, power: 0, defense: 0, morale: 0 };
  const affectedBases = [];

  for (const base of bases) {
    const weather = weatherMap[base.sector];
    if (!base?.sector || !weather?.hazard) {
      continue;
    }

    affectedBases.push({
      base_name: base.name,
      sector: base.sector,
      hazard: weather.label,
      severity: weather.severity,
    });

    for (const [resource, delta] of Object.entries(weather.effects || {})) {
      colonyEffects[resource] = Number(colonyEffects[resource] || 0) + Number(delta || 0);
    }
  }

  if (colony && colony.weather_last_applied_ref !== sourceRef) {
    const colonyUpdate: Record<string, number | string> = {
      weather_last_applied_ref: sourceRef,
    };
    const resourceMap: Record<string, string> = {
      food: 'food_reserves',
      water: 'water_supply',
      medical: 'medical_supplies',
      power: 'power_level',
      defense: 'defense_integrity',
      morale: 'morale',
    };

    for (const [key, field] of Object.entries(resourceMap)) {
      if (Number(colonyEffects[key] || 0) !== 0) {
        colonyUpdate[field] = clamp(Number(colony[field] || 0) + Number(colonyEffects[key] || 0), 0, 100);
      }
    }

    await base44.asServiceRole.entities.ColonyStatus.update(
      colony.id,
      withProvenance(
        colonyUpdate as any,
        {
          dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
          sourceRefs: [sourceRef, buildSourceRef('ColonyStatus', colony.id, 'weather')],
        },
      ),
    );
  }

  const affectedSurvivors = [];
  for (const survivor of survivors) {
    const base = bases.find((entry) => entry.id === survivor.base_id);
    const weather = base?.sector ? weatherMap[base.sector] : null;
    if (!base?.sector || !weather?.hazard || !weather?.survivor_effects || !isOutdoorTask(survivor.current_task)) {
      continue;
    }
    if (survivor.last_weather_effect_ref === sourceRef) {
      continue;
    }
    if (!shouldApplyWeatherToSurvivor({ survivor, weather, cycleKey })) {
      continue;
    }

    const update: Record<string, unknown> = {
      last_weather_effect_ref: sourceRef,
    };
    if (weather.survivor_effects.health && survivor.health === 'healthy') {
      update.health = weather.survivor_effects.health;
    }
    if (weather.survivor_effects.stress_add) {
      update.stress = clamp(Number(survivor.stress || 20) + Number(weather.survivor_effects.stress_add || 0), 0, 100);
    }
    if (weather.survivor_effects.rest_drain) {
      update.rest = clamp(Number(survivor.rest || 70) - Number(weather.survivor_effects.rest_drain || 0), 0, 100);
    }

    await base44.asServiceRole.entities.Survivor.update(
      survivor.id,
      withProvenance(
        update as any,
        {
          dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
          sourceRefs: [sourceRef, buildSourceRef('Survivor', survivor.id, 'weather')],
        },
      ),
    );
    affectedSurvivors.push({
      name: survivor.name,
      sector: base.sector,
      hazard: weather.label,
      effects: update,
    });
  }

  return Response.json({
    status: 'ok',
    colony_effects: colonyEffects,
    affected_bases: affectedBases,
    affected_survivors: affectedSurvivors,
    already_applied: colony?.weather_last_applied_ref === sourceRef,
  });
}

async function handleGetWeatherMap(base44: any) {
  const worldConditions = await base44.asServiceRole.entities.WorldConditions.list('-updated_date', 1).then((rows: any[]) => rows[0] || null);
  return Response.json({
    status: 'ok',
    world_conditions: worldConditions,
  });
}
