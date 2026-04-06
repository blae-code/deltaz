import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { compiled, callsign, raw_choices } = body;

    if (!compiled || !callsign) {
      return Response.json({ error: 'compiled and callsign required' }, { status: 400 });
    }

    // 1. Generate a rich AI backstory from the player's choices
    const choicesSummary = (raw_choices || []).map(c => `${c.step}: ${c.label}`).join('\n');

    // Build detailed choice descriptions for the AI
    const detailedChoices = (raw_choices || []).map(c => `[${c.step}] Choice: "${c.label}"`).join('\n');

    const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a gritty post-apocalyptic narrative writer for "Dead Signal" — a survival game set after a catastrophic signal blackout wiped out global communications and infrastructure. A new survivor has just arrived at the Dead Signal outpost.

Write their full origin dossier based on these choices. This dossier will be permanently attached to their character and referenced by all AI systems in the game (mission briefings, tactical advisors, narrative events).

Player callsign: ${callsign}
Origin choices:
${detailedChoices}

Personality traits from choices: ${compiled.personality_traits?.join('; ') || 'Unknown'}
Weaknesses/flaws: ${compiled.weaknesses?.join('; ') || 'None noted'}
Faction loyalty: ${compiled.faction_loyalty || 'Unaligned'}
Driving goal: ${compiled.goal || 'Survival'}
Primary skill: ${compiled.primary_skill || 'scavenger'}
Origin tags: ${compiled.origin_tags?.join(', ') || 'unknown'}

Generate ALL of the following:
- backstory: A 5-7 sentence origin narrative written in third person. Weave EVERY choice into one cohesive survival story. Describe specific moments — the day the signal died, how they survived the first week, what they lost, how they discovered their skill, their encounter with faction ideology, and what drew them to Dead Signal. Make it visceral, cinematic, and personal. Include sensory details (sounds, smells, weather). Reference real consequences of their choices.
- appearance: A vivid 3-sentence physical description showing how their journey has marked them. Scars from the first week, gear that reflects their skill, clothing that tells a story. Make it visual enough that another player could picture them.
- personality_summary: A 2-3 sentence psychological profile. What drives them, what haunts them, how they interact with others. Reference their specific personality traits and weaknesses.
- catchphrase: A memorable one-liner this character would say — dark humor, grim wisdom, or defiant hope. Must feel earned by their backstory.
- character_name: A full name (first + last/nickname) that fits their origin. Military survivors get tactical names, medical survivors get clinical ones, drifters get road names.
- age: A specific age (25-55) as a string.
- skills_description: A 2-sentence description of their practical abilities, referencing how they developed them during the apocalypse.
- survival_philosophy: One sentence capturing their core belief about survival.`,
      response_json_schema: {
        type: 'object',
        properties: {
          backstory: { type: 'string' },
          appearance: { type: 'string' },
          personality_summary: { type: 'string' },
          catchphrase: { type: 'string' },
          character_name: { type: 'string' },
          age: { type: 'string' },
          skills_description: { type: 'string' },
          survival_philosophy: { type: 'string' },
        },
      },
    });

    // 2. Create CharacterProfile — fully populated from origin + AI generation
    const profile = await base44.entities.CharacterProfile.create({
      player_email: user.email,
      character_name: aiResult.character_name || callsign,
      backstory: aiResult.backstory || '',
      personality: aiResult.personality_summary || compiled.personality_traits?.join('. ') || '',
      skills: aiResult.skills_description || `Primary: ${compiled.primary_skill}. Affinities: ${compiled.skill_affinities?.join(', ') || 'general'}`,
      weaknesses: compiled.weaknesses?.join('. ') || '',
      appearance: aiResult.appearance || '',
      faction_loyalty: compiled.faction_loyalty || '',
      goals: aiResult.survival_philosophy ? `${compiled.goal || 'Survive another day.'} — "${aiResult.survival_philosophy}"` : (compiled.goal || 'Survive another day.'),
      catchphrase: aiResult.catchphrase || '',
      age: aiResult.age || '30',
      origin: compiled.origin_tags?.join(', ') || 'unknown',
      origin_generated: true,
      primary_skill: compiled.primary_skill || 'scavenger',
      combat_rating: compiled.stat_modifiers?.combat_rating || 2,
    });

    // 3. Create starting reputation records
    const factions = await base44.asServiceRole.entities.Faction.filter({ status: 'active' });
    const repBiases = compiled.reputation_biases || {};

    for (const faction of factions) {
      const tag = faction.tag?.replace(/[\[\]]/g, '') || '';
      const score = repBiases[tag] || 0;
      const rank = score >= 20 ? 'neutral' : score <= -15 ? 'hostile' : 'unknown';
      
      await base44.entities.Reputation.create({
        player_email: user.email,
        faction_id: faction.id,
        score,
        rank,
      });
    }

    // 4. Save origin data on user record
    await base44.auth.updateMe({
      origin_compiled: compiled,
      origin_choices: raw_choices,
    });

    return Response.json({
      status: 'ok',
      profile_id: profile.id,
      character_name: aiResult.character_name,
      backstory: aiResult.backstory,
      appearance: aiResult.appearance,
      personality_summary: aiResult.personality_summary,
      catchphrase: aiResult.catchphrase,
      survival_philosophy: aiResult.survival_philosophy,
      factions_initialized: factions.length,
    });
  } catch (error) {
    console.error('finalizeOrigin error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});