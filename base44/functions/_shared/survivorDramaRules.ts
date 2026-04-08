import { pickDeterministic, rotateDeterministic, stableHash } from './deterministic.ts';
import { normalizeDifficulty, normalizeSkillName } from './survivorSkillRules.ts';

const DRAMA_SEVERITIES = ['minor', 'moderate', 'serious', 'critical'];

const DRAMA_RULES: Record<string, {
  titleStem: string;
  contextLabel: string;
  description: (params: any) => string;
  resolutionOptions: (params: any) => any[];
}> = {
  desertion: {
    titleStem: 'Desertion Rumor',
    contextLabel: 'desertion_pressure',
    description: ({ primaryName, secondaryName, contextSummary }: any) => `${primaryName} has been caught planning a quiet exit while ${secondaryName} tries to keep the matter contained. ${contextSummary} turns a private doubt into a colony-wide loyalty test.`,
    resolutionOptions: ({ severity }: any) => [
      {
        id: 'appeal_to_duty',
        label: 'Appeal to duty',
        description: 'Gather the shift leads and force a frank conversation about why leaving now would break the line.',
        morale_effect: severity === 'critical' ? 3 : 4,
        risk: 'low',
        skill_check: { skill: 'leadership', difficulty: severity === 'critical' ? 'hard' : 'moderate' },
      },
      {
        id: 'offer_concessions',
        label: 'Offer concessions',
        description: 'Reshuffle rations, rest, or quarters to buy loyalty before the rumor spreads further.',
        morale_effect: 2,
        risk: 'medium',
        skill_check: { skill: 'social', difficulty: 'moderate' },
      },
      {
        id: 'lock_down_access',
        label: 'Lock down the exits',
        description: 'Post armed watchers and make it clear that nobody walks without clearance.',
        morale_effect: severity === 'critical' ? -2 : -3,
        risk: 'high',
        skill_check: { skill: 'combat', difficulty: 'hard' },
      },
    ],
  },
  fight: {
    titleStem: 'Mess Hall Fight',
    contextLabel: 'interpersonal_conflict',
    description: ({ primaryName, secondaryName, contextSummary }: any) => `${primaryName} and ${secondaryName} are one bad sentence away from drawing blood. ${contextSummary} leaves the rest of the colony watching to see who controls the room.`,
    resolutionOptions: ({ severity }: any) => [
      {
        id: 'mediate',
        label: 'Mediate the dispute',
        description: 'Pull both sides aside and force a hard negotiation before fists turn into knives.',
        morale_effect: 5,
        risk: 'low',
        skill_check: { skill: 'social', difficulty: severity === 'critical' ? 'hard' : 'moderate' },
      },
      {
        id: 'assert_command',
        label: 'Assert command authority',
        description: 'Break up the argument and assign harsh duty rotations to both parties.',
        morale_effect: 1,
        risk: 'medium',
        skill_check: { skill: 'leadership', difficulty: 'moderate' },
      },
      {
        id: 'physical_intervention',
        label: 'Intervene physically',
        description: 'Send muscle in to end the brawl before it spills across the barracks.',
        morale_effect: -2,
        risk: 'high',
        skill_check: { skill: 'combat', difficulty: severity === 'critical' ? 'extreme' : 'hard' },
      },
    ],
  },
  mutiny: {
    titleStem: 'Command Challenge',
    contextLabel: 'mutiny_pressure',
    description: ({ primaryName, secondaryName, contextSummary }: any) => `${primaryName} has started gathering doubters while ${secondaryName} scrambles to hold the command chain together. ${contextSummary} gives every grievance a sharper edge.`,
    resolutionOptions: ({ severity }: any) => [
      {
        id: 'address_grievances',
        label: 'Address grievances publicly',
        description: 'Call the colony together, answer complaints directly, and make concrete promises.',
        morale_effect: 6,
        risk: 'medium',
        skill_check: { skill: 'leadership', difficulty: severity === 'critical' ? 'extreme' : 'hard' },
      },
      {
        id: 'reform_rations',
        label: 'Reform the ration plan',
        description: 'Use scarce stockpiles to prove command still serves the people keeping the gates shut.',
        morale_effect: 4,
        risk: 'medium',
        skill_check: { skill: 'social', difficulty: 'hard' },
      },
      {
        id: 'crack_down',
        label: 'Crack down fast',
        description: 'Isolate agitators, post guards, and shut down any open defiance before it spreads.',
        morale_effect: -4,
        risk: 'high',
        skill_check: { skill: 'combat', difficulty: 'hard' },
      },
    ],
  },
  theft: {
    titleStem: 'Missing Supplies',
    contextLabel: 'resource_shortage',
    description: ({ primaryName, secondaryName, contextSummary }: any) => `A shortage has put ${primaryName} under suspicion, and ${secondaryName} is already naming names. ${contextSummary} means missing crates feel like sabotage, not hunger.`,
    resolutionOptions: ({ severity }: any) => [
      {
        id: 'investigate_tracks',
        label: 'Investigate the theft',
        description: 'Audit stores, trace movement, and confront whoever touched the cache last.',
        morale_effect: 3,
        risk: 'low',
        skill_check: { skill: 'survival', difficulty: severity === 'critical' ? 'hard' : 'moderate' },
      },
      {
        id: 'settle_with_reparations',
        label: 'Settle with reparations',
        description: 'Negotiate repayment and contain the fallout before the whole quarter erupts.',
        morale_effect: 2,
        risk: 'medium',
        skill_check: { skill: 'social', difficulty: 'moderate' },
      },
      {
        id: 'punish_publicly',
        label: 'Punish publicly',
        description: 'Make an example out of the suspect and remind everyone who owns the storeroom keys.',
        morale_effect: -3,
        risk: 'high',
        skill_check: { skill: 'leadership', difficulty: 'hard' },
      },
    ],
  },
  breakdown: {
    titleStem: 'Cracks in the Line',
    contextLabel: 'stress_break',
    description: ({ primaryName, secondaryName, contextSummary }: any) => `${primaryName} is visibly fraying after too many shifts without relief, and ${secondaryName} is one of the few people they still trust. ${contextSummary} turns exhaustion into operational risk.`,
    resolutionOptions: ({ severity }: any) => [
      {
        id: 'medical_intervention',
        label: 'Medical intervention',
        description: 'Pull the survivor off the line, medicate, and give them structured recovery time.',
        morale_effect: 5,
        risk: 'low',
        skill_check: { skill: 'medical', difficulty: severity === 'critical' ? 'hard' : 'moderate' },
      },
      {
        id: 'reassign_support',
        label: 'Assign support detail',
        description: 'Pair them with a steady hand and reduce immediate duties without making it look like exile.',
        morale_effect: 3,
        risk: 'medium',
        skill_check: { skill: 'leadership', difficulty: 'moderate' },
      },
      {
        id: 'force_through_shift',
        label: 'Force them through the shift',
        description: 'Keep the workload intact and rely on discipline to get them over the worst of it.',
        morale_effect: -4,
        risk: 'high',
        skill_check: { skill: 'combat', difficulty: 'hard' },
      },
    ],
  },
  sabotage: {
    titleStem: 'Sabotage Scare',
    contextLabel: 'infrastructure_risk',
    description: ({ primaryName, secondaryName, contextSummary }: any) => `A damaged subsystem points back to ${primaryName}, while ${secondaryName} argues the colony cannot afford another quiet failure. ${contextSummary} puts every repair team under suspicion.`,
    resolutionOptions: ({ severity }: any) => [
      {
        id: 'trace_the_fault',
        label: 'Trace the fault',
        description: 'Inspect the damaged systems and prove whether this was sabotage or a desperate shortcut.',
        morale_effect: 4,
        risk: 'low',
        skill_check: { skill: 'crafting', difficulty: severity === 'critical' ? 'hard' : 'moderate' },
      },
      {
        id: 'lock_critical_systems',
        label: 'Lock critical systems',
        description: 'Restrict access to fuel, power, and armory controls until command knows who to trust.',
        morale_effect: 0,
        risk: 'medium',
        skill_check: { skill: 'leadership', difficulty: 'hard' },
      },
      {
        id: 'hunt_the_saboteur',
        label: 'Hunt the saboteur',
        description: 'Treat the damage as hostile action and sweep the colony with armed teams.',
        morale_effect: -3,
        risk: 'high',
        skill_check: { skill: 'survival', difficulty: 'hard' },
      },
    ],
  },
  romance: {
    titleStem: 'Unauthorized Attachment',
    contextLabel: 'relationship_strain',
    description: ({ primaryName, secondaryName, contextSummary }: any) => `${primaryName} and ${secondaryName} are getting careless about a relationship that is starting to bend work rotations and loyalties. ${contextSummary} makes private attachments everybody else's problem.`,
    resolutionOptions: ({ severity }: any) => [
      {
        id: 'set_boundaries',
        label: 'Set firm boundaries',
        description: 'Keep them together but establish hard rules for shift discipline and shared duties.',
        morale_effect: 4,
        risk: 'low',
        skill_check: { skill: 'social', difficulty: 'moderate' },
      },
      {
        id: 'formalize_roles',
        label: 'Formalize roles',
        description: 'Restructure assignments so their loyalty strengthens the colony instead of distorting it.',
        morale_effect: 2,
        risk: 'medium',
        skill_check: { skill: 'leadership', difficulty: 'moderate' },
      },
      {
        id: 'separate_the_pair',
        label: 'Separate the pair',
        description: 'Break up the arrangement before it grows into a faction inside the walls.',
        morale_effect: -3,
        risk: 'high',
        skill_check: { skill: 'leadership', difficulty: severity === 'critical' ? 'hard' : 'moderate' },
      },
    ],
  },
  rivalry: {
    titleStem: 'Rivalry Boils Over',
    contextLabel: 'status_competition',
    description: ({ primaryName, secondaryName, contextSummary }: any) => `${primaryName} and ${secondaryName} have turned an old competition into a daily disruption. ${contextSummary} ensures every witness already has a side.`,
    resolutionOptions: ({ severity }: any) => [
      {
        id: 'structured_contest',
        label: 'Stage a structured contest',
        description: 'Channel the rivalry into a scored test with rules, witnesses, and stakes everybody accepts.',
        morale_effect: 3,
        risk: 'medium',
        skill_check: { skill: 'combat', difficulty: severity === 'critical' ? 'hard' : 'moderate' },
      },
      {
        id: 'mediate_terms',
        label: 'Mediate terms',
        description: 'Force both sides to set terms, concede ground, and agree on a line they will not cross.',
        morale_effect: 5,
        risk: 'low',
        skill_check: { skill: 'social', difficulty: 'moderate' },
      },
      {
        id: 'impose_chain_of_command',
        label: 'Impose chain of command',
        description: 'End the debate and make one survivor answer to the other until the tension breaks.',
        morale_effect: -2,
        risk: 'high',
        skill_check: { skill: 'leadership', difficulty: 'hard' },
      },
    ],
  },
};

const RELATION_POSITIVE_TYPES = new Set(['ally', 'friend', 'trusted', 'partner', 'romantic']);

const normalizeSeverity = (value: unknown) => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : 'moderate';
  return DRAMA_SEVERITIES.includes(normalized) ? normalized : 'moderate';
};

const normalizeRisk = (value: unknown) => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : 'medium';
  return ['none', 'low', 'medium', 'high'].includes(normalized) ? normalized : 'medium';
};

const formatName = (survivor: any) => survivor?.nickname || survivor?.name || 'Unknown survivor';

const getRelationshipScore = (survivor: any, targetId: string) => {
  const relationship = Array.isArray(survivor?.relationships)
    ? survivor.relationships.find((entry: any) => entry?.survivor_id === targetId)
    : null;
  if (!relationship) {
    return 0;
  }

  const strength = Number(relationship?.strength || 0);
  const type = String(relationship?.type || '').toLowerCase();
  const polarity = RELATION_POSITIVE_TYPES.has(type) ? 1 : type ? -1 : 0;
  return strength + polarity * 2;
};

const buildContextSummary = (contextFactors: string[]) => {
  if (!contextFactors.length) {
    return 'The strain is subtle, but everyone can feel it.';
  }
  return `The pressure comes from ${contextFactors.slice(0, 3).map((factor) => factor.replace(/_/g, ' ')).join(', ')}.`;
};

const selectPair = (survivors: any[], cycleKey: string, scorePair: (left: any, right: any) => number) => {
  let bestPair: any[] = survivors.slice(0, 2);
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let leftIndex = 0; leftIndex < survivors.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < survivors.length; rightIndex += 1) {
      const left = survivors[leftIndex];
      const right = survivors[rightIndex];
      const score = scorePair(left, right);
      const tieBreaker = stableHash('drama-pair', cycleKey, left?.id, right?.id) / 1000000;
      if ((score + tieBreaker) > bestScore) {
        bestScore = score + tieBreaker;
        bestPair = [left, right];
      }
    }
  }

  return bestPair.filter(Boolean);
};

const sortByStress = (survivors: any[]) => [...survivors].sort((left, right) => {
  const leftValue = Number(left?.stress || 0) - Number(left?.rest || 0) - Number(left?.social || 0);
  const rightValue = Number(right?.stress || 0) - Number(right?.rest || 0) - Number(right?.social || 0);
  return rightValue - leftValue;
});

export const getMoraleBand = (morale: number) => {
  if (morale <= 20) return 'desperate';
  if (morale <= 40) return 'anxious';
  if (morale <= 60) return 'neutral';
  return 'content';
};

export const getComplexityTier = (survivorCount: number, dramaHistory: number, activeThreatCount: number) => {
  let score = 0;
  if (survivorCount >= 15) score += 3;
  else if (survivorCount >= 8) score += 2;
  else if (survivorCount >= 4) score += 1;

  if (dramaHistory >= 10) score += 2;
  else if (dramaHistory >= 5) score += 1;

  if (activeThreatCount > 0) score += 1;

  if (score >= 5) return 'epic';
  if (score >= 3) return 'complex';
  if (score >= 1) return 'layered';
  return 'simple';
};

export const buildDramaContextFactors = (colony: any, world: any, territories: any[], survivors: any[]) => {
  const factors: string[] = [];
  const activeThreatCount = territories.filter((territory) => territory?.active_threat_wave?.status === 'incoming').length;

  if ((colony?.food_reserves ?? 100) < 30) factors.push('low_food');
  if ((colony?.water_supply ?? 100) < 30) factors.push('low_water');
  if ((colony?.medical_supplies ?? 100) < 30) factors.push('low_medical');
  if ((colony?.defense_integrity ?? 100) < 35) factors.push('weak_defenses');
  if (activeThreatCount > 0) factors.push('active_threats');
  if (['radiation_storm', 'acid_rain', 'dust_storm', 'blizzard'].includes(world?.weather)) factors.push('hazardous_weather');
  if (survivors.length >= 15) factors.push('large_colony');
  if (survivors.length <= 4) factors.push('small_colony');
  if (survivors.some((survivor) => (survivor?.stress ?? 0) >= 75)) factors.push('high_stress');
  if (survivors.some((survivor) => (survivor?.rest ?? 70) <= 20)) factors.push('fatigue');

  return factors;
};

const pickInvolvedSurvivors = (dramaType: string, survivors: any[], cycleKey: string) => {
  const rotated = rotateDeterministic(survivors.filter(Boolean), 'drama-survivors', cycleKey);
  if (rotated.length === 0) {
    return [];
  }

  if (dramaType === 'romance') {
    return selectPair(rotated, cycleKey, (left, right) =>
      getRelationshipScore(left, right.id) + getRelationshipScore(right, left.id) + (left?.social ?? 0) + (right?.social ?? 0));
  }

  if (['fight', 'rivalry', 'mutiny'].includes(dramaType)) {
    return selectPair(rotated, cycleKey, (left, right) =>
      (left?.stress ?? 0) + (right?.stress ?? 0) - getRelationshipScore(left, right.id) - getRelationshipScore(right, left.id));
  }

  if (dramaType === 'breakdown') {
    const sorted = sortByStress(rotated);
    return [sorted[0], sorted.find((entry) => entry?.id !== sorted[0]?.id && (entry?.social ?? 0) >= 40) || sorted[1]].filter(Boolean);
  }

  if (['theft', 'sabotage', 'desertion'].includes(dramaType)) {
    const sorted = [...rotated].sort((left, right) => {
      const leftValue = (100 - Number(left?.hunger ?? 80)) + Number(left?.stress ?? 0) + (left?.current_task === 'scavenge' ? 10 : 0);
      const rightValue = (100 - Number(right?.hunger ?? 80)) + Number(right?.stress ?? 0) + (right?.current_task === 'scavenge' ? 10 : 0);
      return rightValue - leftValue;
    });
    return [sorted[0], sorted.find((entry) => entry?.id !== sorted[0]?.id) || null].filter(Boolean);
  }

  return rotated.slice(0, Math.min(2, rotated.length));
};

const buildResolutionOptions = (dramaType: string, severity: string, params: any) => {
  const rule = DRAMA_RULES[dramaType] || DRAMA_RULES.breakdown;
  return rule.resolutionOptions({ ...params, severity }).map((option) => {
    const skill = normalizeSkillName(option?.skill_check?.skill);
    const difficulty = normalizeDifficulty(option?.skill_check?.difficulty);
    return {
      id: option.id,
      label: option.label,
      description: option.description,
      morale_effect: Math.max(-10, Math.min(10, Number(option.morale_effect || 0))),
      risk: normalizeRisk(option.risk),
      ...(skill ? { skill_check: { skill, difficulty } } : {}),
    };
  });
};

const buildDescription = (dramaType: string, params: any) => {
  const rule = DRAMA_RULES[dramaType] || DRAMA_RULES.breakdown;
  return rule.description(params);
};

export const buildDramaDraft = ({
  colony,
  survivors,
  recentDramas = [],
  territories = [],
  world = {},
  cycleKey,
}: {
  colony: any;
  survivors: any[];
  recentDramas?: any[];
  territories?: any[];
  world?: any;
  cycleKey: string;
}) => {
  const activeSurvivors = survivors.filter((survivor) => survivor?.status === 'active');
  if (activeSurvivors.length === 0) {
    return null;
  }

  const morale = Number(colony?.morale ?? 50);
  const moraleBand = getMoraleBand(morale);
  const activeThreatCount = territories.filter((territory) => territory?.active_threat_wave?.status === 'incoming').length;
  const complexityTier = getComplexityTier(activeSurvivors.length, recentDramas.length, activeThreatCount);
  const contextFactors = buildDramaContextFactors(colony, world, territories, activeSurvivors);
  const recentTypes = new Set(recentDramas.slice(0, 5).map((drama) => drama?.drama_type).filter(Boolean));

  const typeScores = Object.keys(DRAMA_RULES).map((dramaType) => {
    let score = stableHash('drama-score-base', cycleKey, dramaType) % 15;
    if (contextFactors.includes('low_food') || contextFactors.includes('low_water')) {
      if (dramaType === 'theft') score += 28;
      if (dramaType === 'mutiny') score += 20;
    }
    if (contextFactors.includes('weak_defenses') || contextFactors.includes('active_threats')) {
      if (dramaType === 'sabotage') score += 22;
      if (dramaType === 'desertion') score += 18;
    }
    if (contextFactors.includes('hazardous_weather')) {
      if (dramaType === 'breakdown') score += 16;
      if (dramaType === 'mutiny') score += 10;
    }
    if (contextFactors.includes('high_stress') || contextFactors.includes('fatigue')) {
      if (dramaType === 'breakdown') score += 24;
      if (dramaType === 'fight') score += 20;
      if (dramaType === 'rivalry') score += 12;
    }
    if (activeSurvivors.some((survivor) => Array.isArray(survivor?.relationships) && survivor.relationships.some((entry: any) => Number(entry?.strength || 0) >= 5))) {
      if (dramaType === 'romance') score += 10;
      if (dramaType === 'rivalry') score += 8;
    }
    if (moraleBand === 'desperate') {
      if (dramaType === 'mutiny') score += 16;
      if (dramaType === 'desertion') score += 14;
    }
    if (moraleBand === 'content') {
      if (dramaType === 'romance') score += 12;
      if (dramaType === 'rivalry') score += 8;
    }
    if (recentTypes.has(dramaType)) {
      score -= 18;
    }

    return { dramaType, score };
  }).sort((left, right) => right.score - left.score);

  const selectedType = typeScores[0]?.dramaType || 'breakdown';
  const involved = pickInvolvedSurvivors(selectedType, activeSurvivors, cycleKey);
  const primary = involved[0] || activeSurvivors[0];
  const secondary = involved[1] || activeSurvivors.find((survivor) => survivor?.id !== primary?.id) || primary;

  const severityIndex = Math.max(0, Math.min(3,
    (moraleBand === 'desperate' ? 2 : moraleBand === 'anxious' ? 1 : 0)
    + (contextFactors.includes('active_threats') ? 1 : 0)
    + (contextFactors.includes('high_stress') ? 1 : 0)
    + (complexityTier === 'epic' ? 1 : 0)
    - (moraleBand === 'content' ? 1 : 0)));
  const severity = DRAMA_SEVERITIES[severityIndex] || 'moderate';

  const params = {
    severity,
    primaryName: formatName(primary),
    secondaryName: formatName(secondary),
    contextSummary: buildContextSummary(contextFactors),
  };

  const rule = DRAMA_RULES[selectedType] || DRAMA_RULES.breakdown;

  return {
    drama_type: selectedType,
    severity,
    title: `${rule.titleStem}: ${formatName(primary)}`,
    description: buildDescription(selectedType, params),
    involved_survivor_ids: involved.map((survivor) => survivor?.id).filter(Boolean),
    involved_survivor_names: involved.map((survivor) => formatName(survivor)).filter(Boolean),
    context_factors: contextFactors,
    complexity_tier: complexityTier,
    resolution_options: buildResolutionOptions(selectedType, severity, params),
  };
};

const reactionEffectByType: Record<string, 'positive' | 'negative' | 'neutral'> = {
  de_escalate: 'positive',
  morale_boost: 'positive',
  offer_help: 'positive',
  investigate: 'neutral',
  avoid: 'neutral',
  form_alliance: 'negative',
  spread_rumor: 'negative',
  exploit: 'negative',
};

const reactionNarrative = (survivorName: string, reactionType: string, dramaTitle: string, involvedNames: string) => {
  switch (reactionType) {
    case 'de_escalate':
      return `${survivorName} steps between the loudest voices and forces the room to breathe. Their calm read of ${dramaTitle} pulls some of the heat away from ${involvedNames}.`;
    case 'spread_rumor':
      return `${survivorName} turns whispers into a circuit around the bunks. By nightfall, ${dramaTitle} is being retold with sharper edges and fewer facts.`;
    case 'form_alliance':
      return `${survivorName} quietly picks a side and starts collecting nods from the fence-sitters. The dispute around ${dramaTitle} starts to look like a faction line instead of a bad day.`;
    case 'offer_help':
      return `${survivorName} moves in with supplies, labor, and a practical plan. Their help gives ${involvedNames} one solid place to stand while the rest of the colony watches.`;
    case 'exploit':
      return `${survivorName} sees an opening and starts trading favors while everyone else is distracted. The disorder around ${dramaTitle} suddenly benefits somebody.`;
    case 'investigate':
      return `${survivorName} keeps their head down and starts checking facts, footprints, and work logs. They treat ${dramaTitle} like a problem that can be solved if the details stop lying.`;
    case 'morale_boost':
      return `${survivorName} refuses to let the air go dead and starts pulling people back toward each other. It is not enough to solve ${dramaTitle}, but it keeps the fear from owning the hour.`;
    default:
      return `${survivorName} keeps their distance and watches ${dramaTitle} unfold without stepping in. Their silence says almost as much as any speech could.`;
  }
};

export const buildDramaReactions = ({
  drama,
  survivors,
  cycleKey,
}: {
  drama: any;
  survivors: any[];
  cycleKey: string;
}) => {
  const existingReactions = Array.isArray(drama?.ai_reactions) ? drama.ai_reactions : [];
  const involvedIds = new Set(Array.isArray(drama?.involved_survivor_ids) ? drama.involved_survivor_ids : []);
  const reactedIds = new Set(existingReactions.map((reaction: any) => reaction?.survivor_id));
  const potentialReactors = survivors.filter((survivor) => !involvedIds.has(survivor?.id) && !reactedIds.has(survivor?.id));

  if (potentialReactors.length === 0) {
    return [];
  }

  const maxReactors = Math.min(3, potentialReactors.length);
  const reactorCount = Math.max(1, Math.min(maxReactors, 1 + (stableHash('drama-reactor-count', cycleKey, drama?.id) % maxReactors)));
  const sorted = [...potentialReactors].sort((left, right) =>
    stableHash('drama-reactor-order', cycleKey, drama?.id, left?.id) - stableHash('drama-reactor-order', cycleKey, drama?.id, right?.id));
  const selected = sorted.slice(0, reactorCount);
  const involvedNames = (drama?.involved_survivor_names || []).join(', ') || 'the involved survivors';

  return selected.map((survivor, index) => {
    const personality = String(survivor?.personality || '').toLowerCase();
    const skills = survivor?.skills || {};
    let reactionType = 'avoid';

    if (personality.includes('paranoid') || personality.includes('anxious')) reactionType = 'spread_rumor';
    else if (personality.includes('aggressive')) reactionType = 'form_alliance';
    else if (personality.includes('nurturing') || Number(skills.medical || 0) >= 100) reactionType = 'offer_help';
    else if (personality.includes('cheerful') || survivor?.skill === 'cook') reactionType = 'morale_boost';
    else if (personality.includes('loner') || personality.includes('stoic')) reactionType = 'avoid';
    else if (Number(skills.social || 0) >= 100 || Number(skills.leadership || 0) >= 100) reactionType = 'de_escalate';
    else if (Number(skills.survival || 0) >= 100 || survivor?.skill === 'guard' || survivor?.skill === 'scavenger') reactionType = 'investigate';
    else if (survivor?.skill === 'trader') reactionType = 'exploit';

    if (drama?.drama_type === 'romance' && reactionType === 'form_alliance') reactionType = 'spread_rumor';
    if (drama?.drama_type === 'theft' && reactionType === 'avoid') reactionType = 'investigate';

    return {
      survivor_id: survivor?.id,
      survivor_name: formatName(survivor),
      reaction_type: reactionType,
      action: `${formatName(survivor)} reacts to ${drama?.title} by ${reactionType.replace(/_/g, ' ')}.`,
      narrative: reactionNarrative(formatName(survivor), reactionType, drama?.title || 'the dispute', involvedNames),
      effect: reactionEffectByType[reactionType] || 'neutral',
      timestamp: new Date(Date.now() + index * 1000).toISOString(),
    };
  });
};

export const buildDramaOutcomeNarrative = ({
  drama,
  choice,
  checkResult,
  checkSurvivorName,
  consequences,
}: {
  drama: any;
  choice: any;
  checkResult?: any;
  checkSurvivorName?: string | null;
  consequences?: string[];
}) => {
  const consequenceSummary = (consequences || []).slice(0, 3).map((value) => value.replace(/_/g, ' ')).join(', ');
  const skillSentence = checkResult
    ? `${checkSurvivorName || 'A survivor'} made a ${checkResult.difficulty} ${choice?.skill_check?.skill} check and ${checkResult.critical ? 'won a decisive success' : checkResult.fumble ? 'collapsed under the pressure' : checkResult.passed ? 'held the line' : 'came up short'}.`
    : 'No formal skill check decided the outcome; the result came down to discipline and timing.';
  const moraleSentence = Number(choice?.morale_effect || 0) >= 0
    ? 'The colony comes out of it steadier than it went in.'
    : 'The colony pays for the decision with visible tension afterward.';
  const consequenceSentence = consequenceSummary ? `Visible fallout: ${consequenceSummary}.` : '';
  return `${choice?.label || 'The chosen response'} settles ${drama?.title || 'the dispute'} on hard practical terms. ${skillSentence} ${moraleSentence}${consequenceSentence ? ` ${consequenceSentence}` : ''}`.replace(/\s+/g, ' ').trim();
};

export const buildNeedsDrama = ({
  trigger,
  colony,
  survivors,
  cycleKey,
}: {
  trigger: any;
  colony: any;
  survivors: any[];
  cycleKey: string;
}) => {
  const needMap: Record<string, string[]> = {
    hunger: ['theft', 'mutiny', 'desertion'],
    social: ['rivalry', 'romance', 'fight'],
    rest: ['breakdown', 'desertion', 'sabotage'],
    stress: ['breakdown', 'fight', 'mutiny'],
  };

  const options = needMap[trigger?.need] || ['breakdown'];
  const selectedType = pickDeterministic(options, 'needs-drama-type', cycleKey, trigger?.survivor_id, trigger?.need) || 'breakdown';
  const focal = survivors.find((survivor) => survivor?.id === trigger?.survivor_id) || trigger;
  const partner = survivors.find((survivor) =>
    survivor?.id !== focal?.id
    && survivor?.base_id === focal?.base_id
    && survivor?.status === 'active')
    || survivors.find((survivor) => survivor?.id !== focal?.id)
    || focal;

  const severity = normalizeSeverity(
    trigger?.need === 'stress' && Number(trigger?.value || 0) >= 90
      ? 'critical'
      : Number(trigger?.value || 0) >= 75
        ? 'serious'
        : 'moderate',
  );

  const contextFactors = buildDramaContextFactors(colony, {}, [], survivors);
  contextFactors.push(`needs_${trigger?.need || 'stress'}`);
  const params = {
    severity,
    primaryName: formatName(focal),
    secondaryName: formatName(partner),
    contextSummary: `${buildContextSummary(contextFactors)} ${formatName(focal)} is at ${trigger?.label || 'a breaking point'}.`,
  };

  const rule = DRAMA_RULES[selectedType] || DRAMA_RULES.breakdown;

  return {
    drama_type: selectedType,
    severity,
    title: `${rule.titleStem}: ${formatName(focal)}`,
    description: buildDescription(selectedType, params),
    involved_survivor_ids: [focal?.id, partner?.id].filter(Boolean),
    involved_survivor_names: [formatName(focal), formatName(partner)].filter(Boolean),
    context_factors: Array.from(new Set(contextFactors)).slice(0, 8),
    resolution_options: buildResolutionOptions(selectedType, severity, params),
  };
};
