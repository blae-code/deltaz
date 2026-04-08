import { deterministicNumber } from './deterministic.ts';

export const SKILL_NAMES = ['combat', 'crafting', 'medical', 'leadership', 'survival', 'social'] as const;
export const LEVEL_THRESHOLDS = [0, 50, 150, 350, 700, 1200];

export const DIFFICULTY_TARGETS: Record<string, number> = {
  easy: 1,
  moderate: 2,
  hard: 3,
  extreme: 4,
  legendary: 5,
};

type SkillName = (typeof SKILL_NAMES)[number];

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const normalizeSkillName = (value: unknown) => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return SKILL_NAMES.includes(normalized as SkillName) ? normalized as SkillName : null;
};

export const normalizeDifficulty = (value: unknown) => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : 'moderate';
  return DIFFICULTY_TARGETS[normalized] ? normalized : 'moderate';
};

export function getSkillLevel(xp: number) {
  const numericXp = Number.isFinite(Number(xp)) ? Number(xp) : 0;
  for (let index = LEVEL_THRESHOLDS.length - 1; index >= 0; index -= 1) {
    if (numericXp >= LEVEL_THRESHOLDS[index]) {
      return index + 1;
    }
  }
  return 1;
}

export function getSkillProgress(xp: number) {
  const normalizedXp = Math.max(0, Number.isFinite(Number(xp)) ? Number(xp) : 0);
  const level = getSkillLevel(normalizedXp);
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] || (LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + 500);
  const progress = normalizedXp - currentThreshold;
  const needed = Math.max(1, nextThreshold - currentThreshold);
  return {
    level,
    xp: normalizedXp,
    progress,
    needed,
    percent: clamp(Math.round((progress / needed) * 100), 0, 100),
  };
}

export function getAllSkillLevels(skills: Record<string, number> = {}) {
  return Object.fromEntries(SKILL_NAMES.map((name) => [
    name,
    getSkillProgress(Number(skills[name] || 0)),
  ]));
}

export const computeCombatRating = (combatXp: number) => {
  const normalizedXp = Math.max(0, Number.isFinite(Number(combatXp)) ? Number(combatXp) : 0);
  return Math.min(10, getSkillLevel(normalizedXp) + Math.floor(normalizedXp / 200));
};

export const buildSkillLogEntry = (
  skill: string,
  xp: number,
  reason: string,
  date = new Date().toISOString(),
) => ({
  skill,
  xp,
  reason,
  date,
});

export function runSkillCheck(
  skillLevel: number,
  difficulty: string,
  ...parts: unknown[]
) {
  const normalizedDifficulty = normalizeDifficulty(difficulty);
  const target = DIFFICULTY_TARGETS[normalizedDifficulty] || 2;
  const diff = Math.max(-6, Math.min(6, Number(skillLevel || 1) - target));
  const passChance = clamp(50 + diff * 15, 5, 95);
  const roll = deterministicNumber(0, 99, 'skill-check', normalizedDifficulty, skillLevel, ...parts);
  const passed = roll < passChance;
  const critical = passed && roll <= Math.max(4, Math.floor(passChance * 0.2));
  const fumble = !passed && roll >= 95;

  return {
    passed,
    critical,
    fumble,
    passChance: Math.round(passChance),
    roll,
    skillLevel,
    difficulty: normalizedDifficulty,
  };
}
