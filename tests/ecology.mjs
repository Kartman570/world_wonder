import assert from 'node:assert/strict';
import { World, TILE, ANIMALS } from '../src/core/simulation.js';
import { initializeEcology, updateEcology, weatherAt } from '../src/gameplay/ecology.js';
const w = new World('ecology-tests'),
  t = w.trees.find((t) => Math.hypot(t.x - w.player.x, t.y - w.player.y) > 1000);
t.wood = 0;
w.choppedTrees.add(t.id);
initializeEcology(w);
const start = w.time;
w.time += 4319;
updateEcology(w);
assert.equal(t.wood, 0);
w.time += 31;
Object.assign(w.player, { x: t.x, y: t.y });
updateEcology(w);
assert.equal(t.wood, 0, 'No tree grows under the player');
Object.assign(w.player, w.respawn);
w.time += 31;
updateEcology(w);
assert.equal(t.wood, 3);
assert.equal(w.choppedTrees.has(t.id), false);
assert.ok(w.ecology.regrown > 0);
const r = w.resources.find((r) => r.kind === 'herb' && !r.industry);
r.amount = 0;
w.time += 31;
updateEcology(w);
const deadline = r.regrowAt;
w.time = deadline - 1;
updateEcology(w);
assert.equal(r.amount, 0);
w.time = deadline + 31;
Object.assign(w.player, w.respawn);
if (Math.hypot(r.x - w.player.x, r.y - w.player.y) < 400) w.player.x += 1000;
updateEcology(w);
assert.equal(r.amount, 2);
const ore = w.resources.find((r) => r.kind === 'ore');
ore.amount = 0;
w.time += 10000;
updateEcology(w);
assert.equal(ore.amount, 0, 'Ore is finite');
console.log(
  '✓ Forest regrows after three days and herbs on schedule, never under the player; ore remains finite',
);
const adults = w.entities.filter((e) => e.role === 'deer' && e.hp > 0);
assert.ok(adults.length >= 3);
const parent = adults[0],
  spot = w.trees.find(
    (t) =>
      !w.inCity(t) &&
      !w.terrain(t).water &&
      Math.hypot(t.x - w.player.x, t.y - w.player.y) > 2000 &&
      !w.blocked(t.x, t.y),
  );
Object.assign(parent, { x: spot.x, y: spot.y });
Object.assign(adults[1], { x: spot.x + 80, y: spot.y });
adults[2].hp = 0;
w.ecology.nextBirth = w.time;
w.ecology.nextCheck = w.time;
updateEcology(w);
const child = w.entities.find((e) => e.role === 'deer' && e.juvenileUntil);
assert.ok(child);
assert.ok(child.maxHp < ANIMALS.deer.hp);
const loaded = World.restore(w.save());
assert.equal(loaded.ecology.births, w.ecology.births);
assert.equal(
  loaded.entities.filter((e) => e.juvenileUntil).length,
  w.entities.filter((e) => e.juvenileUntil).length,
);
loaded.time = child.juvenileUntil + 31;
loaded.ecology.nextCheck = loaded.time;
updateEcology(loaded);
assert.equal(loaded.entities.find((e) => e.id === child.id).maxHp, ANIMALS.deer.hp);
assert.deepEqual(weatherAt(w), weatherAt(World.restore(w.save())));
const kinds = new Set();
for (let i = 0; i < 128; i++) kinds.add(weatherAt({ seed: w.seed, time: i * 360 }).kind);
assert.ok(kinds.has('rain') && kinds.has('snow') && kinds.has('fog'));
console.log(
  '✓ Limited breeding of living pairs, young animals and maturation, saved state and reproducible seasons with rain, snow and fog',
);
