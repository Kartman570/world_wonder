import { ROLES, TILE, point } from '../core/content.js';
import { warrant, cityMemory } from './law.js';
ROLES.carpenter = 'Carpenter';
export const PROJECTS = {
  mill: {
    name: 'Mechanism for a New Mill',
    room: 'warehouse',
    cost: { planks: 10, ingot: 3, tools: 1, gold: 120 },
    seconds: 45,
    description: 'The miller makes flour 35% faster, using the same amount of grain.',
    prop: 'improvedMill',
  },
  clinic: {
    name: 'Equip the Infirmary',
    room: 'apothecary',
    cost: { planks: 8, cloth: 8, medicine: 3, gold: 100 },
    seconds: 50,
    description:
      'The healer makes medicine 25% faster, and treatment restores more health to residents and the player.',
    prop: 'clinicCabinet',
  },
  arsenal: {
    name: 'Town Arsenal',
    room: 'barracks',
    cost: { ingot: 6, leather: 6, planks: 8, gold: 150 },
    seconds: 60,
    description:
      'The carpenter and weaponsmiths will deliver 3 suits of armor, 3 shields, and 60 arrows to the warehouse. Buy equipment from the appropriate traders.',
    prop: 'cityArmory',
  },
};
export function initializeProjects(w) {
  if (w.dungeonSpec || w.generatorVersion < 8) return;
  w.projects ??= {};
  const migrating = !w.projectRevision;
  for (const z of w.cities) {
    w.projects[z.id] ??= {};
    const store = w.buildings.find((b) => b.city === z.id && b.type === 'warehouse');
    if (!store) continue;
    if (migrating && !w.entities.some((e) => e.projectBuilder && e.faction === z.id)) {
      const e = w.add('carpenter', z.id, store.workSpot.x / TILE, store.workSpot.y / TILE);
      e.projectBuilder = true;
      e.noTrade = true;
      e.inventory = { gold: 20 };
      e.work = point(store.door.x + 2.5, store.door.y + 2.5);
      if (w.blocked(e.work.x, e.work.y)) e.work = { ...store.workSpot };
      e.home = {
        ...(w.buildings.find((b) => b.city === z.id && b.type === 'house') || store).workSpot,
      };
      e.livery = z.style?.cloth;
      e.flagColor = z.style?.flag;
    }
    for (const builder of w.entities.filter((e) => e.projectBuilder && e.faction === z.id)) {
      const outside = point(store.door.x + 2.5, store.door.y + 2.5);
      if (!w.blocked(outside.x, outside.y)) builder.work = outside;
    }
    for (const [id, def] of Object.entries(PROJECTS)) {
      const b = w.buildings.find((b) => b.city === z.id && b.type === def.room) || store;
      const state = (w.projects[z.id][id] ??= {
        status: 'funding',
        funds: {},
        remaining: def.seconds,
        site: { ...b.workSpot },
        buildingId: b.id,
      });
      if (state.status === 'completed') installProjectProp(w, z.id, id);
    }
  }
  w.projectRevision = 1;
}
function installProjectProp(w, city, id) {
  const state = w.projects[city][id],
    b = w.buildings.find((b) => b.id === state.buildingId),
    def = PROJECTS[id];
  if (b && !b.furniture.some((f) => f.project === id))
    b.furniture.push({
      kind: def.prop,
      project: id,
      x: state.site.x / TILE + 0.7,
      y: state.site.y / TILE - 0.8,
      w: 1,
      h: 1,
      solid: false,
    });
}
export function projectBuilt(w, city, id) {
  return w.projects?.[city]?.[id]?.status === 'completed';
}
export function projectWorkRate(w, e) {
  if (e.industryRole === 'miller' && projectBuilt(w, e.faction, 'mill')) return 1.35;
  if (e.industryRole === 'healer' && projectBuilt(w, e.faction, 'clinic')) return 1.25;
  return 1;
}
export function donateProject(w, city, id) {
  const p = w.player,
    state = w.projects?.[city]?.[id],
    def = PROJECTS[id];
  if (!state || !def || state.status !== 'funding')
    return { ok: false, message: 'This project is already supplied or finished.' };
  if (
    w.dungeonSpec ||
    w.inCity(p)?.id !== city ||
    p.imprisoned ||
    p.weaponDrawn ||
    warrant(w, city)
  )
    return {
      ok: false,
      message: 'Bring supplies in person to a peaceful town with your weapon sheathed.',
    };
  const keeper = w.entities.find(
      (e) => e.hp > 0 && e.role === 'quartermaster' && e.faction === city,
    ),
    board = w.workProps.find((f) => f.industry === city + '-board');
  if (
    !(keeper && w.canInteract(p, keeper, 140)) &&
    !(board && w.canInteract(p, point(board.x + 0.5, board.y + 0.5), 140))
  )
    return { ok: false, message: 'Approach a quartermaster or notice board.' };
  let count = 0;
  for (const [k, n] of Object.entries(def.cost)) {
    const transfer = Math.min(Math.max(0, n - (state.funds[k] || 0)), p.inventory[k] || 0);
    if (transfer) {
      p.inventory[k] -= transfer;
      state.funds[k] = (state.funds[k] || 0) + transfer;
      count += transfer;
    }
  }
  if (!count) return { ok: false, message: 'Your bag contains none of the missing materials.' };
  if (Object.entries(def.cost).every(([k, n]) => state.funds[k] >= n)) {
    state.status = 'building';
    state.started = w.time;
    w.log(
      w.factionName(city) +
        ': everything for the project “' +
        def.name +
        '” collected. The carpenter will start by day.',
    );
  }
  return { ok: true, message: 'Supplies delivered to town. Donations are not refunded.' };
}
export function projectAI(w, e, dt) {
  if (!e.projectBuilder || e.hp <= 0) return false;
  if (
    e.aggressor &&
    w.entityById.get(e.aggressor)?.hp > 0 &&
    Math.hypot(e.x - w.entityById.get(e.aggressor).x, e.y - w.entityById.get(e.aggressor).y) < 400
  )
    return false;
  if (w.night) {
    e.state = 'sleep';
    w.navigate(e, e.home, dt, 82);
    return true;
  }
  const pair = Object.entries(w.projects?.[e.faction] || {}).find(
    ([id, s]) => s.status === 'building',
  );
  if (!pair) {
    e.state = 'waitingForProject';
    w.navigate(e, e.work, dt, 80);
    return true;
  }
  const [id, state] = pair,
    def = PROJECTS[id];
  e.state = 'buildingCityProject';
  w.navigate(e, state.site, dt, 88);
  if (Math.hypot(e.x - state.site.x, e.y - state.site.y) > 45) return true;
  state.remaining = Math.max(0, state.remaining - dt);
  if (state.remaining > 0) return true;
  state.status = 'completed';
  state.completed = w.time;
  state.funds = {};
  installProjectProp(w, e.faction, id);
  if (id === 'arsenal') {
    const store = w.warehouses[e.faction];
    for (const [k, n] of Object.entries({ armor: 3, shield: 3, arrow: 60 }))
      store[k] = (store[k] || 0) + n;
  }
  const memory = cityMemory(w, e.faction);
  memory.reputation = Math.min(100, memory.reputation + 12);
  w.log(w.factionName(e.faction) + ': completed the project “' + def.name + '”. Reputation +12.');
  return true;
}
