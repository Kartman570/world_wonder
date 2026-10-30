import assert from 'node:assert/strict';
import { World } from '../src/core/simulation.js';
import { FOOD, updateEvents } from '../src/gameplay/world-events.js';
const w = new World('living-journey'),
  initial = new Map(w.entities.map((e) => [e.id, { x: e.x, y: e.y }]));
w.living.nextCheck = w.time;
for (const z of w.cities) {
  w.living.cities[z.id].nextRaid = w.time;
  for (const k of FOOD) w.warehouses[z.id][k] = 0;
}
updateEvents(w);
assert.ok(w.living.raids.length > 0);
const participants = w.living.raids.flatMap((r) => r.members);
for (let i = 0; i < 4000; i++) {
  w.update(0.15);
  if (i % 1000 === 999)
    console.log('Living region: ' + Math.round(w.elapsed) + ' simulation seconds');
}
assert.ok(
  participants.some((id) => {
    const e = w.entityById.get(id),
      p = initial.get(id);
    return e && Math.hypot(e.x - p.x, e.y - p.y) > 1000;
  }),
  'Raiders physically travel',
);
assert.ok(w.entities.every((e) => Number.isFinite(e.x) && Number.isFinite(e.y)));
for (const inventory of [...w.entities.map((e) => e.inventory), ...Object.values(w.warehouses)])
  assert.ok(Object.values(inventory).every((n) => Number.isFinite(n) && n >= 0));
assert.ok(Object.values(w.living.cities).some((s) => s.meals > 0));
const saved = World.restore(w.save());
assert.deepEqual(saved.living, w.living);
assert.deepEqual(saved.projects, w.projects);
saved.update(0.15);
console.log(
  JSON.stringify(
    {
      seconds: w.elapsed,
      raids: w.living.raids.map((r) => ({
        city: r.city,
        status: r.status,
        phase: r.phase,
        stolen: r.stolen,
        survivors: r.members.filter((id) => w.entityById.get(id)?.hp > 0).length,
      })),
      caravans: w.caravanStats,
      ill: w.entities.filter((e) => e.hp > 0 && e.sickness).length,
    },
    null,
    2,
  ),
);
