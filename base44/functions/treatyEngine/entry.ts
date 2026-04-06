import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const LEADERSHIP_RANKS = new Set(['trusted', 'allied', 'revered']);
const NEGOTIABLE_STATUSES = new Set(['proposed', 'negotiating']);
const ACTIVE_TREATY_STATUSES = new Set(['proposed', 'negotiating', 'accepted']);
const TREATY_LABELS = {
  non_aggression: 'Non-Aggression Pact',
  trade_pact: 'Trade Pact',
  alliance: 'Alliance',
};
const DIPLOMACY_STATUS_BY_TREATY = {
  non_aggression: 'ceasefire',
  trade_pact: 'trade_agreement',
  alliance: 'allied',
};

const clampDurationDays = (value) => {
  const parsed = Number.parseInt(String(value ?? 7), 10);
  if (!Number.isFinite(parsed)) {
    return 7;
  }
  return Math.max(1, Math.min(30, parsed));
};

const normalizeText = (value, maxLength = 2000) =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

const getTreaties = (base44) => base44.asServiceRole.entities.Treaty.filter({});
const getFactions = (base44) => base44.asServiceRole.entities.Faction.filter({});
const getDiplomacy = (base44) => base44.asServiceRole.entities.Diplomacy.filter({});

const findTreatyById = (treaties, treatyId) => treaties.find((treaty) => treaty.id === treatyId);

const findDiplomacyRecord = (records, factionAId, factionBId) =>
  records.find(
    (record) =>
      (record.faction_a_id === factionAId && record.faction_b_id === factionBId) ||
      (record.faction_a_id === factionBId && record.faction_b_id === factionAId),
  );

const userHasFactionAuthority = async (base44, user, factionId) => {
  if (user.role === 'admin') {
    return true;
  }

  const reps = await base44.asServiceRole.entities.Reputation.filter({
    player_email: user.email,
    faction_id: factionId,
  });

  return Boolean(reps[0] && LEADERSHIP_RANKS.has(reps[0].rank));
};

const invokeCommodityRefresh = async (base44) => {
  try {
    await base44.asServiceRole.functions.invoke('commodityPriceEngine', {});
  } catch (error) {
    console.error('Treaty commodity refresh failed:', error);
  }
};

const notifyAllFactionMembers = async (base44, factionId, title, message, priority, referenceId) => {
  const reps = await base44.asServiceRole.entities.Reputation.filter({ faction_id: factionId });
  const emails = [...new Set(reps.map(r => r.player_email))];
  const batch = emails.slice(0, 50).map(email => ({
    player_email: email,
    title,
    message,
    type: 'diplomacy_alert',
    priority: priority || 'high',
    is_read: false,
    reference_id: referenceId || '',
  }));
  if (batch.length > 0) {
    await base44.asServiceRole.entities.Notification.bulkCreate(batch);
  }
};

const logDiplomacyEvent = async (base44, params) => {
  await base44.asServiceRole.entities.DiplomacyLog.create({
    faction_a_id: params.faction_a_id,
    faction_b_id: params.faction_b_id,
    action: params.action,
    old_status: params.old_status || '',
    new_status: params.new_status || '',
    initiated_by_email: params.email || '',
    initiated_by_faction_id: params.initiator_faction_id || '',
    description: params.description || '',
    treaty_id: params.treaty_id || '',
  });
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const action = typeof body.action === 'string' ? body.action.trim() : '';
    const treaty_id = typeof body.treaty_id === 'string' ? body.treaty_id : '';

    if (!action) {
      return Response.json({ error: 'Action is required' }, { status: 400 });
    }

    if (action === 'propose') {
      const treaty_type = typeof body.treaty_type === 'string' ? body.treaty_type : '';
      const proposer_faction_id = typeof body.proposer_faction_id === 'string' ? body.proposer_faction_id : '';
      const target_faction_id = typeof body.target_faction_id === 'string' ? body.target_faction_id : '';
      const terms = normalizeText(body.terms);
      const duration_days = clampDurationDays(body.duration_days);

      if (!Object.hasOwn(TREATY_LABELS, treaty_type)) {
        return Response.json({ error: 'Invalid treaty type' }, { status: 400 });
      }
      if (!proposer_faction_id || !target_faction_id) {
        return Response.json({ error: 'Both proposer and target factions are required' }, { status: 400 });
      }
      if (proposer_faction_id === target_faction_id) {
        return Response.json({ error: 'A faction cannot propose a treaty to itself' }, { status: 400 });
      }

      const [treaties, factions] = await Promise.all([getTreaties(base44), getFactions(base44)]);
      const proposerFaction = factions.find((faction) => faction.id === proposer_faction_id);
      const targetFaction = factions.find((faction) => faction.id === target_faction_id);
      if (!proposerFaction || !targetFaction) {
        return Response.json({ error: 'Faction not found' }, { status: 404 });
      }
      if (proposerFaction.status !== 'active' || targetFaction.status !== 'active') {
        return Response.json({ error: 'Treaties can only involve active factions' }, { status: 400 });
      }

      const canPropose = await userHasFactionAuthority(base44, user, proposer_faction_id);
      if (!canPropose) {
        return Response.json(
          { error: 'Insufficient faction standing to propose treaties. You need Trusted rank or higher.' },
          { status: 403 },
        );
      }

      const conflict = treaties.find(
        (treaty) =>
          ACTIVE_TREATY_STATUSES.has(treaty.status) &&
          ((treaty.proposer_faction_id === proposer_faction_id && treaty.target_faction_id === target_faction_id) ||
            (treaty.proposer_faction_id === target_faction_id && treaty.target_faction_id === proposer_faction_id)),
      );
      if (conflict) {
        return Response.json(
          { error: 'An active or pending treaty already exists between these factions.' },
          { status: 409 },
        );
      }

      const title = `${TREATY_LABELS[treaty_type]}: ${proposerFaction.name} — ${targetFaction.name}`;
      const treaty = await base44.asServiceRole.entities.Treaty.create({
        title,
        treaty_type,
        proposer_faction_id,
        target_faction_id,
        proposer_email: user.email,
        status: 'proposed',
        terms,
        duration_days,
        signed_by_proposer: user.email,
      });

      // Notify target faction leaders
      const targetReps = await base44.asServiceRole.entities.Reputation.filter({ faction_id: target_faction_id });
      const targetLeads = targetReps.filter((rep) => LEADERSHIP_RANKS.has(rep.rank));
      for (const lead of targetLeads.slice(0, 10)) {
        await base44.asServiceRole.entities.Notification.create({
          player_email: lead.player_email,
          title: `Treaty Proposal from ${proposerFaction.name}`,
          message: `${proposerFaction.name} proposes a ${TREATY_LABELS[treaty_type]}. Review and respond in the Diplomacy section.`,
          type: 'diplomacy_alert',
          priority: 'high',
          is_read: false,
          reference_id: treaty.id,
        });
      }

      // Log the proposal
      await logDiplomacyEvent(base44, {
        faction_a_id: proposer_faction_id,
        faction_b_id: target_faction_id,
        action: 'treaty_proposed',
        old_status: '',
        new_status: 'proposed',
        email: user.email,
        initiator_faction_id: proposer_faction_id,
        description: `${proposerFaction.name} proposed a ${TREATY_LABELS[treaty_type]} to ${targetFaction.name}`,
        treaty_id: treaty.id,
      });

      return Response.json({ status: 'ok', treaty });
    }

    if (action === 'counter') {
      const counter_terms = normalizeText(body.counter_terms);
      if (!treaty_id) {
        return Response.json({ error: 'treaty_id is required' }, { status: 400 });
      }
      if (!counter_terms) {
        return Response.json({ error: 'Counter terms are required' }, { status: 400 });
      }

      const treaties = await getTreaties(base44);
      const treaty = findTreatyById(treaties, treaty_id);
      if (!treaty) return Response.json({ error: 'Treaty not found' }, { status: 404 });
      if (!NEGOTIABLE_STATUSES.has(treaty.status)) {
        return Response.json({ error: 'Treaty is not in a negotiable state' }, { status: 400 });
      }

      const canCounter = await userHasFactionAuthority(base44, user, treaty.target_faction_id);
      if (!canCounter) {
        return Response.json({ error: 'Insufficient standing in target faction' }, { status: 403 });
      }

      await base44.asServiceRole.entities.Treaty.update(treaty_id, {
        status: 'negotiating',
        counter_terms,
      });

      await base44.asServiceRole.entities.Notification.create({
        player_email: treaty.proposer_email,
        title: 'Treaty Counter-Proposal Received',
        message: 'The target faction has responded with counter-terms. Review the proposal in Diplomacy.',
        type: 'system_alert',
        priority: 'high',
        is_read: false,
        reference_id: treaty.id,
      });

      return Response.json({ status: 'ok' });
    }

    if (action === 'accept') {
      if (!treaty_id) {
        return Response.json({ error: 'treaty_id is required' }, { status: 400 });
      }

      const [treaties, factions, territories, economies, diplomacyRecords] = await Promise.all([
        getTreaties(base44),
        getFactions(base44),
        base44.asServiceRole.entities.Territory.filter({}),
        base44.asServiceRole.entities.FactionEconomy.filter({}),
        getDiplomacy(base44),
      ]);

      const treaty = findTreatyById(treaties, treaty_id);
      if (!treaty) return Response.json({ error: 'Treaty not found' }, { status: 404 });
      if (!NEGOTIABLE_STATUSES.has(treaty.status)) {
        return Response.json({ error: 'Treaty cannot be accepted in its current state' }, { status: 400 });
      }

      const canAccept = await userHasFactionAuthority(base44, user, treaty.target_faction_id);
      if (!canAccept) {
        return Response.json({ error: 'Insufficient standing in target faction' }, { status: 403 });
      }

      const proposerFaction = factions.find((faction) => faction.id === treaty.proposer_faction_id);
      const targetFaction = factions.find((faction) => faction.id === treaty.target_faction_id);
      if (!proposerFaction || !targetFaction) {
        return Response.json({ error: 'Faction not found' }, { status: 404 });
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + clampDurationDays(treaty.duration_days) * 86400000);
      const newDipStatus = DIPLOMACY_STATUS_BY_TREATY[treaty.treaty_type];
      const existingDip = findDiplomacyRecord(diplomacyRecords, treaty.proposer_faction_id, treaty.target_faction_id);

      if (existingDip) {
        await base44.asServiceRole.entities.Diplomacy.update(existingDip.id, {
          status: newDipStatus,
          previous_status: existingDip.status || 'neutral',
          terms: treaty.counter_terms || treaty.terms || '',
          initiated_by: treaty.proposer_faction_id,
          expires_at: expiresAt.toISOString(),
        });
      } else {
        await base44.asServiceRole.entities.Diplomacy.create({
          faction_a_id: treaty.proposer_faction_id,
          faction_b_id: treaty.target_faction_id,
          status: newDipStatus,
          previous_status: 'neutral',
          terms: treaty.counter_terms || treaty.terms || '',
          initiated_by: treaty.proposer_faction_id,
          expires_at: expiresAt.toISOString(),
        });
      }

      const ecoA = economies.find((economy) => economy.faction_id === treaty.proposer_faction_id);
      const ecoB = economies.find((economy) => economy.faction_id === treaty.target_faction_id);
      const prodA = ecoA?.resource_production || {};
      const prodB = ecoB?.resource_production || {};
      const resources = [...new Set([...Object.keys(prodA), ...Object.keys(prodB)])];

      const commodityEffects = resources
        .map((resource) => {
          let modifier = 0;
          if (treaty.treaty_type === 'trade_pact') modifier = -0.15;
          else if (treaty.treaty_type === 'alliance') modifier = -0.2;
          else if (treaty.treaty_type === 'non_aggression') modifier = -0.05;
          return modifier === 0 ? null : { resource, modifier };
        })
        .filter(Boolean);

      const territoryEffects = [];
      const affectedTerritories = territories.filter(
        (territory) =>
          (territory.controlling_faction_id === treaty.proposer_faction_id ||
            territory.controlling_faction_id === treaty.target_faction_id) &&
          (territory.status === 'contested' || territory.status === 'hostile'),
      );

      for (const territory of affectedTerritories) {
        let nextStatus = territory.status;
        if (treaty.treaty_type === 'alliance') nextStatus = 'secured';
        else if (treaty.treaty_type === 'non_aggression') nextStatus = 'secured';
        else if (treaty.treaty_type === 'trade_pact' && territory.status === 'contested') nextStatus = 'secured';

        if (nextStatus !== territory.status) {
          territoryEffects.push({
            territory_id: territory.id,
            previous_status: territory.status,
            security_change: nextStatus,
          });
          await base44.asServiceRole.entities.Territory.update(territory.id, { status: nextStatus });
        }
      }

      await base44.asServiceRole.entities.Treaty.update(treaty_id, {
        status: 'accepted',
        signed_at: now.toISOString(),
        signed_by_target: user.email,
        expires_at: expiresAt.toISOString(),
        commodity_effects: commodityEffects,
        territory_effects: territoryEffects,
      });

      await invokeCommodityRefresh(base44);

      // Notify ALL members of both factions
      const acceptTitle = `TREATY SIGNED: ${proposerFaction.name} & ${targetFaction.name}`;
      const acceptMsgA = `Your faction's ${TREATY_LABELS[treaty.treaty_type]} with ${targetFaction.name} has been signed! ${commodityEffects.length > 0 ? 'Market effects are now active.' : ''}`;
      const acceptMsgB = `${proposerFaction.name}'s ${TREATY_LABELS[treaty.treaty_type]} with your faction has been signed! ${commodityEffects.length > 0 ? 'Market effects are now active.' : ''}`;
      await Promise.all([
        notifyAllFactionMembers(base44, treaty.proposer_faction_id, acceptTitle, acceptMsgA, 'high', treaty.id),
        notifyAllFactionMembers(base44, treaty.target_faction_id, acceptTitle, acceptMsgB, 'high', treaty.id),
      ]);

      await base44.asServiceRole.entities.Event.create({
        title: `TREATY SIGNED: ${proposerFaction.name} & ${targetFaction.name} — ${TREATY_LABELS[treaty.treaty_type]}`,
        content: `${proposerFaction.name} and ${targetFaction.name} have signed a formal ${TREATY_LABELS[treaty.treaty_type]}. ${commodityEffects.length > 0 ? `Market effects: ${commodityEffects.map((effect) => `${effect.resource} ${effect.modifier > 0 ? '+' : ''}${Math.round(effect.modifier * 100)}%`).join(', ')}. ` : ''}${territoryEffects.length > 0 ? `${territoryEffects.length} territory/ies security status updated.` : ''}`,
        type: 'world_event',
        severity: treaty.treaty_type === 'alliance' ? 'warning' : 'info',
        is_active: true,
      });

      // Log the event
      await logDiplomacyEvent(base44, {
        faction_a_id: treaty.proposer_faction_id,
        faction_b_id: treaty.target_faction_id,
        action: treaty.treaty_type === 'alliance' ? 'alliance_formed' : treaty.treaty_type === 'non_aggression' ? 'non_aggression_signed' : 'treaty_accepted',
        old_status: existingDip?.status || 'neutral',
        new_status: newDipStatus,
        email: user.email,
        initiator_faction_id: treaty.target_faction_id,
        description: `${TREATY_LABELS[treaty.treaty_type]} between ${proposerFaction.name} and ${targetFaction.name} signed`,
        treaty_id: treaty.id,
      });

      return Response.json({
        status: 'ok',
        diplomacy_status: newDipStatus,
        commodity_effects: commodityEffects,
        territory_effects: territoryEffects,
      });
    }

    if (action === 'reject') {
      if (!treaty_id) {
        return Response.json({ error: 'treaty_id is required' }, { status: 400 });
      }

      const [treaties, factions] = await Promise.all([getTreaties(base44), getFactions(base44)]);
      const treaty = findTreatyById(treaties, treaty_id);
      if (!treaty) return Response.json({ error: 'Treaty not found' }, { status: 404 });
      if (!NEGOTIABLE_STATUSES.has(treaty.status)) {
        return Response.json({ error: 'Treaty cannot be rejected in its current state' }, { status: 400 });
      }

      const canReject = await userHasFactionAuthority(base44, user, treaty.target_faction_id);
      if (!canReject) {
        return Response.json({ error: 'Insufficient standing in target faction' }, { status: 403 });
      }

      await base44.asServiceRole.entities.Treaty.update(treaty_id, { status: 'rejected' });

      const proposerFactionRej = factions.find((faction) => faction.id === treaty.proposer_faction_id);
      const targetFaction = factions.find((faction) => faction.id === treaty.target_faction_id);

      // Notify proposer faction members
      await notifyAllFactionMembers(
        base44,
        treaty.proposer_faction_id,
        'Treaty Rejected',
        `${targetFaction?.name || 'The target faction'} has rejected your faction's treaty proposal.`,
        'high',
        treaty.id
      );

      // Log the rejection
      await logDiplomacyEvent(base44, {
        faction_a_id: treaty.proposer_faction_id,
        faction_b_id: treaty.target_faction_id,
        action: 'treaty_rejected',
        old_status: treaty.status,
        new_status: 'rejected',
        email: user.email,
        initiator_faction_id: treaty.target_faction_id,
        description: `${targetFaction?.name} rejected ${proposerFactionRej?.name}'s treaty proposal`,
        treaty_id: treaty.id,
      });

      return Response.json({ status: 'ok' });
    }

    if (action === 'revoke') {
      if (!treaty_id) {
        return Response.json({ error: 'treaty_id is required' }, { status: 400 });
      }

      const [treaties, factions, diplomacyRecords] = await Promise.all([
        getTreaties(base44),
        getFactions(base44),
        getDiplomacy(base44),
      ]);
      const treaty = findTreatyById(treaties, treaty_id);
      if (!treaty) return Response.json({ error: 'Treaty not found' }, { status: 404 });
      if (treaty.status !== 'accepted') {
        return Response.json({ error: 'Only accepted treaties can be revoked' }, { status: 400 });
      }

      const canRevokeProposer = await userHasFactionAuthority(base44, user, treaty.proposer_faction_id);
      const canRevokeTarget = await userHasFactionAuthority(base44, user, treaty.target_faction_id);
      if (!canRevokeProposer && !canRevokeTarget) {
        return Response.json({ error: 'Insufficient faction standing to revoke this treaty' }, { status: 403 });
      }

      const dip = findDiplomacyRecord(diplomacyRecords, treaty.proposer_faction_id, treaty.target_faction_id);
      if (dip) {
        await base44.asServiceRole.entities.Diplomacy.update(dip.id, {
          status: dip.previous_status || 'neutral',
          previous_status: dip.status || 'neutral',
        });
      }

      for (const effect of treaty.territory_effects || []) {
        if (!effect?.territory_id || !effect?.previous_status) continue;
        await base44.asServiceRole.entities.Territory.update(effect.territory_id, {
          status: effect.previous_status,
        });
      }

      await base44.asServiceRole.entities.Treaty.update(treaty_id, { status: 'revoked' });
      await invokeCommodityRefresh(base44);

      const proposerFaction = factions.find((faction) => faction.id === treaty.proposer_faction_id);
      const targetFaction = factions.find((faction) => faction.id === treaty.target_faction_id);

      await base44.asServiceRole.entities.Event.create({
        title: `TREATY REVOKED: ${proposerFaction?.name} — ${targetFaction?.name}`,
        content: `The treaty between ${proposerFaction?.name} and ${targetFaction?.name} has been revoked. Diplomatic relations were reverted.`,
        type: 'faction_conflict',
        severity: 'warning',
        is_active: true,
      });

      // Notify ALL members of both factions
      const revokeTitle = `TREATY REVOKED: ${proposerFaction?.name} — ${targetFaction?.name}`;
      const revokeMsg = `The treaty between ${proposerFaction?.name} and ${targetFaction?.name} has been revoked. Diplomatic relations reverted to ${dip?.previous_status || 'neutral'}.`;
      await Promise.all([
        notifyAllFactionMembers(base44, treaty.proposer_faction_id, revokeTitle, revokeMsg, 'high', treaty.id),
        notifyAllFactionMembers(base44, treaty.target_faction_id, revokeTitle, revokeMsg, 'high', treaty.id),
      ]);

      // Log the revocation
      await logDiplomacyEvent(base44, {
        faction_a_id: treaty.proposer_faction_id,
        faction_b_id: treaty.target_faction_id,
        action: 'treaty_revoked',
        old_status: 'accepted',
        new_status: dip?.previous_status || 'neutral',
        email: user.email,
        initiator_faction_id: user.email === treaty.proposer_email ? treaty.proposer_faction_id : treaty.target_faction_id,
        description: `Treaty between ${proposerFaction?.name} and ${targetFaction?.name} revoked`,
        treaty_id: treaty.id,
      });

      return Response.json({ status: 'ok' });
    }

    if (action === 'list') {
      const treaties = await base44.asServiceRole.entities.Treaty.filter({}, '-created_date', 200);
      return Response.json({ treaties });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('Treaty engine error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});