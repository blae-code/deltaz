const hashString = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const toKey = (parts: unknown[]) => parts.map((part) => {
  if (part === null || part === undefined) {
    return '';
  }
  if (typeof part === 'object') {
    try {
      return JSON.stringify(part);
    } catch {
      return String(part);
    }
  }
  return String(part);
}).join('::');

export const stableHash = (...parts: unknown[]) => hashString(toKey(parts));

export const deterministicNumber = (
  min: number,
  max: number,
  ...parts: unknown[]
) => {
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);
  if (lower === upper) {
    return lower;
  }

  const span = upper - lower + 1;
  return lower + (stableHash(...parts) % span);
};

export const deterministicBoolean = (
  probability: number,
  ...parts: unknown[]
) => {
  const threshold = Math.max(0, Math.min(1, probability));
  return (stableHash(...parts) / 0xffffffff) < threshold;
};

export const pickDeterministic = <T>(
  items: T[],
  ...parts: unknown[]
) => {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return items[stableHash(...parts) % items.length] ?? null;
};

export const rotateDeterministic = <T>(
  items: T[],
  ...parts: unknown[]
) => {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const offset = stableHash(...parts) % items.length;
  return items.slice(offset).concat(items.slice(0, offset));
};

export const sortDeterministic = <T>(
  items: T[],
  getKey: (item: T) => unknown,
  ...parts: unknown[]
) => [...items].sort((left, right) => {
  const leftHash = stableHash(...parts, getKey(left));
  const rightHash = stableHash(...parts, getKey(right));
  return leftHash - rightHash;
});
