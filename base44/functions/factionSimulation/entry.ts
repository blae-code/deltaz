import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

const ACTIVE_JOB_STATUSES = new Set(['available', 'in_progress']);
const ACTIVE_TREATY_STATUSES = new Set(['accepted']);

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);

    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    } catch (_) {
      // Allow automation contexts with no user session.
    }

    const [factions, territories, diplomacyRecords, economies, treaties, recentEvents, jobs, recentIntel, reputations] = await Promise.all([
      base44.asServiceRole.entities.Faction.filter({}),
      base44.asServiceRole.entities.Territory.filter({}),
      base44.asServiceRole.entities.Diplomacy.filter({}),
      base44.asServiceRole.entities.FactionEconomy.filter({}),
      base44.asServiceRole.entities.Treaty.filter({}),
      base44.asServiceRole.entities.Event.filter({ is_active: true }, '-created_date', 50),
      base44.asServiceRole.entities.Job.filter({}),
      base44.asServiceRole.entities.IntelFeed.filter({ is_active: true }, '-created_date', 50),
      base44.asServiceRole.entities.Reputation.filter({}),
    ]);

    const activeFactions = factions.filter((faction) => faction.status === 'active');
    if (activeFactions.length < 2) {
      return Response.json({ status: 'ok', message: 'Need at least 2 active factions', actions: [] });
    }

    const now = new Date();
    const actions = [];
    const recentEventTitles = new Set(recentEvents.map((event) => sanitizeText(event.title, 140)).filter(Boolean));
    const recentIntelTitles = new Set(recentIntel.map((intel) => sanitizeText(intel.title, 140)).filter(Boolean));
    const openJobTitles = new Set(
      jobs
        .filter((job) => ACTIVE_JOB_STATUSES.has(job.status))
        .map((job) => sanitizeText(job.title, 140))
        .filter(Boolean),
    );

    const getFactionEconomy = (factionId) => economies.find((economy) => economy.faction_id === factionId);
    const getFactionTerritories = (factionId) => territories.filter((territory) => territory.controlling_faction_id === factionId);
    const getDiplomacy = (factionAId, factionBId) => diplomacyRecords.find((record) =>
      (record.faction_a_id === factionAId && record.faction_b_id === factionBId)
      || (record.faction_a_id === factionBId && record.faction_b_id === factionAId)
    );
    const getActiveTreaty = (factionAId, factionBId) => treaties.find((treaty) =>
      ACTIVE_TREATY_STATUSES.has(treaty.status)
      && ((treaty.proposer_faction_id === factionAId && treaty.target_faction_id === factionBId)
        || (treaty.proposer_faction_id === factionBId && treaty.target_faction_id === factionAId))
    );
    const getFactionPower = (factionId) => {
      const economy = getFactionEconomy(factionId);
      const factionTerritories = getFactionTerritories(factionId);
      const wealth = Number(economy?.wealth || 0) || 0;
      const productionTotal = Object.values(economy?.resource_production || {}).reduce(
        (sum, value) => sum + (Number(value || 0) || 0),
        0,
      );
      const securedCount = factionTerritories.filter((territory) => territory.status === 'secured').length;
      const playerCount = reputations.filter((reputation) =>
        reputation.faction_id === factionId && ['trusted', 'allied', 'revered'].includes(reputation.rank)
      ).length;

      return {
        wealth,
        production: productionTotal,
        territories: factionTerritories.length,
        secured: securedCount,
        players: playerCount,
        score: wealth * 0.3 + productionTotal * 20 + factionTerritories.length * 50 + securedCount * 30 + playerCount * 40,
      };
    };
    const createEventOnce = async (payload) => {
      const title = sanitizeText(payload.title, 140);
      if (!title || recentEventTitles.has(title)) {
        return null;
      }

      const event = await base44.asServiceRole.entities.Event.create(payload);
      recentEventTitles.add(title);
      return event;
    };
    const createIntelOnce = async (payload) => {
      const title = sanitizeText(payload.title, 140);
      if (!title || recentIntelTitles.has(title)) {
        return null;
      }

      const intel = await base44.asServiceRole.entities.IntelFeed.create(payload);
      recentIntelTitles.add(title);
      return intel;
    };
    const createJobOnce = async (payload) => {
      const title = sanitizeText(payload.title, 140);
      if (!title || openJobTitles.has(title)) {
        return null;
      }

      const job = await base44.asServiceRole.entities.Job.create(payload);
      openJobTitles.add(title);
      return job;
    };

    for (const diplomacy of diplomacyRecords) {
      const expiresAt = Date.parse(diplomacy.expires_at || '');
      if (!Number.isFinite(expiresAt) || expiresAt >= now.getTime() || diplomacy.status === 'neutral') {
        continue;
      }

      await base44.asServiceRole.entities.Diplomacy.update(diplomacy.id, {
        previous_status: diplomacy.status,
        status: 'neutral',
        expires_at: '',
      });

      const factionA = factions.find((faction) => faction.id === diplomacy.faction_a_id);
      const factionB = factions.find((faction) => faction.id === diplomacy.faction_b_id);
      await createEventOnce({
        title: `AGREEMENT EXPIRED: ${factionA?.name || 'Unknown'} - ${factionB?.name || 'Unknown'}`,
        content: `The ${diplomacy.status} agreement between ${factionA?.name || 'Unknown'} and ${factionB?.name || 'Unknown'} has expired. Relations reset to neutral. The balance of power shifts.`,
        type: 'world_event',
        severity: 'warning',
        faction_id: diplomacy.faction_a_id,
        is_active: true,
      });

      actions.push({ type: 'agreement_expired', factions: [factionA?.name, factionB?.name] });
    }

    for (let indexA = 0; indexA < activeFactions.length; indexA += 1) {
      for (let indexB = indexA + 1; indexB < activeFactions.length; indexB += 1) {
        const factionA = activeFactions[indexA];
        const factionB = activeFactions[indexB];
        const diplomacy = getDiplomacy(factionA.id, factionB.id);
        const treaty = getActiveTreaty(factionA.id, factionB.id);
        const powerA = getFactionPower(factionA.id);
        const powerB = getFactionPower(factionB.id);
        const diplomacyStatus = diplomacy?.status || 'neutral';

        if (treaty && ['allied', 'trade_agreement', 'ceasefire'].includes(diplomacyStatus)) {
          continue;
        }

        let tension = 0;
        const territoriesA = getFactionTerritories(factionA.id);
        const territoriesB = getFactionTerritories(factionB.id);
        const sectorsA = new Set(territoriesA.map((territory) => territory.sector));
        const sectorsB = new Set(territoriesB.map((territory) => territory.sector));
        const sharedSectors = [...sectorsA].filter((sector) => sectorsB.has(sector));
        tension += sharedSectors.length * 15;

        const powerRatio = Math.max(powerA.score, powerB.score) / Math.max(Math.min(powerA.score, powerB.score), 1);
        if (powerRatio > 2) {
          tension += 20;
        } else if (powerRatio > 1.5) {
          tension += 10;
        }

        if (diplomacyStatus === 'hostile') {
          tension += 30;
        } else if (diplomacyStatus === 'war') {
          tension += 50;
        } else if (diplomacyStatus === 'neutral') {
          tension += 5;
        }

        const resourcesA = new Set(territoriesA.flatMap((territory) => territory.resources || []));
        const resourcesB = new Set(territoriesB.flatMap((territory) => territory.resources || []));
        const sharedResources = [...resourcesA].filter((resource) => resourcesB.has(resource));
        tension += sharedResources.length * 8;

        const economyA = getFactionEconomy(factionA.id);
        const economyB = getFactionEconomy(factionB.id);
        if (economyA?.trade_embargo) {
          tension += 15;
        }
        if (economyB?.trade_embargo) {
          tension += 15;
        }

        tension += Math.floor(Math.random() * 20);
        tension = Math.min(100, Math.max(0, tension));

        if (tension >= 75 && diplomacyStatus !== 'war') {
          const disputeTerritory = territories.find((territory) =>
            sharedSectors.includes(territory.sector) && territory.status !== 'hostile'
          );
          if (!disputeTerritory || Math.random() <= 0.4) {
            continue;
          }

          await base44.asServiceRole.entities.Territory.update(disputeTerritory.id, {
            status: 'contested',
            threat_level: 'high',
          });

          await createEventOnce({
            title: `BORDER INCIDENT: ${factionA.name} vs ${factionB.name}`,
            content: `Hostile forces from both ${factionA.name} and ${factionB.name} have been spotted in ${disputeTerritory.name} (${disputeTerritory.sector}). Armed patrols are encroaching on each other's supply lines. The sector is now contested - operatives can intervene through diplomatic channels or direct tactical action.`,
            type: 'faction_conflict',
            severity: 'critical',
            territory_id: disputeTerritory.id,
            faction_id: factionA.id,
            is_active: true,
          });

          await createIntelOnce({
            title: `FLASHPOINT: ${disputeTerritory.name} Dispute Escalating`,
            content: `Intelligence suggests both ${factionA.name} and ${factionB.name} are mobilizing assets toward ${disputeTerritory.name}. A diplomatic resolution is still possible, but the window is narrowing. Players aligned with either faction can propose a treaty or take direct action.`,
            category: 'tactical_advisory',
            severity: 'critical',
            source: 'GHOST PROTOCOL Strategic Analysis',
            related_faction_id: factionA.id,
            related_territory_id: disputeTerritory.id,
            is_active: true,
            expires_at: new Date(now.getTime() + 12 * 3600000).toISOString(),
          });

          await createJobOnce({
            title: `Stabilize ${disputeTerritory.name}`,
            description: `The territorial dispute between ${factionA.name} and ${factionB.name} in ${disputeTerritory.name} threatens to escalate into open conflict. Deploy to the sector, assess the situation, and either negotiate a ceasefire or secure the zone by force.`,
            type: 'recon',
            status: 'available',
            difficulty: 'hazardous',
            territory_id: disputeTerritory.id,
            faction_id: factionA.id,
            reward_reputation: 15,
            reward_credits: 150,
            verification_type: 'admin_confirm',
            verification_criteria: 'Provide evidence of diplomatic contact or tactical intervention in the disputed sector.',
            expires_at: new Date(now.getTime() + 24 * 3600000).toISOString(),
          });

          actions.push({ type: 'territorial_dispute', territory: disputeTerritory.name, factions: [factionA.name, factionB.name], tension });

          if (diplomacyStatus === 'neutral') {
            if (diplomacy) {
              await base44.asServiceRole.entities.Diplomacy.update(diplomacy.id, {
                status: 'hostile',
                previous_status: 'neutral',
              });
            } else {
              await base44.asServiceRole.entities.Diplomacy.create({
                faction_a_id: factionA.id,
                faction_b_id: factionB.id,
                status: 'hostile',
                previous_status: 'neutral',
                initiated_by: powerA.score > powerB.score ? factionA.id : factionB.id,
              });
            }
          }
          continue;
        }

        if (tension >= 50 && tension < 75 && Math.random() > 0.5) {
          const scenario = Math.random();

          if (scenario < 0.4) {
            await createIntelOnce({
              title: `SECRET TALKS: ${factionA.name} and ${factionB.name} Back-Channel`,
              content: `Intercepted communications suggest back-channel negotiations between ${factionA.name} and ${factionB.name} leadership. The nature of these talks is unclear - could be a trade pact, a non-aggression treaty, or something more sinister. Operatives with standing in either faction may be able to influence the outcome.`,
              category: 'faction_intel',
              severity: 'high',
              source: 'SIGINT Intercept / GHOST PROTOCOL',
              related_faction_id: factionA.id,
              is_active: true,
              expires_at: new Date(now.getTime() + 18 * 3600000).toISOString(),
            });
            actions.push({ type: 'secret_negotiations', factions: [factionA.name, factionB.name], tension });
            continue;
          }

          if (scenario < 0.7) {
            const spyFaction = powerA.score > powerB.score ? factionA : factionB;
            const targetFaction = spyFaction.id === factionA.id ? factionB : factionA;

            await createEventOnce({
              title: `ESPIONAGE DETECTED: ${spyFaction.name} Operatives in ${targetFaction.name} Territory`,
              content: `${targetFaction.name} scouts have reported suspicious activity near their supply caches. Evidence points to ${spyFaction.name} intelligence operatives conducting surveillance. This could be a precursor to a larger operation - or simply routine reconnaissance.`,
              type: 'faction_conflict',
              severity: 'warning',
              faction_id: targetFaction.id,
              is_active: true,
            });

            await createJobOnce({
              title: `Counter-Intelligence: Track ${spyFaction.name} Agents`,
              description: `${spyFaction.name} operatives have been detected conducting surveillance in ${targetFaction.name} territory. Locate and document their activities. Your findings will determine the diplomatic response.`,
              type: 'recon',
              status: 'available',
              difficulty: 'hazardous',
              faction_id: targetFaction.id,
              reward_reputation: 10,
              reward_credits: 100,
              verification_type: 'screenshot',
              verification_criteria: 'Document evidence of hostile faction activity in the target zone.',
              expires_at: new Date(now.getTime() + 18 * 3600000).toISOString(),
            });

            actions.push({ type: 'espionage', spy: spyFaction.name, target: targetFaction.name, tension });
            continue;
          }

          const raiderFaction = powerA.score > powerB.score ? factionA : factionB;
          const victimFaction = raiderFaction.id === factionA.id ? factionB : factionA;
          const victimTerritory = getFactionTerritories(victimFaction.id).find((territory) => (territory.resources || []).length > 0);
          if (!victimTerritory) {
            continue;
          }

          await createEventOnce({
            title: `RAID ALERT: ${raiderFaction.name} Targets ${victimTerritory.name}`,
            content: `Intelligence reports indicate ${raiderFaction.name} is planning a resource raid on ${victimTerritory.name}. ${victimFaction.name} operatives are urged to fortify the sector or request allied assistance.`,
            type: 'faction_conflict',
            severity: 'warning',
            territory_id: victimTerritory.id,
            faction_id: raiderFaction.id,
            is_active: true,
          });

          await createJobOnce({
            title: `Defend ${victimTerritory.name} from ${raiderFaction.name}`,
            description: `${raiderFaction.name} raiders are targeting the resource stores in ${victimTerritory.name}. Rally defenders, fortify positions, or negotiate a ceasefire before the attack commences.`,
            type: 'escort',
            status: 'available',
            difficulty: 'critical',
            territory_id: victimTerritory.id,
            faction_id: victimFaction.id,
            reward_reputation: 20,
            reward_credits: 200,
            verification_type: 'admin_confirm',
            verification_criteria: 'Prove that the raid was repelled or diplomatically averted.',
            expires_at: new Date(now.getTime() + 12 * 3600000).toISOString(),
          });

          actions.push({ type: 'resource_raid', raider: raiderFaction.name, target: victimTerritory.name, tension });
          continue;
        }

        if (tension < 30 && diplomacyStatus === 'hostile' && Math.random() > 0.6 && diplomacy) {
          await base44.asServiceRole.entities.Diplomacy.update(diplomacy.id, {
            status: 'neutral',
            previous_status: 'hostile',
          });

          await createEventOnce({
            title: `DETENTE: ${factionA.name} and ${factionB.name} Cool Hostilities`,
            content: `After a period of relative calm, tensions between ${factionA.name} and ${factionB.name} have eased. Diplomatic channels are re-opening. Operatives may seize this opportunity to negotiate a formal agreement.`,
            type: 'world_event',
            severity: 'info',
            faction_id: factionA.id,
            is_active: true,
          });

          actions.push({ type: 'de_escalation', factions: [factionA.name, factionB.name], tension });
        }
      }
    }

    const contestedTerritories = territories.filter((territory) => territory.status === 'contested');
    const threatLevels = ['minimal', 'low', 'moderate', 'high', 'critical'];
    for (const territory of contestedTerritories) {
      const currentIndex = threatLevels.indexOf(territory.threat_level || 'moderate');
      if (currentIndex < 0 || currentIndex >= threatLevels.length - 1 || Math.random() <= 0.65) {
        continue;
      }

      const newThreat = threatLevels[currentIndex + 1];
      await base44.asServiceRole.entities.Territory.update(territory.id, { threat_level: newThreat });
      actions.push({ type: 'threat_escalation', territory: territory.name, new_threat: newThreat });
    }

    const unclaimedTerritories = territories.filter((territory) =>
      !territory.controlling_faction_id && territory.status === 'uncharted'
    );
    if (unclaimedTerritories.length > 0 && Math.random() > 0.7) {
      const targetTerritory = unclaimedTerritories[Math.floor(Math.random() * unclaimedTerritories.length)];
      const claimantFaction = activeFactions[Math.floor(Math.random() * activeFactions.length)];

      await createIntelOnce({
        title: `LAND GRAB: ${claimantFaction.name} Eyes ${targetTerritory.name}`,
        content: `${claimantFaction.name} scouts have been surveying ${targetTerritory.name} in sector ${targetTerritory.sector}. Analysts believe a formal territorial claim is imminent. Other factions may want to contest this expansion.`,
        category: 'faction_intel',
        severity: 'medium',
        source: 'Territorial Analysis Division',
        related_faction_id: claimantFaction.id,
        related_territory_id: targetTerritory.id,
        is_active: true,
        expires_at: new Date(now.getTime() + 24 * 3600000).toISOString(),
      });

      actions.push({ type: 'power_vacuum', territory: targetTerritory.name, interested_faction: claimantFaction.name });
    }

    return Response.json({
      status: 'ok',
      actions_taken: actions.length,
      actions,
      factions_evaluated: activeFactions.length,
      pairs_evaluated: (activeFactions.length * (activeFactions.length - 1)) / 2,
    });
  } catch (error) {
    console.error('factionSimulation error:', error);
    return Response.json({ error: error.message || 'Faction simulation failed' }, { status: 500 });
  }
});

function sanitizeText(value, maxLength = 200) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}
