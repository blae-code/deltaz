import { createClientFromRequest } from 'npm:@base44/sdk@0.8.24';
import { buildOriginDossier, buildProfilePayload } from '../_shared/originProfile.ts';
import { DATA_ORIGINS, buildSourceRef, withProvenance } from '../_shared/provenance.ts';

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
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const callsign = sanitizeText(body.callsign, 48);
    const compiled = normalizeCompiled(body.compiled);
    const rawChoices = normalizeChoices(body.raw_choices);

    if (!callsign || !compiled) {
      return Response.json({ error: 'compiled and callsign required' }, { status: 400 });
    }

    const dossier = buildOriginDossier(callsign, compiled, rawChoices);
    const profilePayload = buildProfilePayload(user.email, callsign, compiled, dossier);

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
    const reputationMap = new Map<string, any[]>();
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
      const payload = withProvenance({
        player_email: user.email,
        faction_id: faction.id,
        score,
        rank,
      }, {
        dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
        sourceRefs: [
          buildSourceRef('user', user.email, 'origin'),
          buildSourceRef('faction', faction.id),
        ],
      });

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
      personality_summary: dossier.personality_summary,
      catchphrase: profile.catchphrase,
      survival_philosophy: dossier.survival_philosophy,
      factions_initialized: factions.length,
      existing_profile_reused: Boolean(existingProfile),
    });
  } catch (error) {
    console.error('finalizeOrigin error:', error);
    return Response.json({ error: error.message || 'Failed to finalize origin' }, { status: 500 });
  }
});

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

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, numeric));
}

function getReputationRank(score) {
  if (score >= 60) return 'revered';
  if (score >= 40) return 'allied';
  if (score >= 20) return 'trusted';
  if (score >= 0) return 'neutral';
  if (score <= -40) return 'enemy';
  if (score <= -15) return 'hostile';
  return 'unknown';
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
