import { projectBuilt } from './city-projects.js';
import { ITEMS } from '../core/content.js';
import { cityMemory, warrant } from './law.js';
import { dangerNear } from './crafts.js';
export function standing(w, city) {
  const score = cityMemory(w, city).reputation;
  return {
    score,
    title:
      score >= 60
        ? 'Honorary Citizen'
        : score >= 30
          ? 'Friend of the Town'
          : score >= 10
            ? 'Good Reputation'
            : score < 0
              ? 'Bad Reputation'
              : 'Stranger',
    discount: score >= 60 ? 0.15 : score >= 30 ? 0.1 : score >= 10 ? 0.05 : 0,
  };
}
export function tradePrice(w, e, key, buy = true) {
  const base = ITEMS[key]?.price || 0,
    bonus = standing(w, e.faction).discount;
  return buy
    ? Math.max(1, Math.ceil(base * (1 - bonus)))
    : Math.max(1, Math.floor(base * (0.6 + bonus * 0.4)));
}
export function servicePrice(w, e, kind) {
  return Math.ceil((kind === 'rest' ? 15 : 25) * (1 - standing(w, e.faction).discount));
}
function serviceProblem(w, e) {
  if (!e || e.hp <= 0 || !w.canInteract(w.player, e, 130)) return 'Approach the artisan.';
  if (w.player.imprisoned || warrant(w, e.faction)) return 'Wanted criminals are not served here.';
  if (w.player.weaponDrawn || w.player.action || dangerNear(w, w.player, 220))
    return 'Sheathe your weapon and wait for a calm moment.';
  return null;
}
export function beginInnRest(w, e) {
  const problem = serviceProblem(w, e);
  if (problem) return { ok: false, message: problem };
  if (e.role !== 'cook' || w.interiorAt(w.player)?.type !== 'inn')
    return { ok: false, message: 'Ask the innkeeper inside the inn for lodging.' };
  const price = servicePrice(w, e, 'rest');
  if ((w.player.inventory.gold || 0) < price) return { ok: false, message: 'Not enough gold.' };
  if (!['bread', 'ration', 'jerky'].some((k) => e.inventory[k] > 0))
    return { ok: false, message: 'The inn has run out of food.' };
  w.player.inventory.gold -= price;
  w.startAction({
    type: 'innRest',
    provider: e.id,
    remaining: 12,
    total: 12,
    escrow: { gold: price },
    x: w.player.x,
    y: w.player.y,
  });
  return { ok: true, message: 'Rest at the Inn · 12 seconds. Canceling refunds your payment.' };
}
export function finishInnRest(w, a) {
  const e = w.entityById.get(a.provider),
    food = ['bread', 'ration', 'jerky'].find((k) => e?.inventory[k] > 0);
  if (
    !e ||
    e.hp <= 0 ||
    !food ||
    !w.canInteract(w.player, e, 150) ||
    w.interiorAt(w.player)?.type !== 'inn' ||
    warrant(w, e.faction)
  )
    return false;
  e.inventory[food]--;
  e.inventory.gold = (e.inventory.gold || 0) + (a.escrow.gold || 0);
  w.player.hp = w.player.maxHp;
  w.player.stamina = w.player.maxStamina || 300;
  w.log('You sleep and eat at the inn. Your strength returns.');
  return true;
}
export function clinicHeal(w, e) {
  const problem = serviceProblem(w, e);
  if (problem) return { ok: false, message: problem };
  if (!['healer', 'herbalist'].includes(e.role))
    return { ok: false, message: 'Healers and herbalists provide treatment.' };
  if (w.player.hp >= w.player.maxHp) return { ok: false, message: 'No treatment needed.' };
  if (!(e.inventory.medicine > 0))
    return { ok: false, message: 'The healer has no medicine. Wait for another batch.' };
  const price = servicePrice(w, e, 'heal');
  if ((w.player.inventory.gold || 0) < price) return { ok: false, message: 'Not enough gold.' };
  e.inventory.medicine--;
  w.player.inventory.gold -= price;
  e.inventory.gold = (e.inventory.gold || 0) + price;
  w.player.hp = Math.min(
    w.player.maxHp,
    w.player.hp + (projectBuilt(w, e.faction, 'clinic') ? 90 : 75),
  );
  return { ok: true, message: 'The healer treated your wounds and consumed medicine.' };
}
