import { TILE, point, TRADE } from '../core/content.js';
export const ROLE_ROOMS = {
  smith: 'smith',
  cook: 'inn',
  herbalist: 'apothecary',
  tailor: 'tailor',
  farmerTrader: 'farmshop',
  armorer: 'armory',
  bowyer: 'bowshop',
  leatherworker: 'leatherworks',
  provisioner: 'provisions',
};
const stock = {
  smith: { gold: 220, sword: 5, bow: 3, arrow: 90, axe: 4, hammer: 3, ore: 15, log: 10 },
  cook: { gold: 170, ration: 20, fish: 6, meat: 8 },
  herbalist: { gold: 100, herb: 12 },
  tailor: { gold: 150, fiber: 9, cloth: 3, coat: 1, hide: 3 },
  farmerTrader: { gold: 100, ration: 12, fiber: 16, meat: 4 },
  armorer: { gold: 260, sword: 8, axe: 5, hammer: 5, coat: 4 },
  bowyer: { gold: 180, bow: 8, arrow: 150, log: 12 },
  leatherworker: { gold: 140, hide: 12, coat: 8, cloth: 5 },
  provisioner: { gold: 200, ration: 30, bait: 30, herb: 8 },
};
export function populateSettlementPeople(w, z) {
  const add = (role, x = z.x, y = z.y, name) => {
    const e = w.safeSpawn(role, z.id, x, y, name);
    e.livery = z.style.cloth;
    e.flagColor = z.style.flag;
    e.noTrade = !!TRADE[role];
    return e;
  };
  const guards = z.kind === 'capital' ? 3 : z.kind === 'town' ? 1 : 0;
  for (const [dx, dy] of z.gates)
    for (let j = 0; j < guards; j++)
      add(j % 2 ? 'archer' : 'guard', z.x + dx + (j - 1) * 1.2, z.y + dy);
  for (let j = 0; j < (z.kind === 'capital' ? 12 : z.kind === 'town' ? 4 : 0); j++)
    add(j % 3 ? 'guard' : 'archer', z.x + ((j % 4) - 2) * 3, z.y - 14 + Math.floor(j / 4) * 3);
  const quarters = w.buildings.filter((b) => b.city === z.id && b.type === 'barracks');
  if (quarters.length)
    for (const [j, g] of w.entities
      .filter((e) => e.faction === z.id && ['guard', 'archer'].includes(e.role))
      .entries()) {
      const b = quarters[j % quarters.length];
      g.barracksId = b.id;
      g.homeBuildingId = b.id;
      g.home = { ...b.workSpot };
      if (j % 3 === 0) Object.assign(g, g.home);
    }
  const homes = w.buildings.filter((b) => b.city === z.id && b.type === 'house');
  for (let j = 0; j < (z.kind === 'capital' ? 42 : z.kind === 'town' ? 22 : 10); j++) {
    const h = homes[j % homes.length],
      onSquare = j % 5 === 0,
      x = onSquare ? z.x + (w.random() - 0.5) * 10 : h.x + h.w / 2,
      y = onSquare ? z.y + (w.random() - 0.5) * 8 : h.y + h.h + 1.5;
    add(
      'citizen',
      x,
      y,
      'Resident ' + ['Alma', 'Jarek', 'Lina', 'Wood', 'Thea', 'Niklas', 'Martha', 'Edda'][j % 8],
    );
  }
  add('mayor', z.x, z.y, z.kind === 'village' ? 'Village Elder ' + z.name : 'Mayor ' + z.name);
  add('quartermaster');
  for (const role of z.traderRoles) {
    const actual = role === 'farmer' ? 'farmerTrader' : role,
      e = add(actual);
    e.noTrade = false;
    e.shopkeeper = true;
    e.inventory = { ...stock[actual] };
  }
  for (let j = 0; j < (z.isVillage ? 1 : 2); j++)
    for (const [role, work] of [
      ['fisher', z.fishing],
      ['hunter', z.hunt],
      ['forester', z.lumber],
      ['miner', z.mine],
    ]) {
      const e = add(role, z.x + j, z.y + 3);
      e.work = { ...work };
    }
  const farmer = add('farmer');
  farmer.work = { ...w.workSites.find((s) => s.id === z.id + '-field') };
  if (!z.isVillage) {
    const herald = add('herald', z.x + 2.5, z.y + 1.5);
    herald.work = point(z.x + 2.5, z.y + 1.5);
    herald.nextAnnouncement = w.elapsed + 5;
    herald.newsIndex = 0;
  }
}
