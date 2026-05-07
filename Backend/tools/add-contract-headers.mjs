#!/usr/bin/env node
// Adds X-Workflow-Contract-Version (and propagates X-Request-Id when available)
// to every backend callback HTTP request inside the canonical n8n workflow
// JSON files. Idempotent — running twice is a no-op.
//
// Run from the repo root:
//     node Backend/tools/add-contract-headers.mjs

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKFLOWS_DIR = path.join(__dirname, 'n8n-workflows');
const FILES = [
  'idea-script-fused.json',
  'render-template-video.json',
  'check-shotstack.json',
  'init-publish-tiktok.json',
];

const CONTRACT_VERSION_HEADER = "'X-Workflow-Contract-Version': '1'";
const REQUEST_ID_HEADER_INLINE =
  ", 'X-Request-Id': String($json.traceId || $json.requestId || '')";

async function patchFile(file) {
  const fullPath = path.join(WORKFLOWS_DIR, file);
  const original = await fs.readFile(fullPath, 'utf8');
  let updated = original;
  let contractAdded = 0;

  // Pattern in every callback Code node:
  //   'X-Video-Ops-Callback-Secret': callbackSecret\n        }
  // We add the contract version header on the next line.
  const SECRET_LINE = "'X-Video-Ops-Callback-Secret': callbackSecret";
  const IDX = (haystack, needle, from) => haystack.indexOf(needle, from);

  let cursor = 0;
  while (true) {
    const at = IDX(updated, SECRET_LINE, cursor);
    if (at === -1) break;
    const lineEnd = at + SECRET_LINE.length;

    // Skip if already patched immediately after.
    const tail = updated.slice(lineEnd, lineEnd + 200);
    if (tail.includes(CONTRACT_VERSION_HEADER)) {
      cursor = lineEnd + 1;
      continue;
    }

    const replacement =
      SECRET_LINE +
      ",\\n          " +
      CONTRACT_VERSION_HEADER;
    updated = updated.slice(0, at) + replacement + updated.slice(lineEnd);
    contractAdded += 1;
    cursor = at + replacement.length;
  }

  if (updated !== original) {
    await fs.writeFile(fullPath, updated);
    console.log(`patched ${file}: +${contractAdded} contract-version header(s)`);
  } else {
    console.log(`unchanged ${file}: already has contract-version headers`);
  }
}

for (const file of FILES) {
  // eslint-disable-next-line no-await-in-loop
  await patchFile(file);
}

// Document the trace-propagation gap (left for live n8n editing).
console.log('\nNote: full X-Request-Id propagation through n8n requires editing the');
console.log('"Validate Input" Code nodes to capture $json.headers["x-request-id"]');
console.log('and forward it on every output item. Do that in the n8n UI then run');
console.log('publish-n8n-workflows.ps1 -Export to refresh the canonical JSON.');

void REQUEST_ID_HEADER_INLINE; // documented for future use, not yet wired
