import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  assemblyPlan,
  componentRect,
  BuildingSprites,
  buildingSpriteId,
} from '../src/render/building-sprites.js';
import { SpriteSheets, sheetGeometry } from '../src/render/sprite-sheets.js';
import { TILE } from '../src/core/content.js';
const m = JSON.parse(
  await fs.readFile(new URL('../graphics/sprites/manifest.json', import.meta.url)),
);
const b = { type: 'smith', x: 10, y: 20, w: 8, h: 10, door: { x: 14, y: 29 } };
const unfinished = structuredClone(m);
unfinished.catalog.find((e) => e.id === 'building_smith').components.walls.spriteReady = false;
assert.equal(assemblyPlan(unfinished, b), null, 'unfinished modules preserve fallback');
for (const e of m.catalog) for (const c of Object.values(e.components || {})) c.spriteReady = true;
const outside = assemblyPlan(m, b),
  inside = assemblyPlan(m, b, true);
assert.equal(outside.length, 4);
assert.equal(inside.length, 3);
assert.ok(!inside.some((p) => /facade|roof/.test(p.id)));
assert.equal(inside.at(-1).id, 'door#open');
b.doorState = 'locked';
assert.equal(assemblyPlan(m, b, true).at(-1).id, 'door#locked');
assert.deepEqual(componentRect(b, { origin: 'door', rect: [0, -0.5, 1, 1.5] }), [
  14 * TILE,
  28.5 * TILE,
  TILE,
  1.5 * TILE,
]);
assert.equal(buildingSpriteId({ type: 'arkVault' }), 'building_ark_vault');
assert.ok(assemblyPlan(m, { ...b, type: 'arkVault' }));
for (const entry of m.catalog.filter((e) => e.assembly)) {
  const sample = {
    ...b,
    sprite: entry.id,
    type: entry.id === 'building_ark_vault' ? 'arkVault' : 'house',
  };
  for (const inside of [false, true])
    assert.ok(
      assemblyPlan(m, sample, inside),
      entry.id + ' resolves its components and door style',
    );
  const floor = assemblyPlan(m, sample, true).find((p) => p.id.endsWith('#floor'));
  const rect = componentRect(sample, floor),
    { size, footprint } = entry.assembly.sourceCanvas;
  assert.equal(
    rect[0] + (footprint[0] / size[0]) * rect[2],
    sample.x * TILE,
    entry.id + ' footprint x',
  );
  assert.equal(
    rect[1] + (footprint[1] / size[1]) * rect[3],
    sample.y * TILE,
    entry.id + ' footprint y',
  );
  assert.equal((footprint[2] / size[0]) * rect[2], sample.w * TILE, entry.id + ' footprint width');
  assert.equal((footprint[3] / size[1]) * rect[3], sample.h * TILE, entry.id + ' footprint height');
}
const sheets = new SpriteSheets({
  fetcher: async () => ({ ok: true, json: async () => m }),
  imageLoader: async (url) =>
    url.includes('/door/') ? { width: 384, height: 384 } : { width: 480, height: 480 },
});
await sheets.ready;
assert.equal(
  sheets.configFor('building_smith#roof').file,
  'static/building_smith/building_smith_roof.png',
);
const renderer = new BuildingSprites(sheets),
  calls = [];
const c = {
  save() {},
  restore() {},
  beginPath() {},
  rect() {},
  clip() {},
  drawImage(...args) {
    calls.push(args);
  },
};
assert.equal(renderer.draw(c, b, false, 'ground'), false);
await Promise.all(outside.map((p) => sheets.load(p.id)));
await sheets.load('door#locked');
assert.equal(renderer.draw(c, b, false, 'ground'), true);
assert.equal(calls.length, 1);
renderer.draw(c, b, false, 'depth');
assert.equal(calls.length, 4);
assert.equal(
  sheetGeometry({ width: 480, height: 480 }, { directions: 1, frameWidth: 480, frameHeight: 480 })
    .frames,
  1,
);
console.log(
  '✓ Building modules: common coordinates, contour variants, cutaway, door states, lazy loading and atomic fallback',
);
const roofBounds = renderer.bounds(b);
assert.equal(
  renderer.visible(b, {
    left: roofBounds.left,
    right: roofBounds.right,
    top: roofBounds.top,
    bottom: b.y * TILE - 1,
  }),
  true,
  'roof visible before building footprint enters viewport',
);
assert.equal(
  renderer.visible(b, {
    left: roofBounds.right + 1,
    right: roofBounds.right + 100,
    top: 0,
    bottom: 99999,
  }),
  false,
);
assert.doesNotThrow(
  () => componentRect({ ...b, door: undefined }, { origin: 'door', rect: [0, 0, 1, 1] }),
  'decorative tents have a default entrance origin',
);
