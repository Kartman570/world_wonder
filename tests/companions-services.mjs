import assert from 'node:assert/strict';
import { World, TILE, ITEMS } from '../src/core/simulation.js';
import {
  standing,
  tradePrice,
  beginInnRest,
  clinicHeal,
} from '../src/gameplay/settlement-services.js';
import { cityMemory, recordCrime } from '../src/gameplay/law.js';
import { tickCraft, cancelCraft } from '../src/gameplay/crafts.js';
import {
  hireCompanion,
  orderCompanion,
  giveCompanion,
  companionAI,
  updateCompanions,
} from '../src/gameplay/companions.js';
import { startRaid } from '../src/gameplay/world-events.js';
import { contractOffers, updateContracts, contractProgress } from '../src/gameplay/contracts.js';
const w = new World('party-tests'),
  city = w.cities[0].id,
  p = w.player,
  hunter = w.entities.find((e) => e.role === 'hunter' && e.faction === city);
Object.assign(p, { x: hunter.x, y: hunter.y });
p.inventory.gold = 1000;
p.weaponDrawn = false;
w.rebuildSpatial();
assert.equal(hireCompanion(w, hunter).ok, false);
cityMemory(w, city).reputation = 40;
assert.equal(standing(w, city).title, 'Friend of the Town');
const smith = w.entities.find((e) => e.role === 'smith' && e.faction === city);
assert.equal(
  tradePrice(w, smith, 'sword'),
  Math.ceil(ITEMS.sword.price * 0.9),
  'Discount uses real item price',
);
assert.ok(hireCompanion(w, hunter).ok);
assert.equal(p.inventory.gold, 940);
const until = hunter.companion.until;
p.inventory.arrow = 20;
const arrows = hunter.inventory.arrow || 0;
assert.ok(giveCompanion(w, hunter, 'arrow').ok);
assert.equal(hunter.inventory.arrow, arrows + 10);
assert.equal(p.inventory.arrow, 10);
assert.ok(orderCompanion(w, hunter, 'hold').ok);
assert.deepEqual(hunter.companion.anchor, { x: hunter.x, y: hunter.y });
const moved = { x: hunter.x + 200, y: hunter.y };
Object.assign(p, moved);
companionAI(w, hunter, 0.15);
assert.equal(hunter.state, 'holdingPosition');
assert.ok(orderCompanion(w, hunter, 'follow').ok);
assert.equal(
  w.hostile(
    hunter,
    w.entities.find((e) => e.role === 'deer'),
  ),
  false,
);
assert.equal(
  w.hostile(
    hunter,
    w.entities.find((e) => e.role === 'guard'),
  ),
  false,
);
const civilian = w.entities.find((e) => e.role === 'citizen');
civilian.aggressor = 'player';
assert.equal(
  w.hostile(hunter, civilian),
  false,
  'Companion does not attack the player’s innocent victim',
);
civilian.aggressor = null;
const loaded = World.restore(w.save()),
  follower = loaded.entityById.get(hunter.id);
assert.equal(follower.companion.until, until);
loaded.time = until + 1;
updateCompanions(loaded);
assert.equal(follower.companion.returning, true);
Object.assign(follower, follower.home);
companionAI(loaded, follower, 0.15);
assert.equal(follower.companion, null);
recordCrime(w, city, 'murder');
updateCompanions(w);
assert.equal(hunter.companion.active, false);
assert.equal(hunter.companion.returning, true);
console.log(
  '✓ Reputation, discounts, paid hiring of a real hunter, orders, arrow transfer, saving, contract expiration and refusal to join crimes',
);
const inn = w.buildings.find((b) => b.type === 'inn' && b.city),
  cook = w.entities.find((e) => e.role === 'cook' && e.faction === inn.city);
w.cityMemory[inn.city].active = null;
Object.assign(cook, inn.workSpot);
Object.assign(p, inn.workSpot);
p.hp = 20;
p.stamina = 0;
cook.inventory.bread = 3;
w.entities = w.entities.filter((e) => e === cook || e.industryRole === 'healer');
w.rebuildSpatial();
const gold = p.inventory.gold,
  cookGold = cook.inventory.gold || 0;
assert.ok(beginInnRest(w, cook).ok);
assert.ok(p.inventory.gold < gold);
cancelCraft(w);
assert.equal(p.inventory.gold, gold);
assert.equal(cook.inventory.bread, 3);
assert.ok(beginInnRest(w, cook).ok);
const paid = gold - p.inventory.gold;
tickCraft(w, 12);
assert.equal(p.hp, 100);
assert.equal(cook.inventory.bread, 2);
assert.equal(cook.inventory.gold, cookGold + paid);
assert.ok(beginInnRest(w, cook).ok);
cook.inventory.bread = 0;
cook.inventory.ration = 0;
cook.inventory.jerky = 0;
tickCraft(w, 12);
assert.equal(p.inventory.gold, gold - paid, 'Unavailable food refunds payment');
const healer = w.entities.find((e) => e.industryRole === 'healer');
Object.assign(p, { x: healer.x, y: healer.y });
healer.inventory.medicine = 1;
p.hp = 20;
w.cityMemory[healer.faction].active = null;
w.rebuildSpatial();
assert.ok(clinicHeal(w, healer).ok);
assert.equal(p.hp, 95);
assert.equal(healer.inventory.medicine, 0);
assert.equal(clinicHeal(w, healer).ok, false);
console.log(
  '✓ Timed lodging, food consumption, payment to the host, cancellation/refund and paid treatment using real medicine',
);
const battle = new World('defense-tests'),
  raid = startRaid(battle, battle.cities[0].id, 'red');
const offer = contractOffers(battle, raid.city).find((q) => q.type === 'defend');
assert.ok(offer);
battle.acceptQuest(offer);
const q = battle.quests.find((q) => q.id === offer.id);
Object.assign(battle.player, raid.target);
for (let i = 0; i < 12; i++) {
  battle.time++;
  updateContracts(battle);
}
assert.ok(q.defenseMinutes >= 10);
raid.status = 'repelled';
updateContracts(battle);
assert.equal(contractProgress(battle, q), 1);
assert.equal(q.deadline, null);
raid.stolen = 4;
assert.equal(contractProgress(battle, q), 0);
console.log(
  '✓ Urgent warehouse defense requires physical presence and repelling the raid without looting',
);
