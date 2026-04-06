import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Allow admin manual trigger or automation (no user)
  try {
    const user = await base44.auth.me();
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
  } catch (_) {
    // Automation context
  }

  const [factions, territories, diplomacyRecords, economies, treaties, recentEvents, jobs, reputations] = await Promise.all([
    base44.asServiceRole.entities.Faction.filter({}),
    base44.asServiceRole.entities.Territory.filter({}),
    base44.asServiceRole.entities.Diplomacy.filter({}),
    base44.asServiceRole.entities.FactionEconomy.filter({}),
    base44.asServiceRole.entities.Treaty.filter({}),
    base44.asServiceRole.entities.Event.filter({ is_active: true }, '-created_date', 30),
    base44.asServiceRole.entities.Job.filter({}),
    base44.asServiceRole.entities.Reputation.filter({}),
  ]);

  const activeFactions = factions.filter(f => f.status === 'active');
  if (activeFactions.length < 2) {
    return Response.json({ status: 'ok', message: 'Need at least 2 active factions', actions: [] });
  }

  const now = new Date();
  const actions = [];

  // Helper functions
  const getFactionEcon = (fId) => economies.find(e => e.faction_id === fId);
  const getFactionTerritories = (fId) => territories.filter(t => t.controlling_faction_id === fId);
  const getDiplomacy = (aId, bId) => diplomacyRecords.find(d =>
    (d.faction_a_id === aId && d.faction_b_id === bId) || (d.faction_a_id === bId && d.faction_b_id === aId)
  );
  const getActiveTreaty = (aId, bId) => treaties.find(t =>
    t.status === 'accepted' &&
    ((t.proposer_faction_id === aId && t.target_faction_id === bId) ||
     (t.proposer_faction_id === bId && t.target_faction_id === aId))
  );
  const getFactionPower = (fId) => {
    const econ = getFactionEcon(fId);
    const terrs = getFactionTerritories(fId);
    const wealth = econ?.wealth || 0;
    const prodTotal = Object.values(econ?.resource_production || {}).reduce((s, v) => s + (v || 0), 0);
    const securedCount = terrs.filter(t => t.status === 'secured').length;
    const playerCount = reputations.filter(r => r.faction_id === fId && ['trusted', 'allied', 'revered'].includes(r.rank)).length;
    return {
      wealth, production: prodTotal, territories: terrs.length,
      secured: securedCount, players: playerCount,
      score: wealth * 0.3 + prodTotal * 20 + terrs.length * 50 + securedCount * 30 + playerCount * 40,
    };
  };

  // 1. EXPIRE OLD DIPLOMACY AGREEMENTS
  for (const dip of diplomacyRecords) {
    if (dip.expires_at && new Date(dip.expires_at) < now && dip.status !== 'neutral') {
      await base44.asServiceRole.entities.Diplomacy.update(dip.id, {
        previous_status: dip.status,
        status: 'neutral',
        expires_at: '',
      });
      const fA = factions.find(f => f.id === dip.faction_a_id);
      const fB = factions.find(f => f.id === dip.faction_b_id);
      await base44.asServiceRole.entities.Event.create({
        title: `AGREEMENT EXPIRED: ${fA?.name} — ${fB?.name}`,
        content: `The ${dip.status} agreement between ${fA?.name} and ${fB?.name} has expired. Relations reset to neutral. The balance of power shifts.`,
        type: 'world_event',
        severity: 'warning',
        faction_id: dip.faction_a_id,
        is_active: true,
      });
      actions.push({ type: 'agreement_expired', factions: [fA?.name, fB?.name] });
    }
  }

  // 2. TENSION SIMULATION — evaluate each faction pair
  for (let i = 0; i < activeFactions.length; i++) {
    for (let j = i + 1; j < activeFactions.length; j++) {
      const fA = activeFactions[i];
      const fB = activeFactions[j];
      const dip = getDiplomacy(fA.id, fB.id);
      const treaty = getActiveTreaty(fA.id, fB.id);
      const powerA = getFactionPower(fA.id);
      const powerB = getFactionPower(fB.id);

      const dipStatus = dip?.status || 'neutral';

      // Skip allied factions with active treaties
      if (treaty && ['allied', 'trade_agreement', 'ceasefire'].includes(dipStatus)) continue;

      // Calculate tension score
      let tension = 0;

      // Territorial proximity — shared sectors increase tension
      const terrA = getFactionTerritories(fA.id);
      const terrB = getFactionTerritories(fB.id);
      const sectorsA = new Set(terrA.map(t => t.sector));
      const sectorsB = new Set(terrB.map(t => t.sector));
      const sharedSectors = [...sectorsA].filter(s => sectorsB.has(s));
      tension += sharedSectors.length * 15;

      // Power imbalance creates aggression from the stronger faction
      const powerRatio = Math.max(powerA.score, powerB.score) / Math.max(Math.min(powerA.score, powerB.score), 1);
      if (powerRatio > 2.0) tension += 20;
      else if (powerRatio > 1.5) tension += 10;

      // Existing hostility escalates
      if (dipStatus === 'hostile') tension += 30;
      else if (dipStatus === 'war') tension += 50;
      else if (dipStatus === 'neutral') tension += 5;

      // Resource competition — both want same scarce resources
      const resA = new Set(terrA.flatMap(t => t.resources || []));
      const resB = new Set(terrB.flatMap(t => t.resources || []));
      const sharedRes = [...resA].filter(r => resB.has(r));
      tension += sharedRes.length * 8;

      // Economic pressure — embargoed factions are more aggressive
      const econA = getFactionEcon(fA.id);
      const econB = getFactionEcon(fB.id);
      if (econA?.trade_embargo) tension += 15;
      if (econB?.trade_embargo) tension += 15;

      // Randomness factor — chaos of the wasteland
      tension += Math.floor(Math.random() * 20);

      // Clamp to 0-100
      tension = Math.min(100, Math.max(0, tension));

      // 3. GENERATE EVENTS BASED ON TENSION
      if (tension >= 75 && dipStatus !== 'war') {
        // HIGH TENSION — territorial dispute or border incident
        const disputeTerritory = territories.find(t =>
          sharedSectors.includes(t.sector) && t.status !== 'hostile'
        );

        if (disputeTerritory && Math.random() > 0.4) {
          // Territorial dispute — mark territory as contested
          await base44.asServiceRole.entities.Territory.update(disputeTerritory.id, {
            status: 'contested',
            threat_level: 'high',
          });

          await base44.asServiceRole.entities.Event.create({
            title: `BORDER INCIDENT: ${fA.name} vs ${fB.name}`,
            content: `Hostile forces from both ${fA.name} and ${fB.name} have been spotted in ${disputeTerritory.name} (${disputeTerritory.sector}). Armed patrols are encroaching on each other's supply lines. The sector is now contested — operatives can intervene through diplomatic channels or direct tactical action.`,
            type: 'faction_conflict',
            severity: 'critical',
            territory_id: disputeTerritory.id,
            faction_id: fA.id,
            is_active: true,
          });

          // Create actionable intel
          await base44.asServiceRole.entities.IntelFeed.create({
            title: `FLASHPOINT: ${disputeTerritory.name} Dispute Escalating`,
            content: `Intelligence suggests both ${fA.name} and ${fB.name} are mobilizing assets toward ${disputeTerritory.name}. A diplomatic resolution is still possible, but the window is narrowing. Players aligned with either faction can propose a treaty or take direct action.`,
            category: 'tactical_advisory',
            severity: 'critical',
            source: 'GHOST PROTOCOL Strategic Analysis',
            related_faction_id: fA.id,
            related_territory_id: disputeTerritory.id,
            is_active: true,
            expires_at: new Date(now.getTime() + 12 * 3600000).toISOString(),
          });

          // Generate a mission for players to intervene
          await base44.asServiceRole.entities.Job.create({
            title: `Stabilize ${disputeTerritory.name}`,
            description: `The territorial dispute between ${fA.name} and ${fB.name} in ${disputeTerritory.name} threatens to escalate into open conflict. Deploy to the sector, assess the situation, and either negotiate a ceasefire or secure the zone by force.`,
            type: 'recon',
            status: 'available',
            difficulty: 'hazardous',
            territory_id: disputeTerritory.id,
            faction_id: fA.id,
            reward_reputation: 15,
            reward_credits: 150,
            verification_type: 'admin_confirm',
            verification_criteria: 'Provide evidence of diplomatic contact or tactical intervention in the disputed sector.',
            expires_at: new Date(now.getTime() + 24 * 3600000).toISOString(),
          });

          actions.push({ type: 'territorial_dispute', territory: disputeTerritory.name, factions: [fA.name, fB.name], tension });

          // Escalate diplomacy if neutral
          if (dipStatus === 'neutral') {
            if (dip) {
              await base44.asServiceRole.entities.Diplomacy.update(dip.id, { status: 'hostile', previous_status: 'neutral' });
            } else {
              await base44.asServiceRole.entities.Diplomacy.create({
                faction_a_id: fA.id, faction_b_id: fB.id,
                status: 'hostile', previous_status: 'neutral',
                initiated_by: powerA.score > powerB.score ? fA.id : fB.id,
              });
            }
          }
        }
      } else if (tension >= 50 && tension < 75 && Math.random() > 0.5) {
        // MEDIUM TENSION — secret negotiations or espionage
        const scenario = Math.random();

        if (scenario < 0.4) {
          // Secret treaty negotiations — AI-generated backroom deal
          await base44.asServiceRole.entities.IntelFeed.create({
            title: `SECRET TALKS: ${fA.name} and ${fB.name} Back-Channel`,
            content: `Intercepted communications suggest back-channel negotiations between ${fA.name} and ${fB.name} leadership. The nature of these talks is unclear — could be a trade pact, a non-aggression treaty, or something more sinister. Operatives with standing in either faction may be able to influence the outcome.`,
            category: 'faction_intel',
            severity: 'high',
            source: 'SIGINT Intercept / GHOST PROTOCOL',
            related_faction_id: fA.id,
            is_active: true,
            expires_at: new Date(now.getTime() + 18 * 3600000).toISOString(),
          });
          actions.push({ type: 'secret_negotiations', factions: [fA.name, fB.name], tension });

        } else if (scenario < 0.7) {
          // Espionage — one faction spying on another
          const spy = powerA.score > powerB.score ? fA : fB;
          const target = spy.id === fA.id ? fB : fA;

          await base44.asServiceRole.entities.Event.create({
            title: `ESPIONAGE DETECTED: ${spy.name} Operatives in ${target.name} Territory`,
            content: `${target.name} scouts have reported suspicious activity near their supply caches. Evidence points to ${spy.name} intelligence operatives conducting surveillance. This could be a precursor to a larger operation — or simply routine reconnaissance.`,
            type: 'faction_conflict',
            severity: 'warning',
            faction_id: target.id,
            is_active: true,
          });

          await base44.asServiceRole.entities.Job.create({
            title: `Counter-Intelligence: Track ${spy.name} Agents`,
            description: `${spy.name} operatives have been detected conducting surveillance in ${target.name} territory. Locate and document their activities. Your findings will determine the diplomatic response.`,
            type: 'recon',
            status: 'available',
            difficulty: 'hazardous',
            faction_id: target.id,
            reward_reputation: 10,
            reward_credits: 100,
            verification_type: 'screenshot',
            verification_criteria: 'Document evidence of hostile faction activity in the target zone.',
            expires_at: new Date(now.getTime() + 18 * 3600000).toISOString(),
          });
          actions.push({ type: 'espionage', spy: spy.name, target: target.name, tension });

        } else {
          // Resource raid — one faction targeting another's resources
          const raider = powerA.score > powerB.score ? fA : fB;
          const victim = raider.id === fA.id ? fB : fA;
          const victimTerr = getFactionTerritories(victim.id).find(t => (t.resources || []).length > 0);

          if (victimTerr) {
            await base44.asServiceRole.entities.Event.create({
              title: `RAID ALERT: ${raider.name} Targets ${victimTerr.name}`,
              content: `Intelligence reports indicate ${raider.name} is planning a resource raid on ${victimTerr.name}. ${victim.name} operatives are urged to fortify the sector or request allied assistance.`,
              type: 'faction_conflict',
              severity: 'warning',
              territory_id: victimTerr.id,
              faction_id: raider.id,
              is_active: true,
            });

            await base44.asServiceRole.entities.Job.create({
              title: `Defend ${victimTerr.name} from ${raider.name}`,
              description: `${raider.name} raiders are targeting the resource stores in ${victimTerr.name}. Rally defenders, fortify positions, or negotiate a ceasefire before the attack commences.`,
              type: 'escort',
              status: 'available',
              difficulty: 'critical',
              territory_id: victimTerr.id,
              faction_id: victim.id,
              reward_reputation: 20,
              reward_credits: 200,
              verification_type: 'admin_confirm',
              verification_criteria: 'Prove that the raid was repelled or diplomatically averted.',
              expires_at: new Date(now.getTime() + 12 * 3600000).toISOString(),
            });
            actions.push({ type: 'resource_raid', raider: raider.name, target: victimTerr.name, tension });
          }
        }
      } else if (tension < 30 && dipStatus === 'hostile' && Math.random() > 0.6) {
        // LOW TENSION + currently hostile = natural de-escalation
        if (dip) {
          await base44.asServiceRole.entities.Diplomacy.update(dip.id, {
            status: 'neutral',
            previous_status: 'hostile',
          });
          await base44.asServiceRole.entities.Event.create({
            title: `DÉTENTE: ${fA.name} and ${fB.name} Cool Hostilities`,
            content: `After a period of relative calm, tensions between ${fA.name} and ${fB.name} have eased. Diplomatic channels are re-opening. Operatives may seize this opportunity to negotiate a formal agreement.`,
            type: 'world_event',
            severity: 'info',
            faction_id: fA.id,
            is_active: true,
          });
          actions.push({ type: 'de_escalation', factions: [fA.name, fB.name], tension });
        }
      }
    }
  }

  // 4. TERRITORY DECAY — uncontrolled contested zones deteriorate
  const contestedTerritories = territories.filter(t => t.status === 'contested');
  for (const terr of contestedTerritories) {
    const threatLevels = ['minimal', 'low', 'moderate', 'high', 'critical'];
    const currentIdx = threatLevels.indexOf(terr.threat_level || 'moderate');
    if (currentIdx < 4 && Math.random() > 0.65) {
      const newThreat = threatLevels[currentIdx + 1];
      await base44.asServiceRole.entities.Territory.update(terr.id, { threat_level: newThreat });
      actions.push({ type: 'threat_escalation', territory: terr.name, new_threat: newThreat });
    }
  }

  // 5. POWER VACUUM — unclaimed/uncharted territories may attract faction attention
  const unclaimedTerritories = territories.filter(t => !t.controlling_faction_id && t.status === 'uncharted');
  if (unclaimedTerritories.length > 0 && Math.random() > 0.7) {
    const target = unclaimedTerritories[Math.floor(Math.random() * unclaimedTerritories.length)];
    const claimant = activeFactions[Math.floor(Math.random() * activeFactions.length)];

    await base44.asServiceRole.entities.IntelFeed.create({
      title: `LAND GRAB: ${claimant.name} Eyes ${target.name}`,
      content: `${claimant.name} scouts have been surveying ${target.name} in sector ${target.sector}. Analysts believe a formal territorial claim is imminent. Other factions may want to contest this expansion.`,
      category: 'faction_intel',
      severity: 'medium',
      source: 'Territorial Analysis Division',
      related_faction_id: claimant.id,
      related_territory_id: target.id,
      is_active: true,
      expires_at: new Date(now.getTime() + 24 * 3600000).toISOString(),
    });
    actions.push({ type: 'power_vacuum', territory: target.name, interested_faction: claimant.name });
  }

  return Response.json({
    status: 'ok',
    actions_taken: actions.length,
    actions,
    factions_evaluated: activeFactions.length,
    pairs_evaluated: (activeFactions.length * (activeFactions.length - 1)) / 2,
  });
});