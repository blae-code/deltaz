import { deterministicNumber, rotateDeterministic } from './deterministic.ts';
import { DATA_ORIGINS, buildSourceRef, withProvenance } from './provenance.ts';

const CHARACTER_NAMES = [
  'Mara Keene', 'Silas Voss', 'Iris Mercer', 'Knox Vale', 'June Maddox',
  'Rhea Dunn', 'Dorian Pike', 'Lena Shaw', 'Ansel Cross', 'Tess Harrow',
];

const APPEARANCE_TRAITS = [
  'weather-creased skin',
  'patched field gear',
  'a scavenged headset worn thin with use',
  'old faction markings hidden under fresh stitching',
  'steady hands despite the strain',
  'a posture built by too many hard roads',
];

const CATCHPHRASES = [
  'Count the exits before the bullets.',
  'Nothing in the wastes stays free for long.',
  'Keep moving and the signal cannot pin you.',
  'Useful beats heroic every time.',
  'If the route still breathes, it still pays.',
];

const sanitizeText = (value: unknown, maxLength = 240) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
};

const normalizeCompiled = (compiled: any) => ({
  personality_traits: Array.isArray(compiled?.personality_traits)
    ? compiled.personality_traits.map((item: unknown) => sanitizeText(item, 80)).filter(Boolean)
    : [],
  weaknesses: Array.isArray(compiled?.weaknesses)
    ? compiled.weaknesses.map((item: unknown) => sanitizeText(item, 80)).filter(Boolean)
    : [],
  faction_loyalty: sanitizeText(compiled?.faction_loyalty, 120),
  goal: sanitizeText(compiled?.goal, 180),
  primary_skill: sanitizeText(compiled?.primary_skill, 40) || 'scavenger',
  origin_tags: Array.isArray(compiled?.origin_tags)
    ? compiled.origin_tags.map((item: unknown) => sanitizeText(item, 40)).filter(Boolean)
    : [],
  skill_affinities: Array.isArray(compiled?.skill_affinities)
    ? compiled.skill_affinities.map((item: unknown) => sanitizeText(item, 40)).filter(Boolean)
    : [],
  reputation_biases: compiled?.reputation_biases && typeof compiled.reputation_biases === 'object'
    ? compiled.reputation_biases
    : {},
  stat_modifiers: compiled?.stat_modifiers && typeof compiled.stat_modifiers === 'object'
    ? compiled.stat_modifiers
    : {},
});

export function buildOriginDossier(callsign: string, compiled: any, rawChoices: any[]) {
  const normalized = normalizeCompiled(compiled);
  const seed = `${sanitizeText(callsign, 80)}:${normalized.primary_skill}:${normalized.origin_tags.join(',')}:${rawChoices.map((choice) => sanitizeText(choice?.label, 80)).join('|')}`;
  const chosenName = rotateDeterministic(CHARACTER_NAMES, seed, 'name')[0] || sanitizeText(callsign, 80) || 'Unknown';
  const appearancePool = rotateDeterministic(APPEARANCE_TRAITS, seed, 'appearance').slice(0, 3);
  const age = String(deterministicNumber(25, 55, seed, 'age'));
  const personality = normalized.personality_traits.join(', ') || 'guarded and pragmatic';
  const weaknesses = normalized.weaknesses.join(', ') || 'old signal trauma';
  const tags = normalized.origin_tags.join(', ') || 'unknown origins';
  const goal = normalized.goal || 'survive another day';
  const skill = normalized.primary_skill || 'scavenger';
  const choiceTrail = rawChoices
    .map((choice) => sanitizeText(choice?.label, 80))
    .filter(Boolean)
    .slice(0, 4)
    .join(', ');

  return {
    backstory: `${sanitizeText(callsign, 80)} emerged from the blackout carrying the marks of ${tags}. The first months after the collapse forced them to turn ${skill} into habit while every choice narrowed the road ahead. ${choiceTrail ? `Those choices still define their posture: ${choiceTrail}.` : 'Every hard call from those first weeks still rides with them.'} They reached Dead Signal looking for a place where usefulness matters more than comfort, and they intend to stay alive long enough to pursue ${goal.toLowerCase()}.`,
    appearance: `${sanitizeText(callsign, 80)} presents with ${appearancePool.join(', ')}. Nothing about the kit looks ornamental; every strap and scar reads like it has already paid for itself.`,
    personality_summary: `${sanitizeText(callsign, 80)} reads as ${personality}. The pressure fractures around ${weaknesses}, but it has not stripped away their focus.`,
    catchphrase: rotateDeterministic(CATCHPHRASES, seed, 'catchphrase')[0] || 'Useful beats heroic every time.',
    character_name: chosenName,
    age,
    skills_description: `${sanitizeText(callsign, 80)} survived by turning ${skill} into repeatable field discipline. ${normalized.skill_affinities.length > 0 ? `Secondary affinities still show up in ${normalized.skill_affinities.join(', ')} work.` : 'They rely on practical work more than theory.'}`,
    survival_philosophy: `Survival means staying useful long enough to pursue ${goal.toLowerCase()}.`,
  };
}

export function buildProfilePayload(playerEmail: string, callsign: string, compiled: any, rawChoices: any[]) {
  const normalized = normalizeCompiled(compiled);
  const dossier = buildOriginDossier(callsign, normalized, rawChoices);

  return withProvenance({
    player_email: playerEmail,
    character_name: dossier.character_name || sanitizeText(callsign, 80),
    backstory: dossier.backstory,
    personality: dossier.personality_summary,
    skills: dossier.skills_description,
    weaknesses: normalized.weaknesses.join('. ') || '',
    appearance: dossier.appearance,
    faction_loyalty: normalized.faction_loyalty,
    goals: dossier.survival_philosophy,
    catchphrase: dossier.catchphrase,
    age: dossier.age,
    origin: normalized.origin_tags.join(', ') || 'unknown',
    origin_generated: true,
    primary_skill: normalized.primary_skill,
    combat_rating: clampNumber(normalized.stat_modifiers?.combat_rating, 1, 10, 2),
  }, {
    dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
    sourceRefs: [
      buildSourceRef('player', playerEmail),
      ...normalized.origin_tags.slice(0, 4).map((tag: string) => `origin:${tag}`),
    ],
  });
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, numeric));
}
