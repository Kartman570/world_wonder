import { TILE, point } from '../core/content.js';
export function initializeTrainingStock(w) {
  if (w.dungeonSpec || !w.trainingRoom) return;
  w.trainingStock ??= { inventory: { sword: 256, bow: 256, arrow: 8192 }, issued: [] };
  const b = w.trainingRoom;
  w.trainingRack = {
    id: 'training-stock',
    name: 'Training Weapon Stock',
    ...point(b.x + 2.5, b.y + 2.3),
  };
}
export function takeTrainingKit(w) {
  const stock = w.trainingStock,
    p = w.player,
    generation = w.life?.generation || 1;
  if (!stock || !w.canInteract(p, w.trainingRack, 115))
    return { ok: false, message: 'Approach the weapon rack in the training hall.' };
  if (stock.issued.includes(generation))
    return { ok: false, message: 'This wanderer has already claimed a training kit.' };
  let n = 0;
  for (const [key, count] of Object.entries({ sword: 1, bow: 1, arrow: 32 })) {
    const qty = Math.min(Math.max(0, count - (p.inventory[key] || 0)), stock.inventory[key] || 0);
    if (qty) {
      stock.inventory[key] -= qty;
      p.inventory[key] = (p.inventory[key] || 0) + qty;
      n += qty;
    }
  }
  if (!n)
    return { ok: false, message: 'You already carry the required weapons, or the stock is empty.' };
  stock.issued.push(generation);
  p.equipment ??= {};
  p.equipment.melee ??= 'sword';
  p.equipment.ranged ??= 'bow';
  w.normalizeEquipment();
  w.log('You receive training weapons from the cathedral stock: a sword, bow, and missing arrows.');
  return { ok: true, message: 'Weapons issued. R — draw, Q — switch slots.' };
}
