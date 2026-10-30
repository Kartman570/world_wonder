import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = fileURLToPath(new URL('../', import.meta.url));
const extra = new Set([
  'worker-harness.mjs',
  'performance.mjs',
  'compatibility.mjs',
  'journey.mjs',
  'living-journey.mjs',
]);
const tests = (await fs.readdir(new URL('../tests/', import.meta.url)))
  .filter((f) => f.endsWith('.mjs') && !extra.has(f))
  .sort();
for (const test of tests) {
  console.log(`\n── ${test}`);
  const result = spawnSync(process.execPath, ['tests/' + test], { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`\n✓ ${tests.length} test suites passed`);
