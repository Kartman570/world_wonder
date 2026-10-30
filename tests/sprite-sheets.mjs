import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { SpriteSheets, sheetGeometry, spriteFrame } from '../src/render/sprite-sheets.js';
const liveManifest = JSON.parse(
  await fs.readFile(new URL('../graphics/sprites/manifest.json', import.meta.url)),
);
for (const config of liveManifest.catalog.filter((e) => e.type === 'character' && e.spriteReady)) {
  const bytes = await fs.readFile(new URL('../graphics/sprites/' + config.file, import.meta.url));
  assert.equal(bytes.toString('hex', 0, 8), '89504e470d0a1a0a');
  if (config.hash)
    assert.ok(
      createHash('sha256').update(bytes).digest('hex').startsWith(config.hash),
      'PNG hash must match the manifest',
    );
  const image = { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  sheetGeometry(image, {
    ...config,
    animations: Object.fromEntries(
      Object.entries(config.animations || {}).filter(([, c]) => c.ready),
    ),
  });
}
const fixtureCatalog = (m) => ({
  ...m,
  catalog: Object.entries(m.assets).map(([id, config]) => ({ id, spriteReady: true, ...config })),
  assets: undefined,
});
// Fixed fixtures exercise timing without constraining future artist-authored PNG sizes.
const manifest = {
    assets: {
      cityGuard: {
        file: 'guard-fixture.png',
        fps: 10,
        animations: { idle: { start: 3, frames: 1 }, walk: { start: 0, frames: 8 } },
      },
      robot: { file: 'robot-fixture.png' },
    },
    roles: { guard: 'cityGuard', escort: 'cityGuard' },
    races: {},
  },
  images = {
    'guard-fixture.png': { width: 2048, height: 2048 },
    'robot-fixture.png': { width: 2048, height: 256 },
  };
const geometry = sheetGeometry({ width: 2048, height: 2048 });
for (let frame = 0; frame < 8; frame++) {
  const r = spriteFrame(geometry, {}, 0, frame / 10);
  assert.equal(r.frame, frame);
  assert.equal(r.x, 0);
  assert.equal(r.y, frame * 256);
}
assert.equal(spriteFrame(geometry, {}, 0, 0.8).frame, 0);
assert.equal(spriteFrame(geometry, {}, 2, 0).x, 512);
assert.equal(spriteFrame(geometry, {}, 4, 0).x, 1024);
const tall = sheetGeometry(
  { width: 4096, height: 7680 },
  { frameHeight: 640, fps: 13, scale: 0.4, anchor: [0.5, 0.9] },
);
assert.equal(tall.frameWidth, 512);
assert.equal(tall.frames, 12);
assert.equal(spriteFrame(tall, {}, 7, 11 / 13).y, 7040);
assert.equal(spriteFrame(tall, {}, 7, 12 / 13).frame, 0);
const long = sheetGeometry({ width: 1024, height: 128 * 40 });
assert.equal(long.frames, 40);
assert.equal(spriteFrame(long, {}, 0, 3.9).frame, 39);
assert.throws(() => sheetGeometry({ width: 2047, height: 2048 }));
assert.throws(() => sheetGeometry({ width: 2048, height: 2049 }));
assert.throws(() => sheetGeometry({ width: 2048, height: 2048 }, { frameWidth: 128 }));
assert.throws(() =>
  sheetGeometry({ width: 2048, height: 2048 }, { animations: { walk: { start: 7, frames: 2 } } }),
);
const warnings = [],
  loads = [];
const sheets = new SpriteSheets({
  manifestUrl: 'https://example.test/game/graphics/sprites/manifest.json',
  fetcher: async () => ({ ok: true, json: async () => fixtureCatalog(manifest) }),
  imageLoader: async (url) => {
    loads.push(url);
    const file = new URL(url).pathname.split('/').at(-1);
    if (!images[file]) throw Error('not found');
    return images[file];
  },
  warn: (m) => warnings.push(m),
});
await sheets.preload(['cityGuard', 'robot']);
assert.ok(loads[0].startsWith('https://example.test/game/graphics/sprites/'));
const calls = [],
  context = { drawImage: (...args) => calls.push(args) },
  guard = { role: 'guard', dir: 0 },
  pose = (walk, x = 100) => ({ x, y: 200, walk });
assert.equal(sheets.draw(context, guard, pose(0), 0), true);
assert.equal(calls.at(-1)[2], 3 * 256);
sheets.draw(context, guard, pose(1), 0.01);
assert.equal(calls.at(-1)[2], 0);
sheets.draw(context, guard, pose(2), 0.11);
assert.equal(calls.at(-1)[2], 256);
const paused = calls.at(-1);
sheets.draw(context, guard, pose(2), 0.11);
assert.deepEqual(calls.at(-1), paused);
sheets.draw(context, guard, pose(2), 0.5);
assert.equal(calls.at(-1)[2], 3 * 256);
assert.equal(calls.at(-1)[5], 100 - 64);
assert.ok(Math.abs(calls.at(-1)[6] - (200 - 95.0385)) < 1e-6);
assert.equal(sheets.draw(context, { role: 'citizen' }, pose(0), 1), false);
assert.equal(sheets.draw(context, { role: 'guard', sprite: 'robot' }, pose(0), 0), true);
assert.equal(sheets.assetFor({ race: 'arctarian' }), null);
assert.equal(sheets.draw(context, { role: 'guard', sprite: 'unknown' }, pose(0), 0), false);
assert.equal(sheets.draw(context, { role: 'guard', sprite: 'unknown' }, pose(0), 1), false);
assert.equal(warnings.length, 1);
assert.equal(loads.length, 2);
sheets.manifest.catalog.push({ id: 'broken', spriteReady: true, file: 'broken.png' });
await sheets.load('broken');
assert.equal(sheets.draw(context, { sprite: 'broken' }, pose(0), 2), false);
await sheets.load('broken');
assert.equal(loads.filter((x) => x.endsWith('broken.png')).length, 1);
const bad = new SpriteSheets({
  fetcher: async () => ({ ok: false, status: 404 }),
  warn: (m) => warnings.push(m),
});
assert.equal(await bad.ready, false);
assert.equal(bad.draw(context, guard, pose(0), 0), false);
console.log(
  '✓ Real PNG geometry, 8 views, 10 fps/loop, tall cells and long animation, foot anchor, idle/pause, asset mapping, Pages paths and cached fallback',
);
// Actual contract: identity columns, separate idle row and a one-second walk cycle.
const guardConfig = {
  frameWidth: 128,
  frameHeight: 128,
  frames: 13,
  fps: 12,
  scale: 1,
  animations: {
    idle: { start: 0, frames: 1 },
    walk: { start: 1, frames: 12 },
    attack: { start: 5, frames: 3, loop: false },
  },
};
const g = sheetGeometry({ width: 1024, height: 1664 }, guardConfig);
for (let d = 0; d < 8; d++) assert.equal(spriteFrame(g, guardConfig, d, 0).x, d * 128);
assert.equal(spriteFrame(g, guardConfig, -1, 0).direction, 7);
assert.equal(spriteFrame(g, guardConfig, 0, 1).frame, 1);
assert.equal(spriteFrame(g, guardConfig, 0, 0.99).frame, 12);
assert.equal(spriteFrame(g, guardConfig, 0, 100, 'idle').frame, 0);
assert.equal(spriteFrame(g, guardConfig, 0, 100, 'attack').frame, 7);
assert.throws(() => sheetGeometry({ width: 1024, height: 1664 }, { ...guardConfig, frames: 12 }));
let clock = 0;
const pending = [],
  requested = [],
  closed = [];
const queueManifest = {
  assets: Object.fromEntries(
    ['a', 'b', 'c', 'd', 'alias'].map((id) => [id, { file: (id === 'alias' ? 'a' : id) + '.png' }]),
  ),
  roles: { guard: 'a' },
};
const queued = new SpriteSheets({
  maxConcurrent: 1,
  maxBytes: 8 * 8 * 4,
  now: () => clock,
  fetcher: async () => ({ ok: true, json: async () => fixtureCatalog(queueManifest) }),
  imageLoader: (url) => {
    requested.push(url.split('/').at(-1));
    return new Promise((resolve) =>
      pending.push(() => resolve({ width: 8, height: 8, close: () => closed.push(url) })),
    );
  },
});
await queued.ready;
assert.equal(requested.length, 0, 'manifest does not eagerly load every model');
const a = queued.load('a'),
  alias = queued.load('alias'),
  b = queued.load('b', 0),
  c = queued.load('c', 0);
queued.load('c', 1);
assert.deepEqual(requested, ['a.png']);
pending.shift()();
await a;
await alias;
assert.deepEqual(
  requested,
  ['a.png', 'c.png'],
  'visible model takes priority over queued prefetch',
);
pending.shift()();
await c;
pending.shift()();
await b;
assert.equal(
  requested.filter((x) => x === 'a.png').length,
  1,
  'aliases share the same decoded atlas',
);
const nearestContext = {
  imageSmoothingEnabled: true,
  drawImage() {
    assert.equal(this.imageSmoothingEnabled, false);
  },
};
queued.draw(nearestContext, { sprite: 'a' }, { x: 0, y: 0 }, 0);
assert.equal(nearestContext.imageSmoothingEnabled, true);
clock = 3000;
queued.prepare([{ sprite: 'a' }]);
assert.equal(queued.bytes, 256);
assert.equal(queued.assets.has('a'), true);
assert.equal(queued.assets.has('alias'), true);
assert.equal(queued.assets.has('b'), false);
assert.equal(closed.length, 2);
const reloaded = queued.load('b');
pending.shift()();
await reloaded;
assert.equal(requested.filter((x) => x === 'b.png').length, 2);
assert.equal(queued.draw(nearestContext, { sprite: 'alias' }, { x: 0, y: 0 }, 0), true);
console.log(
  '✓ New manifest clips, exact dimensions, nearest rendering, lazy loading, bounded queue, visible priority, shared URLs and LRU eviction/reload',
);
const { actorAnimation } = await import('../src/render/sprite-sheets.js');
const actions = {
  animations: {
    idle: { frames: 2 },
    walk: { frames: 8 },
    attack: { frames: 6 },
    death: { frames: 8 },
    work: { frames: 5 },
    pray: { frames: 3 },
  },
  states: { praying: 'pray' },
};
assert.equal(actorAnimation({ state: 'craftingGoods' }, {}, false, actions), 'work');
assert.equal(actorAnimation({ state: 'fishing' }, {}, true, actions), 'walk');
assert.equal(actorAnimation({ hp: 0 }, {}, false, actions), 'death');
assert.equal(actorAnimation({ pendingStrike: {} }, {}, true, actions), 'attack');
assert.equal(actorAnimation({ state: 'praying' }, {}, false, actions), 'pray');
assert.equal(actorAnimation({ spriteAnimation: 'pray' }, {}, false, actions), 'pray');
assert.equal(actorAnimation({ state: 'craftingGoods' }, {}, false, { animations: {} }), 'idle');
sheets.manifest.catalog.push({
  id: 'custom',
  spriteReady: true,
  file: 'robot-fixture.png',
  animations: { death: { start: 0, frames: 1, loop: false }, work: { start: 0, frames: 1 } },
  hash: 'abc123',
});
assert.ok(await sheets.load('custom'));
assert.ok(loads.at(-1).endsWith('?v=abc123'));
// Content hashes invalidate the HTTP cache when the artist updates the same file.
assert.equal(
  sheets.assets.get('custom').resource.url,
  'https://example.test/game/graphics/sprites/robot-fixture.png?v=abc123',
);
console.log(
  '✓ Open-ended clips, profession states, death/attack priority and content-versioned texture URLs',
);
sheets.manifest.catalog.push({
  id: 'actions',
  spriteReady: true,
  file: 'guard-fixture.png',
  fps: 10,
  animations: {
    idle: { start: 0, frames: 1 },
    walk: { start: 1, frames: 2 },
    attack: { start: 3, frames: 2, loop: false },
    death: { start: 5, frames: 2, loop: false },
    work: { start: 7, frames: 1 },
  },
});
await sheets.load('actions');
const worker = { sprite: 'actions', state: 'craftingGoods' };
sheets.draw(context, worker, pose(0), 0);
assert.equal(calls.at(-1)[2], 7 * 256);
worker.spriteAnimation = 'death';
sheets.draw(context, worker, { ...pose(0), animationSeconds: 100 }, 1);
assert.equal(calls.at(-1)[2], 6 * 256);
worker.spriteAnimation = 'attack';
sheets.draw(context, worker, pose(0), 2);
sheets.draw(context, worker, pose(0), 2.1);
assert.equal(calls.at(-1)[2], 4 * 256);
worker.spriteAnimationToken = 1;
sheets.draw(context, worker, pose(0), 2.11);
assert.equal(calls.at(-1)[2], 3 * 256);
console.log('✓ Work playback, frozen final death pose and explicit attack restart');
const attacker = { sprite: 'actions', pendingStrike: { remaining: 0.2 } };
sheets.draw(context, attacker, { ...pose(0), attack: 0.4 }, 0);
sheets.draw(context, attacker, { ...pose(0), attack: 0.3 }, 0.1);
assert.equal(calls.at(-1)[2], 4 * 256);
attacker.pendingStrike = { remaining: 0.2 };
sheets.draw(context, attacker, { ...pose(0), attack: 0.4 }, 0.11);
assert.equal(calls.at(-1)[2], 3 * 256);
console.log('✓ Consecutive combat strikes restart their animation automatically');

assert.equal(
  actorAnimation({}, {}, true, { animations: { idle: { frames: 1 }, death: { frames: 8 } } }),
  'idle',
  'missing walk must not play unrelated clips',
);
let catalogLoads = 0;
// Artist completion must not remove this test's intentionally planned entry.
const unifiedManifest = {
  ...liveManifest,
  catalog: [
    ...liveManifest.catalog,
    {
      id: 'planned_fixture',
      spriteReady: false,
      file: 'characters/planned_fixture/planned_fixture_atlas.png',
      animations: { idle: { ready: false, frames: 4 } },
    },
  ],
};
const unified = new SpriteSheets({
  fetcher: async () => ({ ok: true, json: async () => unifiedManifest }),
  imageLoader: async () => {
    catalogLoads++;
    const g = liveManifest.catalog.find((e) => e.id === 'city_guard');
    return { width: g.frameWidth * 8, height: g.frameHeight * g.frames };
  },
});
await unified.preload(['city_guard', 'planned_fixture']);
assert.equal(catalogLoads, 1, 'planned catalog entries never request textures');
assert.equal(unified.assetFor({ role: 'guard' }), 'city_guard');
assert.deepEqual(
  Object.keys(unified.configFor('city_guard').animations),
  Object.entries(liveManifest.catalog.find((e) => e.id === 'city_guard').animations)
    .filter(([, clip]) => clip.ready)
    .map(([name]) => name),
);
assert.equal(unified.configFor('planned_fixture'), null);
assert.equal(unified.draw(context, { role: 'guard' }, pose(0), 0), true);
console.log(
  '✓ One unified catalog: ready texture loads, planned sprites/clips are excluded and guard role still draws',
);
