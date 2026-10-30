import assert from 'node:assert/strict';
import { World, TILE, W, ANIMALS } from '../src/core/simulation.js';
import { point } from '../src/core/content.js';
import { resolveInteraction, beginGather } from '../src/gameplay/interactions.js';
import { nearbyLootSources, takeLoot } from '../src/gameplay/loot.js';
import { beginCraft } from '../src/gameplay/crafts.js';
import { beginStrike, tickCombat, aimPlayer, attackPlayer } from '../src/gameplay/combat.js';
import {
  initializeAlienEcology,
  alienWorkerAI,
  stealAlienTool,
  giveAlienTool,
  updateAlienEcology,
} from '../src/gameplay/alien-ecology.js';
import { updateLore, canBreathe } from '../src/world/lore-world.js';
import { AIR_GRACE, breathingDanger, atmospherePressure } from '../src/render/atmosphere.js';
import { arkRoomCell } from '../src/render/interiors.js';
const w = new World('alien-suite'),
  p = w.player;
function clearArena() {
  w.entities = [];
  w.corpses = [];
  w.resources = [];
  w.landmarks = [];
  w.pathQueue = [];
  w.player.action = null;
  w.player.hp = 100;
  w.deathReport = null;
  for (let y = 190; y < 230; y++)
    for (let x = 180; x < 250; x++) {
      const i = y * W + x;
      w.tiles[i] = 1;
      w.solids[i] = 0;
      w.walls[i] = 0;
      w.roomGrid[i] = 0;
    }
  Object.assign(p, point(200.5, 210.5));
  w.rebuildSpatial();
}
{
  const corpse = { id: 900001, ...p, inventory: {}, animal: 'caveSpider', butchered: false };
  corpse.id = 900001;
  w.corpses.push(corpse);
  let completed = 0;
  w.onAction = () => completed++;
  w.startAction({ corpse: corpse.id, remaining: 3 });
  w.tickPlayerAction(2.9);
  assert.equal(corpse.butchered, false);
  w.tickPlayerAction(0.11);
  assert.equal(completed, 1);
  assert.equal(corpse.inventory.spiderChitin, 2);
  assert.equal(corpse.inventory.venomGland, 1);
  assert.equal(resolveInteraction(w).kind, 'corpse');
  const source = nearbyLootSources(w).find((s) => s.obj === corpse);
  assert.equal(takeLoot(w, source, 'spiderChitin'), 2);
  assert.equal(takeLoot(w, source, 'venomGland'), 1);
  w.debugMode = true;
  const old = {
    id: 900002,
    x: p.x,
    y: p.y,
    animal: 'caveSpider',
    butchered: true,
    inventory: { hide: 0, meat: 0 },
  };
  w.corpses.push(old);
  initializeAlienEcology(w);
  assert.equal(old.inventory.spiderChitin, 2);
  delete old.inventory.spiderChitin;
  delete old.inventory.venomGland;
  initializeAlienEcology(w);
  assert.equal(old.inventory.spiderChitin, undefined, 'Migration cannot refill a looted spider');
  const caveBody = { animal: 'caveSpider', butchered: true, inventory: { meat: 0, hide: 0 } };
  initializeAlienEcology({ dungeonSpec: {}, corpses: [caveBody] });
  assert.equal(caveBody.inventory.spiderChitin, 2, 'Already butchered cave spiders also migrate');
  const next = { id: 900003, x: p.x, y: p.y, animal: 'wolf', inventory: {}, butchered: false };
  w.corpses.push(next);
  w.startAction({ corpse: next.id, remaining: 3 });
  assert.equal(next.butchered, true);
  assert.equal(p.action, null);
  const herb = { id: 0, x: p.x, y: p.y, kind: 'herb', amount: 1 };
  w.resources = [herb];
  assert.ok(beginGather(w, { kind: 'resource', obj: herb }));
  assert.equal(herb.amount, 0);
  assert.equal(p.action, null);
  p.weaponDrawn = false;
  p.inventory.herb = 5;
  p.inventory.cloth = 5;
  const result = beginCraft(w, 'bandage');
  assert.ok(result.ok, result.message);
  assert.equal(p.action, null);
  assert.ok(p.inventory.bandage > 0);
  w.debugMode = false;
  console.log(
    '✓ Butchering spiders yields accessible loot; legacy zero-value carcasses are repaired, debug instantly finishes gathering, butchering and crafting',
  );
}
{
  const a = w.loreGeography.ark;
  Object.assign(p, point(a.x, a.y));
  p.inventory.breathSuit = 1;
  p.breathSuitWorn = false;
  p.hp = 100;
  w.loreState.exposure = 0;
  assert.equal(canBreathe(w), false);
  assert.equal(breathingDanger(w), true);
  assert.ok(atmospherePressure(w) > 0.2);
  updateLore(w, AIR_GRACE);
  assert.equal(p.hp, 100, 'Time to notice danger and retreat before damage');
  updateLore(w, 10);
  assert.equal(p.hp, 60);
  assert.ok(!w.deathReport);
  p.breathSuitWorn = true;
  updateLore(w, 1);
  assert.equal(w.loreState.exposure, 0);
  assert.equal(p.hp, 60);
  assert.equal(breathingDanger(w), false);
  console.log(
    '✓ Suffocation: 12 seconds to react, then 4 HP/per second; sealed clothing stops the danger while fog remains visible',
  );
}
{
  for (const b of w.buildings.filter((b) => b.type === 'arkVault')) {
    assert.ok(b.w >= 11);
    let floor = 0;
    for (let y = b.y; y < b.y + b.h; y++)
      for (let x = b.x; x < b.x + b.w; x++) {
        const cell = arkRoomCell(b, x, y),
          i = y * W + x;
        if (cell === 'floor') {
          floor++;
          assert.equal(w.roomGrid[i], b.id);
          assert.equal(w.walls[i], 0);
        }
        if (cell === 'wall') assert.equal(w.walls[i], 1);
      }
    assert.ok(floor > 40);
    assert.equal(w.roomGrid[b.y * W + b.x], 0);
    assert.ok(w.path(b.entrance, b.workSpot).length, 'A real walkable doorway into the round home');
  }
  assert.ok(w.alienEcology.sites.length >= 15);
  const miner = w.entities.find((e) => e.role === 'arctMiner'),
    rock = w.alienEcology.sites.find((s) => s.kind === 'arkRock');
  Object.assign(miner, { x: rock.x, y: rock.y + 95, alienSite: rock.id, alienWork: 0 });
  Object.assign(p, { x: rock.x + 130, y: rock.y + 150 });
  const ore = miner.inventory.ore || 0;
  alienWorkerAI(w, miner, 5);
  assert.equal(miner.inventory.ore, ore + 2);
  assert.ok(w.effects.some((f) => f.beam));
  const gardener = w.entities.find((e) => e.alienJob === 'garden'),
    garden = w.alienEcology.sites.find((s) => s.kind === 'arkGarden');
  Object.assign(gardener, { x: garden.x, y: garden.y + 95, alienSite: garden.id, alienWork: 0 });
  alienWorkerAI(w, gardener, 7);
  assert.equal(gardener.inventory.spore, 1);
  const filter = w.alienEcology.sites.find((s) => s.kind === 'arkFilter');
  Object.assign(gardener, { x: filter.x, y: filter.y + 95, alienSite: filter.id });
  alienWorkerAI(w, gardener, 7);
  assert.equal(gardener.inventory.spore, 0);
  assert.equal(filter.inventory.spore, 1);
  const actors = w.entities;
  w.entities = [miner, gardener];
  miner.aggressor = null;
  gardener.aggressor = null;
  const stored = () => w.alienEcology.sites.reduce((n, s) => n + (s.inventory.ore || 0), 0),
    beforeStored = stored();
  for (let i = 0; i < 1600; i++) {
    w.elapsed += 0.15;
    w.time += 0.1;
    w.rebuildSpatial();
    w.processPaths(6);
    alienWorkerAI(w, miner, 0.15);
    alienWorkerAI(w, gardener, 0.15);
  }
  assert.ok(
    stored() > beforeStored,
    'Miner physically walks to the quarry and carries ore to a living structure',
  );
  w.entities = actors;
  w.rebuildSpatial();
  const remains = w.corpses.filter((c) => c.desertRemains).length;
  assert.ok(remains > 100);
  initializeAlienEcology(w);
  assert.equal(w.corpses.filter((c) => c.desertRemains).length, remains);
  const restored = World.restore(w.save());
  assert.deepEqual(restored.alienEcology, w.alienEcology);
  assert.equal(restored.corpses.filter((c) => c.desertRemains).length, remains);
  console.log(
    '✓ Round interior walls and reachable doors; extraction, gathering, carrying, desert remains and saves without duplication',
  );
}
{
  const miner = w.entities.find((e) => e.role === 'arctMiner');
  Object.assign(p, { x: miner.x, y: miner.y + 20, weaponDrawn: false });
  w.rebuildSpatial();
  assert.ok(stealAlienTool(w, miner).ok);
  assert.equal(miner.inventory.arkCutter, 0);
  assert.equal(p.inventory.arkCutter, 1);
  assert.equal(stealAlienTool(w, miner).ok, false);
  const other = w.entities.find((e) => e.role === 'arctMiner' && e !== miner);
  w.damage(p, other, 100000);
  assert.equal(w.corpses.find((c) => c.sourceId === other.id).inventory.arkCutter, 1);
  const original = w.entities.find((e) => e.role === 'wizard');
  p.cutterShots = 0;
  Object.assign(p, { x: original.x, y: original.y + 35 });
  w.rebuildSpatial();
  assert.ok(giveAlienTool(w).message.includes('Good'));
  assert.equal(original.inventory.arkCutter, 1);
  assert.equal(p.inventory.arkCutter, undefined);
  clearArena();
  p.inventory.arkCutter = 1;
  p.inventory.arrow = 0;
  p.stamina = 1;
  assert.ok(w.equip('ranged', 'arkCutter').ok);
  p.weaponMode = 'ranged';
  w.normalizeEquipment();
  p.weaponDrawn = true;
  p.drawUntil = 0;
  p.cooldown = 0;
  const enemy = w.add('nomad', 'emralaan', p.x / TILE + 12, p.y / TILE);
  enemy.mounted = true;
  enemy.inventory.armor = 1;
  enemy.hp = enemy.maxHp = 500;
  w.rebuildSpatial();
  aimPlayer(w, { x: enemy.x, y: enemy.y - 38 }, { lock: true });
  assert.equal(p.lockedTargetId, enemy.id);
  assert.ok(attackPlayer(w).ok);
  tickCombat(w, p, 0.04);
  assert.ok(enemy.hp <= 0);
  assert.equal(p.inventory.arrow, 0);
  assert.equal(p.stamina, 1);
  assert.ok(p.cooldown <= 0.12);
  assert.equal(p.cutterShots, 1);
  p.cooldown = 0;
  const blocked = w.add('nomad', 'emralaan', p.x / TILE + 7, p.y / TILE);
  const wallX = Math.floor(p.x / TILE) + 4;
  w.walls[Math.floor(p.y / TILE) * W + wallX] = 1;
  w.rebuildSpatial();
  assert.ok(beginStrike(w, p, null, { angle: 0, weapon: 'arkCutter' }));
  tickCombat(w, p, 0.04);
  assert.ok(blocked.hp > 0, 'No beam through a wall');
  const wizard = w.add('wizard', 'cathedral', p.x / TILE - 2, p.y / TILE);
  wizard.home = { x: wizard.x, y: wizard.y };
  p.weaponDrawn = true;
  p.cooldown = 0;
  updateAlienEcology(w, 0.1);
  assert.equal(p.inventory.arkCutter, undefined);
  assert.equal(wizard.inventory.arkCutter, 1);
  assert.equal(w.alienEcology.toolReceipts.at(-1).forced, true);
  assert.ok(wizard.announcement.includes('must not use magical artifacts'));
  assert.equal(p.pendingStrike, null);
  console.log(
    '✓ Real theft/corpse loot, ranged slot, rapid beam without arrows/stamina, lethality and walls; voluntary handover and confiscation by Sophos',
  );
}
