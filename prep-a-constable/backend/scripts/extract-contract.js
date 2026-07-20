#!/usr/bin/env node
// ============================================================================
// extract-contract.js
//
// Regenerates src/lib/stateContract.js (and .cjs) from the app source so the
// sync layer can NEVER drift from the app's real persistence logic.
//
// Run whenever you change DEFAULT_STATE, loadStateFromRaw, mergeState, or the
// sanitisers in the app:
//     node scripts/extract-contract.js ../prep-a-constable.jsx
//
// It verifies every required block is found, then writes both module formats.
// ============================================================================

const fs = require('fs');
const path = require('path');

const appPath = process.argv[2] || path.join(__dirname, '..', '..', 'prep-a-constable.jsx');
if (!fs.existsSync(appPath)) {
  console.error(`App source not found at: ${appPath}`);
  process.exit(1);
}
const code = fs.readFileSync(appPath, 'utf8');

function grab(re, name) {
  const m = code.match(re);
  if (!m) {
    console.error(`FAILED to find block: ${name}`);
    process.exit(1);
  }
  return m[0].trimEnd();
}

const blocks = {
  SCHEMA_VERSION: grab(/const SCHEMA_VERSION = \d+;/, 'SCHEMA_VERSION'),
  STORAGE_KEY: grab(/const STORAGE_KEY = "[^"]+";/, 'STORAGE_KEY'),
  DEFAULT_STATE: grab(/const DEFAULT_STATE = \(\) => \(\{[\s\S]*?\n\}\);/, 'DEFAULT_STATE'),
  DANGEROUS_KEYS: grab(/const DANGEROUS_KEYS = [\s\S]*?;/, 'DANGEROUS_KEYS'),
  isPlainObject: grab(/const isPlainObject =[\s\S]*?;\n/, 'isPlainObject'),
  sanitizeRecordMap: grab(/const sanitizeRecordMap =[\s\S]*?\n\};/, 'sanitizeRecordMap'),
  dayKey: grab(/const dayKey = \(d = new Date\(\)\) => \{[\s\S]*?\n\};/, 'dayKey'),
  loadStateFromRaw: grab(/function loadStateFromRaw\(raw\) \{[\s\S]*?\n\}/, 'loadStateFromRaw'),
  mergeState: grab(/function mergeState\(a, b\) \{[\s\S]*?\n\}/, 'mergeState'),
};

const order = [
  'SCHEMA_VERSION', 'STORAGE_KEY', 'DEFAULT_STATE', 'DANGEROUS_KEYS',
  'isPlainObject', 'sanitizeRecordMap', 'dayKey', 'loadStateFromRaw', 'mergeState',
];

const header = `// ============================================================================
// stateContract — GENERATED from prep-a-constable.jsx by scripts/extract-contract.js
// DO NOT EDIT BY HAND. Edit the app, then re-run the script.
// ============================================================================

`;

const body = order.map((k) => blocks[k]).join('\n\n');

const esmFooter = `

export {
  SCHEMA_VERSION, STORAGE_KEY, DEFAULT_STATE, isPlainObject,
  sanitizeRecordMap, dayKey, loadStateFromRaw, mergeState,
};
`;

const cjsFooter = `

module.exports = {
  SCHEMA_VERSION, STORAGE_KEY, DEFAULT_STATE, isPlainObject,
  sanitizeRecordMap, dayKey, loadStateFromRaw, mergeState,
};
`;

const libDir = path.join(__dirname, '..', 'src', 'lib');
fs.writeFileSync(path.join(libDir, 'stateContract.js'), header + body + esmFooter);
fs.writeFileSync(path.join(libDir, 'stateContract.cjs'), header + body + cjsFooter);

console.log('Regenerated stateContract.js and stateContract.cjs');
console.log('SCHEMA_VERSION:', blocks.SCHEMA_VERSION);
