import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { World, W, H, TILE } from '../src/core/simulation.js';
import { point } from '../src/core/content.js';
import { polygonArea, pointInPolygon } from '../src/world/map-geometry.js';
import { classifyBiome } from '../src/world/regional-terrain.js';
import { urquhartEdges } from '../src/world/regional-roads.js';
const hash = (a) => createHash('sha256').update(a).digest('hex');
assert.equal(classifyBiome(1, 28, 30), 1);
assert.equal(classifyBiome(30, 10, 40), 12);
assert.equal(classifyBiome(15, -8, 40), 11);
assert.equal(classifyBiome(15, 10, 10), 0);
for (const seed of [
  '734291',
  'first-watershed',
  'hydro-3',
  'shape-2',
  'watershed-0',
  'watershed-1',
  'watershed-2',
  'watershed-5',
  'watershed-12',
  'watershed-20',
  'watershed-27',
  'watershed-29',
  'natural-stress-36',
  'natural-stress-50',
  'natural-stress-69',
  'natural-stress-88',
]) {
  const w = new World(seed, { generatorVersion: 10 });
  assert.equal(w.generatorVersion, 10);
  const m = w.geography.mesh;
  assert.ok(w.riverPaths.length > 10);
  assert.ok(w.regionRoutes.length >= w.cities.length - 1);
  assert.equal(m.order.length, m.points.length);
  const rank = new Int32Array(m.points.length);
  m.order.forEach((i, k) => (rank[i] = k));
  for (let i = 0; i < m.points.length; i++)
    if (m.drain[i] >= 0) {
      assert.ok(rank[m.drain[i]] < rank[i], 'Drainage is acyclic and eventually reaches an outlet');
      assert.ok(m.filled[m.drain[i]] < m.filled[i]);
      assert.ok(m.flux[m.drain[i]] >= m.flux[i]);
    }
  for (const river of w.riverPaths) {
    assert.ok(river.cells.length >= 2);
    for (let i = 1; i < river.cells.length; i++)
      assert.equal(m.drain[river.cells[i - 1]], river.cells[i]);
    assert.ok(river.points.every((p) => p[0] >= 0 && p[1] >= 0 && p[0] < W && p[1] < H));
  }
  const start = w.cities[0];
  for (const z of w.cities) {
    assert.ok(z.wardPlan.wards.length >= 4);
    assert.ok(z.outline.length > 6);
    assert.ok(polygonArea(z.outline) > 500);
    assert.ok(z.wardPlan.lots.length > 0);
    assert.equal(z.wardPlan.algorithm, 'relaxed-voronoi');
    assert.ok(
      w.path(point(start.x, start.y), point(z.x, z.y)).length || z === start,
      'Cities have a real walkable road connection',
    );
    for (const other of w.cities)
      if (other !== z) assert.ok(Math.hypot(z.x - other.x, z.y - other.y) > 280);
  }
  for (const b of w.buildings.filter((b) => b.city && b.enterable && b.type !== 'cage')) {
    for (let y = b.y; y < b.y + b.h; y++)
      for (let x = b.x; x < b.x + b.w; x++)
        assert.ok(![2, 4].includes(w.tile(x, y)), 'A building cannot erase a natural watercourse');
    assert.ok(
      w.path(b.entrance, b.workSpot).length,
      'Door and interior reachable: ' + seed + ' ' + b.type,
    );
    const z = w.cities.find((z) => z.id === b.city);
    assert.ok(
      w.path(point(z.x, z.y), b.entrance).length,
      'Street reaches the door: ' + seed + ' ' + b.type,
    );
  }
  for (let i = 0; i < W * H; i++) {
    if (w.roadMask[i]) assert.ok(![2, 4, 17].includes(w.tiles[i]), 'Road is dry or has a bridge');
    if (w.riverMask[i] && !w.roadMask[i])
      assert.ok([2, 4].includes(w.tiles[i]), 'Nature remains after settlement and lore placement');
  }
  const wet = w.riverMask.findIndex((v, i) => v && w.tiles[i] === 4);
  assert.ok(wet >= 0);
  const t = w.terrain(point((wet % W) + 0.5, Math.floor(wet / W) + 0.5));
  assert.ok(Math.hypot(t.current.x, t.current.y) > 20);
  for (const lake of w.lakes)
    assert.ok(
      lake.cells.length >= 3 && lake.depth > 2,
      'Lakes come from a connected depression, not a circle around a fisher',
    );
  if (seed === '734291') {
    assert.equal(
      hash(w.tiles),
      '511e6f6b95732952f65d72fbee1f768b4e1c5a65ce8c70d70d5583a67392484f',
      'Alpha 12 map remains byte-identical',
    );
    const copy = new World(seed, { generatorVersion: 10 });
    assert.equal(hash(w.tiles), hash(copy.tiles));
    assert.deepEqual(
      w.cities.map((z) => z.outline),
      copy.cities.map((z) => z.outline),
    );
    const restored = World.restore(w.save());
    assert.equal(hash(w.tiles), hash(restored.tiles));
    assert.equal(restored.generatorVersion, 10);
    const different = new World('different-watershed', { generatorVersion: 10 });
    assert.notEqual(hash(w.naturalTiles), hash(different.naturalTiles));
  }
  console.log(
    '✓ ' +
      seed +
      ': drainage, tributaries, climate, roads/bridges, wards, every city door and interiors',
  );
}
const old = new World('old-alpha11', { generatorVersion: 9 }),
  restored = World.restore(old.save());
assert.equal(restored.generatorVersion, 9);
assert.equal(hash(old.tiles), hash(restored.tiles));
assert.equal(restored.geography, undefined);
assert.equal(old.cities[0].wardPlan, undefined);
console.log(
  '✓ Legacy alpha 11 retains its exact geography; new worlds use generator 10; seeded reproducibility and save/load are stable',
);
