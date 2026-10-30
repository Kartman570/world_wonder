import { finishInnRest } from './settlement-services.js';
import { RECIPES, SKILLS, USE_EFFECTS } from './adventure-content.js';
import { TILE, ITEMS } from '../core/content.js';
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function normalizeCrafts(p) {
  p.skills ??= Object.fromEntries(Object.keys(SKILLS).map((k) => [k, 0]));
  p.crafted ??= {};
  p.gear ??= { body: null, offhand: null };
}
export function skillLevel(p, key) {
  normalizeCrafts(p);
  return Math.min(10, 1 + Math.floor(Math.sqrt((p.skills[key] || 0) / 30)));
}
export function grantSkill(p, key, xp) {
  normalizeCrafts(p);
  p.skills[key] = (p.skills[key] || 0) + xp;
}
export function hasMaterials(inv, input) {
  return Object.entries(input).every(([k, n]) => (inv[k] || 0) >= n);
}
export function addItems(inv, items) {
  for (const [k, n] of Object.entries(items)) inv[k] = (inv[k] || 0) + n;
}
export function removeItems(inv, items) {
  for (const [k, n] of Object.entries(items)) {
    inv[k] -= n;
    if (inv[k] <= 0) delete inv[k];
  }
}
export function dangerNear(w, p = w.player, r = 330) {
  return w.nearby(p, r).some((e) => w.hostile(e, p) && w.visibleFrom(p, e) && w.lineClear(p, e));
}
export function stationAvailable(w, station) {
  const p = w.player;
  if (station === 'field') return true;
  const b = w.interiorAt(p);
  const rooms = {
    fire: ['inn', 'house'],
    forge: ['smith', 'armory'],
    loom: ['tailor'],
    bench: ['warehouse', 'bowshop', 'leatherworks'],
    mortar: ['apothecary'],
    tannery: ['leatherworks', 'warehouse'],
  };
  if (b && rooms[station]?.includes(b.type)) return true;
  return (
    station === 'fire' && (w.camps || []).some((c) => distance(c, p) < 100 && c.fireUntil > w.time)
  );
}
export function craftProblem(w, recipe) {
  const p = w.player;
  normalizeCrafts(p);
  if (!recipe) return 'Recipe not found.';
  if (p.imprisoned) return 'Crafting is unavailable in a cell.';
  if (p.action) return 'Finish your current action first.';
  if (p.weaponDrawn) return 'Sheathe your weapon for R.';
  if (dangerNear(w)) return 'Move away from danger first.';
  if (skillLevel(p, recipe.skill) < recipe.level) return 'Requires level ' + recipe.level + '.';
  if (!stationAvailable(w, recipe.station)) return 'No suitable workstation nearby.';
  if (!hasMaterials(p.inventory, recipe.input)) return 'Not enough materials.';
  return null;
}
export function craftDuration(p, recipe) {
  return (
    Math.round(
      recipe.seconds *
        (1 - Math.min(0.25, (skillLevel(p, recipe.skill) - 1) * 0.04)) *
        (p.inventory.tools > 0 ? 0.85 : 1) *
        10,
    ) / 10
  );
}
export function beginCraft(w, id) {
  const recipe = RECIPES.find((r) => r.id === id),
    problem = craftProblem(w, recipe);
  if (problem) return { ok: false, message: problem };
  const p = w.player;
  removeItems(p.inventory, recipe.input);
  w.startAction({
    type: 'craft',
    recipe: id,
    remaining: craftDuration(p, recipe),
    total: craftDuration(p, recipe),
    escrow: { ...recipe.input },
    x: p.x,
    y: p.y,
  });
  return { ok: true, message: 'Work started: ' + recipe.name + '.' };
}
export function cancelCraft(w) {
  const p = w.player,
    a = p.action;
  if (!a || !['craft', 'campRest', 'rescue', 'innRest'].includes(a.type)) return false;
  if (a.escrow) addItems(p.inventory, a.escrow);
  p.action = null;
  return true;
}
export function tickCraft(w, dt) {
  const p = w.player,
    a = p.action;
  if (!a || !['craft', 'campRest', 'rescue', 'innRest'].includes(a.type)) return false;
  if (distance(p, a) > 65 || p.weaponDrawn || dangerNear(w, p, 180)) {
    cancelCraft(w);
    w.log('Work interrupted. Unused materials returned.');
    return true;
  }
  a.remaining -= w.debugMode ? Infinity : dt;
  if (a.remaining > 0) return true;
  if (a.type === 'craft') {
    const recipe = RECIPES.find((r) => r.id === a.recipe);
    if (!recipe || !stationAvailable(w, recipe.station)) {
      cancelCraft(w);
      return true;
    }
    addItems(p.inventory, recipe.output);
    for (const [k, n] of Object.entries(recipe.output)) p.crafted[k] = (p.crafted[k] || 0) + n;
    grantSkill(p, recipe.skill, 12);
    w.log(
      'Crafted: ' +
        Object.entries(recipe.output)
          .map(([k, n]) => ITEMS[k].name + ' × ' + n)
          .join(', '),
    );
  } else if (a.type === 'innRest') {
    if (!finishInnRest(w, a)) {
      cancelCraft(w);
      w.log('Lodging interrupted: the host or food is unavailable. Payment refunded.');
      return true;
    }
  } else if (a.type === 'campRest') {
    p.hp = Math.min(p.maxHp, p.hp + 35 + (skillLevel(p, 'survival') - 1) * 2);
    p.stamina = p.maxStamina || 300;
    grantSkill(p, 'survival', 8);
    w.log('You rest by the fire and regain your strength.');
  } else if (a.type === 'rescue') {
    const e = w.entityById.get(a.entity);
    if (e?.hp > 0 && e.captive) {
      e.captive = false;
      e.following = true;
      e.state = 'following';
      w.log('The apprentice is free. Escort them to their home town.');
    }
  }
  p.action = null;
  w.onAction?.();
  return true;
}
export function useSupply(w, key) {
  const p = w.player,
    effect = USE_EFFECTS[key];
  if (!effect || !(p.inventory[key] > 0)) return { ok: false, message: 'Item unavailable.' };
  if (
    !(key === 'medicine' && p.poison?.some((s) => s.until > w.elapsed)) &&
    effect.hp &&
    p.hp >= p.maxHp &&
    (!effect.stamina || p.stamina >= p.maxStamina)
  )
    return { ok: false, message: 'Your strength is already restored.' };
  if (dangerNear(w, p, 150) && ['bandage', 'medicine', 'salve'].includes(key))
    return { ok: false, message: 'You cannot bandage wounds while being attacked.' };
  removeItems(p.inventory, { [key]: 1 });
  if (key === 'medicine') {
    p.poison = [];
    w.poisoned?.delete('player');
  }
  p.hp = Math.min(
    p.maxHp,
    p.hp +
      (effect.hp || 0) +
      (['bandage', 'salve', 'medicine'].includes(key) ? (skillLevel(p, 'medicine') - 1) * 2 : 0),
  );
  p.stamina = Math.min(p.maxStamina || 300, p.stamina + (effect.stamina || 0));
  return { ok: true, message: 'Used: ' + ITEMS[key].name };
}
export function equipGear(w, slot, key) {
  const p = w.player;
  normalizeCrafts(p);
  const choices =
    slot === 'body' ? ['coat', 'travelCoat', 'armor'] : slot === 'offhand' ? ['shield'] : [];
  if (key !== null && (!choices.includes(key) || !(p.inventory[key] > 0)))
    return { ok: false, message: 'You cannot equip that item.' };
  p.gear[slot] = key;
  return { ok: true };
}
export function armorReduction(p) {
  normalizeCrafts(p);
  let value = 0;
  if ((p.inventory[p.gear.body] || 0) > 0)
    value = { coat: 0.05, travelCoat: 0.16, armor: 0.25 }[p.gear.body] || 0;
  if (p.weapon !== 'bow' && p.inventory.shield > 0 && p.gear.offhand === 'shield') value += 0.12;
  return Math.min(0.4, value);
}
export function deployCamp(w) {
  const p = w.player;
  if (
    w.dungeonSpec ||
    p.imprisoned ||
    w.inCity(p) ||
    w.interiorAt(p) ||
    distance(p, w.respawn) < 25 * TILE
  )
    return { ok: false, message: 'Pitch camps in the wild, outside settlements and dungeons.' };
  if (p.action || p.weaponDrawn || dangerNear(w, p, 600))
    return { ok: false, message: 'Camping requires a safe place and a sheathed weapon.' };
  if (!(p.inventory.campKit > 0))
    return { ok: false, message: 'You need a packed camp. You can craft one.' };
  if ((w.camps || []).some((c) => distance(c, p) < 180))
    return { ok: false, message: 'Too close to another camp.' };
  if ((w.camps || []).length >= 3)
    return { ok: false, message: 'Pack up one of your three camps first.' };
  if (
    w.terrain(p).water ||
    !w.walkClear(p, { x: p.x + 55, y: p.y }) ||
    !w.walkClear(p, { x: p.x - 55, y: p.y })
  )
    return { ok: false, message: 'You need a dry, clear spot.' };
  removeItems(p.inventory, { campKit: 1 });
  w.camps ??= [];
  const c = {
    id: 'camp-' + ++w.id,
    name: 'Wanderer’s Camp',
    x: p.x,
    y: p.y + 35,
    inventory: {},
    fireUntil: w.time + 30,
  };
  w.camps.push(c);
  grantSkill(p, 'survival', 12);
  w.log('You pitch a field camp. Bandits can loot its chest.');
  return { ok: true, camp: c, message: 'Camp pitched.' };
}
export function startCampRest(w, camp) {
  if (!w.camps?.includes(camp)) return { ok: false, message: 'The camp is already packed.' };
  const p = w.player;
  if (
    distance(p, camp) > 100 ||
    dangerNear(w) ||
    p.action ||
    p.weaponDrawn ||
    camp.fireUntil <= w.time
  )
    return { ok: false, message: 'You need a lit campfire, safety, and free hands.' };
  const food = ['ration', 'bread', 'jerky'].find((k) => p.inventory[k] > 0);
  if (!food) return { ok: false, message: 'Rest requires provisions.' };
  removeItems(p.inventory, { [food]: 1 });
  w.startAction({
    type: 'campRest',
    remaining: 8,
    total: 8,
    escrow: { [food]: 1 },
    x: p.x,
    y: p.y,
  });
  return { ok: true, message: 'Rest by the Fire · 8 seconds.' };
}
export function fuelCamp(w, camp) {
  if (!w.camps?.includes(camp)) return { ok: false, message: 'The camp is already packed.' };
  if (distance(w.player, camp) > 100 || !(w.player.inventory.log > 0))
    return { ok: false, message: 'Approach the fire with a log.' };
  removeItems(w.player.inventory, { log: 1 });
  camp.fireUntil = Math.max(w.time, camp.fireUntil) + 60;
  return { ok: true, message: 'The fire will burn for another game hour.' };
}
export function packCamp(w, camp) {
  if (!w.camps?.includes(camp)) return { ok: false, message: 'The camp is already packed.' };
  if (distance(w.player, camp) > 100 || dangerNear(w))
    return { ok: false, message: 'Approach the camp and make sure the area is safe.' };
  if (Object.values(camp.inventory).some((n) => n > 0))
    return { ok: false, message: 'Collect your belongings from the chest first.' };
  w.camps = w.camps.filter((c) => c.id !== camp.id);
  addItems(w.player.inventory, { campKit: 1 });
  return { ok: true, message: 'Camp packed.' };
}
