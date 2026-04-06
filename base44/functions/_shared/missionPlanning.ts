export class MissionPlanningError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'MissionPlanningError';
    this.status = status;
  }
}

export const VALID_OPERATION_TYPES = new Set([
  'assault',
  'recon',
  'defense',
  'sabotage',
  'scavenge',
  'escort',
]);

const HEALTH_PENALTIES: Record<string, number> = {
  critical: -20,
  injured: -12,
  sick: -8,
  healthy: 0,
  peak: 5,
};

const MORALE_MODIFIERS: Record<string, number> = {
  desperate: -15,
  anxious: -8,
  neutral: 0,
  content: 5,
  thriving: 10,
};

const OPERATION_SKILLS: Record<string, string[]> = {
  assault: ['guard', 'scavenger'],
  recon: ['scavenger', 'mechanic'],
  defense: ['guard', 'engineer'],
  sabotage: ['mechanic', 'engineer'],
  scavenge: ['scavenger', 'trader'],
  escort: ['guard', 'medic'],
};

const THREAT_MODIFIERS: Record<string, number> = {
  minimal: 10,
  low: 5,
  moderate: 0,
  high: -12,
  critical: -25,
};

const STATUS_MODIFIERS: Record<string, number> = {
  secured: 8,
  uncharted: -3,
  contested: -12,
  hostile: -20,
};

const DIPLOMACY_STATUS_MODIFIERS: Record<string, number> = {
  war: -20,
  hostile: -12,
  neutral: 0,
  ceasefire: 3,
  trade_agreement: 8,
  allied: 12,
};

const OPERATION_DIFFICULTY: Record<string, number> = {
  recon: 5,
  scavenge: 3,
  escort: 0,
  defense: -3,
  sabotage: -8,
  assault: -12,
};

export const normalizeIdArray = (value: unknown, maxItems = 12) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(
    value
      .map((item) => sanitizeText(item, 80))
      .filter(Boolean),
  )).slice(0, maxItems);
};

export const sanitizeText = (value: unknown, maxLength = 200) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
};

export const clampNumber = (value: unknown, min: number, max: number, fallback: number) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, numeric));
};

export const loadMissionPlanningContext = async (
  base44: any,
  user: any,
  { territoryId, survivorIds }: { territoryId: string; survivorIds: string[] },
) => {
  const [territories, diplomacyRecords, factions, inventoryItems, survivorGroups, playerBases] = await Promise.all([
    base44.asServiceRole.entities.Territory.filter({ id: territoryId }),
    base44.asServiceRole.entities.Diplomacy.list('-updated_date', 100),
    base44.asServiceRole.entities.Faction.list('-created_date', 50),
    base44.asServiceRole.entities.InventoryItem.filter({ owner_email: user.email }, '-created_date', 500),
    Promise.all(survivorIds.map((id) => base44.asServiceRole.entities.Survivor.filter({ id }))),
    user.role === 'admin'
      ? Promise.resolve([])
      : base44.asServiceRole.entities.PlayerBase.filter({ owner_email: user.email }),
  ]);

  const territory = territories[0];
  if (!territory) {
    throw new MissionPlanningError('Territory not found', 404);
  }

  const squad = survivorGroups.map((group) => group[0]).filter(Boolean);
  if (squad.length === 0) {
    throw new MissionPlanningError('No valid survivors found', 400);
  }
  if (squad.length !== survivorIds.length) {
    throw new MissionPlanningError('One or more survivors were not found', 400);
  }
  if (squad.some((survivor) => survivor.status !== 'active')) {
    throw new MissionPlanningError('All assigned survivors must be active', 409);
  }

  if (user.role !== 'admin') {
    const ownedBaseIds = new Set(playerBases.map((base: any) => base.id).filter(Boolean));
    const unauthorized = squad.some((survivor) => !ownedBaseIds.has(survivor.base_id));
    if (unauthorized) {
      throw new MissionPlanningError('One or more survivors are not available to this planner', 403);
    }
  }

  return {
    territory,
    diplomacyRecords,
    factions,
    inventoryItems,
    squad,
  };
};

export const buildMissionRiskAssessment = ({
  territory,
  diplomacyRecords,
  factions,
  inventoryItems,
  squad,
  operationType,
}: {
  territory: any;
  diplomacyRecords: any[];
  factions: any[];
  inventoryItems: any[];
  squad: any[];
  operationType: string;
}) => {
  const riskFactors = [];
  let baseSuccess = 60;

  const averageCombat = squad.reduce(
    (sum, survivor) => sum + clampNumber(survivor.combat_rating, 1, 10, 1),
    0,
  ) / squad.length;
  const combatBonus = clampNumber((averageCombat - 3) * 5, -15, 20, 0);
  riskFactors.push({
    factor: 'Squad Combat Rating',
    impact: Math.round(combatBonus),
    detail: `Average combat: ${averageCombat.toFixed(1)}/10 across ${squad.length} operatives`,
  });
  baseSuccess += combatBonus;

  const sizeBonus = Math.min(10, Math.max(0, (squad.length - 1) * 3));
  riskFactors.push({
    factor: 'Squad Size',
    impact: sizeBonus,
    detail: `${squad.length} operative${squad.length > 1 ? 's' : ''} assigned`,
  });
  baseSuccess += sizeBonus;

  const averageHealth = squad.reduce(
    (sum, survivor) => sum + (HEALTH_PENALTIES[survivor.health] ?? 0),
    0,
  ) / squad.length;
  riskFactors.push({
    factor: 'Squad Health',
    impact: Math.round(averageHealth),
    detail: squad
      .map((survivor) => `${sanitizeText(survivor.name, 40)}: ${sanitizeText(survivor.health, 20) || 'unknown'}`)
      .join(', '),
  });
  baseSuccess += averageHealth;

  const averageMorale = squad.reduce(
    (sum, survivor) => sum + (MORALE_MODIFIERS[survivor.morale] ?? 0),
    0,
  ) / squad.length;
  riskFactors.push({
    factor: 'Squad Morale',
    impact: Math.round(averageMorale),
    detail: squad
      .map((survivor) => `${sanitizeText(survivor.name, 40)}: ${sanitizeText(survivor.morale, 20) || 'unknown'}`)
      .join(', '),
  });
  baseSuccess += averageMorale;

  const idealSkills = OPERATION_SKILLS[operationType] || [];
  const matchingSpecialists = squad.filter((survivor) => idealSkills.includes(survivor.skill)).length;
  const skillBonus = matchingSpecialists > 0 ? Math.min(15, matchingSpecialists * 8) : -5;
  riskFactors.push({
    factor: 'Skill Compatibility',
    impact: skillBonus,
    detail: matchingSpecialists > 0
      ? `${matchingSpecialists}/${squad.length} have ideal skills (${idealSkills.join(', ')})`
      : `No specialists for ${operationType} (ideal: ${idealSkills.join(', ')})`,
  });
  baseSuccess += skillBonus;

  const equippedItems = inventoryItems.filter((item) => item.is_equipped);
  if (equippedItems.length > 0) {
    const averageCondition = equippedItems.reduce(
      (sum, item) => sum + clampNumber(item.condition, 0, 100, 50),
      0,
    ) / equippedItems.length;
    const equipmentBonus = Math.round((averageCondition - 50) / 5);
    riskFactors.push({
      factor: 'Equipment Condition',
      impact: equipmentBonus,
      detail: `Average gear condition: ${averageCondition.toFixed(0)}% across ${equippedItems.length} items`,
    });
    baseSuccess += equipmentBonus;
  } else {
    riskFactors.push({
      factor: 'Equipment Condition',
      impact: -10,
      detail: 'No equipped items found - squad is underequipped',
    });
    baseSuccess -= 10;
  }

  const threatPenalty = THREAT_MODIFIERS[territory.threat_level] ?? 0;
  riskFactors.push({
    factor: 'Territory Threat',
    impact: threatPenalty,
    detail: `${sanitizeText(territory.name, 80)} threat level: ${sanitizeText(territory.threat_level, 20) || 'unknown'}`,
  });
  baseSuccess += threatPenalty;

  const statusPenalty = STATUS_MODIFIERS[territory.status] ?? 0;
  riskFactors.push({
    factor: 'Territory Control',
    impact: statusPenalty,
    detail: `${sanitizeText(territory.name, 80)} status: ${sanitizeText(territory.status, 20) || 'unknown'}${territory.controlling_faction_id ? '' : ' (unclaimed)'}`,
  });
  baseSuccess += statusPenalty;

  if (territory.controlling_faction_id) {
    const controllingFaction = factions.find((faction) => faction.id === territory.controlling_faction_id) || null;
    const relevantDiplomacy = diplomacyRecords.filter((record) =>
      record.faction_a_id === territory.controlling_faction_id || record.faction_b_id === territory.controlling_faction_id
    );

    let worstModifier = 0;
    let worstStatus = 'neutral';
    for (const record of relevantDiplomacy) {
      const modifier = DIPLOMACY_STATUS_MODIFIERS[record.status] ?? 0;
      if (modifier < worstModifier) {
        worstModifier = modifier;
        worstStatus = record.status;
      }
    }

    const activeWars = relevantDiplomacy.filter(
      (record) => record.status === 'war' || record.status === 'hostile',
    ).length;
    const diplomaticPenalty = worstModifier - (activeWars * 3);
    riskFactors.push({
      factor: 'Diplomatic Tension',
      impact: diplomaticPenalty,
      detail: controllingFaction
        ? `Controlled by [${sanitizeText(controllingFaction.tag, 20)}] ${sanitizeText(controllingFaction.name, 80)} - ${activeWars} active conflicts, worst status: ${worstStatus}`
        : `Unknown faction controls this territory - worst status: ${worstStatus}`,
    });
    baseSuccess += diplomaticPenalty;
  }

  const operationModifier = OPERATION_DIFFICULTY[operationType] ?? 0;
  riskFactors.push({
    factor: 'Operation Difficulty',
    impact: operationModifier,
    detail: `${operationType.toUpperCase()} operations have ${operationModifier >= 0 ? 'lower' : 'higher'} inherent risk`,
  });
  baseSuccess += operationModifier;

  const successProbability = Math.max(5, Math.min(98, Math.round(baseSuccess)));
  const riskScore = 100 - successProbability;
  const riskTier = successProbability >= 80
    ? 'low'
    : successProbability >= 60
      ? 'moderate'
      : successProbability >= 40
        ? 'high'
        : 'critical';

  return {
    success_probability: successProbability,
    risk_score: riskScore,
    risk_tier: riskTier,
    risk_factors: riskFactors,
    squad_summary: {
      count: squad.length,
      avg_combat: Number.parseFloat(averageCombat.toFixed(1)),
      names: squad.map((survivor) => survivor.name),
    },
    territory_summary: {
      name: territory.name,
      sector: territory.sector,
      threat: territory.threat_level,
      status: territory.status,
    },
  };
};
