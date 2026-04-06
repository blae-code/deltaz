import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const LEADERSHIP_RANKS = new Set(['trusted', 'allied', 'revered']);

const STATUS_LABELS = {
  neutral: 'Neutral',
  allied: 'Allied',
  trade_agreement: 'Trade Agreement',
  ceasefire: 'Ceasefire',
  non_aggression: 'Non-Aggression Pact',
  hostile: 'Hostile',
  war: 'At War',
};

async function getUserFactionAuthority(base44, user, factionId) {
  if (user.role === 'admin') return true;
  const reps = await base44.asServiceRole.entities.Reputation.filter({
    player_email: user.email,
    faction_id: factionId,
  });
  return Boolean(reps[0] && LEADERSHIP_RANKS.has(reps[0].rank));
}

async function notifyFactionMembers(base44, factionId, title, message, priority, referenceId) {
  const reps = await base44.asServiceRole.entities.Reputation.filter({ faction_id: factionId });
  const memberEmails = [...new Set(
    reps
      .filter(r => LEADERSHIP_RANKS.has(r.rank) || r.rank === 'neutral')
      .map(r => r.player_email)
  )];

  // Batch notify — cap at 50 members per faction
  const batch = memberEmails.slice(0, 50).map(email => ({
    player_email: email,
    title,
    message,
    type: 'diplomacy_alert',
    priority,
    is_read: false,
    reference_id: referenceId || '',
  }));

  if (batch.length > 0) {
    await base44.asServiceRole.entities.Notification.bulkCreate(batch);
  }

  return memberEmails.length;
}

async function logDiplomacyEvent(base44, params) {
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
}

function findDiplomacyRecord(records, aId, bId) {
  return records.find(
    r => (r.faction_a_id === aId && r.faction_b_id === bId) ||
         (r.faction_a_id === bId && r.faction_b_id === aId)
  );
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body?.action) {
      return Response.json({ error: 'Action is required' }, { status: 400 });
    }

    const { action, initiator_faction_id, target_faction_id, reason, terms } = body;

    // ===== DECLARE WAR =====
    if (action === 'declare_war') {
      if (!initiator_faction_id || !target_faction_id) {
        return Response.json({ error: 'Both factions are required' }, { status: 400 });
      }
      if (initiator_faction_id === target_faction_id) {
        return Response.json({ error: 'Cannot declare war on yourself' }, { status: 400 });
      }

      const hasAuth = await getUserFactionAuthority(base44, user, initiator_faction_id);
      if (!hasAuth) {
        return Response.json({ error: 'Insufficient faction standing. Need Trusted rank or higher.' }, { status: 403 });
      }

      const [factions, diplomacyRecords] = await Promise.all([
        base44.asServiceRole.entities.Faction.filter({}),
        base44.asServiceRole.entities.Diplomacy.filter({}),
      ]);

      const initiator = factions.find(f => f.id === initiator_faction_id);
      const target = factions.find(f => f.id === target_faction_id);
      if (!initiator || !target) {
        return Response.json({ error: 'Faction not found' }, { status: 404 });
      }

      const existing = findDiplomacyRecord(diplomacyRecords, initiator_faction_id, target_faction_id);
      if (existing?.status === 'war') {
        return Response.json({ error: 'Already at war with this faction' }, { status: 409 });
      }

      const oldStatus = existing?.status || 'neutral';
      const now = new Date().toISOString();

      if (existing) {
        await base44.asServiceRole.entities.Diplomacy.update(existing.id, {
          status: 'war',
          previous_status: oldStatus,
          initiated_by: initiator_faction_id,
          war_declared_at: now,
          war_reason: reason || '',
          terms: '',
          expires_at: '',
        });
      } else {
        await base44.asServiceRole.entities.Diplomacy.create({
          faction_a_id: initiator_faction_id,
          faction_b_id: target_faction_id,
          status: 'war',
          previous_status: 'neutral',
          initiated_by: initiator_faction_id,
          war_declared_at: now,
          war_reason: reason || '',
        });
      }

      // Revoke any active treaties between the factions
      const treaties = await base44.asServiceRole.entities.Treaty.filter({});
      const activeTreaties = treaties.filter(t =>
        t.status === 'accepted' &&
        ((t.proposer_faction_id === initiator_faction_id && t.target_faction_id === target_faction_id) ||
         (t.proposer_faction_id === target_faction_id && t.target_faction_id === initiator_faction_id))
      );
      for (const t of activeTreaties) {
        await base44.asServiceRole.entities.Treaty.update(t.id, { status: 'revoked' });
      }

      // Update contested territories
      const territories = await base44.asServiceRole.entities.Territory.filter({});
      const shared = territories.filter(t =>
        t.controlling_faction_id === initiator_faction_id || t.controlling_faction_id === target_faction_id
      );
      for (const t of shared.filter(t => t.status === 'secured')) {
        await base44.asServiceRole.entities.Territory.update(t.id, { status: 'contested', threat_level: 'high' });
      }

      // Create world event
      await base44.asServiceRole.entities.Event.create({
        title: `⚔ WAR DECLARED: ${initiator.name} vs ${target.name}`,
        content: `${initiator.name} has formally declared war on ${target.name}.${reason ? ` Reason: "${reason}"` : ''} All treaties between the factions have been revoked. Border territories are now contested.`,
        type: 'faction_conflict',
        severity: 'critical',
        is_active: true,
      });

      // Create broadcast
      await base44.asServiceRole.entities.Broadcast.create({
        channel: 'conflict',
        title: `WAR: ${initiator.name} declares war on ${target.name}`,
        content: `ATTENTION ALL OPERATIVES — ${initiator.name} [${initiator.tag}] has declared open war against ${target.name} [${target.tag}].${reason ? ` Stated cause: "${reason}"` : ''} All existing agreements are VOID. Mobilize immediately.`,
        faction_id: initiator_faction_id,
        faction_name: initiator.name,
        faction_color: initiator.color || '#c53030',
        severity: 'emergency',
        is_pinned: true,
        auto_generated: true,
        expires_at: new Date(Date.now() + 72 * 3600000).toISOString(),
      });

      // Notify BOTH factions' members
      const warTitle = `WAR DECLARED: ${initiator.name} vs ${target.name}`;
      const warMessageInit = `Your faction ${initiator.name} has declared war on ${target.name}.${reason ? ` Reason: ${reason}` : ''} All treaties revoked. Prepare for conflict.`;
      const warMessageTarget = `${initiator.name} has declared war on your faction ${target.name}.${reason ? ` Reason: ${reason}` : ''} All treaties revoked. Mobilize defenses.`;

      await Promise.all([
        notifyFactionMembers(base44, initiator_faction_id, warTitle, warMessageInit, 'critical'),
        notifyFactionMembers(base44, target_faction_id, warTitle, warMessageTarget, 'critical'),
      ]);

      // Log the event
      await logDiplomacyEvent(base44, {
        faction_a_id: initiator_faction_id,
        faction_b_id: target_faction_id,
        action: 'war_declared',
        old_status: oldStatus,
        new_status: 'war',
        email: user.email,
        initiator_faction_id,
        description: `${initiator.name} declared war on ${target.name}${reason ? `: ${reason}` : ''}`,
      });

      // Refresh commodity prices
      try { await base44.asServiceRole.functions.invoke('commodityPriceEngine', {}); } catch (_) {}

      return Response.json({ status: 'ok', revoked_treaties: activeTreaties.length });
    }

    // ===== PROPOSE CEASEFIRE =====
    if (action === 'propose_ceasefire') {
      if (!initiator_faction_id || !target_faction_id) {
        return Response.json({ error: 'Both factions are required' }, { status: 400 });
      }

      const hasAuth = await getUserFactionAuthority(base44, user, initiator_faction_id);
      if (!hasAuth) {
        return Response.json({ error: 'Insufficient faction standing' }, { status: 403 });
      }

      const [factions, diplomacyRecords] = await Promise.all([
        base44.asServiceRole.entities.Faction.filter({}),
        base44.asServiceRole.entities.Diplomacy.filter({}),
      ]);

      const initiator = factions.find(f => f.id === initiator_faction_id);
      const target = factions.find(f => f.id === target_faction_id);
      const existing = findDiplomacyRecord(diplomacyRecords, initiator_faction_id, target_faction_id);

      if (!existing || (existing.status !== 'war' && existing.status !== 'hostile')) {
        return Response.json({ error: 'Ceasefire can only be proposed during war or hostility' }, { status: 400 });
      }

      const oldStatus = existing.status;
      await base44.asServiceRole.entities.Diplomacy.update(existing.id, {
        status: 'ceasefire',
        previous_status: oldStatus,
        initiated_by: initiator_faction_id,
        terms: terms || 'Ceasefire agreement — hostilities suspended.',
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      });

      await base44.asServiceRole.entities.Event.create({
        title: `CEASEFIRE: ${initiator.name} & ${target.name}`,
        content: `${initiator.name} and ${target.name} have agreed to a ceasefire.${terms ? ` Terms: "${terms}"` : ''} Hostilities are suspended for 7 days.`,
        type: 'world_event',
        severity: 'warning',
        is_active: true,
      });

      const cfTitle = `CEASEFIRE: ${initiator.name} — ${target.name}`;
      const cfMsg = `A ceasefire has been signed between ${initiator.name} and ${target.name}. Hostilities suspended for 7 days.`;
      await Promise.all([
        notifyFactionMembers(base44, initiator_faction_id, cfTitle, cfMsg, 'high'),
        notifyFactionMembers(base44, target_faction_id, cfTitle, cfMsg, 'high'),
      ]);

      await logDiplomacyEvent(base44, {
        faction_a_id: initiator_faction_id,
        faction_b_id: target_faction_id,
        action: 'ceasefire_signed',
        old_status: oldStatus,
        new_status: 'ceasefire',
        email: user.email,
        initiator_faction_id,
        description: `Ceasefire between ${initiator.name} and ${target.name}`,
      });

      return Response.json({ status: 'ok' });
    }

    // ===== SET HOSTILE =====
    if (action === 'set_hostile') {
      if (!initiator_faction_id || !target_faction_id) {
        return Response.json({ error: 'Both factions are required' }, { status: 400 });
      }

      const hasAuth = await getUserFactionAuthority(base44, user, initiator_faction_id);
      if (!hasAuth) {
        return Response.json({ error: 'Insufficient faction standing' }, { status: 403 });
      }

      const [factions, diplomacyRecords] = await Promise.all([
        base44.asServiceRole.entities.Faction.filter({}),
        base44.asServiceRole.entities.Diplomacy.filter({}),
      ]);

      const initiator = factions.find(f => f.id === initiator_faction_id);
      const target = factions.find(f => f.id === target_faction_id);
      const existing = findDiplomacyRecord(diplomacyRecords, initiator_faction_id, target_faction_id);
      const oldStatus = existing?.status || 'neutral';

      if (existing) {
        await base44.asServiceRole.entities.Diplomacy.update(existing.id, {
          status: 'hostile',
          previous_status: oldStatus,
          initiated_by: initiator_faction_id,
          terms: reason || '',
        });
      } else {
        await base44.asServiceRole.entities.Diplomacy.create({
          faction_a_id: initiator_faction_id,
          faction_b_id: target_faction_id,
          status: 'hostile',
          previous_status: 'neutral',
          initiated_by: initiator_faction_id,
          terms: reason || '',
        });
      }

      const hostTitle = `HOSTILITY: ${initiator.name} → ${target.name}`;
      const hostMsg = `${initiator.name} has declared hostility against ${target.name}.${reason ? ` Reason: ${reason}` : ''}`;
      await Promise.all([
        notifyFactionMembers(base44, initiator_faction_id, hostTitle, hostMsg, 'high'),
        notifyFactionMembers(base44, target_faction_id, hostTitle, hostMsg, 'high'),
      ]);

      await logDiplomacyEvent(base44, {
        faction_a_id: initiator_faction_id,
        faction_b_id: target_faction_id,
        action: 'status_changed',
        old_status: oldStatus,
        new_status: 'hostile',
        email: user.email,
        initiator_faction_id,
        description: `${initiator.name} declared hostility against ${target.name}`,
      });

      return Response.json({ status: 'ok' });
    }

    // ===== NORMALIZE (reset to neutral) =====
    if (action === 'normalize') {
      if (!initiator_faction_id || !target_faction_id) {
        return Response.json({ error: 'Both factions are required' }, { status: 400 });
      }

      // Only admin or both factions' leaders can normalize
      const hasAuthA = await getUserFactionAuthority(base44, user, initiator_faction_id);
      const hasAuthB = await getUserFactionAuthority(base44, user, target_faction_id);
      if (!hasAuthA && !hasAuthB) {
        return Response.json({ error: 'Insufficient standing' }, { status: 403 });
      }

      const [factions, diplomacyRecords] = await Promise.all([
        base44.asServiceRole.entities.Faction.filter({}),
        base44.asServiceRole.entities.Diplomacy.filter({}),
      ]);

      const initiator = factions.find(f => f.id === initiator_faction_id);
      const target = factions.find(f => f.id === target_faction_id);
      const existing = findDiplomacyRecord(diplomacyRecords, initiator_faction_id, target_faction_id);

      if (!existing) {
        return Response.json({ status: 'ok', message: 'Already neutral' });
      }

      const oldStatus = existing.status;
      await base44.asServiceRole.entities.Diplomacy.update(existing.id, {
        status: 'neutral',
        previous_status: oldStatus,
        terms: '',
        war_reason: '',
        war_declared_at: '',
        expires_at: '',
      });

      const normTitle = `Relations Normalized: ${initiator.name} — ${target.name}`;
      const normMsg = `Diplomatic relations between ${initiator.name} and ${target.name} have been reset to neutral.`;
      await Promise.all([
        notifyFactionMembers(base44, initiator_faction_id, normTitle, normMsg, 'normal'),
        notifyFactionMembers(base44, target_faction_id, normTitle, normMsg, 'normal'),
      ]);

      await logDiplomacyEvent(base44, {
        faction_a_id: initiator_faction_id,
        faction_b_id: target_faction_id,
        action: 'status_changed',
        old_status: oldStatus,
        new_status: 'neutral',
        email: user.email,
        initiator_faction_id,
        description: `Relations between ${initiator.name} and ${target.name} normalized`,
      });

      return Response.json({ status: 'ok' });
    }

    // ===== GET DIPLOMACY HISTORY =====
    if (action === 'history') {
      const { faction_a_id, faction_b_id } = body;
      let logs;
      if (faction_a_id && faction_b_id) {
        const all = await base44.asServiceRole.entities.DiplomacyLog.filter({}, '-created_date', 200);
        logs = all.filter(l =>
          (l.faction_a_id === faction_a_id && l.faction_b_id === faction_b_id) ||
          (l.faction_a_id === faction_b_id && l.faction_b_id === faction_a_id)
        );
      } else {
        logs = await base44.asServiceRole.entities.DiplomacyLog.filter({}, '-created_date', 50);
      }
      return Response.json({ logs });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('Diplomacy actions error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});