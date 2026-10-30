import assert from 'node:assert/strict';
import { Expedition } from '../src/core/expedition.js';
import { World, TILE, W, ITEMS } from '../src/core/simulation.js';
import { resolveInteraction } from '../src/gameplay/interactions.js';
import { RECIPES, INDUSTRIES } from '../src/gameplay/adventure-content.js';
import {
  beginCraft,
  tickCraft,
  cancelCraft,
  skillLevel,
  deployCamp,
  fuelCamp,
  startCampRest,
  packCamp,
  equipGear,
  armorReduction,
  useSupply,
} from '../src/gameplay/crafts.js';
import { industryAI, updateIndustry } from '../src/gameplay/industry.js';
import {
  contractOffers,
  contractProgress,
  claimContracts,
  updateContracts,
  beginRescue,
  rescueAI,
} from '../src/gameplay/contracts.js';
import { weaponFor } from '../src/gameplay/combat.js';
function alone(seed = 'adventure-tests') {
  const w = new World(seed);
  w.entities = [];
  w.rebuildSpatial();
  w.player.weaponDrawn = false;
  return w;
}
function finish(w) {
  for (let i = 0; i < 500 && w.player.action; i++) tickCraft(w, 0.1);
  assert.equal(w.player.action, null);
}
{
  const w = alone(),
    p = w.player;
  p.inventory = { fiber: 12 };
  assert.ok(beginCraft(w, 'rope').ok);
  assert.equal(p.inventory.fiber, 9);
  assert.equal(p.inventory.rope, undefined);
  const saved = World.restore(w.save());
  assert.equal(saved.player.action.recipe, 'rope');
  finish(saved);
  assert.equal(saved.player.inventory.rope, 1);
  assert.equal(saved.player.inventory.fiber, 9);
  assert.equal(saved.player.crafted.rope, 1);
  assert.ok(saved.player.skills.craft > 0);
  cancelCraft(w);
  assert.ok(beginCraft(w, 'rope').ok);
  p.x += 80;
  tickCraft(w, 0.1);
  assert.equal(p.inventory.fiber, 12, 'Interrupted crafting refunds exactly once');
  tickCraft(w, 99);
  assert.equal(p.inventory.fiber, 12);
  Object.assign(p, w.respawn);
  assert.ok(beginCraft(w, 'rope').ok);
  w.die(p);
  assert.equal(
    w.storages[w.inCity(w.respawn)?.id]?.fiber ||
      w.corpses.find((c) => c.formerPlayer)?.inventory.fiber ||
      w.fallenEstates.find((e) => e.inventory.fiber)?.inventory.fiber,
    12,
    'Reserved materials are recovered into the death inventory',
  );
  console.log(
    '✓ Crafting: reservations, timed production, experience, cancellation, death and saved work without duplication',
  );
}
{
  const w = alone(),
    p = w.player;
  p.inventory = { ore: 10, log: 5 };
  assert.equal(beginCraft(w, 'ingot').ok, false, 'Cannot smelt without forge');
  const smith = w.buildings.find((b) => b.type === 'smith');
  Object.assign(p, smith.workSpot);
  assert.ok(beginCraft(w, 'ingot').ok);
  finish(w);
  assert.equal(p.inventory.ingot, 1);
  assert.equal(p.inventory.ore, 8);
  p.skills.smithing = 30;
  assert.equal(skillLevel(p, 'smithing'), 2);
  assert.ok(beginCraft(w, 'nails').ok);
  finish(w);
  assert.equal(p.inventory.nails, 8);
  assert.equal(p.inventory.ingot, undefined);
  p.inventory.armor = 1;
  p.inventory.shield = 1;
  assert.ok(equipGear(w, 'body', 'armor').ok);
  assert.ok(equipGear(w, 'offhand', 'shield').ok);
  assert.ok(armorReduction(p) > 0.3);
  p.weapon = 'bow';
  assert.equal(armorReduction(p), 0.25);
  p.hp = 20;
  p.inventory.medicine = 1;
  assert.ok(useSupply(w, 'medicine').ok);
  assert.equal(p.hp, 80);
  assert.equal(p.inventory.medicine, undefined);
  console.log(
    '✓ Workplaces, advanced recipes, actual material consumption, wearable armor/shield and consumable medicines',
  );
}
{
  const w = new World('industry-test');
  for (const role of ['grainFarmer', 'beekeeper', ...Object.keys(INDUSTRIES)])
    assert.equal(w.entities.filter((e) => e.industryRole === role).length, 3);
  const e = w.entities.find((e) => e.industryRole === 'miller'),
    store = w.warehouses[e.faction];
  e.inventory = {};
  store.grain = 3;
  e.production = null;
  Object.assign(e, e.deliveryPoint);
  industryAI(w, e, 0.15);
  Object.assign(e, e.work);
  industryAI(w, e, 0.15);
  assert.equal(store.grain, 0);
  assert.equal(e.inventory.flour, undefined);
  assert.equal(e.production.remaining, 12);
  industryAI(w, e, 6);
  assert.equal(e.inventory.flour, undefined);
  industryAI(w, e, 6);
  assert.equal(e.inventory.flour, 2);
  assert.equal(e.production, null);
  assert.equal(weaponFor(e), 'natural', 'Unarmed workers do not conjure swords');
  const farmer = w.entities.find((e) => e.industryRole === 'grainFarmer'),
    crop = w.resources.find(
      (r) => r.industry === farmer.faction + '-grainFarmer' && r.kind === 'grain',
    );
  Object.assign(farmer, crop);
  farmer.inventory = {};
  const cropBefore = crop.amount;
  industryAI(w, farmer, 5);
  assert.equal(crop.amount, cropBefore - 1);
  assert.equal(farmer.inventory.grain, 1);
  crop.amount = 0;
  crop.regrowAt = w.time + 240;
  w.time += 239;
  updateIndustry(w);
  assert.equal(crop.amount, 0);
  w.time += 11;
  updateIndustry(w);
  assert.equal(crop.amount, crop.maxAmount);
  const healer = w.entities.find((e) => e.industryRole === 'healer'),
    guard = w.add('guard', healer.faction, (healer.x + 30) / TILE, healer.y / TILE);
  Object.assign(guard, { x: healer.x + 30, y: healer.y, hp: 40 });
  healer.inventory = { medicine: 1 };
  healer.production = null;
  w.rebuildSpatial();
  industryAI(w, healer, 0.15);
  assert.equal(healer.inventory.medicine, 0);
  assert.equal(guard.hp, 85);
  const restored = World.restore(w.save());
  assert.equal(restored.entities.filter((e) => e.industryRole).length, 21);
  assert.equal(restored.resources.filter((r) => r.industry).length, 27);
  assert.equal(restored.workProps.filter((f) => f.kind === 'noticeBoard').length, 3);
  console.log(
    '✓ Seven professions across three towns: real materials, production, harvest/regrowth, treatment and no duplicates after reload',
  );
}
{
  const w = alone(),
    p = w.player;
  let found = false;
  for (let y = 20; y < 450 && !found; y += 10)
    for (let x = 20; x < 620 && !found; x += 10) {
      Object.assign(p, { x: x * TILE, y: y * TILE });
      if (
        w.inCity(p) ||
        w.terrain(p).water ||
        Math.hypot(p.x - w.respawn.x, p.y - w.respawn.y) < 30 * TILE
      )
        continue;
      p.inventory = { campKit: 1, log: 2, bread: 1 };
      const result = deployCamp(w);
      if (result.ok) found = true;
    }
  assert.ok(found);
  const c = w.camps[0];
  w.corpses = [{ id: 777, name: 'Loot by the Camp', x: p.x + 5, y: p.y, inventory: { gold: 3 } }];
  assert.equal(resolveInteraction(w).kind, 'corpse');
  w.corpses[0].inventory = {};
  assert.equal(resolveInteraction(w).kind, 'camp');
  p.hp = 30;
  p.stamina = 1;
  assert.ok(startCampRest(w, c).ok);
  finish(w);
  assert.equal(p.hp, 65);
  assert.equal(p.stamina, 300);
  assert.equal(p.inventory.bread, undefined);
  const until = c.fireUntil;
  assert.ok(fuelCamp(w, c).ok);
  assert.equal(c.fireUntil, until + 60);
  c.inventory = { gold: 20 };
  assert.equal(packCamp(w, c).ok, false);
  const thief = w.add('bandit', 'red', c.x / TILE, c.y / TILE);
  w.rebuildSpatial();
  w.banditAI(thief, 0.15);
  assert.equal(thief.inventory.gold >= 20, true);
  assert.equal(c.inventory.gold, undefined);
  thief.hp = 0;
  w.rebuildSpatial();
  assert.ok(packCamp(w, c).ok);
  assert.equal(w.camps.length, 0);
  assert.equal(p.inventory.campKit, 1);
  assert.equal(packCamp(w, c).ok, false);
  assert.equal(p.inventory.campKit, 1, 'Stale camp cannot duplicate the kit');
  console.log('✓ Real campsite: rest, food, fuel, chest, looting and packing up');
}
{
  const w = new World('contract-tests'),
    p = w.player,
    city = w.cities[0].id,
    store = w.warehouses[city],
    quarter = w.entities.find((e) => e.faction === city && e.role === 'quartermaster');
  store.grain = 0;
  const offer = contractOffers(w, city).find((q) => q.type === 'commission' && q.item === 'grain');
  assert.ok(offer);
  w.acceptQuest(offer);
  p.inventory.grain = offer.count;
  const gold = p.inventory.gold,
    treasury = store.gold;
  assert.ok(claimContracts(w, quarter).length);
  assert.equal(store.grain, offer.count);
  assert.equal(p.inventory.grain, 0);
  assert.equal(p.inventory.gold, gold + offer.reward);
  assert.equal(store.gold, treasury - offer.reward);
  assert.equal(claimContracts(w, quarter).length, 0);
  const make = contractOffers(w, city).find((q) => q.type === 'make' && q.item === 'rope');
  w.acceptQuest(make);
  p.inventory.rope = 3;
  const q = w.quests.find((q) => q.id === make.id);
  assert.equal(contractProgress(w, q), 0, 'Bought items do not satisfy personal crafting order');
  p.crafted.rope = 3;
  assert.equal(contractProgress(w, q), 3);
  store.gold = 0;
  claimContracts(w, quarter);
  assert.equal(q.status, 'active');
  assert.equal(p.inventory.rope, 3);
  store.gold = 1000;
  claimContracts(w, quarter);
  assert.equal(q.status, 'completed');
  const survey = contractOffers(w, city).find((q) => q.type === 'survey');
  w.acceptQuest(survey);
  const sq = w.quests.find((q) => q.id === survey.id);
  for (const site of sq.checkpoints) {
    Object.assign(p, site);
    updateContracts(w);
  }
  assert.equal(contractProgress(w, sq), sq.count);
  w.time = sq.deadline + 1;
  updateContracts(w);
  assert.equal(sq.status, 'failed');
  console.log(
    '✓ Contracts reflect real shortages: materials enter storage, rewards consume the treasury, crafting differs from buying, deadlines and campsite visits work',
  );
}
{
  const expedition = new Expedition(),
    w = expedition.surface;
  w.debugMode = true;
  const entrance = w.dungeonEntrances[0];
  assert.ok(expedition.enter(entrance.id, { debug: true }).ok);
  const cave = expedition.current;
  cave.debugMode = false;
  cave.entities = [];
  cave.rebuildSpatial();
  cave.player.inventory.fiber = 6;
  cave.player.weaponDrawn = false;
  assert.ok(beginCraft(cave, 'rope').ok);
  assert.equal(cave.player.inventory.fiber, 3);
  expedition.leave();
  Object.assign(w.player, w.respawn);
  assert.equal(w.player.inventory.fiber, 6, 'Leaving dungeon refunds reserved materials');
  w.debugMode = false;
  assert.ok(beginCraft(w, 'rope').ok);
  w.debugMode = true;
  assert.ok(w.debugTravel({ ...w.respawn }).ok);
  assert.equal(w.player.inventory.fiber, 6, 'Debug movement also refunds reserved materials');
  console.log('✓ Surface/dungeon transitions preserve reserved materials');
}
{
  const w = new World('rescue-test'),
    e = w.entities.find((e) => e.captive),
    bandit = w.entities.find(
      (b) => b.faction === e.captor && ['bandit', 'raider', 'brute'].includes(b.role),
    );
  assert.equal(w.hostile(bandit, e), false);
  w.entities = w.entities.filter((o) => o === e);
  Object.assign(w.player, { x: e.x + 30, y: e.y, weaponDrawn: false });
  w.rebuildSpatial();
  const offer = contractOffers(w, e.rescueCity).find((q) => q.target === e.id);
  w.acceptQuest(offer);
  assert.ok(beginRescue(w, e).ok);
  finish(w);
  assert.equal(e.following, true);
  assert.equal(e.captive, false);
  const before = { x: 200.5 * TILE, y: 200.5 * TILE };
  Object.assign(e, before);
  Object.assign(w.player, { x: 204.5 * TILE, y: 200.5 * TILE });
  for (let y = 198; y < 204; y++)
    for (let x = 198; x < 207; x++) {
      w.tiles[y * W + x] = 3;
      w.solids[y * W + x] = 0;
      w.walls[y * W + x] = 0;
      w.roomGrid[y * W + x] = 0;
    }
  w.rebuildSpatial();
  rescueAI(w, e, 0.15);
  assert.ok(Math.hypot(e.x - before.x, e.y - before.y) > 0);
  Object.assign(e, { x: e.home.x + 25, y: e.home.y });
  rescueAI(w, e, 0.15);
  assert.equal(e.rescued, true);
  assert.equal(w.questProgress(w.quests.find((q) => q.target === e.id)), 1);
  const saved = World.restore(w.save());
  assert.equal(saved.entityById.get(e.id).rescued, true);
  console.log(
    '✓ Apprentice rescue: captor protection, untying, physical escort, homecoming and saved state',
  );
}
