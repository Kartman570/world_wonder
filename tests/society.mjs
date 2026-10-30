import assert from 'node:assert/strict';
import { World as BaseWorld, W, H, TILE, dist } from '../src/core/simulation.js';
// Regression fixtures for the previous settlement generation remain stable.
class World extends BaseWorld {
  constructor(seed, options = {}) {
    super(seed, { generatorVersion: 7, ...options });
  }
}
import { Expedition } from '../src/core/expedition.js';
import { hoveredNpc } from '../src/gameplay/interactions.js';
for (let seed = 0; seed < 12; seed++) {
  const w = new World('society-' + seed),
    mid = w.riverRoute[Math.floor(w.riverRoute.length / 2)],
    x = Math.round(mid[0]),
    y = Math.round(mid[1]);
  const seen = new Uint8Array(W * H),
    queue = [y * W + x];
  seen[queue[0]] = 1;
  let reachesBoundary = false;
  for (let k = 0; k < queue.length; k++) {
    const i = queue[k],
      xx = i % W,
      yy = Math.floor(i / W);
    if (xx === 0 || yy === 0 || xx === W - 1 || yy === H - 1) reachesBoundary = true;
    for (const n of [i - 1, i + 1, i - W, i + W])
      if (n >= 0 && n < W * H && !seen[n] && w.riverMask[n] && [2, 4, 5].includes(w.tiles[n])) {
        seen[n] = 1;
        queue.push(n);
      }
  }
  assert.ok(reachesBoundary, `${seed}: natural river does not reach the map boundary`);
  assert.ok(w.cities.some((z) => z.isVillage));
  for (const city of w.cities) {
    const bs = w.buildings.filter((b) => b.city === city.id);
    if (city.isVillage) {
      assert.ok(!bs.some((b) => b.type === 'wall' || b.type === 'tower'));
      assert.ok(city.houseCount <= 14);
    } else {
      assert.ok(bs.some((b) => b.type === 'wall'));
      assert.ok(
        city.gatePlan.every(
          (g) =>
            g.reasons.length && g.reasons.every((r) => ['road', 'logging', 'port'].includes(r)),
        ),
      );
    }
    for (const [dx, dy] of city.gates)
      assert.equal(w.blocked((city.x + dx + 0.5) * TILE, (city.y + dy + 0.5) * TILE), false);
  }
}
console.log(
  '✓ Across 12 worlds, natural rivers reach the region boundary; gates connect to roads and workplaces, hamlets have no walls',
);
const w = new World('working-day'),
  worker = w.entities.find((e) => e.role === 'forester');
w.entities = [worker];
w.pathQueue = [];
w.rebuildSpatial();
Object.assign(worker, worker.work);
const tree = w.treesNear(worker.work, 650)[0];
assert.ok(tree);
Object.assign(worker, { x: tree.x, y: tree.y });
const before = w.warehouses[worker.faction].log;
w.harvest(worker, tree, 6);
const pile = w.woodPiles[0];
assert.equal(pile.inventory.log, 3);
assert.equal(worker.inventory.log || 0, 0);
assert.equal(tree.wood, 0);
assert.equal(w.warehouses[worker.faction].log, before);
w.time = 18 * 60;
w.entities = [worker];
w.rebuildSpatial();
for (let i = 0; i < 1600; i++) w.update(0.15);
assert.equal(w.warehouses[worker.faction].log, before + 3);
assert.equal(
  w.woodPiles.reduce((n, p) => n + (p.inventory.log || 0), 0),
  0,
);
assert.equal(worker.inventory.log || 0, 0);
assert.deepEqual(World.restore(w.save()).woodPiles, w.woodPiles);
console.log(
  '✓ Logs appear on the ground only after chopping and are physically carried to storage in the evening without duplication',
);
const life = new World('life-in-town'),
  tailor = life.entities.find((e) => e.role === 'tailor'),
  king = life.entities.find((e) => e.role === 'king'),
  herald = life.entities.find((e) => e.role === 'herald');
assert.equal(life.interiorAt(tailor).type, 'tailor');
assert.ok(
  life.buildings
    .find((b) => b.id === tailor.workBuildingId)
    .furniture.some((f) => f.kind === 'loom'),
);
assert.equal(life.interiorAt(king).type, 'castle');
tailor.inventory = { fiber: 3, cloth: 0, hide: 0 };
life.warehouses[tailor.faction].fiber = 0;
life.warehouses[tailor.faction].hide = 0;
tailor.craftTimer = 18;
life.craftAI(tailor, 0.15);
assert.equal(tailor.inventory.fiber, 0);
assert.equal(tailor.inventory.cloth, 1);
assert.equal(life.trade(tailor, 'fish', false).ok, false);
const news = life.heraldNews(herald.faction);
assert.ok(news.some((t) => t.includes('plague')));
assert.ok(news.some((t) => life.entities.some((e) => e.caravan && t.includes(e.name))));
life.elapsed = herald.nextAnnouncement + 1;
life.entities = [herald];
life.rebuildSpatial();
life.step(0.15);
assert.ok(herald.announcement);
assert.ok(herald.speechUntil > life.elapsed);
const royal = life.royalOffers(king);
assert.ok(royal.some((q) => q.type === 'clearDungeon'));
assert.ok(royal.some((q) => q.reward >= 400));
const q = royal.find((q) => q.type === 'kill');
life.acceptQuest(q);
life.kills = q.count;
const cash = life.player.inventory.gold;
life.completeQuests(king);
assert.equal(life.quests[0].status, 'completed');
assert.equal(life.player.inventory.gold, cash + q.reward);
assert.equal(new Set(life.campSites.map((c) => c.style)).size, 3);
assert.ok(life.workProps.some((f) => f.kind === 'fishingRod'));
assert.ok(life.workProps.some((f) => f.kind === 'bucket'));
life.entities = [king];
Object.assign(life.player, { x: king.x + 500, y: king.y });
assert.equal(
  hoveredNpc(life, { x: king.x, y: king.y - 23 }),
  null,
  'The king is hidden by the roof from outside',
);
life.entities = [king];
Object.assign(life.player, { x: king.x, y: king.y + 220 });
life.resetMotion();
assert.equal(
  hoveredNpc(life, { x: king.x, y: king.y - 23 }),
  king,
  'Hovering does not require interaction range',
);
assert.equal(
  hoveredNpc(life, { x: king.x, y: king.y - 68 }),
  king,
  'Hovering accounts for the new head height',
);
console.log(
  '✓ Workplaces, textile materials, kings with special tasks, herald news and hover labels work',
);
