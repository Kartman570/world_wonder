import assert from 'node:assert/strict';
import { World, TILE } from '../src/core/simulation.js';
import {
  FOOD,
  initializeEvents,
  updateEvents,
  startRaid,
  raidAI,
  treatPatient,
  eventNews,
} from '../src/gameplay/world-events.js';
import { contractOffers } from '../src/gameplay/contracts.js';
const w = new World('living-tests'),
  city = w.cities[0].id,
  store = w.warehouses[city];
for (const k of FOOD) store[k] = 0;
for (let i = 0; i < 8; i++) {
  w.time += 31;
  updateEvents(w);
}
const s = w.living.cities[city];
assert.ok(s.hunger >= 6);
assert.ok(s.outbreak);
const patient = w.entities.find((e) => e.faction === city && e.sickness);
assert.ok(patient);
assert.ok(contractOffers(w, city).some((q) => /fever/i.test(q.title)));
assert.ok(/fever/i.test(eventNews(w, city).join(' ')));
const meds = { medicine: 1 };
assert.ok(treatPatient(w, patient, meds));
assert.equal(meds.medicine, 0);
assert.equal(patient.sickness, null);
assert.equal(s.treated, 1);
assert.equal(treatPatient(w, patient, meds), false);
store.bread = 100;
for (let i = 0; i < 8; i++) {
  w.time += 31;
  updateEvents(w);
}
assert.equal(s.hunger, 0);
assert.ok(s.meals > 0);
console.log(
  '✓ Real food consumption, hunger, disease outbreaks, urgent tasks, treatment consuming medicine and restored supplies',
);
const raid = startRaid(w, city, 'red');
assert.ok(raid);
assert.equal(startRaid(w, city, 'red'), null);
const bandit = w.entities.find((e) => e.id === raid.members[0]);
Object.assign(bandit, raid.target);
store.bread = 12;
const before = bandit.inventory.bread || 0;
raidAI(w, bandit, 3);
assert.equal(store.bread, 8);
assert.equal(bandit.inventory.bread, before + 4);
assert.equal(raid.phase, 'returning');
const saved = World.restore(w.save()),
  savedRaid = saved.living.raids.find((r) => r.id === raid.id);
assert.equal(savedRaid.stolen, raid.stolen);
assert.equal(
  saved.entities.find((e) => e.id === bandit.id).inventory.bread,
  bandit.inventory.bread,
);
for (const id of savedRaid.members) saved.entityById.get(id).hp = 0;
saved.time += 31;
updateEvents(saved);
assert.equal(savedRaid.status, 'defeated');
assert.ok(saved.living.history.length);
assert.equal(
  saved.events.filter((e) => e.text.includes('supplies')).some((e) => e.scope === 'personal'),
  false,
);
console.log(
  '✓ Raid by existing bandits: no duplicates, warehouse → real inventory, retreat, death, local news and saved state',
);
