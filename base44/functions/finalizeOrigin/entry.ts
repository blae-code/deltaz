import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';

const MAX_TEXT_LENGTH = 600;

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const callsign = sanitizeText(body.callsign, 48);
    const compiled = normalizeCompiled(body.compiled);
    const rawChoices = normalizeChoices(body.raw_choices);

    if (!callsign || !compiled) {
      return Response.json({ error: 'compiled and callsign required' }, { status: 400 });
    }

    const aiResult = await generateOriginDossier(base44, callsign, compiled, rawChoices);
    const profilePayload = buildProfilePayload(user.email, callsign, compiled, aiResult);

    const existingProfiles = await base44.asServiceRole.entities.CharacterProfile.filter({ player_email: user.email });
    const existingProfile = existingProfiles[0];
    const profile = existingProfile
      ? await base44.asServiceRole.entities.CharacterProfile.update(existingProfile.id, profilePayload)
      : await base44.asServiceRole.entities.CharacterProfile.create(profilePayload);
    if (existingProfiles.length > 1) {
      await Promise.all(existingProfiles.slice(1).map((record) =>
        base44.asServiceRole.entities.CharacterProfile.update(record.id, profilePayload),
      ));
    }

    const factions = await base44.asServiceRole.entities.Faction.filter({ status: 'active' });
    const existingReputations = await base44.asServiceRole.entities.Reputation.filter({ player_email: user.email });
    const reputationMap = new Map();
    for (const reputation of existingReputations) {
      const bucket = reputationMap.get(reputation.faction_id) || [];
      bucket.push(reputation);
      reputationMap.set(reputation.faction_id, bucket);
    }

    const repBiases = isRecord(compiled.reputation_biases) ? compiled.reputation_biases : {};
    for (const faction of factions) {
      if (!faction?.id) {
        continue;
      }

      const tag = sanitizeText(String(faction.tag || '').replace(/[\[\]]/g, ''), 24);
      const score = clampNumber(repBiases[tag], -100, 100, 0);
      const rank = getReputationRank(score);
      const payload = {
        player_email: user.email,
        faction_id: faction.id,
        score,
        rank,
      };

      const existingRows = reputationMap.get(faction.id) || [];
      if (existingRows.length > 0) {
        await Promise.all(existingRows.map((row) =>
          base44.asServiceRole.entities.Reputation.update(row.id, payload),
        ));
      } else {
        await base44.asServiceRole.entities.Reputation.create(payload);
      }
    }

    await base44.auth.updateMe({
      origin_compiled: compiled,
      origin_choices: rawChoices,
    });

    return Response.json({
      status: 'ok',
      profile_id: profile.id,
      character_name: profile.character_name,
      backstory: profile.backstory,
      appearance: profile.appearance,
      personality_summary: aiResult.personality_summary,
      catchphrase: profile.catchphrase,
      survival_philosophy: aiResult.survival_philosophy,
      factions_initialized: factions.length,
      existing_profile_reused: Boolean(existingProfile),
    });
  } catch (error) {
    console.error('finalizeOrigin error:', error);
    return Response.json({ error: error.message || 'Failed to finalize origin' }, { status: 500 });
  }
});

async function generateOriginDossier(base44, callsign, compiled, rawChoices) {
  const fallback = buildFallbackOrigin(callsign, compiled, rawChoices);
  const detailedChoices = rawChoices
    .map((choice) => `[${choice.step}] Choice: "${choice.label}"`)
    .join('\n');

  try {
    const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a gritty post-apocalyptic narrative writer for "Dead Signal" — a survival game set after a catastrophic signal blackout wiped out global communications and infrastructure. A new survivor has just arrived at the Dead Signal outpost.

Write their full origin dossier based on these choices. This dossier will be permanently attached to their character and referenced by all AI systems in the game (mission briefings, tactical advisors, narrative events).

Player callsign: ${callsign}
Origin choices:
${detailedChoices || 'No detailed choices supplied.'}

Personality traits from choices: ${compiled.personality_traits?.join('; ') || 'Unknown'}
Weaknesses/flaws: ${compiled.weaknesses?.join('; ') || 'None noted'}
Faction loyalty: ${compiled.faction_loyalty || 'Unaligned'}
Driving goal: ${compiled.goal || 'Survival'}
Primary skill: ${compiled.primary_skill || 'scavenger'}
Origin tags: ${compiled.origin_tags?.join(', ') || 'unknown'}

Generate ALL of the following:
- backstory: A 5-7 sentence origin narrative written in third person.
- appearance: A vivid 3-sentence physical description.
- personality_summary: A 2-3 sentence psychological profile.
- catchphrase: A memorable one-liner this character would say.
- character_name: A full name or hardened wasteland nickname.
- age: A specific age (25-55) as a string.
- skills_description: A 2-sentence description of their practical abilities.
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

    return {
      backstory: sanitizeText(aiResult?.backstory, 2000) || fallback.backstory,
      appearance: sanitizeText(aiResult?.appearance, 800) || fallback.appearance,
      personality_summary: sanitizeText(aiResult?.personality_summary, 800) || fallback.personality_summary,
      catchphrase: sanitizeText(aiResult?.catchphrase, 200) || fallback.catchphrase,
      character_name: sanitizeText(aiResult?.character_name, 80) || fallback.character_name,
      age: normalizeAge(aiResult?.age) || fallback.age,
      skills_description: sanitizeText(aiResult?.skills_description, 800) || fallback.skills_description,
      survival_philosophy: sanitizeText(aiResult?.survival_philosophy, 240) || fallback.survival_philosophy,
    };
  } catch (error) {
    console.error('finalizeOrigin dossier generation failed:', error);
    return fallback;
  }
}

function buildProfilePayload(playerEmail, callsign, compiled, aiResult) {
  return {
    player_email: playerEmail,
    character_name: aiResult.character_name || callsign,
    backstory: aiResult.backstory || '',
    personality: aiResult.personality_summary || compiled.personality_traits.join('. ') || '',
    skills: aiResult.skills_description || `Primary: ${compiled.primary_skill}. Affinities: ${compiled.skill_affinities.join(', ') || 'general'}`,
    weaknesses: compiled.weaknesses.join('. ') || '',
    appearance: aiResult.appearance || '',
    faction_loyalty: compiled.faction_loyalty || '',
    goals: aiResult.survival_philosophy
      ? `${compiled.goal || 'Survive another day.'} — "${aiResult.survival_philosophy}"`
      : (compiled.goal || 'Survive another day.'),
    catchphrase: aiResult.catchphrase || '',
    age: aiResult.age || '30',
    origin: compiled.origin_tags.join(', ') || 'unknown',
    origin_generated: true,
    primary_skill: compiled.primary_skill || 'scavenger',
    combat_rating: clampNumber(compiled.stat_modifiers?.combat_rating, 1, 10, 2),
  };
}

function buildFallbackOrigin(callsign, compiled, rawChoices) {
  const personality = compiled.personality_traits.join(', ') || 'guarded';
  const weaknesses = compiled.weaknesses.join(', ') || 'scarred by the blackout';
  const tags = compiled.origin_tags.join(', ') || 'unknown origin';
  const goal = compiled.goal || 'survive another day';
  const skill = compiled.primary_skill || 'scavenger';
  const choiceTrail = rawChoices.map((choice) => choice.label).join(', ');

  return {
    backstory: `${callsign} emerged from the signal collapse carrying the marks of ${tags}. The first weeks after the blackout forced them to lean on ${skill} instincts while every decision narrowed the road ahead. ${choiceTrail ? `Those choices still define them: ${choiceTrail}.` : 'Every hard choice from that first month still follows them.'} They arrived at Dead Signal hunting a place where purpose matters more than comfort. The wasteland remembers what they lost, and they intend to make it pay.`,
    appearance: `${callsign} looks weather-beaten and alert, with gear worn smooth by hard travel. Their posture carries the strain of too many nights without safety, and their kit reflects a survivor shaped by ${skill} work. Nothing about them looks ornamental; every scar and every strap has a reason.`,
    personality_summary: `${callsign} comes across as ${personality}, but the pressure fractures around ${weaknesses}. They keep moving because stopping means listening too closely to what the signal took.`,
    catchphrase: 'If it still breathes, it still fights.',
    character_name: callsign,
    age: '30',
    skills_description: `${callsign} survived by turning ${skill} into routine under pressure. Their practical strengths were forged in scarcity, not theory, and they know how to improvise when supplies or time run thin.`,
    survival_philosophy: `Survival means staying useful long enough to pursue ${goal.toLowerCase()}.`,
  };
}

function normalizeCompiled(value) {
  if (!isRecord(value)) {
    return null;
  }

  return {
    personality_traits: normalizeStringArray(value.personality_traits),
    weaknesses: normalizeStringArray(value.weaknesses),
    faction_loyalty: sanitizeText(value.faction_loyalty, 80),
    goal: sanitizeText(value.goal, 180),
    primary_skill: sanitizeText(value.primary_skill, 40),
    origin_tags: normalizeStringArray(value.origin_tags),
    skill_affinities: normalizeStringArray(value.skill_affinities),
    reputation_biases: isRecord(value.reputation_biases) ? value.reputation_biases : {},
    stat_modifiers: isRecord(value.stat_modifiers) ? value.stat_modifiers : {},
  };
}

function normalizeChoices(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((choice) => ({
      step: sanitizeText(choice?.step, 80),
      label: sanitizeText(choice?.label, 180),
      id: sanitizeText(choice?.id, 80),
    }))
    .filter((choice) => choice.step && choice.label);
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => sanitizeText(item, MAX_TEXT_LENGTH))
    .filter(Boolean);
}

function sanitizeText(value, maxLength = MAX_TEXT_LENGTH) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function normalizeAge(value) {
  const text = sanitizeText(value, 3);
  if (!text) {
    return '';
  }

  const age = Number.parseInt(text, 10);
  if (!Number.isFinite(age)) {
    return '';
  }

  return String(clampNumber(age, 25, 55, 30));
}

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, numeric));
}

function getReputationRank(score) {
  if (score >= 60) {
    return 'revered';
  }
  if (score >= 40) {
    return 'allied';
  }
  if (score >= 20) {
    return 'trusted';
  }
  if (score >= 0) {
    return 'neutral';
  }
  if (score <= -40) {
    return 'enemy';
  }
  if (score <= -15) {
    return 'hostile';
  }
  return 'unknown';
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
