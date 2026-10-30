import fs from 'node:fs/promises';
const root = new URL('../', import.meta.url),
  output = new URL('dist/', root);
await fs.rm(output, { recursive: true, force: true });
await fs.mkdir(output, { recursive: true });
for (const entry of [
  'index.html',
  'src',
  'vendor',
  'graphics/sprites',
  'graphics/terrain/sprites',
]) {
  const dest = new URL(entry, output);
  await fs.mkdir(new URL('./', dest), { recursive: true });
  await fs.cp(new URL(entry, root), dest, {
    recursive: true,
    filter: (source) => !entry.startsWith('graphics/') || !source.endsWith('.md'),
  });
}
await fs.writeFile(new URL('.nojekyll', output), '');
console.log(
  '✓ dist/: game code, runtime PNGs and licenses; no Blender sources, tests or development documents',
);
