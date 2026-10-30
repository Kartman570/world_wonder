import { CORPSE_REACH } from './loot.js';
import { canUseCell } from './law.js';
import { ITEMS, ANIMALS, TRADE, TILE } from '../core/content.js';
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
// The action discriminant belongs to the descriptor; resource.kind remains on obj.
export function resolveInteraction(world, p = world.player) {
  const candidates = [];
  const add = (kind, obj, label, priority = 1) =>
    candidates.push({ kind, obj, x: obj.x, y: obj.y, label, priority });
  if (world.trainingRack && world.canInteract(p, world.trainingRack, 115))
    add('trainingStock', world.trainingRack, 'Training Weapons · claim the kit', -1);
  for (const horse of world.entities.filter((e) => e.role === 'horse' && e.hp > 0))
    if (!horse.horse.rider && world.canInteract(p, horse, 145))
      add('horse', horse, horse.name + ' · reins', 0);
  for (const z of world.cities || []) {
    const board = { city: z.id, x: (z.x + 4.5) * TILE, y: (z.y + 4.5) * TILE };
    if (world.canInteract(p, board, 90)) add('contractBoard', board, 'Notice Board · read', -1);
  }
  for (const site of world.alienEcology?.sites || [])
    if (world.canInteract(p, site, 120)) add('alienSite', site, site.name + ' · inspect', 1);
  for (const site of world.loreSites || [])
    if (world.canInteract(p, site, 120)) add('loreSite', site, site.title + ' · inspect', 1);
  for (const camp of world.camps || [])
    if (world.canInteract(p, camp, 100)) add('camp', camp, 'Field Camp · rest and storage', 1);
  if (world.detention) {
    const guard = world.entityById.get(world.detention.guard);
    if (guard && world.canInteract(p, guard, 110))
      add('arrest', guard, 'Guards · discuss detention', -4);
  }
  for (const prison of world.prisons || []) {
    for (const c of prison.cells) {
      const gate = { ...c, x: (c.door.x + 0.5) * TILE, y: (c.door.y + 0.5) * TILE };
      if (p.imprisoned?.cellId === c.id || canUseCell(world, c, p))
        add('cell', gate, c.open ? 'Open Cell · inspect' : 'Cell · castle', -2);
    }
    const b = world.buildings[prison.buildingId - 1],
      chest = { city: prison.city, x: (b.door.x + 1.85) * TILE, y: (b.door.y - 1.25) * TILE };
    if (world.canInteract(p, chest, 80)) add('prisonChest', chest, 'Prison Chest · equipment', -1);
  }
  if (world.dungeonExit && world.canInteract(p, world.dungeonExit, 90))
    add('dungeonExit', world.dungeonExit, 'Stairs · return to the surface', -1);
  for (const d of world.dungeonEntrances || [])
    if (world.canInteract(p, d, 95))
      add(
        'dungeonEntrance',
        d,
        d.name + ' · descend' + (d.kind === 'underwater' ? ' through an underwater entrance' : ''),
        -1,
      );
  for (const shelf of world.libraryShelves || [])
    if (world.canInteract(p, shelf, 90)) add('libraryShelf', shelf, shelf.name + ' · read', -1);
  for (const pedestal of world.pedestals || [])
    if (world.canInteract(p, pedestal, 85))
      add('pedestal', pedestal, 'Pedestal: ' + pedestal.name + ' · inspect', -1);
  if (!world.libraryShelves?.length && world.canInteract(p, world.library, 95))
    add('library', world.library, 'Library · read');
  for (const l of world.landmarks)
    if (Object.values(l.inventory).some((n) => n > 0) && world.canInteract(p, l, 90))
      add('landmark', l, l.name + ' · open', 0);
  for (const r of world.resources)
    if (r.amount > 0 && world.canInteract(p, r, 60))
      add('resource', r, ITEMS[r.kind].name + ' · gather', 0);
  for (const pile of world.woodPiles || [])
    if ((pile.inventory.log || 0) > 0 && world.canInteract(p, pile, 80))
      add('woodPile', pile, 'Logs × ' + pile.inventory.log + ' · take', 0);
  for (const c of world.corpses)
    if (
      (Object.values(c.inventory || {}).some((n) => n > 0) || (c.animal && !c.butchered)) &&
      world.canInteract(p, c, CORPSE_REACH)
    )
      add('corpse', c, c.name + ' · ' + (c.animal && !c.butchered ? 'butcher' : 'search'), -2);
  for (const e of world.entities)
    if (
      e.hp > 0 &&
      !ANIMALS[e.role] &&
      !['horse', 'bandit', 'banditArcher', 'brute', 'raider', 'nomad', 'nomadArcher'].includes(
        e.role,
      ) &&
      world.canInteract(p, e)
    )
      add(
        'npc',
        e,
        e.name +
          ' · ' +
          (TRADE[e.role] && !e.noTrade ? 'trade' : e.role === 'dummy' ? 'training' : 'talk'),
      );
  if (!candidates.length) {
    const t = world
      .treesNear(p, 60)
      .filter((t) => world.canInteract(p, t, 60))
      .sort((a, b) => distance(a, p) - distance(b, p))[0];
    if (t) add('tree', t, 'Tree · chop');
  }
  return (
    candidates.sort((a, b) => a.priority - b.priority || distance(a, p) - distance(b, p))[0] || null
  );
}
export function beginGather(world, target) {
  if (
    target?.kind !== 'resource' ||
    !target.obj ||
    !(target.obj.amount > 0) ||
    !world.canInteract(world.player, target.obj, 60)
  )
    return false;
  world.startAction({
    type: 'resource',
    id: target.obj.id,
    remaining: target.obj.kind === 'ore' ? 4 : 2,
  });
  return true;
}
export function hoveredNpc(world, point, zoom = 1) {
  let selected = null,
    best = Infinity;
  for (const e of world.entities) {
    if (e.hp <= 0) continue;
    const pose = world.renderPose(e);
    if (!world.visibleFrom(world.player, pose)) continue;
    const animal = ANIMALS[e.role],
      height =
        e.race === 'arctarian'
          ? 114
          : e.mounted
            ? 105
            : e.role === 'wizard'
              ? 100
              : animal
                ? ['deer', 'elk'].includes(e.role)
                  ? 90
                  : 55
                : 80;
    const dx = Math.abs(point.x - pose.x),
      dy = Math.abs(point.y - (pose.y - height / 2));
    if (
      dx > (animal ? Math.max(22, animal.size * 1.5) : e.horse || e.mounted ? 45 : 22) / zoom ||
      dy > (height / 2 + 4) / zoom
    )
      continue;
    const score = dx * dx + dy * dy;
    if (score < best) {
      best = score;
      selected = e;
    }
  }
  return selected;
}
