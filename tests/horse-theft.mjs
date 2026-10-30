import assert from 'node:assert/strict';
import {
  stealHorse,
  horseOwned,
  playerHorse,
  buyHorse,
  reclaimHorse,
} from '../src/gameplay/horses.js';
import { warrant, sentence } from '../src/gameplay/law.js';
import { grantDebugGold } from '../src/gameplay/debug-tools.js';
function fixture(witness = false) {
  const p = { id: 'player', x: 0, y: 0, hp: 100, inventory: { gold: 0 } },
    horse = {
      id: 1,
      x: 20,
      y: 0,
      hp: 150,
      role: 'horse',
      faction: 'oak',
      horse: { owner: 'stable', city: 'oak' },
    };
  const watcher = { id: 2, x: 40, y: 0, hp: 100, role: 'groom', faction: 'oak' };
  const w = {
    player: p,
    entities: [p, horse, ...(witness ? [watcher] : [])],
    entityById: new Map([[1, horse]]),
    cities: [{ id: 'oak' }],
    life: { generation: 2 },
    time: 480,
    elapsed: 0,
    canInteract: () => true,
    interiorAt: () => null,
    nearby: () => w.entities,
    visibleFrom: () => true,
    lineClear: () => true,
    rebuildSpatial() {},
    log() {},
    factionName: () => 'Town',
  };
  return { w, p, horse, watcher };
}
{
  const { w, p } = fixture();
  assert.equal(grantDebugGold(w).ok, false);
  assert.equal(p.inventory.gold, 0);
  w.debugMode = true;
  assert.equal(grantDebugGold(w).ok, true);
  assert.equal(p.inventory.gold, 1_000_000);
  grantDebugGold(w);
  assert.equal(p.inventory.gold, 2_000_000);
}
{
  const { w, p, horse } = fixture();
  assert.equal(stealHorse(w, horse).ok, true);
  assert.equal(p.inventory.gold, 0);
  assert.ok(horseOwned(w, horse));
  assert.equal(playerHorse(w), horse);
  assert.equal(w.cityMemory, undefined, 'unseen theft does not magically alert city');
  assert.equal(stealHorse(w, horse).ok, false);
}
{
  const { w, horse, watcher } = fixture(true);
  assert.equal(stealHorse(w, horse).ok, true);
  assert.equal(warrant(w, 'oak').kind, 'theft');
  assert.equal(sentence(w, 'oak').kind, 'prison');
  assert.ok(watcher.speechUntil > 0);
}
{
  const { w, horse } = fixture(true);
  w.lineClear = () => false;
  assert.equal(stealHorse(w, horse).ok, true);
  assert.equal(w.cityMemory, undefined);
}
for (const type of ['distant', 'stunned']) {
  const { w, p, horse } = fixture();
  if (type === 'distant') w.canInteract = () => false;
  if (type === 'stunned') p.stunUntil = 10;
  if (type === 'owned') w.entities.push({ hp: 1, horse: { owner: 'player', generation: 2 } });
  assert.equal(stealHorse(w, horse).ok, false);
  assert.equal(horse.horse.owner, 'stable');
  assert.equal(p.riding, undefined);
}
console.log(
  '✓ Debug-only million gold; free horse theft mounts rider, witnesses report theft, unseen theft and failed attempts preserve correct state',
);

{
  const { w, horse } = fixture();
  w.entities.push({ hp: 1, horse: { owner: 'player', generation: 2 } });
  assert.equal(stealHorse(w, horse).ok, true, 'owning a horse does not block another theft');
}

{
  const { w, p, horse } = fixture(true);
  p.inventory.gold = 1000;
  const groom = w.entities.find((e) => e.role === 'groom');
  groom.inventory = {};
  const second = { ...horse, id: 3, horse: { ...horse.horse } };
  w.entities.push(second);
  w.entityById.set(3, second);
  assert.equal(buyHorse(w, groom, horse.id).ok, true);
  assert.equal(buyHorse(w, groom, second.id).ok, true);
  assert.equal(p.inventory.gold, 560);
  const stray = { ...horse, id: 4, horse: { owner: 'stray' } };
  w.entities.push(stray);
  assert.equal(reclaimHorse(w, stray).ok, true, 'multiple owned horses do not block reclaiming');
  assert.equal(w.entities.filter((e) => horseOwned(w, e)).length, 3);
}
