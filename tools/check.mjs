import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = fileURLToPath(new URL('../', import.meta.url));
async function files(dir) {
  const result = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) result.push(...(await files(p)));
    else result.push(p);
  }
  return result;
}
const scripts = (await Promise.all(['src', 'tools', 'tests'].map((d) => files(path.join(root, d)))))
  .flat()
  .filter((p) => /\.(?:m?js)$/.test(p));
for (const file of scripts) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
// Catch broken imports, worker URLs and static entry points after moves/renames.
const pages = [path.join(root, 'index.html'), ...(await files(path.join(root, 'tools/previews')))];
for (const file of [...scripts.filter((p) => !p.startsWith(path.join(root, 'tests'))), ...pages]) {
  const source = await fs.readFile(file, 'utf8');
  const references = [
    ...source.matchAll(
      /(?:from\s*|import\s*(?:\(\s*)?|new URL\s*\()\s*['"](\.{1,2}\/[^'"\n]+)['"]/g,
    ),
  ].map((m) => m[1]);
  if (file.endsWith('.html'))
    references.push(
      ...[...source.matchAll(/(?:src|href)=["'](\.{1,2}\/[^"']+)["']/g)].map((m) => m[1]),
    );
  for (const ref of references) {
    const target = path.resolve(path.dirname(file), ref.split(/[?#]/)[0]);
    try {
      const info = await fs.stat(target);
      if (info.isDirectory() && !ref.endsWith('/')) {
        throw new Error('Directory URLs require a trailing slash');
      }
    } catch {
      throw new Error(`Missing local reference: ${path.relative(root, file)} → ${ref}`);
    }
  }
}
console.log(
  `✓ Syntax: ${scripts.length} modules; local imports, worker URLs and preview entry points resolve`,
);

// Repository-authored text is English, including artist briefs and preview tools.
const textFiles = [
  ...(await files(path.join(root, 'src'))),
  ...(await files(path.join(root, 'tools'))),
  ...(await files(path.join(root, 'tests'))),
  ...(await files(path.join(root, 'graphics'))),
  ...(await files(path.join(root, 'vendor'))),
  ...(await files(path.join(root, '.github'))),
  path.join(root, 'README.md'),
  path.join(root, 'index.html'),
  path.join(root, 'package.json'),
].filter((file) => /\.(?:m?js|py|json|md|html|css|txt)$/.test(file));
for (const file of textFiles) {
  const source = await fs.readFile(file, 'utf8');
  if (/[\u0400-\u04ff]/u.test(source)) {
    throw new Error(`Non-English legacy text in ${path.relative(root, file)}`);
  }
}
console.log(
  `✓ English content: ${textFiles.length} source, documentation and asset metadata files`,
);
