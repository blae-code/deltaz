import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';
import { deterministicBoolean, deterministicNumber, sortDeterministic } from '../_shared/deterministic.ts';
import { DATA_ORIGINS, buildSourceRef, getCycleKey, hasSourceRef, withProvenance } from '../_shared/provenance.ts';

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
    const cycleKey = getCycleKey(30, now.getTime());
    const cycleRef = `faction_sim:${cycleKey}`;
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
    const createEventOnce = async (payload, sourceRefs = []) => {
      const title = sanitizeText(payload.title, 140);
      if (!title || recentEventTitles.has(title)) {
        return null;
      }

      const event = await base44.asServiceRole.entities.Event.create(withProvenance(payload, {
        dataOrigin: DATA_ORIGINS.DETERMINISTIC_PROJECTION,
        sourceRefs: [cycleRef, ...sourceRefs],
      }));
      recentEventTitles.add(title);
      return event;
    };
    const createIntelOnce = async (payload, sourceRefs = []) => {
      const title = sanitizeText(payload.title, 140);
      if (!title || recentIntelTitles.has(title)) {
        return null;
      }

      const intel = await base44.asServiceRole.entities.IntelFeed.create(withProvenance(payload, {
        dataOrigin: DATA_ORIGINS.DETERMINISTIC_PROJECTION,
        sourceRefs: [cycleRef, ...sourceRefs],
      }));
      recentIntelTitles.add(title);
      return intel;
    };
    const createJobOnce = async (payload, sourceRefs = []) => {
      const title = sanitizeText(payload.title, 140);
      if (!title || openJobTitles.has(title)) {
        return null;
      }

      const job = await base44.asServiceRole.entities.Job.create(withProvenance(payload, {
        dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
        sourceRefs: [cycleRef, ...sourceRefs],
      }));
      openJobTitles.add(title);
      return job;
    };

    for (const diplomacy of diplomacyRecords) {
      const expiresAt = Date.parse(diplomacy.expires_at || '');
      if (!Number.isFinite(expiresAt) || expiresAt >= now.getTime() || diplomacy.status === 'neutral' || hasSourceRef(diplomacy, cycleRef)) {
        continue;
      }

      diplomacy.previous_status = diplomacy.status;
      diplomacy.status = 'neutral';
      diplomacy.expires_at = '';
      await base44.asServiceRole.entities.Diplomacy.update(diplomacy.id, withProvenance({
        previous_status: diplomacy.previous_status,
        status: 'neutral',
        expires_at: '',
      }, {
        dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
        sourceRefs: [
          cycleRef,
          buildSourceRef('diplomacy', diplomacy.id),
          buildSourceRef('faction', diplomacy.faction_a_id),
          buildSourceRef('faction', diplomacy.faction_b_id),
        ],
      }));

      const factionA = factions.find((faction) => faction.id === diplomacy.faction_a_id);
      const factionB = factions.find((faction) => faction.id === diplomacy.faction_b_id);
      await createEventOnce({
        title: `AGREEMENT EXPIRED: ${factionA?.name || 'Unknown'} - ${factionB?.name || 'Unknown'}`,
        content: `The ${diplomacy.previous_status} agreement between ${factionA?.name || 'Unknown'} and ${factionB?.name || 'Unknown'} has expired. Relations reset to neutral. The balance of power shifts.`,
        type: 'world_event',
        severity: 'warning',
        faction_id: diplomacy.faction_a_id,
        is_active: true,
      }, [
        buildSourceRef('diplomacy', diplomacy.id),
        buildSourceRef('faction', diplomacy.faction_a_id),
        buildSourceRef('faction', diplomacy.faction_b_id),
      ]);

      actions.push({ type: 'agreement_expired', factions: [factionA?.name, factionB?.name] });
    }

    for (let indexA = 0; indexA < activeFactions.length; indexA += 1) {
      for (let indexB = indexA + 1; indexB < activeFactions.length; indexB += 1) {
        const factionA = activeFactions[indexA];
        const factionB = activeFactions[indexB];
        const pairKey = `${factionA.id}:${factionB.id}`;
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

        tension += deterministicNumber(0, 19, cycleKey, pairKey, 'tension_noise');
        tension = Math.min(100, Math.max(0, tension));

        if (tension >= 75 && diplomacyStatus !== 'war') {
          const disputeCandidates = sortDeterministic(
            territories.filter((territory) => sharedSectors.includes(territory.sector) && territory.status !== 'hostile'),
            (territory) => territory.id,
            cycleKey,
            pairKey,
            'dispute',
          );
          const disputeTerritory = disputeCandidates[0];
          const shouldEscalate = disputeTerritory && deterministicBoolean(0.6, cycleKey, pairKey, disputeTerritory?.id, 'escalate');
          if (!disputeTerritory || !shouldEscalate) {
            continue;
          }

          disputeTerritory.status = 'contested';
          disputeTerritory.threat_level = 'high';
          await base44.asServiceRole.entities.Territory.update(disputeTerritory.id, withProvenance({
            status: 'contested',
            threat_level: 'high',
          }, {
            dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
            sourceRefs: [
              cycleRef,
              buildSourceRef('territory', disputeTerritory.id),
              buildSourceRef('faction', factionA.id),
              buildSourceRef('faction', factionB.id),
            ],
          }));

          await createEventOnce({
            title: `BORDER INCIDENT: ${factionA.name} vs ${factionB.name}`,
            content: `Hostile forces from both ${factionA.name} and ${factionB.name} have been spotted in ${disputeTerritory.name} (${disputeTerritory.sector}). Armed patrols are encroaching on each other's supply lines. The sector is now contested and intervention is likely.`,
            type: 'faction_conflict',
            severity: 'critical',
            territory_id: disputeTerritory.id,
            faction_id: factionA.id,
            is_active: true,
          }, [
            buildSourceRef('territory', disputeTerritory.id),
            buildSourceRef('faction', factionA.id),
            buildSourceRef('faction', factionB.id),
          ]);

          await createIntelOnce({
            title: `FLASHPOINT: ${disputeTerritory.name} Dispute Escalating`,
            content: `Sensor sweeps confirm both ${factionA.name} and ${factionB.name} are shifting assets toward ${disputeTerritory.name}. Diplomatic intervention is still possible, but the sector is already trending toward direct conflict.`,
            category: 'tactical_advisory',
            severity: 'critical',
            source: 'GHOST PROTOCOL Strategic Analysis',
            related_faction_id: factionA.id,
            related_territory_id: disputeTerritory.id,
            is_active: true,
            expires_at: new Date(now.getTime() + 12 * 3600000).toISOString(),
          }, [
            buildSourceRef('territory', disputeTerritory.id),
            buildSourceRef('faction', factionA.id),
            buildSourceRef('faction', factionB.id),
          ]);

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
          }, [
            buildSourceRef('territory', disputeTerritory.id),
            buildSourceRef('faction', factionA.id),
            buildSourceRef('faction', factionB.id),
          ]);

          actions.push({ type: 'territorial_dispute', territory: disputeTerritory.name, factions: [factionA.name, factionB.name], tension });

          if (diplomacyStatus === 'neutral') {
            if (diplomacy) {
              diplomacy.previous_status = 'neutral';
              diplomacy.status = 'hostile';
              await base44.asServiceRole.entities.Diplomacy.update(diplomacy.id, withProvenance({
                status: 'hostile',
                previous_status: 'neutral',
              }, {
                dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
                sourceRefs: [
                  cycleRef,
                  buildSourceRef('diplomacy', diplomacy.id),
                  buildSourceRef('faction', factionA.id),
                  buildSourceRef('faction', factionB.id),
                ],
              }));
            } else {
              const newDiplomacy = await base44.asServiceRole.entities.Diplomacy.create(withProvenance({
                faction_a_id: factionA.id,
                faction_b_id: factionB.id,
                status: 'hostile',
                previous_status: 'neutral',
                initiated_by: powerA.score > powerB.score ? factionA.id : factionB.id,
              }, {
                dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
                sourceRefs: [
                  cycleRef,
                  buildSourceRef('faction', factionA.id),
                  buildSourceRef('faction', factionB.id),
                ],
              }));
              diplomacyRecords.push(newDiplomacy);
            }
          }
          continue;
        }

        if (tension >= 50 && tension < 75 && deterministicBoolean(0.5, cycleKey, pairKey, 'midband')) {
          const scenario = deterministicNumber(0, 99, cycleKey, pairKey, 'scenario');

          if (scenario < 40) {
            await createIntelOnce({
              title: `SECRET TALKS: ${factionA.name} and ${factionB.name} Back-Channel`,
              content: `Intercepted traffic indicates controlled communication between ${factionA.name} and ${factionB.name}. Analysts cannot confirm the end state, but the exchange looks deliberate and immediate.`,
              category: 'faction_intel',
              severity: 'high',
              source: 'SIGINT Intercept / GHOST PROTOCOL',
              related_faction_id: factionA.id,
              is_active: true,
              expires_at: new Date(now.getTime() + 18 * 3600000).toISOString(),
            }, [
              buildSourceRef('faction', factionA.id),
              buildSourceRef('faction', factionB.id),
            ]);
            actions.push({ type: 'secret_negotiations', factions: [factionA.name, factionB.name], tension });
            continue;
          }

          if (scenario < 70) {
            const spyFaction = powerA.score > powerB.score ? factionA : factionB;
            const targetFaction = spyFaction.id === factionA.id ? factionB : factionA;

            await createEventOnce({
              title: `ESPIONAGE DETECTED: ${spyFaction.name} Operatives in ${targetFaction.name} Territory`,
              content: `${targetFaction.name} patrol reports point to covert surveillance activity tied to ${spyFaction.name}. Command is treating the movement as a precursor to a larger operation unless disproven.`,
              type: 'faction_conflict',
              severity: 'warning',
              faction_id: targetFaction.id,
              is_active: true,
            }, [
              buildSourceRef('faction', spyFaction.id),
              buildSourceRef('faction', targetFaction.id),
            ]);

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
            }, [
              buildSourceRef('faction', spyFaction.id),
              buildSourceRef('faction', targetFaction.id),
            ]);

            actions.push({ type: 'espionage', spy: spyFaction.name, target: targetFaction.name, tension });
            continue;
          }

          const raiderFaction = powerA.score > powerB.score ? factionA : factionB;
          const victimFaction = raiderFaction.id === factionA.id ? factionB : factionA;
          const victimTerritories = sortDeterministic(
            getFactionTerritories(victimFaction.id).filter((territory) => (territory.resources || []).length > 0),
            (territory) => territory.id,
            cycleKey,
            pairKey,
            'raid_target',
          );
          const victimTerritory = victimTerritories[0];
          if (!victimTerritory) {
            continue;
          }

          await createEventOnce({
            title: `RAID ALERT: ${raiderFaction.name} Targets ${victimTerritory.name}`,
            content: `Intelligence reports indicate ${raiderFaction.name} is preparing a resource raid on ${victimTerritory.name}. ${victimFaction.name} has a short window to harden the sector or negotiate pressure off the route.`,
            type: 'faction_conflict',
            severity: 'warning',
            territory_id: victimTerritory.id,
            faction_id: raiderFaction.id,
            is_active: true,
          }, [
            buildSourceRef('territory', victimTerritory.id),
            buildSourceRef('faction', raiderFaction.id),
            buildSourceRef('faction', victimFaction.id),
          ]);

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
          }, [
            buildSourceRef('territory', victimTerritory.id),
            buildSourceRef('faction', raiderFaction.id),
            buildSourceRef('faction', victimFaction.id),
          ]);

          actions.push({ type: 'resource_raid', raider: raiderFaction.name, target: victimTerritory.name, tension });
          continue;
        }

        if (tension < 30 && diplomacyStatus === 'hostile' && diplomacy && deterministicBoolean(0.4, cycleKey, pairKey, 'deescalate')) {
          diplomacy.previous_status = 'hostile';
          diplomacy.status = 'neutral';
          await base44.asServiceRole.entities.Diplomacy.update(diplomacy.id, withProvenance({
            status: 'neutral',
            previous_status: 'hostile',
          }, {
            dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
            sourceRefs: [
              cycleRef,
              buildSourceRef('diplomacy', diplomacy.id),
              buildSourceRef('faction', factionA.id),
              buildSourceRef('faction', factionB.id),
            ],
          }));

          await createEventOnce({
            title: `DETENTE: ${factionA.name} and ${factionB.name} Cool Hostilities`,
            content: `After sustained low-pressure contact, tensions between ${factionA.name} and ${factionB.name} have eased. Diplomatic channels are reopening and field escalation has slowed.`,
            type: 'world_event',
            severity: 'info',
            faction_id: factionA.id,
            is_active: true,
          }, [
            buildSourceRef('faction', factionA.id),
            buildSourceRef('faction', factionB.id),
          ]);

          actions.push({ type: 'de_escalation', factions: [factionA.name, factionB.name], tension });
        }
      }
    }

    const threatLevels = ['minimal', 'low', 'moderate', 'high', 'critical'];
    const contestedTerritories = territories.filter((territory) => territory.status === 'contested');
    for (const territory of contestedTerritories) {
      const currentIndex = threatLevels.indexOf(territory.threat_level || 'moderate');
      if (currentIndex < 0 || currentIndex >= threatLevels.length - 1 || hasSourceRef(territory, cycleRef)) {
        continue;
      }
      if (!deterministicBoolean(0.35, cycleKey, territory.id, 'threat_escalation')) {
        continue;
      }

      const newThreat = threatLevels[currentIndex + 1];
      territory.threat_level = newThreat;
      await base44.asServiceRole.entities.Territory.update(territory.id, withProvenance({
        threat_level: newThreat,
      }, {
        dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
        sourceRefs: [
          cycleRef,
          buildSourceRef('territory', territory.id),
        ],
      }));
      actions.push({ type: 'threat_escalation', territory: territory.name, new_threat: newThreat });
    }

    const unclaimedTerritories = sortDeterministic(
      territories.filter((territory) => !territory.controlling_faction_id && territory.status === 'uncharted'),
      (territory) => territory.id,
      cycleKey,
      'unclaimed',
    );
    if (unclaimedTerritories.length > 0 && deterministicBoolean(0.3, cycleKey, 'power_vacuum')) {
      const targetTerritory = unclaimedTerritories[0];
      const claimantFaction = sortDeterministic(activeFactions, (faction) => faction.id, cycleKey, targetTerritory.id, 'claimant')[0];

      await createIntelOnce({
        title: `LAND GRAB: ${claimantFaction.name} Eyes ${targetTerritory.name}`,
        content: `${claimantFaction.name} scouting patterns have tightened around ${targetTerritory.name} in sector ${targetTerritory.sector}. Analysts assess the zone as a near-term expansion target unless another faction intervenes first.`,
        category: 'faction_intel',
        severity: 'medium',
        source: 'Territorial Analysis Division',
        related_faction_id: claimantFaction.id,
        related_territory_id: targetTerritory.id,
        is_active: true,
        expires_at: new Date(now.getTime() + 24 * 3600000).toISOString(),
      }, [
        buildSourceRef('territory', targetTerritory.id),
        buildSourceRef('faction', claimantFaction.id),
      ]);

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
