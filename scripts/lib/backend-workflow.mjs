import { execFileSync } from 'node:child_process';

export const allowedPrefixes = ['base44/', 'docs/', 'scripts/'];
export const allowedFiles = new Set([
  '.env.example',
  '.gitignore',
  'README.md',
  'package-lock.json',
  'package.json',
  'src/components/crafting/TradeFromProject.jsx',
  'src/components/trading/CreateTradeRequest.jsx',
  'src/components/trading/TradeRequestCard.jsx',
  'src/pages/MissionPlanner.jsx',
]);

export const runGit = (args, { allowFailure = false } = {}) => {
  try {
    return execFileSync('git', args, {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    if (allowFailure) {
      return '';
    }
    throw error;
  }
};

export const getCurrentBranch = () => runGit(['branch', '--show-current']).trim();

export const getAheadBehind = (ref = 'origin/main') => {
  const output = runGit(['rev-list', '--left-right', '--count', `HEAD...${ref}`], {
    allowFailure: true,
  }).trim();

  if (!output) {
    return { ahead: 0, behind: 0 };
  }

  const [aheadRaw = '0', behindRaw = '0'] = output.split(/\s+/);
  return {
    ahead: Number.parseInt(aheadRaw, 10) || 0,
    behind: Number.parseInt(behindRaw, 10) || 0,
  };
};

export const getDiffFiles = (args) =>
  runGit(args, { allowFailure: true })
    .split(/\r?\n/)
    .filter(Boolean);

export const normalizePorcelainPath = (line) => {
  const rawPath = line.slice(3).trim();
  if (!rawPath) {
    return null;
  }

  if (rawPath.includes(' -> ')) {
    const [, nextPath] = rawPath.split(' -> ');
    return nextPath.trim();
  }

  return rawPath;
};

export const getWorkingTreeFiles = () =>
  runGit(['status', '--porcelain=v1'], { allowFailure: true })
    .split(/\r?\n/)
    .filter(Boolean)
    .map(normalizePorcelainPath)
    .filter(Boolean);

export const getChangedFiles = ({ against = 'origin/main', includeWorkingTree = true } = {}) => {
  const files = new Set(getDiffFiles(['diff', '--name-only', '--diff-filter=ACMR', `${against}...HEAD`]));

  if (includeWorkingTree) {
    for (const filePath of getWorkingTreeFiles()) {
      files.add(filePath);
    }
  }

  return [...files].sort();
};

export const isAllowedBackendPath = (filePath) =>
  allowedFiles.has(filePath) || allowedPrefixes.some((prefix) => filePath.startsWith(prefix));

export const getUnexpectedFiles = (files) => files.filter((filePath) => !isAllowedBackendPath(filePath));

export const hasCleanWorkingTree = () => getWorkingTreeFiles().length === 0;

export const isRefAncestorOfHead = (ref = 'origin/main') => {
  const mergeBase = runGit(['merge-base', 'HEAD', ref], { allowFailure: true }).trim();
  const refSha = runGit(['rev-parse', ref], { allowFailure: true }).trim();
  return Boolean(mergeBase) && mergeBase === refSha;
};
