import {
  getAheadBehind,
  getChangedFiles,
  getCurrentBranch,
  getDiffFiles,
  getUnexpectedFiles,
  hasCleanWorkingTree,
  isAllowedBackendPath,
  isRefAncestorOfHead,
  runGit,
} from './lib/backend-workflow.mjs';

const against = 'origin/main';
const shouldFetch = process.argv.includes('--fetch');

if (shouldFetch) {
  runGit(['fetch', 'origin']);
}

const branch = getCurrentBranch();
const { ahead, behind } = getAheadBehind(against);
const localFiles = getChangedFiles({ against });
const unexpectedLocalFiles = getUnexpectedFiles(localFiles);
const upstreamFiles = getDiffFiles(['diff', '--name-only', '--diff-filter=ACMR', `HEAD...${against}`]);
const upstreamBackendFiles = upstreamFiles.filter(isAllowedBackendPath);
const upstreamNonBackendFiles = upstreamFiles.filter((filePath) => !isAllowedBackendPath(filePath));
const localCommittedFiles = getChangedFiles({ against, includeWorkingTree: false });
const localCommittedUnexpectedFiles = getUnexpectedFiles(localCommittedFiles);

console.log('Backend Stewardship Status');
console.log(`Branch: ${branch}`);
console.log(`Relative to ${against}: ahead ${ahead}, behind ${behind}`);
console.log(`Rebased on ${against}: ${isRefAncestorOfHead(against) ? 'yes' : 'no'}`);
console.log(`Working tree: ${hasCleanWorkingTree() ? 'clean' : 'dirty'}`);

console.log('');
console.log(`Local backend-boundary changes: ${localFiles.length}`);
for (const filePath of localFiles) {
  console.log(`- ${filePath}`);
}

if (unexpectedLocalFiles.length > 0) {
  console.log('');
  console.log('Unexpected local files outside the backend boundary:');
  for (const filePath of unexpectedLocalFiles) {
    console.log(`- ${filePath}`);
  }
}

console.log('');
console.log(`Upstream backend/shared files not yet in HEAD: ${upstreamBackendFiles.length}`);
for (const filePath of upstreamBackendFiles) {
  console.log(`- ${filePath}`);
}

console.log('');
console.log(`Upstream non-backend files not yet in HEAD: ${upstreamNonBackendFiles.length}`);
for (const filePath of upstreamNonBackendFiles) {
  console.log(`- ${filePath}`);
}

console.log('');
console.log(`Committed branch-only files vs ${against}: ${localCommittedFiles.length}`);
for (const filePath of localCommittedFiles) {
  console.log(`- ${filePath}`);
}

if (localCommittedUnexpectedFiles.length > 0) {
  console.log('');
  console.log('Committed branch-only files outside the backend boundary:');
  for (const filePath of localCommittedUnexpectedFiles) {
    console.log(`- ${filePath}`);
  }
}
