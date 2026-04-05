import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, treaty_id, ...params } = await req.json();

    // ============ PROPOSE TREATY ============
    if (action === "propose") {
      const { treaty_type, proposer_faction_id, target_faction_id, terms, duration_days } = params;

      // Verify proposer has standing with the faction (trusted+ reputation)
      const reps = await base44.asServiceRole.entities.Reputation.filter({
        player_email: user.email,
        faction_id: proposer_faction_id,
      });
      const rep = reps[0];
      const isAdmin = user.role === 'admin';
      if (!isAdmin && (!rep || !['trusted', 'allied', 'revered'].includes(rep.rank))) {
        return Response.json({ error: 'Insufficient faction standing to propose treaties. You need Trusted rank or higher.' }, { status: 403 });
      }

      // Check no existing active treaty between these factions
      const existing = await base44.asServiceRole.entities.Treaty.filter({});
      const conflict = existing.find(t =>
        ['proposed', 'negotiating', 'accepted'].includes(t.status) &&
        ((t.proposer_faction_id === proposer_faction_id && t.target_faction_id === target_faction_id) ||
         (t.proposer_faction_id === target_faction_id && t.target_faction_id === proposer_faction_id))
      );
      if (conflict) {
        return Response.json({ error: 'An active or pending treaty already exists between these factions.' }, { status: 400 });
      }

      // Generate title
      const [factions] = await Promise.all([
        base44.asServiceRole.entities.Faction.filter({}),
      ]);
      const fA = factions.find(f => f.id === proposer_faction_id);
      const fB = factions.find(f => f.id === target_faction_id);
      const typeLabels = { non_aggression: 'Non-Aggression Pact', trade_pact: 'Trade Pact', alliance: 'Alliance' };
      const title = `${typeLabels[treaty_type]}: ${fA?.name || '?'} — ${fB?.name || '?'}`;

      const treaty = await base44.asServiceRole.entities.Treaty.create({
        title,
        treaty_type,
        proposer_faction_id,
        target_faction_id,
        proposer_email: user.email,
        status: 'proposed',
        terms: terms || '',
        duration_days: duration_days || 7,
        signed_by_proposer: user.email,
      });

      // Notify target faction members
      const targetReps = await base44.asServiceRole.entities.Reputation.filter({ faction_id: target_faction_id });
      const targetLeads = targetReps.filter(r => ['trusted', 'allied', 'revered'].includes(r.rank));
      for (const lead of targetLeads.slice(0, 10)) {
        await base44.asServiceRole.entities.Notification.create({
          player_email: lead.player_email,
          title: `Treaty Proposal from ${fA?.name}`,
          message: `${fA?.name} proposes a ${typeLabels[treaty_type]}. Review and respond in the Diplomacy section.`,
          type: 'system_alert',
          priority: 'high',
          reference_id: treaty.id,
        });
      }

      return Response.json({ status: 'ok', treaty });
    }

    // ============ COUNTER / NEGOTIATE ============
    if (action === "counter") {
      const { counter_terms } = params;
      const treaty = (await base44.asServiceRole.entities.Treaty.filter({})). find(t => t.id === treaty_id);
      if (!treaty) return Response.json({ error: 'Treaty not found' }, { status: 404 });
      if (treaty.status !== 'proposed' && treaty.status !== 'negotiating') {
        return Response.json({ error: 'Treaty is not in a negotiable state' }, { status: 400 });
      }

      // Verify user is from the target faction
      const reps = await base44.asServiceRole.entities.Reputation.filter({
        player_email: user.email,
        faction_id: treaty.target_faction_id,
      });
      const rep = reps[0];
      const isAdmin = user.role === 'admin';
      if (!isAdmin && (!rep || !['trusted', 'allied', 'revered'].includes(rep.rank))) {
        return Response.json({ error: 'Insufficient standing in target faction' }, { status: 403 });
      }

      await base44.asServiceRole.entities.Treaty.update(treaty_id, {
        status: 'negotiating',
        counter_terms,
      });

      return Response.json({ status: 'ok' });
    }

    // ============ ACCEPT / SIGN TREATY ============
    if (action === "accept") {
      const treaties = await base44.asServiceRole.entities.Treaty.filter({});
      const treaty = treaties.find(t => t.id === treaty_id);
      if (!treaty) return Response.json({ error: 'Treaty not found' }, { status: 404 });
      if (!['proposed', 'negotiating'].includes(treaty.status)) {
        return Response.json({ error: 'Treaty cannot be accepted in its current state' }, { status: 400 });
      }

      // Verify user belongs to the target faction
      const reps = await base44.asServiceRole.entities.Reputation.filter({
        player_email: user.email,
        faction_id: treaty.target_faction_id,
      });
      const rep = reps[0];
      const isAdmin = user.role === 'admin';
      if (!isAdmin && (!rep || !['trusted', 'allied', 'revered'].includes(rep.rank))) {
        return Response.json({ error: 'Insufficient standing in target faction' }, { status: 403 });
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + (treaty.duration_days || 7) * 86400000);

      // Calculate commodity and territory effects
      const factions = await base44.asServiceRole.entities.Faction.filter({});
      const territories = await base44.asServiceRole.entities.Territory.filter({});
      const economies = await base44.asServiceRole.entities.FactionEconomy.filter({});

      const fA = factions.find(f => f.id === treaty.proposer_faction_id);
      const fB = factions.find(f => f.id === treaty.target_faction_id);
      const ecoA = economies.find(e => e.faction_id === treaty.proposer_faction_id);
      const ecoB = economies.find(e => e.faction_id === treaty.target_faction_id);

      // Determine shared border territories
      const terrA = territories.filter(t => t.controlling_faction_id === treaty.proposer_faction_id);
      const terrB = territories.filter(t => t.controlling_faction_id === treaty.target_faction_id);

      // Treaty effects on diplomacy entity
      const dipStatusMap = {
        non_aggression: 'ceasefire',
        trade_pact: 'trade_agreement',
        alliance: 'allied',
      };
      const newDipStatus = dipStatusMap[treaty.treaty_type];

      // Update or create diplomacy record
      const diplomacyRecords = await base44.asServiceRole.entities.Diplomacy.filter({});
      const existingDip = diplomacyRecords.find(d =>
        (d.faction_a_id === treaty.proposer_faction_id && d.faction_b_id === treaty.target_faction_id) ||
        (d.faction_a_id === treaty.target_faction_id && d.faction_b_id === treaty.proposer_faction_id)
      );

      if (existingDip) {
        await base44.asServiceRole.entities.Diplomacy.update(existingDip.id, {
          status: newDipStatus,
          previous_status: existingDip.status,
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

      // Calculate commodity effects
      const commodityEffects = [];
      const getProd = (eco) => eco?.resource_production || {};
      const prodA = getProd(ecoA);
      const prodB = getProd(ecoB);
      const resources = [...new Set([...Object.keys(prodA), ...Object.keys(prodB)])];

      for (const res of resources) {
        let mod = 0;
        if (treaty.treaty_type === 'trade_pact') mod = -0.15;
        else if (treaty.treaty_type === 'alliance') mod = -0.20;
        else if (treaty.treaty_type === 'non_aggression') mod = -0.05;
        if (mod !== 0) commodityEffects.push({ resource: res, modifier: mod });
      }

      // Calculate territory security effects
      const territoryEffects = [];
      const allBorderTerr = [...terrA, ...terrB];
      for (const t of allBorderTerr) {
        if (t.status === 'contested' || t.status === 'hostile') {
          let newStatus = t.status;
          if (treaty.treaty_type === 'alliance') newStatus = 'secured';
          else if (treaty.treaty_type === 'non_aggression') newStatus = 'secured';
          else if (treaty.treaty_type === 'trade_pact' && t.status === 'contested') newStatus = 'secured';

          if (newStatus !== t.status) {
            territoryEffects.push({ territory_id: t.id, security_change: newStatus });
            await base44.asServiceRole.entities.Territory.update(t.id, { status: newStatus });
          }
        }
      }

      // Update the treaty record
      await base44.asServiceRole.entities.Treaty.update(treaty_id, {
        status: 'accepted',
        signed_at: now.toISOString(),
        signed_by_target: user.email,
        expires_at: expiresAt.toISOString(),
        commodity_effects: commodityEffects,
        territory_effects: territoryEffects,
      });

      // Trigger commodity price recalculation
      try {
        await base44.asServiceRole.functions.invoke('commodityPriceEngine', {});
      } catch (_) {
        // Non-critical if this fails
      }

      // Create world event
      const typeLabels = { non_aggression: 'Non-Aggression Pact', trade_pact: 'Trade Pact', alliance: 'Alliance' };
      await base44.asServiceRole.entities.Event.create({
        title: `TREATY SIGNED: ${fA?.name} & ${fB?.name} — ${typeLabels[treaty.treaty_type]}`,
        content: `${fA?.name} and ${fB?.name} have signed a formal ${typeLabels[treaty.treaty_type]}. ${commodityEffects.length > 0 ? `Market effects: ${commodityEffects.map(e => `${e.resource} ${e.modifier > 0 ? '+' : ''}${Math.round(e.modifier * 100)}%`).join(', ')}. ` : ''}${territoryEffects.length > 0 ? `${territoryEffects.length} territory/ies security status updated.` : ''}`,
        type: 'world_event',
        severity: treaty.treaty_type === 'alliance' ? 'warning' : 'info',
        is_active: true,
      });

      return Response.json({
        status: 'ok',
        diplomacy_status: newDipStatus,
        commodity_effects: commodityEffects,
        territory_effects: territoryEffects,
      });
    }

    // ============ REJECT TREATY ============
    if (action === "reject") {
      const treaties = await base44.asServiceRole.entities.Treaty.filter({});
      const treaty = treaties.find(t => t.id === treaty_id);
      if (!treaty) return Response.json({ error: 'Treaty not found' }, { status: 404 });

      await base44.asServiceRole.entities.Treaty.update(treaty_id, { status: 'rejected' });

      const factions = await base44.asServiceRole.entities.Faction.filter({});
      const fA = factions.find(f => f.id === treaty.proposer_faction_id);
      const fB = factions.find(f => f.id === treaty.target_faction_id);

      await base44.asServiceRole.entities.Notification.create({
        player_email: treaty.proposer_email,
        title: `Treaty Rejected`,
        message: `${fB?.name} has rejected your treaty proposal.`,
        type: 'system_alert',
        priority: 'high',
      });

      return Response.json({ status: 'ok' });
    }

    // ============ REVOKE TREATY ============
    if (action === "revoke") {
      const treaties = await base44.asServiceRole.entities.Treaty.filter({});
      const treaty = treaties.find(t => t.id === treaty_id);
      if (!treaty) return Response.json({ error: 'Treaty not found' }, { status: 404 });

      // Revert diplomacy to neutral
      const diplomacyRecords = await base44.asServiceRole.entities.Diplomacy.filter({});
      const dip = diplomacyRecords.find(d =>
        (d.faction_a_id === treaty.proposer_faction_id && d.faction_b_id === treaty.target_faction_id) ||
        (d.faction_a_id === treaty.target_faction_id && d.faction_b_id === treaty.proposer_faction_id)
      );
      if (dip) {
        await base44.asServiceRole.entities.Diplomacy.update(dip.id, {
          status: 'neutral',
          previous_status: dip.status,
        });
      }

      await base44.asServiceRole.entities.Treaty.update(treaty_id, { status: 'revoked' });

      try {
        await base44.asServiceRole.functions.invoke('commodityPriceEngine', {});
      } catch (_) {}

      const factions = await base44.asServiceRole.entities.Faction.filter({});
      const fA = factions.find(f => f.id === treaty.proposer_faction_id);
      const fB = factions.find(f => f.id === treaty.target_faction_id);

      await base44.asServiceRole.entities.Event.create({
        title: `TREATY REVOKED: ${fA?.name} — ${fB?.name}`,
        content: `The treaty between ${fA?.name} and ${fB?.name} has been revoked. Diplomatic relations return to neutral.`,
        type: 'faction_conflict',
        severity: 'warning',
        is_active: true,
      });

      return Response.json({ status: 'ok' });
    }

    // ============ LIST TREATIES ============
    if (action === "list") {
      const treaties = await base44.asServiceRole.entities.Treaty.filter({});
      return Response.json({ treaties });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('Treaty engine error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});