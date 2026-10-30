import { campaignSupplyOffer } from './campaign.js';
import { ITEMS, TILE, GUARDS, BANDITS, point } from '../core/content.js';
import { normalizeCrafts, grantSkill, dangerNear } from './crafts.js';
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const CONTRACT_TYPES = new Set(['commission', 'make', 'survey', 'rescue', 'defend']);
const needs = [
  ['grain', 36, 10],
  ['flour', 18, 6],
  ['bread', 28, 8],
  ['honey', 14, 4],
  ['hops', 18, 6],
  ['medicine', 12, 3],
  ['leather', 18, 5],
  ['arrow', 120, 24],
  ['log', 60, 10],
];
export function contractOffers(w, city) {
  const z = w.cities.find((z) => z.id === city);
  if (!z || w.dungeonSpec) return [];
  normalizeCrafts(w.player);
  const store = w.warehouses[city],
    day = Math.floor(w.time / 1440),
    base = { city, giver: 'quartermaster', deadline: (day + 2) * 1440 };
  const result = [];
  for (const [k, target, count] of needs
    .filter(([k, target]) => (store[k] || 0) < target)
    .sort((a, b) => (store[a[0]] || 0) / a[1] - (store[b[0]] || 0) / b[1])
    .slice(0, 4)) {
    result.push({
      ...base,
      id: city + '-need-' + k + '-' + day,
      type: 'commission',
      item: k,
      count,
      reward: Math.ceil(ITEMS[k].price * count * 1.35),
      title: 'Supply: ' + ITEMS[k].name,
      needTarget: target,
    });
  }
  for (const [k, count] of [
    ['bandage', 4],
    ['rope', 3],
    ['planks', 6],
  ])
    result.push({
      ...base,
      id: city + '-artisan-' + k + '-' + day,
      type: 'make',
      item: k,
      count,
      reward: Math.ceil(ITEMS[k].price * count * 1.5),
      title: 'Artisan’s Commission: ' + ITEMS[k].name,
    });
  for (const raid of w.living?.raids.filter((r) => r.city === city && r.status === 'active') || [])
    result.unshift({
      ...base,
      deadline: null,
      id: 'defend-' + raid.id,
      type: 'defend',
      raid: raid.id,
      count: 1,
      reward: 180,
      title: 'Defend the Warehouse from Raiders',
    });
  const crisis = w.living?.cities[city];
  if (crisis?.hunger >= 3)
    result.unshift({
      ...base,
      id: city + '-relief-' + day,
      type: 'commission',
      item: 'bread',
      count: 12,
      reward: Math.ceil(ITEMS.bread.price * 12 * 1.8),
      title: 'Urgent: Bread for a Starving Town',
    });
  if (crisis?.outbreak)
    result.unshift({
      ...base,
      id: city + '-fever-' + day,
      type: 'commission',
      item: 'medicine',
      count: 5,
      reward: Math.ceil(ITEMS.medicine.price * 5 * 1.8),
      title: 'Urgent: Medicine for Fever',
    });
  const lessonOffer = campaignSupplyOffer(w, city);
  if (lessonOffer) result.unshift(lessonOffer);
  const sites = w.workSites.filter(
    (s) => s.city === city && ['logging', 'fishing', 'grainFarmer', 'beekeeper'].includes(s.kind),
  );
  if (sites.length >= 2)
    result.push({
      ...base,
      id: city + '-survey-' + day,
      type: 'survey',
      checkpoints: sites.slice(0, 4).map((s) => ({ name: s.name, x: s.x, y: s.y })),
      count: Math.min(4, sites.length),
      reward: 100,
      title: 'Inspect the Work Sites',
    });
  for (const e of w.entities.filter(
    (e) => (e.captive || e.following || e.rescued) && e.hp > 0 && e.rescueCity === city,
  ))
    result.push({
      ...base,
      deadline: null,
      id: 'rescue-' + e.id,
      type: 'rescue',
      target: e.id,
      count: 1,
      reward: 190,
      title: 'Bring Back the Apprentice: ' + e.name,
    });
  return result;
}
export function initializeContracts(w, { restored = false } = {}) {
  if (w.dungeonSpec || w.generatorVersion < 8) return;
  const migrating = !w.contractRevision;
  if (migrating) {
    for (const [i, camp] of w.places
      .filter((z) => ['red', 'ash', 'thorn'].includes(z.id))
      .entries()) {
      const city = w.cities[i % w.cities.length],
        p = point(camp.x + 3, camp.y + 4);
      const e = w.safeSpawn(
        'captive',
        city.id,
        p.x / TILE,
        p.y / TILE,
        'Apprentice ' + ['Ruta', 'Oscar', 'Ylva'][i],
      );
      e.captive = true;
      e.captor = camp.id;
      e.rescueCity = city.id;
      e.noTrade = true;
      e.hp = e.maxHp = 80;
      e.inventory = {};
      e.home = {
        ...w.buildings.find((b) => b.city === city.id && b.type === 'warehouse').workSpot,
      };
      e.livery = city.style?.cloth;
      e.flagColor = city.style?.flag;
    }
  }
  w.contractRevision = 1;
}
export function contractProgress(w, q) {
  normalizeCrafts(w.player);
  switch (q.type) {
    case 'defend': {
      const raid = w.living?.raids.find((r) => r.id === q.raid);
      return raid && raid.status !== 'active' && !raid.stolen && (q.defenseMinutes || 0) >= 10
        ? 1
        : 0;
    }
    case 'commission':
      return Math.min(q.count, w.player.inventory[q.item] || 0);
    case 'make':
      return Math.min(
        q.count,
        w.player.inventory[q.item] || 0,
        Math.max(0, (w.player.crafted[q.item] || 0) - (q.craftedBaseline || 0)),
      );
    case 'survey':
      return (q.checked || []).length;
    case 'rescue':
      return w.entityById.get(q.target)?.rescued ? 1 : 0;
    default:
      return null;
  }
}
export function contractText(w, q) {
  if (q.type === 'defend')
    return (
      'Help defend the warehouse: spend at least 10 game minutes near the raid target and repel the attack without losing supplies. Participation: ' +
      Math.floor(q.defenseMinutes || 0) +
      '/10 min. · ' +
      (contractProgress(w, q) ? 'raid repelled' : 'the fight is not over yet')
    );
  if (q.type === 'commission')
    return (
      'Deliver to the Warehouse ' +
      ITEMS[q.item].name +
      ': ' +
      contractProgress(w, q) +
      '/' +
      q.count +
      (q.deadline ? ' · deadline: day ' + (1 + Math.floor(q.deadline / 1440)) : '')
    );
  if (q.type === 'make')
    return (
      'Craft after accepting the order and deliver to ' +
      ITEMS[q.item].name +
      ': ' +
      contractProgress(w, q) +
      '/' +
      q.count
    );
  if (q.type === 'survey')
    return (
      'Inspect Camps: ' +
      contractProgress(w, q) +
      '/' +
      q.count +
      ' · ' +
      q.checkpoints
        .filter((p, i) => !(q.checked || []).includes(i))
        .map((p) => p.name)
        .join(', ')
    );
  if (q.type === 'rescue') {
    const e = w.entityById.get(q.target);
    return e?.hp <= 0
      ? 'The Apprentice Died'
      : e?.rescued
        ? 'The Apprentice Is Safe'
        : e?.following
          ? 'Escort the apprentice to the town warehouse'
          : 'Find the captive in ' + w.factionName(e?.captor) + ', free and escort home';
  }
  return '';
}
export function updateContracts(w) {
  for (const q of w.quests.filter((q) => q.status === 'active' && CONTRACT_TYPES.has(q.type))) {
    if (q.type === 'defend' && !w.dungeonSpec) {
      const raid = w.living?.raids.find((r) => r.id === q.raid),
        delta = Math.min(1, Math.max(0, w.time - (q.defenseAt ?? w.time)));
      q.defenseAt = w.time;
      if (
        raid?.status === 'active' &&
        w.player.id !== 'absent' &&
        distance(w.player, raid.target) < 1200
      )
        q.defenseMinutes = (q.defenseMinutes || 0) + delta;
      if (raid && raid.status !== 'active') {
        q.deadline = null;
        if (raid.stolen || (q.defenseMinutes || 0) < 10) {
          q.status = 'failed';
          q.failure = raid.stolen ? 'Warehouse Looted' : 'Not enough participation in the defense';
        }
      }
    }
    if (q.deadline && w.time > q.deadline) {
      q.status = 'failed';
      q.failure = 'Expired';
      w.log('Quest deadline expired: ' + q.title);
      continue;
    }
    if (q.type === 'survey' && !w.dungeonSpec) {
      q.checked ??= [];
      for (const [i, p] of q.checkpoints.entries())
        if (!q.checked.includes(i) && distance(w.player, p) < 100) {
          q.checked.push(i);
          w.log('Camp inspected: ' + p.name);
        }
    }
    if (q.type === 'rescue' && !w.dungeonSpec && w.entityById.get(q.target)?.hp <= 0) {
      q.status = 'failed';
      q.failure = 'The Apprentice Died';
      w.log('Quest failed: ' + q.title);
    }
  }
}
export function claimContracts(w, e) {
  const messages = [];
  for (const q of w.quests.filter(
    (q) =>
      q.status === 'active' &&
      CONTRACT_TYPES.has(q.type) &&
      q.city === e.faction &&
      e.role === 'quartermaster',
  )) {
    if (q.deadline && w.time > q.deadline) {
      q.status = 'failed';
      q.failure = 'Expired';
      continue;
    }
    if (contractProgress(w, q) < q.count) continue;
    const store = w.warehouses[q.city];
    if ((store.gold || 0) < q.reward) {
      messages.push(q.title + ': the treasury lacks funds; return later.');
      continue;
    }
    if (['commission', 'make'].includes(q.type)) {
      w.player.inventory[q.item] -= q.count;
      store[q.item] = (store[q.item] || 0) + q.count;
    }
    store.gold -= q.reward;
    w.player.inventory.gold = (w.player.inventory.gold || 0) + q.reward;
    q.status = 'completed';
    const memory = w.cityMemory[q.city];
    if (memory) memory.reputation = Math.min(100, memory.reputation + 7);
    grantSkill(w.player, q.type === 'survey' ? 'survival' : 'craft', 15);
    messages.push(q.title + ': +' + q.reward + ' gold');
    w.log('Quest completed: ' + q.title);
  }
  return messages;
}
export function rescueAI(w, e, dt) {
  if (e.role !== 'captive') return false;
  if (e.captive) {
    e.state = 'captive';
    e.enemyId = null;
    return true;
  }
  if (e.following && !e.rescued) {
    const p = w.player,
      home = e.home;
    if (distance(e, home) < 140) {
      e.rescued = true;
      e.following = false;
      e.state = 'rescued';
      const master = w.entities.find(
        (o) => o.industryRole === 'miller' && o.faction === e.rescueCity,
      );
      if (master) {
        e.role = 'miller';
        e.industryRole = 'miller';
        e.work = { ...master.work };
        e.deliveryPoint = { ...master.deliveryPoint };
        e.workBuildingId = master.workBuildingId;
        e.home = { ...master.home };
        e.productionTimer = 0;
      }
      e.announcement = 'I’m home! Thank you. The quartermaster awaits you.';
      e.speechUntil = w.elapsed + 15;
      w.log(e.name + ' returned to their home town.', { at: e, personal: true });
      return true;
    }
    e.state = distance(e, p) > 900 ? 'waitingForRescuer' : 'following';
    if (distance(e, p) > 90 && distance(e, p) < 900) w.navigate(e, p, dt, 115);
    else if (distance(p, home) < 170 && distance(e, p) < 900) w.navigate(e, home, dt, 110);
    return true;
  }
  e.state = 'apprentice';
  return true;
}
export function beginRescue(w, e) {
  const p = w.player;
  if (!e?.captive || e.hp <= 0 || !w.canInteract(p, e, 100))
    return { ok: false, message: 'Approach the captive.' };
  if (p.action || p.weaponDrawn || dangerNear(w, p, 230))
    return {
      ok: false,
      message: 'Sheathe your weapon and remove nearby threats before untying the ropes.',
    };
  w.startAction({ type: 'rescue', entity: e.id, remaining: 4, total: 4, x: p.x, y: p.y });
  return { ok: true, message: 'Free the Apprentice · 4 seconds.' };
}
