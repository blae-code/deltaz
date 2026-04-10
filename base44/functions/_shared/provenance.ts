const DEFAULT_RULE_VERSION = 'truth-v1';

export const DATA_ORIGINS = {
  USER: 'user',
  SYSTEM_RULE: 'system_rule',
  DETERMINISTIC_PROJECTION: 'deterministic_projection',
  MIGRATION: 'migration',
  ADVISORY: 'advisory',
  SERVER_TELEMETRY: 'server_telemetry',
} as const;

type DataOrigin = (typeof DATA_ORIGINS)[keyof typeof DATA_ORIGINS];

const sanitizeText = (value: unknown, maxLength = 160) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
};

const normalizeSourceRefs = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(
    value
      .map((item) => sanitizeText(item, 200))
      .filter(Boolean),
  )).slice(0, 24);
};

export const buildSourceRef = (entity: string, id: unknown, detail = '') => {
  const entityName = sanitizeText(entity, 40);
  const entityId = sanitizeText(id, 120);
  const suffix = sanitizeText(detail, 80);
  if (!entityName || !entityId) {
    return '';
  }

  return suffix ? `${entityName}:${entityId}#${suffix}` : `${entityName}:${entityId}`;
};

export const getCycleKey = (minutes = 30, now = Date.now()) => {
  const bucketSizeMs = Math.max(1, minutes) * 60 * 1000;
  return `cycle_${minutes}m_${Math.floor(now / bucketSizeMs)}`;
};

export const withProvenance = <T extends Record<string, unknown>>(
  payload: T,
  {
    dataOrigin,
    sourceRefs = [],
    ruleVersion = DEFAULT_RULE_VERSION,
    generatedAt = new Date().toISOString(),
  }: {
    dataOrigin: DataOrigin;
    sourceRefs?: unknown[];
    ruleVersion?: string;
    generatedAt?: string;
  },
) => ({
  ...payload,
  data_origin: dataOrigin,
  source_refs: normalizeSourceRefs(sourceRefs),
  rule_version: sanitizeText(ruleVersion, 60) || DEFAULT_RULE_VERSION,
  generated_at: sanitizeText(generatedAt, 40) || new Date().toISOString(),
});

export const hasSourceRef = (record: any, ref: string) => {
  const normalized = sanitizeText(ref, 200);
  return Boolean(
    normalized
    && Array.isArray(record?.source_refs)
    && record.source_refs.includes(normalized)
  );
};

export const getRuleVersion = () => DEFAULT_RULE_VERSION;
