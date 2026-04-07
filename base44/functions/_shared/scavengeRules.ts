import { deterministicBoolean, deterministicNumber, rotateDeterministic } from './deterministic.ts';
import { buildSourceRef } from './provenance.ts';

const THREAT_VALUE_RANGE = {
  minimal: [30, 80],
  low: [50, 120],
  moderate: [80, 200],
  high: [150, 350],
  critical: [250, 500],
} as const;

const RISK_PROBABILITY = {
  minimal: 0.1,
  low: 0.1,
  moderate: 0.4,
  high: 0.6,
  critical: 0.8,
} as const;

const RESOURCE_ITEM_MAP = {
  fuel: [
    { name: 'stabilizer canisters', valueFactor: 1.3, qty: [1, 3] },
    { name: 'sealed fuel cells', valueFactor: 1.5, qty: [1, 2] },
    { name: 'siphoned diesel drums', valueFactor: 1.1, qty: [1, 2] },
  ],
  metals: [
    { name: 'alloy plates', valueFactor: 1.1, qty: [2, 5] },
    { name: 'machine brackets', valueFactor: 1.0, qty: [2, 6] },
    { name: 'rebar bundles', valueFactor: 0.9, qty: [3, 7] },
  ],
  tech: [
    { name: 'signal relays', valueFactor: 1.6, qty: [1, 3] },
    { name: 'optic boards', valueFactor: 1.4, qty: [1, 3] },
    { name: 'battery regulators', valueFactor: 1.3, qty: [1, 4] },
  ],
  food: [
    { name: 'ration crates', valueFactor: 1.0, qty: [2, 6] },
    { name: 'protein tins', valueFactor: 0.9, qty: [3, 7] },
    { name: 'grain sacks', valueFactor: 0.8, qty: [2, 5] },
  ],
  munitions: [
    { name: 'repacked rounds', valueFactor: 1.4, qty: [2, 5] },
    { name: 'propellant tins', valueFactor: 1.2, qty: [1, 3] },
    { name: 'spare magazines', valueFactor: 1.1, qty: [1, 4] },
  ],
} as const;

const GENERIC_ITEMS = [
  { name: 'field scrap', valueFactor: 0.7, qty: [2, 6] },
  { name: 'salvage wiring', valueFactor: 0.9, qty: [2, 5] },
  { name: 'sealed med packs', valueFactor: 1.2, qty: [1, 3] },
  { name: 'tool kits', valueFactor: 1.1, qty: [1, 2] },
  { name: 'water filters', valueFactor: 1.0, qty: [1, 3] },
  { name: 'spare bearings', valueFactor: 0.8, qty: [2, 5] },
];

const sanitizeText = (value: unknown, maxLength = 120) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
};

const getThreatKey = (value: unknown) => {
  const normalized = sanitizeText(value, 20);
  return ['minimal', 'low', 'moderate', 'high', 'critical'].includes(normalized)
    ? normalized as keyof typeof THREAT_VALUE_RANGE
    : 'moderate';
};

const getPriceInfo = (commodities: any[]) => {
  const priceMap = new Map<string, { price: number; availability: string }>();
  for (const commodity of commodities) {
    const resource = sanitizeText(commodity?.resource_type, 20);
    if (!resource) continue;
    priceMap.set(resource, {
      price: Math.max(5, Math.round(Number(commodity?.current_price || commodity?.base_price || 10) || 10)),
      availability: sanitizeText(commodity?.availability, 20) || 'normal',
    });
  }
  return priceMap;
};

const getResourceTemplates = (resource: string) => RESOURCE_ITEM_MAP[resource as keyof typeof RESOURCE_ITEM_MAP] || [];

export function buildScavengeOutcome({
  territory,
  controller,
  commodities,
  playerEmail,
  attemptIndex,
}: {
  territory: any;
  controller?: any;
  commodities: any[];
  playerEmail: string;
  attemptIndex: number;
}) {
  const threatKey = getThreatKey(territory?.threat_level);
  const seed = `scavenge:${sanitizeText(playerEmail, 120)}:${sanitizeText(territory?.id, 80)}:${attemptIndex}`;
  const priceInfo = getPriceInfo(commodities);
  const scarceResources = new Set(
    commodities
      .filter((commodity) => ['scarce', 'low'].includes(sanitizeText(commodity?.availability, 20)))
      .map((commodity) => sanitizeText(commodity?.resource_type, 20))
      .filter(Boolean),
  );
  const surplusResources = new Set(
    commodities
      .filter((commodity) => ['high', 'surplus'].includes(sanitizeText(commodity?.availability, 20)))
      .map((commodity) => sanitizeText(commodity?.resource_type, 20))
      .filter(Boolean),
  );
  const territoryResources = Array.isArray(territory?.resources)
    ? territory.resources.map((resource: unknown) => sanitizeText(resource, 20)).filter(Boolean)
    : [];
  const pool = [
    ...territoryResources.flatMap((resource) => getResourceTemplates(resource).map((entry) => ({ ...entry, resource }))),
    ...GENERIC_ITEMS.map((entry) => ({ ...entry, resource: 'generic' })),
  ];
  const rotatedPool = rotateDeterministic(pool, seed, 'pool');
  const itemCount = Math.min(rotatedPool.length, deterministicNumber(3, 6, seed, 'count'));
  const [minValue, maxValue] = THREAT_VALUE_RANGE[threatKey];
  const hadComplication = deterministicBoolean(RISK_PROBABILITY[threatKey], seed, 'complication');
  const targetTotal = deterministicNumber(minValue, maxValue, seed, 'target_total');
  const effectiveTarget = hadComplication ? Math.max(minValue, Math.round(targetTotal * 0.7)) : targetTotal;
  const lootItems = rotatedPool.slice(0, itemCount).map((entry, index) => {
    const quantity = deterministicNumber(entry.qty[0], entry.qty[1], seed, entry.name, 'qty', index);
    const market = priceInfo.get(entry.resource);
    const scarcityMultiplier = scarceResources.has(entry.resource) ? 1.4 : surplusResources.has(entry.resource) ? 0.8 : 1;
    const threatMultiplier = threatKey === 'critical' ? 1.5 : threatKey === 'high' ? 1.3 : threatKey === 'moderate' ? 1.1 : 1;
    const unitValue = Math.max(
      5,
      Math.round((market?.price || deterministicNumber(8, 18, seed, entry.name, 'fallback_price')) * entry.valueFactor * scarcityMultiplier * threatMultiplier),
    );
    return {
      name: entry.name,
      quantity,
      rarity: getItemRarity({
        resource: entry.resource,
        threatKey,
        scarceResources,
        surplusResources,
      }),
      value: unitValue,
    };
  });

  const computedTotal = lootItems.reduce((sum, item) => sum + (item.quantity * item.value), 0);
  const scale = computedTotal > 0 ? effectiveTarget / computedTotal : 1;
  const scaledItems = lootItems.map((item, index) => ({
    ...item,
    value: Math.max(5, Math.round(item.value * scale) || deterministicNumber(5, 20, seed, item.name, 'scaled', index)),
  }));
  const totalValue = scaledItems.reduce((sum, item) => sum + (item.quantity * item.value), 0);
  const durationMinutes = deterministicNumber(15, 44, seed, 'duration');

  return {
    seed,
    loot_items: scaledItems,
    loot_summary: buildLootSummary({
      territory,
      controller,
      threatKey,
      resources: territoryResources,
      hadComplication,
      totalValue,
    }),
    risk_event: hadComplication ? buildRiskEvent({ territory, controller, threatKey, resources: territoryResources }) : '',
    had_complication: hadComplication,
    total_value: totalValue,
    duration_minutes: durationMinutes,
    source_refs: [
      buildSourceRef('territory', territory?.id),
      buildSourceRef('faction', controller?.id),
      ...territoryResources.slice(0, 3).map((resource) => `resource:${resource}`),
      `seed:${seed}`,
    ],
  };
}

function getItemRarity({
  resource,
  threatKey,
  scarceResources,
  surplusResources,
}: {
  resource: string;
  threatKey: string;
  scarceResources: Set<string>;
  surplusResources: Set<string>;
}) {
  if (resource !== 'generic' && scarceResources.has(resource)) {
    return threatKey === 'critical' || threatKey === 'high' ? 'rare' : 'uncommon';
  }
  if (surplusResources.has(resource)) {
    return 'common';
  }
  if (threatKey === 'critical') return 'rare';
  if (threatKey === 'high') return 'uncommon';
  return 'common';
}

function buildLootSummary({
  territory,
  controller,
  threatKey,
  resources,
  hadComplication,
  totalValue,
}: {
  territory: any;
  controller?: any;
  threatKey: string;
  resources: string[];
  hadComplication: boolean;
  totalValue: number;
}) {
  const territoryName = sanitizeText(territory?.name, 80) || 'the target zone';
  const factionName = sanitizeText(controller?.name, 80) || 'unclaimed patrols';
  const resourceText = resources.slice(0, 2).join(' and ') || 'mixed salvage';
  const firstSentence = `Scouts moved through ${territoryName} under ${threatKey} pressure and recovered ${resourceText} worth ${totalValue} credits.`;
  if (hadComplication) {
    return `${firstSentence} The run came back leaner than planned after the sector pushed back.`;
  }
  return `${firstSentence} Control markers tied to ${factionName} were present, but the route held long enough to strip the best of it.`;
}

function buildRiskEvent({
  territory,
  controller,
  threatKey,
  resources,
}: {
  territory: any;
  controller?: any;
  threatKey: string;
  resources: string[];
}) {
  const territoryName = sanitizeText(territory?.name, 80) || 'the zone';
  const factionName = sanitizeText(controller?.name, 80) || 'local scavengers';
  const resourceText = resources[0] || 'salvage';

  if (threatKey === 'critical' || threatKey === 'high') {
    return `Hostile pressure near ${territoryName} forced the team off the clean route and cost part of the ${resourceText} haul before exfiltration.`;
  }

  return `${factionName} patrol traces around ${territoryName} cut the search short and left part of the ${resourceText} cache behind.`;
}
