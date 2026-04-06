import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  let body;
  try {
    body = await req.json();
  } catch (_) {
    return Response.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { event, data, old_data } = body;
  if (!event || !data) {
    return Response.json({ error: 'Missing event data' }, { status: 400 });
  }

  const entityName = event.entity_name;
  const eventType = event.type;

  // Fetch context
  const [factions, territories, users] = await Promise.all([
    base44.asServiceRole.entities.Faction.filter({}),
    base44.asServiceRole.entities.Territory.filter({}),
    base44.asServiceRole.entities.User.filter({}),
  ]);

  const getFactionName = (id) => factions.find(f => f.id === id)?.name || 'Unknown Faction';
  const getTerritoryName = (id) => territories.find(t => t.id === id)?.name || 'Unknown Zone';
  const getCallsign = (email) => {
    const u = users.find(u => u.email === email);
    return u?.callsign || u?.discord_username || 'an unknown operative';
  };

  // Fetch character profile for the involved player if applicable
  let charContext = '';

  let contextDescription = '';
  let targetPlayerEmail = null;
  let shouldBroadcast = false;
  let shouldNotifyPlayer = false;

  // --- JOB EVENTS ---
  if (entityName === 'Job' && eventType === 'update') {
    const job = data;
    const prevStatus = old_data?.status;
    const factionName = getFactionName(job.faction_id);
    const territoryName = getTerritoryName(job.territory_id);
    const callsign = getCallsign(job.assigned_to);
    targetPlayerEmail = job.assigned_to;

    if (job.status === 'completed' && prevStatus !== 'completed') {
      contextDescription = `MISSION COMPLETED: "${job.title}" (${job.difficulty} ${job.type}) in ${territoryName} for ${factionName}. Operative ${callsign} survived and extracted successfully. Reward: +${job.reward_reputation || 0} reputation.`;
      shouldBroadcast = true;
      shouldNotifyPlayer = true;
    } else if (job.status === 'failed' && prevStatus !== 'failed') {
      contextDescription = `MISSION FAILED: "${job.title}" (${job.difficulty} ${job.type}) in ${territoryName} for ${factionName}. Operative ${callsign} failed to complete the objective. The wasteland claims another.`;
      shouldBroadcast = true;
      shouldNotifyPlayer = true;
    } else if (job.status === 'in_progress' && prevStatus === 'available') {
      contextDescription = `MISSION ACCEPTED: "${job.title}" (${job.difficulty} ${job.type}) in ${territoryName} for ${factionName}. Operative ${callsign} has been dispatched. Godspeed — they'll need it.`;
      shouldBroadcast = true;
      shouldNotifyPlayer = true;
    }
  }

  // --- REPUTATION EVENTS ---
  if (entityName === 'ReputationLog' && eventType === 'create') {
    const log = data;
    const callsign = getCallsign(log.player_email);
    const factionName = getFactionName(log.faction_id);
    targetPlayerEmail = log.player_email;
    const sign = log.delta > 0 ? '+' : '';

    contextDescription = `REPUTATION SHIFT: ${callsign} ${log.delta > 0 ? 'gained favour' : 'lost standing'} with ${factionName} (${sign}${log.delta}). Reason: ${log.reason}.`;
    shouldBroadcast = Math.abs(log.delta) >= 20; // Only broadcast big swings
    shouldNotifyPlayer = true;
  }

  // --- TERRITORY EVENTS ---
  if (entityName === 'Territory' && eventType === 'update') {
    const t = data;
    const oldStatus = old_data?.status;
    const oldFaction = old_data?.controlling_faction_id;
    const newFaction = t.controlling_faction_id;
    const territoryName = t.name || t.sector;

    if (oldFaction !== newFaction && newFaction) {
      contextDescription = `TERRITORY CAPTURED: ${territoryName} (${t.sector}) has fallen to ${getFactionName(newFaction)}${oldFaction ? ` — wrested from ${getFactionName(oldFaction)}` : ''}. Threat level: ${t.threat_level}.`;
      shouldBroadcast = true;
    } else if (oldStatus !== t.status) {
      contextDescription = `TERRITORY ALERT: ${territoryName} (${t.sector}) status changed from ${oldStatus || 'unknown'} to ${t.status}. Threat level: ${t.threat_level}.`;
      shouldBroadcast = t.status === 'contested' || t.status === 'hostile';
    }
  }

  if (!contextDescription) {
    return Response.json({ status: 'skipped', reason: 'No narration trigger matched' });
  }

  // Fetch character profile + origin data for deep narrator flavor
  if (targetPlayerEmail) {
    const [profiles, targetUsers] = await Promise.all([
      base44.asServiceRole.entities.CharacterProfile.filter({ player_email: targetPlayerEmail }, '-created_date', 1),
      base44.asServiceRole.entities.User.filter({ email: targetPlayerEmail }),
    ]);
    if (profiles.length > 0) {
      const cp = profiles[0];
      const targetUser = targetUsers[0];
      const originChoices = targetUser?.origin_choices;
      const originCompiled = targetUser?.origin_compiled;
      
      let originContext = '';
      if (originChoices && originChoices.length > 0) {
        originContext = `\nORIGIN STORY: ${originChoices.map(c => `${c.step}: "${c.label}"`).join(' → ')}`;
        if (originCompiled) {
          originContext += `\nOrigin tags: ${originCompiled.origin_tags?.join(', ') || 'unknown'}`;
          originContext += `\nPrimary skill: ${originCompiled.primary_skill || 'general'}`;
          originContext += `\nFaction loyalty: ${originCompiled.faction_loyalty || 'unaligned'}`;
          originContext += `\nDriving goal: ${originCompiled.goal || 'survival'}`;
          if (originCompiled.weaknesses?.length) originContext += `\nDeep flaws: ${originCompiled.weaknesses.join('; ')}`;
        }
      }
      
      charContext = `\nCHARACTER DOSSIER for ${getCallsign(targetPlayerEmail)}:`;
      charContext += cp.character_name ? `\n- Name: ${cp.character_name}` : '';
      charContext += cp.backstory ? `\n- Backstory: ${cp.backstory}` : '';
      charContext += cp.personality ? `\n- Personality: ${cp.personality}` : '';
      charContext += cp.skills ? `\n- Skills: ${cp.skills}` : '';
      charContext += cp.weaknesses ? `\n- Weaknesses: ${cp.weaknesses}` : '';
      charContext += cp.goals ? `\n- Goals: ${cp.goals}` : '';
      charContext += cp.catchphrase ? `\n- Catchphrase: "${cp.catchphrase}"` : '';
      charContext += cp.appearance ? `\n- Appearance: ${cp.appearance}` : '';
      charContext += cp.primary_skill ? `\n- Primary skill: ${cp.primary_skill}` : '';
      charContext += cp.combat_rating ? `\n- Combat rating: ${cp.combat_rating}/10` : '';
      charContext += originContext;
    }
  }

  // --- GENERATE AI NARRATION ---
  const prompt = `You are GHOST PROTOCOL — the sardonic, dark-humoured AI narrator for DEAD SIGNAL, a post-apocalyptic survival HQ system based on HumanitZ.

EVENT: ${contextDescription}
${charContext ? `${charContext}\n\nIMPORTANT — USE THE CHARACTER'S FULL DOSSIER AND ORIGIN STORY to deeply personalize narration:\n- Reference their backstory events (where they were when the signal died, how they survived, what they lost)\n- Tie the current event to their origin — e.g. if they lost their family and just completed a rescue mission, that's narratively rich\n- Reference their primary skill, weaknesses, and personality in how you describe their actions\n- If they have a catchphrase, work it in naturally\n- Their faction loyalty should color how you frame faction-related events\n- Make the personal message feel like it's written by someone who has READ their file` : ''}

Generate EXACTLY the following JSON response:

1. "broadcast" — A punchy 1-2 sentence world broadcast for ALL players about this event. Write it like a war correspondent mixed with a stand-up comedian who's seen too much. Dark humour, gallows wit, dramatic flair. Reference the operative's callsign if relevant. Keep it under 200 characters.

2. "personal_message" — A direct message to the involved operative (if applicable). Address them by callsign. Be sardonic but encouraging on success, brutally honest on failure. 2-3 sentences max. If no specific operative is involved, set to null.

3. "severity" — One of: "info", "warning", "critical". Match to how dramatic the event is.

Rules:
- NEVER use real names — only callsigns
- Dark humour is mandatory but never cruel — think "war buddy who copes with jokes"
- Reference the specific mission, territory, or faction by name
- Broadcasts should feel like intercepted radio chatter or terminal announcements
- Personal messages should feel like a grizzled AI handler talking to their operative`;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: "object",
      properties: {
        broadcast: { type: "string" },
        personal_message: { type: "string" },
        severity: { type: "string" }
      }
    }
  });

  const actions = [];

  // Create broadcast event visible to all
  if (shouldBroadcast && result.broadcast) {
    actions.push(
      base44.asServiceRole.entities.Event.create({
        title: result.broadcast,
        content: contextDescription,
        type: 'broadcast',
        severity: result.severity || 'info',
        is_active: true,
      })
    );
  }

  // Send personal notification to the involved player
  if (shouldNotifyPlayer && targetPlayerEmail && result.personal_message) {
    actions.push(
      base44.asServiceRole.entities.Notification.create({
        player_email: targetPlayerEmail,
        title: 'GHOST PROTOCOL — Direct Transmission',
        message: result.personal_message,
        type: 'system_alert',
        priority: result.severity === 'critical' ? 'critical' : result.severity === 'warning' ? 'high' : 'normal',
        is_read: false,
      })
    );
  }

  await Promise.all(actions);

  return Response.json({
    status: 'ok',
    broadcast_sent: shouldBroadcast && !!result.broadcast,
    personal_sent: shouldNotifyPlayer && !!result.personal_message,
    narration: result,
  });
});