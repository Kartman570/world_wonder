import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  TerrainTextures,
  terrainMaterial,
  terrainWeights,
  TERRAIN_CACHE_BYTES,
} from '../src/render/terrain-textures.js';
import { RenderAssets } from '../src/render/render-assets.js';
const root = new URL('../graphics/terrain/sprites/', import.meta.url),
  manifest = JSON.parse(await fs.readFile(new URL('manifest.json', root)));
assert.equal(Object.keys(manifest.materials).length, 14);
for (const [id, m] of Object.entries(manifest.materials)) {
  assert.equal(m.files.length, 2);
  assert.equal(m.worldPeriod, id === 'paving' ? 192 : 384);
  for (const path of m.files) {
    const b = await fs.readFile(new URL(path, root));
    assert.equal(b.toString('hex', 0, 8), '89504e470d0a1a0a');
    assert.equal(b.readUInt32BE(16), 512);
    assert.equal(b.readUInt32BE(20), 512);
  }
  assert.ok((await fs.stat(new URL('../3d/' + id + '.blend', root))).size > 10000);
}
const world = { tile: (x, y) => (x < 10 ? 0 : x < 15 ? 1 : 4), depth: new Uint8Array(1280 * 960) };
world.depth[8 * 1280 + 5] = 8;
assert.ok(['forest', 'mud'].includes(terrainMaterial(world, 5, 8)));
assert.equal(terrainMaterial(world, 12, 8), 'soil');
assert.equal(terrainMaterial(world, 16, 8), 'water');
assert.equal(terrainMaterial({ dungeonSpec: {}, tile: () => 12 }, 2, 2), 'catacomb');
assert.equal(terrainMaterial({ tile: () => 16 }, 2, 2), 'alien');
for (let x = 400; x < 850; x += 7) {
  const weights = terrainWeights(world, x, 500);
  assert.ok(Math.abs([...weights.values()].reduce((a, b) => a + b, 0) - 1) < 1e-9);
  assert.deepEqual([...weights], [...terrainWeights(world, x, 500)]);
}
assert.ok(
  terrainWeights(world, 10 * 48, 500).size > 1,
  'road transition blends more than one material',
);
let active = 0,
  maxActive = 0,
  fetchCalls = 0;
const context = new Proxy(
  {
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    createPattern: () => ({ setTransform() {} }),
  },
  { get: (o, k) => o[k] || (() => {}) },
);
const canvas = () => ({ width: 0, height: 0, getContext: () => context });
const terrain = new TerrainTextures({
  fetcher: async function () {
    assert.equal(this, undefined);
    fetchCalls++;
    return { ok: true, json: async () => manifest };
  },
  imageLoader: async () => {
    active++;
    maxActive = Math.max(maxActive, active);
    await new Promise((r) => setTimeout(r, 1));
    active--;
    return { width: 512, height: 512 };
  },
  createCanvas: canvas,
});
await Promise.all([terrain.warm(), terrain.warm()]);
assert.equal(fetchCalls, 1);
assert.equal(maxActive, 3);
assert.equal(terrain.metrics.decodedBytes, 28 * 512 * 512 * 4);
assert.equal(terrain.paint(context, world, 0, 0), true);
const scratch = terrain.layer;
terrain.paint(context, world, 1, 0);
assert.equal(terrain.layer, scratch);
assert.equal(terrain.metrics.builds, 2);
globalThis.document = { createElement: canvas };
const assets = new RenderAssets({ decor: [] }, { terrain });
let closed = 0;
for (let i = 0; i < 40; i++)
  assets.cacheChunk('test' + i, {
    width: 768,
    height: 768,
    close() {
      closed++;
    },
  });
assert.ok(assets.groundBytes <= TERRAIN_CACHE_BYTES);
assert.equal(assets.ground.size, 28);
assert.equal(closed, 12);
assets.dispose();
assert.equal(assets.groundBytes, 0);
console.log(
  '✓ 28 Blender PNGs and 14 sources; deterministic blended terrain, bounded loading, scratch reuse and 64 MiB chunk LRU',
);
