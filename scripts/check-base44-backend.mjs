import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import { backendTrustRegistry, canonicalTrustLanes } from './lib/backend-trust-registry.mjs';

const rootDir = process.cwd();
const packageJsonPath = path.join(rootDir, 'package.json');
const entitiesDir = path.join(rootDir, 'base44', 'entities');
const functionsDir = path.join(rootDir, 'base44', 'functions');

const normalizeSemver = (value) => value?.match(/\d+\.\d+\.\d+/)?.[0] ?? null;

const fileExists = async (targetPath) => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const listFiles = async (dirPath, predicate) => {
  const dirEntries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of dirEntries.sort((a, b) => a.name.localeCompare(b.name))) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(fullPath, predicate));
      continue;
    }

    if (predicate(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
};

const readJson = async (targetPath) => JSON.parse(await fs.readFile(targetPath, 'utf8'));

const parseJsonc = (filePath, text) => {
  const parsed = ts.parseConfigFileTextToJson(filePath, text);
  if (parsed.error) {
    const message = ts.flattenDiagnosticMessageText(parsed.error.messageText, '\n');
    return { ok: false, message };
  }

  return { ok: true, data: parsed.config };
};

const collectEntityAccess = (sourceText) => {
  const readSet = new Set();
  const writeSet = new Set();
  const entityAccessPattern = /entities\.([A-Za-z0-9_]+)\.(create|update|delete|upsert|filter|get|find|list)\b/g;

  for (const match of sourceText.matchAll(entityAccessPattern)) {
    const [, entityName, action] = match;
    if (['create', 'update', 'delete', 'upsert'].includes(action)) {
      writeSet.add(entityName);
    } else {
      readSet.add(entityName);
    }
  }

  return {
    reads: [...readSet].sort(),
    writes: [...writeSet].sort(),
  };
};

const checkTypeScriptSyntax = (relativePath, sourceText, errors) => {
  const sourceFile = ts.createSourceFile(relativePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const diagnostics = [];
  const visit = (node) => {
    if (node.flags & ts.NodeFlags.ThisNodeHasError) {
      diagnostics.push(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  if (sourceFile.parseDiagnostics.length > 0) {
    for (const diagnostic of sourceFile.parseDiagnostics) {
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
      errors.push(`TypeScript parse error in ${relativePath}: ${message}`);
    }
  }
};

const main = async () => {
  const errors = [];

  if (!await fileExists(packageJsonPath)) {
    throw new Error('package.json not found in the current working directory.');
  }

  const packageJson = await readJson(packageJsonPath);
  const expectedSdkVersion = normalizeSemver(packageJson.dependencies?.['@base44/sdk']);

  if (!expectedSdkVersion) {
    errors.push('Could not resolve @base44/sdk version from package.json.');
  }

  if (!await fileExists(entitiesDir)) {
    errors.push('Missing base44/entities directory.');
  }

  if (!await fileExists(functionsDir)) {
    errors.push('Missing base44/functions directory.');
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`ERROR: ${error}`);
    }
    process.exit(1);
  }

  const entityFiles = await listFiles(entitiesDir, (filePath) => filePath.endsWith('.jsonc'));
  const functionEntries = await listFiles(functionsDir, (filePath) => filePath.endsWith(path.join('entry.ts')));
  const tsFiles = await listFiles(functionsDir, (filePath) => filePath.endsWith('.ts'));

  if (entityFiles.length === 0) {
    errors.push('No entity schema files were found under base44/entities.');
  }

  if (functionEntries.length === 0) {
    errors.push('No function entry files were found under base44/functions.');
  }

  for (const entityFile of entityFiles) {
    const text = await fs.readFile(entityFile, 'utf8');
    const parsed = parseJsonc(entityFile, text);
    if (!parsed.ok) {
      errors.push(`Invalid JSONC in ${path.relative(rootDir, entityFile)}: ${parsed.message}`);
      continue;
    }

    if (!parsed.data?.name) {
      errors.push(`Entity schema ${path.relative(rootDir, entityFile)} is missing a top-level "name".`);
    }
  }

  for (const tsFile of tsFiles) {
    const sourceText = await fs.readFile(tsFile, 'utf8');
    checkTypeScriptSyntax(path.relative(rootDir, tsFile), sourceText, errors);
  }

  const functionSummaries = [];

  for (const functionEntry of functionEntries) {
    const sourceText = await fs.readFile(functionEntry, 'utf8');
    const relativePath = path.relative(rootDir, functionEntry);
    const functionName = path.basename(path.dirname(functionEntry));
    const importMatch = sourceText.match(/npm:@base44\/sdk@(\d+\.\d+\.\d+)/);
    const trustConfig = backendTrustRegistry[functionName];

    if (!trustConfig) {
      errors.push(`${relativePath} is missing an entry in scripts/lib/backend-trust-registry.mjs.`);
    }

    if (!importMatch) {
      errors.push(`${relativePath} does not pin npm:@base44/sdk to an explicit version.`);
    } else if (importMatch[1] !== expectedSdkVersion) {
      errors.push(
        `${relativePath} pins @base44/sdk ${importMatch[1]}, expected ${expectedSdkVersion}.`,
      );
    }

    if (!sourceText.includes('Deno.serve')) {
      errors.push(`${relativePath} does not contain a Deno.serve handler.`);
    }

    if (trustConfig && trustConfig.classification !== 'temporary_freeze' && canonicalTrustLanes.has(trustConfig.lane)) {
      if (!trustConfig.allowsLLM && sourceText.includes('InvokeLLM')) {
        errors.push(`${relativePath} is ${trustConfig.lane} but still calls InvokeLLM.`);
      }
      if (!trustConfig.allowsRandom && sourceText.includes('Math.random')) {
        errors.push(`${relativePath} is ${trustConfig.lane} but still uses Math.random.`);
      }
    }

    functionSummaries.push({
      name: functionName,
      path: relativePath,
      lane: trustConfig?.lane || 'unknown',
      classification: trustConfig?.classification || 'missing',
      ...collectEntityAccess(sourceText),
    });
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`ERROR: ${error}`);
    }
    process.exit(1);
  }

  console.log('Base44 backend check passed.');
  console.log(`SDK version: ${expectedSdkVersion}`);
  console.log(`Entities: ${entityFiles.length}`);
  console.log(`Functions: ${functionSummaries.length}`);

  for (const summary of functionSummaries.sort((a, b) => a.name.localeCompare(b.name))) {
    const reads = summary.reads.length > 0 ? summary.reads.join(', ') : 'none';
    const writes = summary.writes.length > 0 ? summary.writes.join(', ') : 'none';
    console.log(`- ${summary.name} (${summary.lane}/${summary.classification}): reads [${reads}] writes [${writes}]`);
  }
};

await main();
