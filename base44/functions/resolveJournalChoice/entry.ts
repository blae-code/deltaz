import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { entry_id, choice_id } = body;

  if (!entry_id || !choice_id) {
    return Response.json({ error: 'Missing entry_id or choice_id' }, { status: 400 });
  }

  const entries = await base44.entities.JournalEntry.filter({ id: entry_id });
  const entry = entries[0];

  if (!entry || entry.player_email !== user.email) {
    return Response.json({ error: 'Entry not found' }, { status: 404 });
  }

  if (entry.status === 'resolved') {
    return Response.json({ error: 'Already resolved' }, { status: 400 });
  }

  const pendingChoices = user.pending_journal_choices || {};
  const choiceData = pendingChoices[entry_id];
  const selectedChoice = choiceData?.find(c => c.id === choice_id);

  if (!selectedChoice) {
    return Response.json({ error: 'Invalid choice' }, { status: 400 });
  }

  // Gather world context
  const [charProfiles, factions, territories, recentIntel] = await Promise.all([
    base44.asServiceRole.entities.CharacterProfile.filter({ player_email: user.email }, '-created_date', 1),
    base44.asServiceRole.entities.Faction.filter({}),
    base44.asServiceRole.entities.Territory.filter({}),
    base44.asServiceRole.entities.IntelFeed.filter({ is_active: true }, '-created_date', 5),
  ]);

  const charProfile = charProfiles[0];
  const relFaction = factions.find(f => f.id === entry.related_faction_id);
  const relTerritory = territories.find(t => t.id === entry.related_territory_id);
  const pastConsequences = (user.journal_consequence_tags || []).slice(-20);

  // Generate outcome, world effects, and potential follow-up event
  const outcomePrompt = `You are the GHOST PROTOCOL narrative engine for DEAD SIGNAL, a post-apocalyptic survival game.

The operative "${user.callsign || 'Unknown'}" faced this event:
"${entry.title}" — ${entry.narrative}

They chose: "${selectedChoice.label}"
Expected effect: ${selectedChoice.effect_description || 'unknown'}

${charProfile ? `Character: ${charProfile.character_name || user.callsign}\nBackstory: ${(charProfile.backstory || '').substring(0, 300)}\nPersonality: ${charProfile.personality || ''}\nWeaknesses: ${charProfile.weaknesses || ''}` : ''}

Related faction: ${relFaction?.name || 'None'} [${relFaction?.tag || ''}]
Related territory: ${relTerritory?.name || 'None'} (sector ${relTerritory?.sector || '??'}, threat: ${relTerritory?.threat_level || '??'})
Previous consequence history: ${pastConsequences.join(', ') || 'None'}

Generate a structured response with:
1. An atmospheric 2-3 sentence outcome narrative
2. World effects — real consequences that change the game world (intel reports, territory threat changes, faction tensions)
3. Consequence tags — short tags tracking long-term story threads
4. A potential follow-up event that branches from this choice (set has_followup to true if dramatic enough to warrant one, false for minor outcomes)
5. If has_followup, generate a complete follow-up event with 3 new choices that reference the consequence

CRITICAL: World effects should be tangible — create intel that other players can see, shift territory threat levels, etc.`;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: outcomePrompt,
    response_json_schema: {
      type: "object",
      properties: {
        outcome: { type: "string" },
        world_effects: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string", description: "intel_report | territory_shift | faction_alert | broadcast" },
              title: { type: "string" },
              content: { type: "string" },
              severity: { type: "string" }
            }
          }
        },
        consequence_tags: { type: "array", items: { type: "string" } },
        has_followup: { type: "boolean" },
        followup_event: {
          type: "object",
          properties: {
            title: { type: "string" },
            narrative: { type: "string" },
            category: { type: "string" },
            choices: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  label: { type: "string" },
                  effect_description: { type: "string" },
                  reputation_delta: { type: "number" },
                  outcome_narrative: { type: "string" }
                }
              }
            }
          }
        }
      }
    }
  });

  // --- Apply reputation effect ---
  const repDelta = selectedChoice.reputation_delta || 0;
  let repEffect = null;

  if (repDelta !== 0 && entry.related_faction_id) {
    repEffect = { faction_id: entry.related_faction_id, delta: repDelta };

    const reps = await base44.entities.Reputation.filter({
      player_email: user.email,
      faction_id: entry.related_faction_id,
    });

    if (reps.length > 0) {
      const newScore = (reps[0].score || 0) + repDelta;
      let newRank = reps[0].rank;
      if (newScore >= 100) newRank = 'revered';
      else if (newScore >= 60) newRank = 'allied';
      else if (newScore >= 30) newRank = 'trusted';
      else if (newScore >= 0) newRank = 'neutral';
      else if (newScore >= -30) newRank = 'hostile';
      else newRank = 'enemy';

      await base44.entities.Reputation.update(reps[0].id, { score: newScore, rank: newRank });
    }

    const factionName = relFaction?.name || 'Unknown';
    await base44.entities.ReputationLog.create({
      player_email: user.email,
      faction_id: entry.related_faction_id,
      delta: repDelta,
      reason: `Journal: "${entry.title}" — chose "${selectedChoice.label}"`,
    });
  }

  // --- Apply world effects ---
  const worldEffects = [];
  for (const effect of (result.world_effects || [])) {
    if (effect.type === 'intel_report') {
      const intel = await base44.asServiceRole.entities.IntelFeed.create({
        title: effect.title || `Intel from ${user.callsign || 'operative'}`,
        content: effect.content,
        category: 'rumor',
        severity: effect.severity === 'critical' ? 'critical' : effect.severity === 'high' ? 'high' : 'medium',
        source: `Field report from ${user.callsign || 'Anonymous operative'}`,
        related_faction_id: entry.related_faction_id || '',
        related_territory_id: entry.related_territory_id || '',
        is_active: true,
      });
      worldEffects.push({ type: 'intel_created', description: effect.title, entity_id: intel.id });
    } else if (effect.type === 'territory_shift' && entry.related_territory_id && relTerritory) {
      const threatLevels = ['minimal', 'low', 'moderate', 'high', 'critical'];
      const currentIdx = threatLevels.indexOf(relTerritory.threat_level || 'moderate');
      const shift = effect.severity === 'critical' ? 2 : 1;
      const newIdx = Math.min(Math.max(currentIdx + (effect.content?.includes('stabil') ? -shift : shift), 0), 4);
      await base44.asServiceRole.entities.Territory.update(relTerritory.id, { threat_level: threatLevels[newIdx] });
      worldEffects.push({ type: 'territory_threat_changed', description: `${relTerritory.name} threat → ${threatLevels[newIdx]}`, entity_id: relTerritory.id });
    } else if (effect.type === 'broadcast' || effect.type === 'faction_alert') {
      const evt = await base44.asServiceRole.entities.Event.create({
        title: effect.title || 'Field Report',
        content: effect.content,
        type: effect.type === 'faction_alert' ? 'faction_conflict' : 'broadcast',
        severity: effect.severity === 'critical' ? 'critical' : 'warning',
        territory_id: entry.related_territory_id || '',
        faction_id: entry.related_faction_id || '',
        is_active: true,
      });
      worldEffects.push({ type: 'event_created', description: effect.title, entity_id: evt.id });
    }
  }

  // --- Update journal entry ---
  await base44.entities.JournalEntry.update(entry_id, {
    status: 'resolved',
    chosen: choice_id,
    chosen_label: selectedChoice.label,
    outcome: result.outcome || selectedChoice.outcome_narrative || 'The consequences unfold...',
    reputation_effect: repEffect,
    world_effects: worldEffects,
    consequence_tags: result.consequence_tags || [],
  });

  // --- Store consequence tags on user for future event generation ---
  const allTags = [...(user.journal_consequence_tags || []), ...(result.consequence_tags || [])].slice(-50);
  const updatedPending = { ...(user.pending_journal_choices || {}) };
  delete updatedPending[entry_id];
  await base44.auth.updateMe({
    pending_journal_choices: updatedPending,
    journal_consequence_tags: allTags,
  });

  // --- Create follow-up event if warranted ---
  let followupId = null;
  if (result.has_followup && result.followup_event?.title && (entry.chain_depth || 0) < 3) {
    const validCategories = ['encounter', 'discovery', 'dilemma', 'crisis', 'opportunity'];
    const fCat = validCategories.includes(result.followup_event.category) ? result.followup_event.category : 'encounter';

    const followup = await base44.entities.JournalEntry.create({
      player_email: user.email,
      title: result.followup_event.title,
      narrative: result.followup_event.narrative,
      category: fCat,
      status: 'pending',
      choices: (result.followup_event.choices || []).map(c => ({
        id: c.id,
        label: c.label,
        effect_description: c.effect_description,
      })),
      related_faction_id: entry.related_faction_id || '',
      related_territory_id: entry.related_territory_id || '',
      parent_entry_id: entry_id,
      chain_depth: (entry.chain_depth || 0) + 1,
      consequence_tags: result.consequence_tags || [],
    });

    // Store follow-up choices
    await base44.auth.updateMe({
      pending_journal_choices: {
        ...updatedPending,
        [followup.id]: result.followup_event.choices || [],
      }
    });

    followupId = followup.id;
  }

  return Response.json({
    status: 'ok',
    outcome: result.outcome,
    reputation_effect: repEffect,
    world_effects: worldEffects,
    consequence_tags: result.consequence_tags || [],
    followup_entry_id: followupId,
  });
});