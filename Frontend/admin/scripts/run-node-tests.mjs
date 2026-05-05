#!/usr/bin/env node
// Run every `src/**/*.test.js` file through Node's built-in test runner.
// Implemented as a script (rather than a one-liner in package.json) because
// `node --test` does not glob; the CLI only accepts literal file paths.

import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', 'src');

async function collectTestFiles(dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectTestFiles(full);
      out.push(...nested);
    } else if (entry.isFile() && entry.name.endsWith('.test.js')) {
      out.push(full);
    }
  }
  return out;
}

const testFiles = await collectTestFiles(ROOT);
if (testFiles.length === 0) {
  console.log('No node:test files found.');
  process.exit(0);
}

console.log(`Running ${testFiles.length} node:test suite(s)...`);
const child = spawn(process.execPath, ['--test', ...testFiles], {
  stdio: 'inherit',
});
child.on('exit', (code) => process.exit(code ?? 1));
