import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { territory_id, survivor_ids, operation_type } = await req.json();

    if (!territory_id || !survivor_ids?.length || !operation_type) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch all needed data in parallel
    const [territory, allDiplomacy, allFactions, allInventory, survivors] = await Promise.all([
      base44.entities.Territory.filter({ id: territory_id }),
      base44.asServiceRole.entities.Diplomacy.list('-updated_date', 100),
      base44.asServiceRole.entities.Faction.list('-created_date', 50),
      base44.asServiceRole.entities.InventoryItem.filter({ owner_email: user.email }, '-created_date', 500),
      Promise.all(survivor_ids.map(id => base44.asServiceRole.entities.Survivor.filter({ id }))),
    ]);

    const terr = territory[0];
    if (!terr) return Response.json({ error: 'Territory not found' }, { status: 404 });

    const squad = survivors.map(s => s[0]).filter(Boolean);
    if (squad.length === 0) return Response.json({ error: 'No valid survivors found' }, { status: 400 });

    const riskFactors = [];
    let baseSuccess = 60; // Start at 60%

    // === 1. SQUAD COMBAT POWER ===
    const avgCombat = squad.reduce((s, sv) => s + (sv.combat_rating || 1), 0) / squad.length;
    const combatBonus = Math.min(20, (avgCombat - 3) * 5); // 3 is "average", each point above adds 5%
    riskFactors.push({
      factor: "Squad Combat Rating",
      impact: combatBonus,
      detail: `Average combat: ${avgCombat.toFixed(1)}/10 across ${squad.length} operatives`
    });
    baseSuccess += combatBonus;

    // === 2. SQUAD SIZE ===
    const sizeBonus = Math.min(10, (squad.length - 1) * 3);
    riskFactors.push({
      factor: "Squad Size",
      impact: sizeBonus,
      detail: `${squad.length} operative${squad.length > 1 ? 's' : ''} assigned`
    });
    baseSuccess += sizeBonus;

    // === 3. SQUAD HEALTH ===
    const healthPenalties = { critical: -20, injured: -12, sick: -8, healthy: 0, peak: 5 };
    const avgHealth = squad.reduce((s, sv) => s + (healthPenalties[sv.health] || 0), 0) / squad.length;
    riskFactors.push({
      factor: "Squad Health",
      impact: Math.round(avgHealth),
      detail: squad.map(s => `${s.name}: ${s.health}`).join(', ')
    });
    baseSuccess += avgHealth;

    // === 4. SQUAD MORALE ===
    const moraleMods = { desperate: -15, anxious: -8, neutral: 0, content: 5, thriving: 10 };
    const avgMorale = squad.reduce((s, sv) => s + (moraleMods[sv.morale] || 0), 0) / squad.length;
    riskFactors.push({
      factor: "Squad Morale",
      impact: Math.round(avgMorale),
      detail: squad.map(s => `${s.name}: ${s.morale}`).join(', ')
    });
    baseSuccess += avgMorale;

    // === 5. SKILL MATCH ===
    const opSkillMap = {
      assault: ['guard', 'scavenger'],
      recon: ['scavenger', 'mechanic'],
      defense: ['guard', 'engineer'],
      sabotage: ['mechanic', 'engineer'],
      scavenge: ['scavenger', 'trader'],
      escort: ['guard', 'medic'],
    };
    const idealSkills = opSkillMap[operation_type] || [];
    const matchCount = squad.filter(s => idealSkills.includes(s.skill)).length;
    const skillBonus = matchCount > 0 ? Math.min(15, matchCount * 8) : -5;
    riskFactors.push({
      factor: "Skill Compatibility",
      impact: skillBonus,
      detail: matchCount > 0 
        ? `${matchCount}/${squad.length} have ideal skills (${idealSkills.join(', ')})` 
        : `No specialists for ${operation_type} (ideal: ${idealSkills.join(', ')})`
    });
    baseSuccess += skillBonus;

    // === 6. EQUIPMENT CONDITION ===
    const equippedItems = allInventory.filter(i => i.is_equipped);
    if (equippedItems.length > 0) {
      const avgCondition = equippedItems.reduce((s, i) => s + (i.condition || 50), 0) / equippedItems.length;
      const equipBonus = Math.round((avgCondition - 50) / 5); // 50 = baseline
      riskFactors.push({
        factor: "Equipment Condition",
        impact: equipBonus,
        detail: `Average gear condition: ${avgCondition.toFixed(0)}% across ${equippedItems.length} items`
      });
      baseSuccess += equipBonus;
    } else {
      riskFactors.push({
        factor: "Equipment Condition",
        impact: -10,
        detail: "No equipped items found — squad is underequipped"
      });
      baseSuccess -= 10;
    }

    // === 7. TERRITORY THREAT LEVEL ===
    const threatMods = { minimal: 10, low: 5, moderate: 0, high: -12, critical: -25 };
    const threatPenalty = threatMods[terr.threat_level] || 0;
    riskFactors.push({
      factor: "Territory Threat",
      impact: threatPenalty,
      detail: `${terr.name} threat level: ${terr.threat_level}`
    });
    baseSuccess += threatPenalty;

    // === 8. TERRITORY STATUS ===
    const statusMods = { secured: 8, uncharted: -3, contested: -12, hostile: -20 };
    const statusPenalty = statusMods[terr.status] || 0;
    riskFactors.push({
      factor: "Territory Control",
      impact: statusPenalty,
      detail: `${terr.name} status: ${terr.status}${terr.controlling_faction_id ? '' : ' (unclaimed)'}`
    });
    baseSuccess += statusPenalty;

    // === 9. DIPLOMATIC TENSION ===
    if (terr.controlling_faction_id) {
      const controllingFaction = allFactions.find(f => f.id === terr.controlling_faction_id);
      // Find diplomacy entries involving the controlling faction
      const relevantDip = allDiplomacy.filter(d => 
        d.faction_a_id === terr.controlling_faction_id || d.faction_b_id === terr.controlling_faction_id
      );
      
      const dipStatusMods = { war: -20, hostile: -12, neutral: 0, ceasefire: 3, trade_agreement: 8, allied: 12 };
      let worstDip = 0;
      let worstStatus = 'neutral';
      
      for (const d of relevantDip) {
        const mod = dipStatusMods[d.status] || 0;
        if (mod < worstDip) {
          worstDip = mod;
          worstStatus = d.status;
        }
      }

      const activeWars = relevantDip.filter(d => d.status === 'war' || d.status === 'hostile').length;
      const tensionPenalty = worstDip - (activeWars * 3);
      
      riskFactors.push({
        factor: "Diplomatic Tension",
        impact: tensionPenalty,
        detail: controllingFaction 
          ? `Controlled by [${controllingFaction.tag}] ${controllingFaction.name} — ${activeWars} active conflicts, worst status: ${worstStatus}`
          : `Unknown faction controls this territory — worst status: ${worstStatus}`
      });
      baseSuccess += tensionPenalty;
    }

    // === 10. OPERATION TYPE MODIFIER ===
    const opDifficulty = { recon: 5, scavenge: 3, escort: 0, defense: -3, sabotage: -8, assault: -12 };
    const opMod = opDifficulty[operation_type] || 0;
    riskFactors.push({
      factor: "Operation Difficulty",
      impact: opMod,
      detail: `${operation_type.toUpperCase()} operations have ${opMod >= 0 ? 'lower' : 'higher'} inherent risk`
    });
    baseSuccess += opMod;

    // Clamp to 5-98%
    const successProbability = Math.max(5, Math.min(98, Math.round(baseSuccess)));
    const riskScore = 100 - successProbability;

    // Risk tier
    let riskTier;
    if (successProbability >= 80) riskTier = 'low';
    else if (successProbability >= 60) riskTier = 'moderate';
    else if (successProbability >= 40) riskTier = 'high';
    else riskTier = 'critical';

    return Response.json({
      success_probability: successProbability,
      risk_score: riskScore,
      risk_tier: riskTier,
      risk_factors: riskFactors,
      squad_summary: {
        count: squad.length,
        avg_combat: parseFloat(avgCombat.toFixed(1)),
        names: squad.map(s => s.name),
      },
      territory_summary: {
        name: terr.name,
        sector: terr.sector,
        threat: terr.threat_level,
        status: terr.status,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});