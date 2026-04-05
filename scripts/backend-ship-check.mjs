import { execFileSync } from 'node:child_process';
import {
  getChangedFiles,
  getCurrentBranch,
  getUnexpectedFiles,
  hasCleanWorkingTree,
  isRefAncestorOfHead,
} from './lib/backend-workflow.mjs';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const against = 'origin/main';

const runNpmScript = (scriptName) => {
  execFileSync(npmCommand, ['run', scriptName], {
    cwd: process.cwd(),
    stdio: 'inherit',
  });
};

const branch = getCurrentBranch();
const errors = [];

if (!branch) {
  errors.push('Could not determine the current branch.');
}

if (branch === 'main') {
  errors.push('Shipping checks must run from a backend branch, not from main.');
}

if (!hasCleanWorkingTree()) {
  errors.push('Working tree must be clean before ship checks run.');
}

if (!isRefAncestorOfHead(against)) {
  errors.push(`Current branch is not rebased onto ${against}.`);
}

const branchFiles = getChangedFiles({ against, includeWorkingTree: false });
const unexpectedBranchFiles = getUnexpectedFiles(branchFiles);
if (unexpectedBranchFiles.length > 0) {
  errors.push(`Branch contains files outside the backend boundary: ${unexpectedBranchFiles.join(', ')}`);
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`ERROR: ${error}`);
  }
  process.exit(1);
}

runNpmScript('build');
runNpmScript('backend:check');
runNpmScript('backend:guard');

if (!hasCleanWorkingTree()) {
  console.error('ERROR: Working tree changed while running ship checks.');
  process.exit(1);
}

console.log(`Ship checks passed on ${branch}.`);
