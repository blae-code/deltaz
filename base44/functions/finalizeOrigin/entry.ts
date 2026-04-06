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

    const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a post-apocalyptic narrative writer for a game called "Dead Signal". A new survivor has arrived. Based on their origin choices, generate a rich, gritty character profile.

Player callsign: ${callsign}
Origin choices:
${choicesSummary}

Personality traits: ${compiled.personality_traits?.join('; ') || 'Unknown'}
Weaknesses: ${compiled.weaknesses?.join('; ') || 'None noted'}
Faction loyalty: ${compiled.faction_loyalty || 'Unaligned'}
Goal: ${compiled.goal || 'Survival'}
Primary skill: ${compiled.primary_skill || 'scavenger'}

Generate:
- backstory: A 3-4 sentence gritty backstory weaving together ALL their choices into a cohesive narrative. Reference specific events from their choices. Write in third person.
- appearance: A vivid 2-sentence physical description that reflects their journey.
- catchphrase: A short, memorable line this character would say.
- character_name: Suggest a full in-character name (first + last) that fits the vibe. The player can change it later.
- age: A realistic age (25-55) as a string.`,
      response_json_schema: {
        type: 'object',
        properties: {
          backstory: { type: 'string' },
          appearance: { type: 'string' },
          catchphrase: { type: 'string' },
          character_name: { type: 'string' },
          age: { type: 'string' },
        },
      },
    });

    // 2. Create CharacterProfile
    const profile = await base44.entities.CharacterProfile.create({
      player_email: user.email,
      character_name: aiResult.character_name || callsign,
      backstory: aiResult.backstory || '',
      personality: compiled.personality_traits?.join('. ') || '',
      skills: `Primary: ${compiled.primary_skill}. Affinities: ${compiled.skill_affinities?.join(', ') || 'general'}`,
      weaknesses: compiled.weaknesses?.join('. ') || '',
      appearance: aiResult.appearance || '',
      faction_loyalty: compiled.faction_loyalty || '',
      goals: compiled.goal || 'Survive another day.',
      catchphrase: aiResult.catchphrase || '',
      age: aiResult.age || '30',
      origin: compiled.origin_tags?.join(', ') || 'unknown',
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
      backstory_preview: aiResult.backstory?.substring(0, 200),
      factions_initialized: factions.length,
    });
  } catch (error) {
    console.error('finalizeOrigin error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});