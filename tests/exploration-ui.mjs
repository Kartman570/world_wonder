import assert from 'node:assert/strict';
import { locationGroups, filterLocations, questGroups } from '../src/ui/exploration-ui.js';
import { TILE } from '../src/core/content.js';
const w = {
  player: { x: 0, y: 0 },
  cities: [{ id: 'oak' }],
  places: [
    { id: 'oak', name: 'Town', x: 8, y: 8, kind: 'town' },
    { id: 'cathedral', name: 'Cathedral', x: 3, y: 3 },
    { id: 'grove', name: 'Distant Grove', x: 10, y: 10 },
    { id: 'near', name: 'Nearby Barrow', x: 1, y: 1 },
    { id: 'red', name: 'Red Camp', x: 20, y: 20 },
  ],
  dungeonEntrances: [
    {
      id: 'cave',
      name: 'Underwater Passage',
      x: 100,
      y: 80,
      template: 'ruins',
      kind: 'underwater',
    },
  ],
  camps: [{ id: 'camp', name: 'My Campsite', x: 10, y: 20 }],
  workSites: [
    { id: 'port', kind: 'port', name: 'Port', x: 15, y: 10 },
    { id: 'apiary', kind: 'beekeeper', name: 'Forest Apiary', city: 'oak', x: 5, y: 5 },
    { id: 'forge', kind: 'smith', name: 'Smithy', x: 4, y: 4 },
  ],
  stables: [{ buildingId: 1 }],
  prisons: [{ buildingId: 2, city: 'oak' }],
  buildings: [
    { id: 1, name: 'Stable', entrance: { x: 55, y: 66 } },
    { id: 2, name: 'Stockade', entrance: { x: 70, y: 80 } },
  ],
  factionName: () => 'Town',
};
const g = locationGroups(w),
  all = g.flatMap((x) => x.items);
assert.equal(all.length, 11);
assert.equal(new Set(all.map((e) => e.id)).size, 11);
assert.equal(g.find((g) => g.id === 'settlements').items[0].name, 'Cathedral');
assert.equal(g.find((g) => g.id === 'landmarks').items[0].name, 'Nearby Barrow');
assert.deepEqual(all.find((e) => e.id === 'place-oak').target, {
  name: 'Town',
  x: 8 * TILE,
  y: 8 * TILE,
});
assert.equal(all.find((e) => e.id === 'place-oak').plan.id, 'oak');
assert.equal(all.find((e) => e.id === 'place-cathedral').plan, 'sanctuary');
assert.equal(
  all.find((e) => e.id === 'dungeon-cave').target.x,
  100,
  'dungeon coordinates already use world pixels',
);
assert.equal(filterLocations(g, 'UNDERWATER').flatMap((g) => g.items).length, 1);
assert.equal(filterLocations(g, '  apiary ').flatMap((g) => g.items)[0].id, 'site-apiary');
assert.equal(filterLocations(g, 'nonexistent').length, 0);
assert.equal(
  filterLocations(g, 'cathedral').flatMap((g) => g.items).length,
  1,
  'category headings must not turn a specific search into an entire group',
);
assert.equal(locationGroups({ ...w, debugMode: true }).at(-1).items.length, 2);
assert.equal(
  locationGroups({ ...w, buildings: [] }).flatMap((g) => g.items).length,
  9,
  'stale building links do not crash the catalog',
);
const quests = [
    { id: 1, status: 'failed' },
    { id: 2, status: 'active' },
    { id: 3, status: 'completed' },
    { id: 4, status: 'active' },
  ],
  groups = questGroups(quests);
assert.deepEqual(
  groups.map((g) => g.items.map((q) => q.id)),
  [[2, 4], [3], [1]],
);
assert.deepEqual(
  quests.map((q) => q.id),
  [1, 2, 3, 4],
);
console.log(
  '✓ Map categories retain targets/plans/debug actions, coordinates, nearby order and search; journal separates active work from history',
);
