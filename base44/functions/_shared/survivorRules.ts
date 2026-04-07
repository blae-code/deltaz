import { deterministicNumber, rotateDeterministic, stableHash } from './deterministic.ts';
import { DATA_ORIGINS, buildSourceRef, withProvenance } from './provenance.ts';

const SKILLS = ['scavenger', 'medic', 'mechanic', 'farmer', 'guard', 'trader', 'engineer', 'cook'] as const;
const SKILL_BONUS_MAP = {
  scavenger: { bonus_type: 'scrap_yield', bonus_value: 10, combat: 2 },
  medic: { bonus_type: 'healing', bonus_value: 15, combat: 1 },
  mechanic: { bonus_type: 'repair', bonus_value: 10, combat: 2 },
  farmer: { bonus_type: 'food_production', bonus_value: 12, combat: 1 },
  guard: { bonus_type: 'defense', bonus_value: 8, combat: 4 },
  trader: { bonus_type: 'trade_discount', bonus_value: 10, combat: 1 },
  engineer: { bonus_type: 'crafting', bonus_value: 10, combat: 2 },
  cook: { bonus_type: 'morale_boost', bonus_value: 10, combat: 1 },
} as const;

const FIRST_NAMES = [
  'Mara', 'Jace', 'Lena', 'Silas', 'Tara', 'Knox', 'Iris', 'Dorian', 'Nova', 'Hale',
  'Rhea', 'Briggs', 'Tess', 'Corin', 'Vera', 'Quill', 'Ansel', 'Mina', 'Rook', 'June',
];

const LAST_NAMES = [
  'Mercer', 'Voss', 'Keene', 'Rook', 'Maddox', 'Vale', 'Harrow', 'Dunn', 'Sable', 'Cross',
  'Pike', 'Holt', 'Graves', 'Morrow', 'Shaw', 'Kade', 'Blythe', 'Renn', 'Stroud', 'Vane',
];

const NICKNAMES = {
  scavenger: ['Magpie', 'Splice', 'Rattle', 'Patch'],
  medic: ['Bandage', 'Quiet Hands', 'Gauze', 'Needle'],
  mechanic: ['Wrench', 'Grease', 'Rivet', 'Bolt'],
  farmer: ['Row', 'Dirt', 'Mulch', 'Seeder'],
  guard: ['Bulwark', 'Latch', 'Watch', 'Iron Eye'],
  trader: ['Ledger', 'Velvet Knife', 'Two-Credit', 'Broker'],
  engineer: ['Fuse', 'Hex', 'Sparks', 'Brace'],
  cook: ['Ashpan', 'Skillet', 'Smoke', 'Spice'],
} as const;

const PERSONALITIES = {
  wanderer: ['quietly stubborn', 'dryly observant', 'suspicious but steady', 'hard to impress'],
  refugee: ['worn thin but determined', 'alert at every sound', 'grateful and guarded', 'fiercely protective'],
  recruited: ['disciplined under pressure', 'eager to prove useful', 'practical to a fault', 'more loyal than they admit'],
  rescued: ['shaken but resilient', 'careful with every risk', 'relieved and sharp-eyed', 'gentle until pressed'],
  trader: ['smooth when bartering', 'always counting angles', 'cheerful in a dangerous way', 'polite and hard to read'],
  assigned: ['professional and reserved', 'used to taking orders', 'methodical in the field', 'blunt but dependable'],
} as const;

const BACKSTORY_OPENERS = {
  wanderer: 'followed smoke and radio static to the perimeter',
  refugee: 'came in from a shattered route after nearby fighting cut their convoy apart',
  recruited: 'answered a quiet offer after word spread that the base still keeps its lights on',
  rescued: 'was pulled out of a bad stretch and decided not to waste the second chance',
  trader: 'arrived under the pretense of barter and stayed once the numbers made sense',
  assigned: 'was routed in by command to reinforce a fragile sector',
} as const;

const THREAT_HEALTH = {
  minimal: 'healthy',
  low: 'healthy',
  moderate: 'healthy',
  high: 'injured',
  critical: 'injured',
} as const;

const THREAT_MORALE = {
  minimal: 'content',
  low: 'neutral',
  moderate: 'neutral',
  high: 'anxious',
  critical: 'desperate',
} as const;

const sanitizeText = (value: unknown, maxLength = 160) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
};

const toOriginKey = (value: unknown) => {
  const normalized = sanitizeText(value, 24);
  return ['wanderer', 'refugee', 'recruited', 'rescued', 'trader', 'assigned'].includes(normalized)
    ? normalized as keyof typeof PERSONALITIES
    : 'wanderer';
};

const getSkill = (seed: string, index: number) => {
  const ordered = rotateDeterministic([...SKILLS], seed, 'skill');
  return ordered[index % ordered.length] || 'scavenger';
};

const getUniqueName = (seed: string, existingNames: Set<string>, index: number) => {
  const firstPool = rotateDeterministic(FIRST_NAMES, seed, 'first');
  const lastPool = rotateDeterministic(LAST_NAMES, seed, 'last');

  for (let attempt = 0; attempt < firstPool.length * lastPool.length; attempt += 1) {
    const first = firstPool[(index + attempt) % firstPool.length];
    const last = lastPool[(index * 3 + attempt) % lastPool.length];
    const name = `${first} ${last}`;
    if (!existingNames.has(name)) {
      existingNames.add(name);
      return name;
    }
  }

  const fallback = `Survivor ${deterministicNumber(101, 999, seed, index, 'fallback')}`;
  existingNames.add(fallback);
  return fallback;
};

export function buildSurvivorPayloads({
  base,
  territory,
  count,
  origin,
  reason,
  seed,
  existingNames,
  sourceRefs = [],
}: {
  base: any;
  territory?: any;
  count: number;
  origin: string;
  reason: string;
  seed: string;
  existingNames: Set<string>;
  sourceRefs?: string[];
}) {
  const safeCount = Math.max(0, Math.floor(count || 0));
  const originKey = toOriginKey(origin);
  const reasonText = sanitizeText(reason, 160) || 'followed the last safe route into camp';
  const threatLevel = sanitizeText(territory?.threat_level, 20) || 'moderate';
  const baseName = sanitizeText(base?.name, 80) || 'the base';
  const sector = sanitizeText(base?.sector || territory?.sector, 20) || 'unknown sector';
  const payloads = [];

  for (let index = 0; index < safeCount; index += 1) {
    const survivorSeed = `${seed}:${index}`;
    const skill = getSkill(survivorSeed, index);
    const name = getUniqueName(survivorSeed, existingNames, index);
    const skillLevel = deterministicNumber(1, 3, survivorSeed, 'skill_level');
    const personalityPool = rotateDeterministic([...PERSONALITIES[originKey]], survivorSeed, 'personality');
    const personality = personalityPool[0] || 'hard to read';
    const nicknamePool = rotateDeterministic([...NICKNAMES[skill]], survivorSeed, 'nickname');
    const nickname = nicknamePool[0] || 'Ghost';
    const health = THREAT_HEALTH[threatLevel as keyof typeof THREAT_HEALTH] || 'healthy';
    const morale = THREAT_MORALE[threatLevel as keyof typeof THREAT_MORALE] || 'neutral';
    const backstory = `${name} ${BACKSTORY_OPENERS[originKey]} and made for ${baseName} in ${sector}. ${name.split(' ')[0]} is ${personality} and slots cleanly into ${skill} work when the camp needs it.`;
    const bonus = SKILL_BONUS_MAP[skill];

    payloads.push(withProvenance({
      name,
      nickname,
      backstory,
      personality,
      skill,
      skill_level: skillLevel,
      morale,
      health,
      base_id: base.id,
      origin: originKey,
      arrival_reason: reasonText,
      bonus_type: bonus.bonus_type,
      bonus_value: bonus.bonus_value * skillLevel,
      status: 'active',
      current_task: 'idle',
      combat_rating: Math.min(10, bonus.combat + skillLevel + deterministicNumber(0, 2, survivorSeed, 'combat')),
    }, {
      dataOrigin: DATA_ORIGINS.SYSTEM_RULE,
      sourceRefs: [
        buildSourceRef('base', base?.id),
        buildSourceRef('territory', territory?.id || base?.territory_id),
        ...sourceRefs,
      ],
    }));
  }

  return payloads;
}

export function buildArrivalSummary(survivors: any[]) {
  return survivors
    .map((survivor) => `${sanitizeText(survivor.name, 60)} the ${sanitizeText(survivor.skill, 24)} (${sanitizeText(survivor.origin, 24)})`)
    .join(', ');
}

export function buildAttractionReason({
  activeWars,
  emergencies,
  territory,
}: {
  activeWars: any[];
  emergencies: any[];
  territory?: any;
}) {
  if (activeWars.length > 0 && ['minimal', 'low'].includes(sanitizeText(territory?.threat_level, 16))) {
    return { origin: 'refugee', reason: 'Fleeing from faction warfare along the safer corridors.' };
  }

  if (emergencies.length > 0) {
    const eventTitle = sanitizeText(emergencies[0]?.title, 80) || 'regional instability';
    return { origin: 'refugee', reason: `Displaced by ${eventTitle}.` };
  }

  return { origin: 'wanderer', reason: 'Drawn by radio chatter, working lights, and a defensible wall.' };
}

export function getSurvivorCycleSourceRef(cycleKey: string, baseId: string) {
  return `survivor_cycle:${sanitizeText(cycleKey, 60)}:${sanitizeText(baseId, 80)}`;
}

export function getSurvivorNameSet(records: any[]) {
  return new Set(
    records
      .map((record) => sanitizeText(record?.name, 80))
      .filter(Boolean),
  );
}

export function getSurvivorRecordHash(record: any) {
  return stableHash(
    sanitizeText(record?.name, 80),
    sanitizeText(record?.skill, 24),
    sanitizeText(record?.origin, 24),
    sanitizeText(record?.base_id, 80),
  );
}
