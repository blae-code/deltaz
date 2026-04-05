import { getChangedFiles, getUnexpectedFiles } from './lib/backend-workflow.mjs';

const refArg = process.argv.find((arg) => arg.startsWith('--against='));
const againstRef = refArg ? refArg.slice('--against='.length) : 'origin/main';

const changedFiles = getChangedFiles({ against: againstRef });
const unexpectedFiles = getUnexpectedFiles(changedFiles);

if (changedFiles.length === 0) {
  console.log(`No local changes detected against ${againstRef}.`);
  process.exit(0);
}

if (unexpectedFiles.length > 0) {
  console.error(`Backend boundary check failed against ${againstRef}.`);
  console.error('Unexpected files outside the backend-owned area:');
  for (const filePath of unexpectedFiles) {
    console.error(`- ${filePath}`);
  }
  process.exit(1);
}

console.log(`Backend boundary check passed against ${againstRef}.`);
for (const filePath of changedFiles) {
  console.log(`- ${filePath}`);
}
