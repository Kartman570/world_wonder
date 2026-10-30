import { TILE, ANIMALS, BANDITS, GUARDS } from '../core/content.js';
import { warrant } from './law.js';
import { standing } from './settlement-services.js';
import { dangerNear } from './crafts.js';
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function hirePrice(w, e) {
  return standing(w, e.faction).score >= 40 ? 60 : 75;
}
export function hireCompanion(w, e) {
  const p = w.player;
  if (
    w.dungeonSpec ||
    !e ||
    e.hp <= 0 ||
    e.role !== 'hunter' ||
    e.leader ||
    e.captive ||
    e.companion?.returning
  )
    return { ok: false, message: 'Recruit an available town hunter as a companion.' };
  if (!w.canInteract(p, e, 130) || p.weaponDrawn || p.imprisoned || dangerNear(w, p, 200))
    return { ok: false, message: 'Approach a hunter in a calm place with your weapon sheathed.' };
  if (warrant(w, e.faction) || standing(w, e.faction).score < 10)
    return {
      ok: false,
      message: 'A hunter will agree once you earn good standing in their town (10 reputation).',
    };
  const renewing = e.companion?.active;
  if (!renewing && w.entities.filter((o) => o.hp > 0 && o.companion?.active).length >= 2)
    return { ok: false, message: 'Your party already has two companions.' };
  const price = hirePrice(w, e);
  if ((p.inventory.gold || 0) < price) return { ok: false, message: 'Not enough gold.' };
  p.inventory.gold -= price;
  e.inventory.gold = (e.inventory.gold || 0) + price;
  if (renewing) e.companion.until = Math.max(w.time, e.companion.until) + 1440;
  else
    e.companion = {
      active: true,
      order: 'follow',
      until: w.time + 1440,
      anchor: { x: p.x, y: p.y },
    };
  e.enemyId = null;
  e.patrolPoint = null;
  e.path = null;
  return {
    ok: true,
    message: renewing
      ? 'Contract renewed for one day.'
      : 'The hunter joins for one game day. Give orders with V.',
  };
}
export function orderCompanion(w, e, order) {
  if (!e || e.hp <= 0 || !e.companion?.active)
    return { ok: false, message: 'Companion unavailable.' };
  if (!['follow', 'hold', 'dismiss'].includes(order))
    return { ok: false, message: 'Unknown order.' };
  if (distance(e, w.player) > 700 || w.player.id === 'absent')
    return { ok: false, message: 'Your companion is too far away to hear the order.' };
  if (order === 'dismiss') {
    e.companion.active = false;
    e.companion.returning = true;
    e.state = 'returningHome';
  } else {
    e.companion.order = order;
    e.companion.anchor = { x: e.x, y: e.y };
  }
  e.enemyId = null;
  e.path = null;
  return {
    ok: true,
    message: {
      follow: 'Follow me.',
      hold: 'Stay here and defend yourself.',
      dismiss: 'Contract finished. The hunter is going home.',
    }[order],
  };
}
export function giveCompanion(w, e, key) {
  if (!e?.companion?.active || e.hp <= 0 || !w.canInteract(w.player, e, 130))
    return { ok: false, message: 'Approach a living companion.' };
  if (!['arrow', 'medicine', 'ration'].includes(key) || !(w.player.inventory[key] > 0))
    return { ok: false, message: 'No suitable supplies.' };
  const count = Math.min(w.player.inventory[key], key === 'arrow' ? 10 : 1);
  w.player.inventory[key] -= count;
  e.inventory[key] = (e.inventory[key] || 0) + count;
  return { ok: true, message: 'Supplies delivered: ' + count + '.' };
}
export function updateCompanions(w) {
  if (w.dungeonSpec) return;
  for (const e of w.entities) {
    const c = e.companion;
    if (!c?.active || e.hp <= 0) continue;
    if (
      w.time >= c.until ||
      w.player.imprisoned ||
      warrant(w, e.faction) ||
      (w.inCity(w.player) && warrant(w, w.inCity(w.player).id))
    ) {
      c.active = false;
      c.returning = true;
      e.enemyId = null;
      e.path = null;
      w.log(
        e.name +
          ': ' +
          (w.time >= c.until ? 'contract expired.' : 'I will not take part in a crime.') +
          ' I’m going home.',
        { at: e },
      );
    }
  }
}
export function companionHostility(w, a, b) {
  const c = a.companion;
  if (c?.returning) return a.aggressor === b.id;
  if (!c?.active) return null;
  if (c.order === 'hold' && distance(b, c.anchor) > 330) return false;
  if (GUARDS.includes(b.role)) return false;
  return (
    BANDITS.includes(b.role) ||
    w.player.aggressor === b.id ||
    a.aggressor === b.id ||
    (!!ANIMALS[b.role]?.aggressive && distance(b, w.player) < 350)
  );
}
export function companionAI(w, e, dt) {
  const c = e.companion;
  if (!c?.active && !c?.returning) return false;
  if (c.returning) {
    e.state = 'returningHome';
    w.navigate(e, e.home, dt, 95);
    if (distance(e, e.home) < 75) {
      e.companion = null;
      e.patrolPoint = null;
    }
    return true;
  }
  if (e.hp < e.maxHp * 0.6 && e.inventory.medicine > 0 && !dangerNear(w, e, 180)) {
    e.inventory.medicine--;
    e.hp = Math.min(e.maxHp, e.hp + 60);
    w.log(e.name + ' used medicine.', { at: e });
  }
  const p = w.player;
  if (p.id === 'absent' || p.hp <= 0) {
    e.state = 'waitingForLeader';
    return true;
  }
  const target = c.order === 'hold' ? c.anchor : p,
    range = c.order === 'hold' ? 24 : 105;
  e.state =
    c.order === 'hold'
      ? 'holdingPosition'
      : distance(e, p) > 900
        ? 'catchingUp'
        : 'followingLeader';
  if (distance(e, target) > range) w.navigate(e, target, dt, distance(e, target) > 350 ? 135 : 112);
  return true;
}
