import assert from 'node:assert/strict';
import { World, questOffers } from '../src/core/simulation.js';
import { conversationPlan, questTurnIns } from '../src/ui/conversation-ui.js';
import { campaignSupplyOffer, startCampaign } from '../src/gameplay/campaign.js';
const w = new World('conversation-tests'),
  city = w.cities[0].id,
  citizen = w.entities.find((e) => e.role === 'citizen' && e.faction === city),
  mayor = w.entities.find((e) => e.role === 'mayor' && e.faction === city),
  keeper = w.entities.find((e) => e.role === 'quartermaster' && e.faction === city);
assert.equal(conversationPlan(w, citizen, questOffers(citizen)).hasQuests, false);
const offers = questOffers(mayor);
assert.ok(offers.length);
w.acceptQuest(offers[0]);
const plan = conversationPlan(w, mayor, offers);
assert.equal(
  plan.available.some((q) => q.id === offers[0].id),
  false,
);
assert.ok(plan.active.some((q) => q.id === offers[0].id));
assert.equal(questTurnIns(w, citizen).length, 0, 'Unrelated residents never get a hand-in action');
startCampaign(w);
w.campaign.city = city;
const supply = campaignSupplyOffer(w, city);
w.acceptQuest(supply);
assert.equal(questTurnIns(w, keeper).length, 0);
w.player.inventory.herb = 2;
assert.ok(questTurnIns(w, keeper).some((q) => q.id === supply.id));
assert.equal(
  questTurnIns(w, mayor).some((q) => q.id === supply.id),
  false,
);
w.completeQuests(keeper);
assert.equal(
  questTurnIns(w, keeper).some((q) => q.id === supply.id),
  false,
  'Completed hand-ins disappear immediately',
);
assert.equal(conversationPlan(w, keeper, [supply]).available.length, 0);
const courier = {
  id: 'ui-letter',
  city,
  giver: 'mayor',
  destination: w.cities[1].id,
  type: 'courier',
  count: 1,
  reward: 10,
  title: 'Letter',
};
w.acceptQuest(courier);
const recipient = w.entities.find((e) => e.role === 'mayor' && e.faction === courier.destination);
assert.ok(questTurnIns(w, recipient).some((q) => q.id === courier.id));
assert.equal(
  questTurnIns(w, keeper).some((q) => q.id === courier.id),
  false,
);
console.log(
  '✓ Conversations show only relevant tasks: correct recipient, no duplicates, readiness to turn in and removal of completed actions',
);
