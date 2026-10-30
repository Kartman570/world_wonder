import assert from 'node:assert/strict';
import {
  World as BaseWorld,
  TILE,
  W,
  H,
  PLACES,
  ANIMALS,
  questOffers,
} from '../src/core/simulation.js';
// Regression fixtures for the previous settlement generation remain stable.
class World extends BaseWorld {
  constructor(seed, options = {}) {
    super(seed, { generatorVersion: 7, ...options });
  }
}
import { CITIES, point, VERSION } from '../src/core/content.js';
let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log('✓ ' + name);
}
function isolate(w, entities) {
  w.entities = entities;
  w.pathQueue = [];
  w.rebuildSpatial();
  return w;
}
function run(w, seconds, dt = 0.15) {
  for (let t = 0; t < seconds; t += dt) w.update(dt);
}
test('A region 28+ times larger; travel between town gates takes more than a minute of sprinting', () => {
  assert.ok((W * H) / (112 * 96) > 28);
  const cities = new World().cities;
  for (let i = 0; i < cities.length; i++)
    for (let j = i + 1; j < cities.length; j++) {
      const a = cities[i],
        b = cities[j];
      const minimum = ((Math.hypot(a.x - b.x, a.y - b.y) - Math.SQRT2 * 50) * TILE) / 195;
      assert.ok(minimum > 60, `${a.id}–${b.id}: ${minimum}`);
    }
});
test('World generation is reproducible by seed; forest differs with another seed', () => {
  const a = new World('abc'),
    b = new World('abc'),
    c = new World('def');
  assert.deepEqual(a.tiles, b.tiles);
  assert.deepEqual(a.trees.slice(0, 100), b.trees.slice(0, 100));
  assert.notDeepEqual(a.trees.slice(0, 100), c.trees.slice(0, 100));
});
test('Every town has a castle, walls, districts, workshops and passable gates', () => {
  const w = new World();
  for (const z of w.cities) {
    const bs = w.buildings.filter((b) => b.city === z.id);
    assert.ok(bs.filter((b) => b.type === 'house').length >= (z.isVillage ? 8 : 12));
    for (const type of [
      'castle',
      'smith',
      'inn',
      'warehouse',
      ...(z.fortified === false ? [] : ['wall', 'tower']),
    ])
      assert.ok(bs.some((b) => b.type === type));
    for (const [dx, dy] of z.gates || [
      [0, 25],
      [0, -25],
      [25, 0],
      [-25, 0],
    ])
      assert.equal(w.blocked((z.x + dx + 0.5) * TILE, (z.y + dy + 0.5) * TILE), false);
    assert.ok(w.districts.filter((d) => d.city === z.id).length >= 6);
  }
});
test('Fish appears after fishing and consumes bait', () => {
  const w = new World(),
    e = w.entities.find((e) => e.role === 'fisher');
  isolate(w, [e]);
  assert.equal(e.inventory.fish, undefined);
  Object.assign(e, e.work);
  e.timer = 0;
  w.update(0.15);
  assert.equal(e.inventory.fish, 1);
  assert.equal(e.inventory.bait, 19);
});
test('The fisher physically reaches the water through the gate and catches fish', () => {
  const w = new World(),
    e = w.entities.find((e) => e.role === 'fisher' && e.faction === 'north');
  isolate(w, [e]);
  run(w, 100);
  assert.ok((e.inventory.fish || 0) > 0, 'The fisher must reach the workplace');
});
test('Residents do not trade; blacksmiths do not buy fish; fishers do not buy swords', () => {
  const w = new World(),
    p = w.player,
    smith = w.entities.find((e) => e.role === 'smith'),
    fisher = w.entities.find((e) => e.role === 'fisher'),
    citizen = w.entities.find((e) => e.role === 'citizen');
  p.inventory.fish = 3;
  assert.equal(w.trade(smith, 'fish', false).ok, false);
  assert.equal(w.trade(fisher, 'sword', false).ok, false);
  assert.equal(w.trade(citizen, 'fish', false).ok, false);
  const cash = p.inventory.gold;
  p.inventory.ore = 1;
  assert.equal(w.trade(smith, 'ore', false).ok, true);
  assert.ok(p.inventory.gold > cash);
  assert.equal(p.inventory.ore, 0);
});
test('Chopping creates logs from a tree and leaves a stump', () => {
  const w = new World(),
    worker = w.entities.find((e) => e.role === 'forester'),
    e = w.player,
    t = w.treesNear(worker.work, 500)[0];
  assert.ok(t);
  e.inventory.log = 0;
  w.harvest(e, t, 5.9);
  assert.equal(e.inventory.log, 0);
  w.harvest(e, t, 0.2);
  assert.equal(e.inventory.log, 3);
  assert.equal(t.wood, 0);
  w.harvest(e, t, 10);
  assert.equal(e.inventory.log, 3);
});
test('The forester leaves through the gate, chops trees and delivers logs', () => {
  const w = new World(),
    e = w.entities.find((e) => e.role === 'forester');
  isolate(w, [e]);
  const before = w.warehouses[e.faction].log;
  run(w, 160);
  assert.ok(
    w.trees.some((t) => t.wood === 0),
    'The tree must be felled',
  );
  assert.equal(
    w.warehouses[e.faction].log,
    before,
    'Logs must remain at the logging site during the day',
  );
  assert.ok(w.woodPiles.some((p) => p.inventory.log > 0));
  w.time = 18 * 60;
  run(w, 180);
  assert.ok(w.warehouses[e.faction].log > before, 'Logs must reach the warehouse in the evening');
});
test('Carcasses require butchering; the hunter collects the resulting meat and hides', () => {
  const w = new World(),
    h = w.entities.find((e) => e.role === 'hunter'),
    d = w.entities.find((e) => e.role === 'deer');
  isolate(w, [h, d]);
  Object.assign(h, point(200, 350));
  Object.assign(d, point(200, 350));
  d.hp = 1;
  w.damage(h, d, 10);
  const c = w.corpses[0];
  assert.equal(c.inventory.meat, undefined);
  assert.equal(c.butchered, false);
  run(w, 4);
  assert.equal(c.butchered, true);
  assert.equal(h.inventory.meat, ANIMALS.deer.meat);
  assert.equal(h.inventory.hide, ANIMALS.deer.hide);
  assert.deepEqual(c.inventory, {});
});
test('Deep forest slows movement more than the edge; roads allow full speed', () => {
  const w = new World();
  let edge, deep;
  for (let i = 0; i < W * H; i++)
    if (w.tiles[i] === 0 && !w.solids[i]) {
      if (w.depth[i] === 2) edge = point((i % W) + 0.5, Math.floor(i / W) + 0.5);
      if (w.depth[i] >= 18) deep = point((i % W) + 0.5, Math.floor(i / W) + 0.5);
      if (edge && deep) break;
    }
  assert.ok(w.terrain(deep).speed < w.terrain(edge).speed);
  assert.equal(w.terrain(w.territories[0]).speed, 1);
});
test('The player swims; river current moves an idle player, lake water does not', () => {
  const w = new World();
  isolate(w, []);
  const river = w.tiles.findIndex(
    (t, i) =>
      t === 4 &&
      i > W * 10 &&
      i < W * (H - 10) &&
      [i - W, i + W, i - 1, i + 1, i - 2, i + 2].every((n) => w.tiles[n] === 4) &&
      !w.solids[i] &&
      !w.inCity(point(i % W, Math.floor(i / W))),
  );
  Object.assign(w.player, point((river % W) + 0.5, Math.floor(river / W) + 0.5));
  const before = { ...w.player };
  w.update(1);
  assert.ok(
    w.river.axis === 'horizontal' ? w.player.x > before.x + 45 : w.player.y > before.y + 45,
  );
  assert.equal(w.player.swimming, true);
  assert.equal(w.blocked(w.player.x, w.player.y, true), false);
  assert.equal(w.blocked(w.player.x, w.player.y, false), true);
  Object.assign(w.player, point(w.lake.x, w.lake.y));
  const lake = { x: w.player.x, y: w.player.y };
  w.update(1);
  assert.deepEqual({ x: w.player.x, y: w.player.y }, lake);
});
test('An archer consumes an arrow; the projectile deals damage', () => {
  const w = new World(),
    a = w.entities.find((e) => e.role === 'banditArcher');
  isolate(w, [a]);
  const city = w.cities[0];
  Object.assign(a, point(city.x - 2, city.y));
  Object.assign(w.player, point(city.x + 2, city.y));
  w.player.hp = 100;
  const arrows = a.inventory.arrow;
  w.random = () => 0.5;
  assert.equal(w.hit(a, w.player, true), true);
  assert.equal(a.inventory.arrow, arrows - 1);
  assert.equal(w.projectiles.length, 1);
  for (let i = 0; i < 30; i++) {
    w.rebuildSpatial();
    w.updateProjectiles(0.025);
  }
  assert.ok(w.player.hp < 100);
});
test('Arrows do not pass through town walls', () => {
  const w = new World(),
    a = w.entities.find((e) => e.role === 'banditArcher'),
    wall = w.buildings.find((b) => b.type === 'wall' && b.w >= 5 && b.h === 1);
  assert.ok(wall);
  Object.assign(a, point(wall.x + 2, wall.y - 1));
  Object.assign(w.player, point(wall.x + 2, wall.y + 2));
  assert.equal(w.lineClear(a, w.player), false);
  assert.equal(w.hit(a, w.player, true), false);
});
test('A bandit takes the real relic from the player corpse', () => {
  const w = new World(),
    b = w.entities.find((e) => e.role === 'bandit');
  isolate(w, [b]);
  Object.assign(w.player, { x: b.x, y: b.y, inventory: { relic: 1, gold: 25 } });
  w.die(w.player, b);
  w.deathReport.acknowledged = true;
  run(w, 0.6);
  assert.equal(b.inventory.relic, 1);
  assert.deepEqual(w.corpses[0].inventory, {});
  assert.deepEqual(w.player.inventory, {});
});
test('Dying in town does not transfer belongings to the new wanderer', () => {
  const w = new World();
  Object.assign(w.player, point(w.cities[0].x, w.cities[0].y));
  w.player.inventory = { gold: 37, relic: 1 };
  w.die(w.player);
  assert.equal(w.corpses.length, 0);
  assert.equal(w.fallenEstates[0].inventory.gold, 37);
  assert.equal(w.fallenEstates[0].inventory.relic, 1);
  assert.deepEqual(w.storages[w.cities[0].id], {});
});
test('Gathering, letter delivery and visits: separate tasks with correct recipients', () => {
  const w = new World(),
    cook = w.entities.find((e) => e.role === 'cook'),
    mayor = w.entities.find((e) => e.role === 'mayor');
  const fish = questOffers(cook).find((q) => q.item === 'fish');
  w.acceptQuest(fish);
  w.player.inventory.fish = 6;
  const cash = w.player.inventory.gold;
  w.completeQuests(mayor);
  assert.equal(w.quests[0].status, 'active');
  w.completeQuests(cook);
  assert.equal(w.quests[0].status, 'completed');
  assert.equal(w.player.inventory.fish, 0);
  assert.equal(w.player.inventory.gold, cash + fish.reward);
  const courier = questOffers(mayor).find((q) => q.type === 'courier');
  w.acceptQuest(courier);
  assert.equal(w.player.inventory.letter, 1);
  const recipient = w.entities.find((e) => e.role === 'mayor' && e.faction === courier.destination);
  w.completeQuests(recipient);
  assert.equal(w.quests[1].status, 'completed');
  assert.equal(w.player.inventory.letter, 0);
  const visit = questOffers(mayor).find((q) => q.type === 'visit');
  w.acceptQuest(visit);
  const p = w.places.find((p) => p.id === visit.place);
  Object.assign(w.player, point(p.x, p.y));
  w.update(0.1);
  assert.equal(w.questProgress(w.quests[2]), 1);
});
test('Caravans physically exchange cargo with storage without generating goods', () => {
  const w = new World(),
    m = w.entities.find((e) => e.caravan),
    dest = w.cities.find((c) => c.id === m.destination);
  isolate(w, [m]);
  m.rest = 0;
  Object.assign(m, point(dest.x, dest.y + 9));
  const keys = new Set([...Object.keys(m.inventory), ...Object.keys(w.warehouses[dest.id])]);
  const totals = Object.fromEntries(
    [...keys].map((k) => [k, (m.inventory[k] || 0) + (w.warehouses[dest.id][k] || 0)]),
  );
  w.caravanAI(m, 0.15);
  assert.equal(w.caravanStats.arrived, 1);
  assert.equal(m.faction, dest.id);
  assert.ok(m.leg === 1);
  for (const k of keys)
    assert.equal(
      (m.inventory[k] || 0) + (w.warehouses[dest.id][k] || 0),
      totals[k] - (k === 'ration' ? 1 : 0),
      'Preservation ' + k,
    );
});
test('Escort completes only with a living caravan and the player nearby', () => {
  const w = new World(),
    m = w.entities.find((e) => e.caravan),
    q = questOffers(m)[0];
  w.acceptQuest(q);
  const dest = w.cities.find((z) => z.id === m.destination);
  Object.assign(m, point(dest.x, dest.y + 9));
  Object.assign(w.player, point(dest.x, dest.y + 10));
  m.rest = 0;
  w.quests[0].accompanied = 25;
  w.caravanAI(m, 0.15);
  assert.equal(w.quests[0].arrived, true);
  const qm = w.entities.find((e) => e.role === 'quartermaster' && e.faction === dest.id);
  w.completeQuests(qm);
  assert.equal(w.quests[0].status, 'completed');
});
test('A destroyed caravan fails the escort; its cargo remains in the body', () => {
  const w = new World(),
    m = w.entities.find((e) => e.caravan);
  w.acceptQuest(questOffers(m)[0]);
  const cargo = { ...m.inventory };
  m.hp = 0;
  w.die(m);
  assert.equal(w.caravanStats.lost, 1);
  assert.equal(w.quests[0].status, 'failed');
  assert.deepEqual(w.corpses[0].inventory, cargo);
});
test('Residents go home at night while guards stay awake', () => {
  const w = new World(),
    c = w.entities.find((e) => e.role === 'citizen'),
    g = w.entities.find((e) => e.role === 'guard');
  isolate(w, [c, g]);
  w.time = 21 * 60;
  w.update(0.15);
  assert.equal(c.state, 'sleep');
  assert.notEqual(g.state, 'sleep');
});
test('Saves restore felled trees, resources, tasks and real cargo', () => {
  const w = new World();
  w.harvest(w.player, w.trees[3], 6);
  w.resources[0].amount = 0;
  w.entities[5].inventory.fish = 7;
  w.acceptQuest(questOffers(w.entities.find((e) => e.role === 'cook'))[0]);
  const restored = World.restore(w.save());
  assert.equal(restored.trees[3].wood, 0);
  assert.equal(restored.resources[0].amount, 0);
  assert.deepEqual(restored.quests, w.quests);
  assert.deepEqual(restored.entities[5].inventory, w.entities[5].inventory);
  assert.deepEqual(restored.warehouses, w.warehouses);
  assert.doesNotThrow(() => run(restored, 0.3));
});
test('Old saves transfer items into the new cathedral', () => {
  const w = World.restore(
    JSON.stringify({ seed: 'old', player: { inventory: { gold: 777, relic: 1 } } }),
  );
  assert.equal(w.player.inventory.gold, 777);
  assert.equal(w.player.x, w.spawn.x);
  assert.equal(w.version, VERSION);
});

test('Doors lead into the same map; walls block passage and all workplaces are reachable', () => {
  const w = new World(),
    tiles = w.tiles,
    entities = w.entities;
  const rooms = w.buildings.filter((b) => b.enterable);
  assert.ok(rooms.length >= 45);
  for (const b of rooms) {
    assert.equal(
      w.blocked((b.door.x + 0.5) * TILE, (b.door.y + 0.5) * TILE),
      false,
      b.type + ' door',
    );
    assert.equal(w.interiorAt(b.workSpot)?.id, b.id);
    assert.equal(w.blocked(b.workSpot.x, b.workSpot.y), false);
    assert.equal(w.blocked((b.x + 0.5) * TILE, (b.y + 2.5) * TILE), true, 'Side wall');
    assert.ok(w.path(b.entrance, b.workSpot).length, 'Path to workplace ' + b.type);
  }
  const b = rooms.find((b) => b.type === 'smith');
  Object.assign(w.player, b.entrance);
  assert.equal(w.interiorAt(w.player), null);
  for (let i = 0; i < 120; i++) w.move(w.player, w.player.x, w.player.y - 100, 115, 0.016);
  assert.equal(w.interiorAt(w.player)?.id, b.id);
  for (let i = 0; i < 160; i++) w.move(w.player, w.player.x, w.player.y + 100, 115, 0.016);
  assert.equal(w.interiorAt(w.player), null);
  assert.equal(w.tiles, tiles);
  assert.equal(w.entities, entities);
});
test('The merchant is neither visible nor selectable from outside, even beside the door', () => {
  const w = new World(),
    e = w.entities.find((e) => e.role === 'smith'),
    b = w.buildings.find((b) => b.id === e.workBuildingId);
  Object.assign(w.player, b.entrance);
  e.x = (b.door.x + 0.5) * TILE;
  e.y = (b.door.y + 0.5) * TILE;
  isolate(w, [e]);
  assert.ok(Math.hypot(e.x - w.player.x, e.y - w.player.y) < 85);
  assert.equal(w.visibleFrom(w.player, e), false);
  assert.equal(w.canInteract(w.player, e), false);
  const hp = e.hp;
  w.attackPlayer();
  assert.equal(e.hp, hp);
  Object.assign(w.player, { x: e.x, y: e.y + 10 });
  assert.equal(w.visibleFrom(w.player, e), true);
  assert.equal(w.canInteract(w.player, e), true);
});
test('Professions work indoors; a separate worker gathers herbs outdoors', () => {
  const w = new World();
  for (const role of ['smith', 'cook', 'herbalist', 'mayor', 'quartermaster'])
    for (const e of w.entities.filter((e) => e.role === role))
      assert.equal(w.interiorAt(e)?.id, e.workBuildingId);
  const smith = w.entities.find((e) => e.role === 'smith');
  isolate(w, [smith]);
  const ore = smith.inventory.ore;
  run(w, 20);
  assert.ok(smith.inventory.ore < ore);
  assert.ok(smith.inventory.sword > 5);
});
test('The fisher physically enters a home at night instead of disappearing outdoors', () => {
  const w = new World(),
    e = w.entities.find((e) => e.role === 'fisher');
  isolate(w, [e]);
  Object.assign(e, e.work);
  w.time = 21 * 60;
  run(w, 140);
  assert.equal(e.state, 'sleep');
  assert.equal(w.interiorAt(e)?.id, e.homeBuildingId);
});
test('Between steps AI the visible position is smooth and does not change the simulation', () => {
  const w = new World(),
    e = w.entities.find((e) => e.role === 'guard');
  isolate(w, [e]);
  const z = w.cities[0];
  Object.assign(e, point(z.x - 2, z.y));
  e.home = { ...point(z.x - 2, z.y) };
  e.patrolPoint = point(z.x + 2, z.y);
  e.timer = 100;
  const start = e.x;
  w.update(0.15);
  assert.ok(e.x > start);
  const actual = e.x,
    saved = w.save(),
    positions = Array.from({ length: 10 }, (_, i) => w.renderPose(e, i / 9).x);
  assert.equal(positions[0], start);
  assert.equal(positions.at(-1), actual);
  assert.equal(new Set(positions).size, 10);
  assert.equal(w.save(), saved);
});
test('Real fishing and combat with loot continue far from the player', () => {
  const w = new World(),
    f = w.entities.find((e) => e.role === 'fisher'),
    a = w.entities.find((e) => e.faction === 'red' && e.role === 'bandit'),
    b = w.entities.find((e) => e.faction === 'ash' && e.role === 'bandit');
  isolate(w, [f, a, b]);
  Object.assign(f, f.work);
  f.timer = 0;
  Object.assign(a, point(200, 300));
  Object.assign(b, { x: a.x + 25, y: a.y });
  a.hp = b.hp = 15;
  w.rebuildSpatial();
  run(w, 5);
  assert.ok(f.inventory.fish > 0);
  assert.ok(a.hp <= 0 || b.hp <= 0);
  assert.ok(w.corpses.length > 0);
  assert.ok(w.events.some((e) => e.text.includes('took the loot')));
});
test('Budgeted long-path searches run incrementally and finish', () => {
  const w = new World(),
    e = w.entities.find((e) => e.caravan);
  isolate(w, [e]);
  e.nav = point(548, 309);
  e.pathPending = true;
  w.pathQueue = [{ entity: e.id, dest: { ...e.nav } }];
  w.pathBudgetMs = 0.001;
  let slices = 0;
  do {
    w.processPaths(1);
    slices++;
    assert.ok(slices < 2000);
  } while (w.pathJob || w.pathQueue.length);
  assert.ok(slices > 1);
  assert.ok(e.route.length > 10);
  assert.equal(e.pathPending, false);
});
test('Migration 0.2 preserves items and quests and moves artisans indoors', () => {
  const w = new World(),
    e = w.entities.find((e) => e.role === 'smith');
  e.inventory.gold = 987;
  w.player.inventory.gold = 456;
  w.acceptQuest(questOffers(e)[0]);
  const d = JSON.parse(w.save());
  delete d.interiorRevision;
  const old = d.entities.find((n) => n.id === e.id);
  old.x = (88 - 16) * TILE;
  old.y = (300 - 3) * TILE;
  old.state = 'working';
  const loaded = World.restore(JSON.stringify(d)),
    smith = loaded.entities.find((n) => n.id === e.id);
  assert.equal(smith.inventory.gold, 987);
  assert.equal(loaded.player.inventory.gold, 456);
  assert.deepEqual(loaded.quests, w.quests);
  assert.equal(loaded.interiorAt(smith)?.type, 'smith');
});
console.log(`${passed} checks passed.`);
