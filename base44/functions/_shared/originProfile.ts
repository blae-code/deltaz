import { DATA_ORIGINS, buildSourceRef, withProvenance } from './provenance.ts';

const sanitizeText = (value: unknown, maxLength = 600) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
};

const normalizeStringArray = (value: unknown, maxLength = 80) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => sanitizeText(item, maxLength))
    .filter(Boolean)
    .slice(0, 8);
};

const buildListSummary = (items: string[], fallback: string, joiner = ', ') => {
  if (items.length === 0) {
    return fallback;
  }

  if (items.length === 1) {
    return items[0];
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  return `${items.slice(0, -1).join(joiner)}, and ${items[items.length - 1]}`;
};

const buildAppearance = (compiled: any) => {
  const skill = sanitizeText(compiled.primary_skill, 40) || 'scavenger';
  const tags = normalizeStringArray(compiled.origin_tags, 40);

  const gearBySkill: Record<string, string> = {
    scavenger: 'salvage straps and patched utility gear',
    medic: 'field dressings, sealed pouches, and practical layers',
    mechanic: 'grease-marked gloves and tool-weighted webbing',
    farmer: 'weather-scoured workwear and sun-faded outer layers',
    guard: 'reinforced plates and a posture built for watch duty',
    trader: 'cleaner fabric, hidden pockets, and barter-ready kit',
    engineer: 'modular harnesses and improvised rigging',
    cook: 'heat-scarred sleeves and a knife roll kept close',
  };

  const tagLine = tags.length > 0
    ? `The details of their kit still carry traces of ${buildListSummary(tags, 'an older life')}.`
    : 'Nothing about the silhouette looks decorative; every strap and scar still has a job.';

  return `${sanitizeText(compiled.callsign, 48) || 'The operative'} moves in ${gearBySkill[skill] || gearBySkill.scavenger}. Their stance reads as alert, practical, and permanently short on trust. ${tagLine}`;
};

export const buildOriginDossier = (
  callsign: string,
  compiled: any,
  rawChoices: Array<{ label?: string; step?: string }>,
) => {
  const traits = normalizeStringArray(compiled.personality_traits, 80);
  const weaknesses = normalizeStringArray(compiled.weaknesses, 80);
  const originTags = normalizeStringArray(compiled.origin_tags, 60);
  const skillAffinities = normalizeStringArray(compiled.skill_affinities, 60);
  const primarySkill = sanitizeText(compiled.primary_skill, 40) || 'scavenger';
  const goal = sanitizeText(compiled.goal, 180) || 'survive another day';
  const factionLoyalty = sanitizeText(compiled.faction_loyalty, 80) || 'unaligned';
  const choiceTrail = rawChoices
    .map((choice) => sanitizeText(choice?.label, 100))
    .filter(Boolean)
    .slice(0, 6);

  const traitSummary = buildListSummary(traits, 'guarded');
  const weaknessSummary = buildListSummary(weaknesses, 'old signal scars');
  const originSummary = buildListSummary(originTags, 'a broken past');
  const affinitySummary = buildListSummary(skillAffinities, 'field survival');
  const choiceSummary = choiceTrail.length > 0
    ? `The choices that carried them here still show: ${choiceTrail.join(' -> ')}.`
    : 'The road into Dead Signal was made from hard decisions and worse timing.';

  const backstory = `${callsign} came out of ${originSummary} with ${primarySkill} habits and no patience for waste. ${choiceSummary} They reached Dead Signal chasing ${goal.toLowerCase()}, carrying loyalty that leans ${factionLoyalty.toLowerCase()} and instincts shaped by ${traitSummary}. Even now, ${weaknessSummary} still defines the edges of every decision they make.`;
  const personalitySummary = `${callsign} reads as ${traitSummary}, but pressure reliably exposes ${weaknessSummary}. Their operational focus stays fixed on ${goal.toLowerCase()}, even when the cost lands close to the bone.`;
  const catchphrase = primarySkill === 'guard'
    ? 'If the line breaks, we were already dead.'
    : primarySkill === 'medic'
      ? 'Patch the wound, then settle the score.'
      : primarySkill === 'trader'
        ? 'Everything has a price. The trick is paying less.'
        : 'Useful beats heroic every time.';
  const skillsDescription = `${callsign} leans hardest on ${primarySkill} discipline, supported by ${affinitySummary}. Their value comes from repeatable field habits, not luck.`;
  const survivalPhilosophy = `Stay useful, stay mobile, and keep ${goal.toLowerCase()} in reach.`;

  return {
    character_name: callsign,
    age: '',
    backstory,
    appearance: buildAppearance({ ...compiled, callsign }),
    personality_summary: personalitySummary,
    catchphrase,
    skills_description: skillsDescription,
    survival_philosophy: survivalPhilosophy,
  };
};

export const buildProfilePayload = (
  playerEmail: string,
  callsign: string,
  compiled: any,
  dossier: ReturnType<typeof buildOriginDossier>,
) => withProvenance({
  player_email: playerEmail,
  character_name: dossier.character_name || callsign,
  backstory: dossier.backstory || '',
  personality: dossier.personality_summary || '',
  skills: dossier.skills_description || '',
  weaknesses: normalizeStringArray(compiled.weaknesses, 120).join('. '),
  appearance: dossier.appearance || '',
  faction_loyalty: sanitizeText(compiled.faction_loyalty, 120),
  goals: sanitizeText(compiled.goal, 240) || 'Survive another day.',
  catchphrase: dossier.catchphrase || '',
  age: dossier.age || '',
  origin: normalizeStringArray(compiled.origin_tags, 60).join(', '),
  origin_generated: true,
  primary_skill: sanitizeText(compiled.primary_skill, 40) || 'scavenger',
  combat_rating: Math.min(10, Math.max(1, Number(compiled.stat_modifiers?.combat_rating) || 2)),
}, {
  dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
  sourceRefs: [
    buildSourceRef('user', playerEmail, 'origin'),
    ...normalizeStringArray(compiled.origin_tags, 60).map((tag) => `origin_tag:${tag}`),
  ],
});
